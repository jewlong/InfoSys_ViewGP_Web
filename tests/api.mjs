import assert from "node:assert/strict";
import http from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { demoProject, makeElement, validateProject } from "../src/model.ts";
const directory = mkdtempSync(join(tmpdir(), "viewx-api-"));
const databasePath = join(directory, "legacy.db");
const port = Number(process.env.VIEWX_TEST_PORT) || 3198;
let server;
try {
  const project = demoProject();
  project.id = "legacy-project";
  project.futureExtension = { preserve: true };
  // Create a real database using the former Node.js SQLite schema and writer.
  const legacy = new DatabaseSync(databasePath);
  legacy.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, content TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE versions (project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, revision INTEGER NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(project_id,revision));",
  );
  legacy
    .prepare("INSERT INTO projects VALUES (?,?,?,?,?)")
    .run(
      project.id,
      project.name,
      JSON.stringify(project),
      1,
      "2026-10-09T13:52:00.000Z",
    );
  legacy
    .prepare("INSERT INTO versions VALUES (?,?,?,?)")
    .run(project.id, 1, JSON.stringify(project), "2026-10-09T13:52:00.000Z");
  legacy.close();
  server = await startBackend(databasePath, port);
  const base = server.base;
  const put = (id, body, headers = {}) =>
    fetch(`${base}/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  const restored = await (
    await fetch(base + "/api/projects/" + project.id)
  ).json();
  assert.deepEqual(restored.project, project);
  assert.equal(restored.revision, 1);
  const list = await (await fetch(base + "/api/projects")).json();
  assert.equal(list[0].updated_at, "2026-10-09T13:52:00.000Z");
  assert.equal(list[0].id, project.id);
  const updated = { ...project, name: "C# 已更新" };
  let result = await put(project.id, { project: updated, revision: 1 });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).revision, 2);
  const writes = await Promise.all(
    Array.from({ length: 5 }, () =>
      put(project.id, { project: updated, revision: 2 }),
    ),
  );
  assert.equal(writes.filter((r) => r.status === 200).length, 1);
  assert.equal(writes.filter((r) => r.status === 409).length, 4);
  assert.equal((await fetch(base + "/api/projects/not-found")).status, 404);
  assert.equal((await fetch(base + "/api/not-found")).status, 404);
  assert.equal(
    (
      await put(
        project.id,
        { project, revision: 0 },
        { Origin: "https://other.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await put(project.id, { project, revision: 3 }, { Origin: base })).status,
    200,
  );
  assert.equal(
    (
      await put(
        project.id,
        { project, revision: 4 },
        { "Content-Type": "text/plain" },
      )
    ).status,
    415,
  );
  assert.equal(
    (
      await fetch(base + "/api/projects/" + project.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{bad",
      })
    ).status,
    400,
  );
  assert.equal((await put("wrong-id", { project, revision: 4 })).status, 400);
  assert.equal((await put(project.id, { project, revision: -1 })).status, 400);
  // Frontend and backend validators must agree on schema-v1 fixtures.
  const invalids = [
    null,
    {},
    { ...project, schemaVersion: 2 },
    { ...project, screens: [null] },
    { ...project, startScreenId: "missing" },
  ];
  for (const [property, value] of [
    ["width", 0],
    ["kind", "__proto__"],
    ["decimals", 2.5],
    ["variableId", null],
    ["image", "https://example.com/pixel"],
    ["locked", "yes"],
    ["action", "invalid"],
    ["scaleMin", null],
    ["scaleMax", "100"],
    ["fillColor", "red"],
    ["trackColor", false],
    ["showValue", 1],
    ["orientation", "diagonal"],
    ["sampleInterval", 99],
    ["historyPoints", 601],
    ["alarmMaxRows", 0],
    ["alarmRules", null],
    ["alarmRules", [null]],
    [
      "alarmRules",
      [
        {
          id: "r",
          message: "警報",
          variableId: "running",
          operator: "invalid",
          severity: "warning",
        },
      ],
    ],
    ["numberFormat", "bad"],
    ["numberLocale", "bad"],
    ["useGrouping", null],
    ["numberPrefix", false],
    ["inputMin", null],
    ["inputMax", "10"],
    ["inputStep", 0],
    ["fontFamily", ""],
    ["fontWeight", "heavy"],
    ["italic", "yes"],
    ["textAlign", "justify"],
    ["verticalAlign", "baseline"],
    ["wordWrap", null],
    ["lineHeight", 0.5],
    ["borderWidth", 21],
    ["borderRadius", -1],
    ["borderColor", "red"],
    ["borderStyle", "double"],
    ["shapeFilled", 1],
    ["imageFit", "stretch"],
    ["imagePosition", "outside"],
    ["buttonPressedColor", "#xyzxyz"],
  ]) {
    const p = structuredClone(project);
    p.screens[0].elements[0][property] = value;
    invalids.push(p);
  }
  const duplicate = structuredClone(project);
  for (const [property, value] of [
    ["type", null],
    ["type", "invalid"],
    ["type", "popup"],
    ["parentScreenId", null],
    ["parentScreenId", ""],
    ["parentScreenId", "missing"],
    ["parentScreenId", project.screens[0].id],
  ]) {
    const invalid = structuredClone(project);
    invalid.screens[0][property] = value;
    invalids.push(invalid);
  }
  duplicate.screens[0].elements[0].id = duplicate.variables[0].id;
  invalids.push(duplicate);
  for (const p of invalids) {
    assert.equal(validateProject(p), false);
    assert.equal(
      (await put(project.id, { project: p, revision: 4 })).status,
      400,
    );
  }
  const decimals = structuredClone(project);
  Object.assign(decimals.screens[0].elements[0], {
    decimals: 2,
    numberFormat: "percent",
    numberLocale: "de-DE",
    useGrouping: false,
    numberPrefix: "$",
    inputMin: -100,
    inputMax: 100,
    inputStep: 0.25,
    action: "reset",
    fontFamily: "serif",
    fontWeight: "bold",
    italic: true,
    underline: true,
    textAlign: "right",
    verticalAlign: "bottom",
    wordWrap: false,
    lineHeight: 1.5,
    textBackground: true,
    borderWidth: 4,
    borderRadius: 24,
    borderStyle: "dotted",
    borderColor: "#ff0000",
    shapeFilled: false,
    imageFit: "cover",
    imagePosition: "top",
    buttonHoverBackground: "#123456",
    buttonHoverColor: "#ffffff",
    buttonPressedBackground: "#654321",
    buttonPressedColor: "#000000",
    buttonDisabledBackground: "#222222",
    buttonDisabledColor: "#aaaaaa",
  });
  decimals.screens[0].elements[0].image = "data:image/png;base64,aGVsbG8=";
  decimals.screens[0].elements.push(
    ...["gauge", "bar", "trend", "alarm"].map((kind) => ({
      ...makeElement(kind),
      ...(kind === "alarm"
        ? {
            alarmRules: [
              {
                id: "r",
                message: "運轉警報",
                variableId: "running",
                operator: "true",
                severity: "warning",
                enabled: true,
              },
            ],
          }
        : { variableId: "temperature" }),
    })),
  );
  assert.equal(validateProject(decimals), true);
  assert.equal(
    (await put(project.id, { project: decimals, revision: 4 })).status,
    200,
  );
  // Use HTTP Expect: 100-continue so an early 413 is observable even when the
  // server rejects the upload before receiving its body. Chunked uploads still
  // send the full payload until the server enforces its streaming read limit.
  async function oversizedRequest(streaming) {
    return new Promise((resolve, reject) => {
      let done = false;
      const request = http.request(
        base + "/api/projects/" + project.id,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Expect: "100-continue",
            ...(streaming ? {} : { "Content-Length": 21 * 1024 * 1024 }),
          },
        },
        (response) => {
          done = true;
          response.resume();
          resolve(response.statusCode);
          request.destroy();
        },
      );
      request.on("error", (error) => {
        if (!done) reject(error);
      });
      request.on("continue", async () => {
        try {
          request.write('{"padding":"');
          for (let i = 0; i < 21 && !done; i++) {
            request.write("a".repeat(1024 * 1024));
            await new Promise((r) => setTimeout(r, 10));
          }
          if (!done) request.end('"}');
        } catch (error) {
          if (!done) reject(error);
        }
      });
      request.flushHeaders();
    });
  }
  assert.equal(await oversizedRequest(false), 413);
  assert.equal(await oversizedRequest(true), 413);
  const home = await fetch(base + "/");
  assert.equal(home.status, 200);
  assert.ok((await home.text()).includes("ViewX Studio"));
  const unknown = await fetch(base + "/api/not-found");
  assert.equal(
    unknown.headers.get("content-type").startsWith("application/json"),
    true,
  );
  await server.close();
  server = await startBackend(databasePath, port);
  const reopened = await (
    await fetch(base + "/api/projects/" + project.id)
  ).json();
  assert.equal(reopened.revision, 5);
  assert.deepEqual(reopened.project.futureExtension, { preserve: true });
  const db = new DatabaseSync(databasePath);
  assert.equal(db.prepare("SELECT count(*) AS n FROM versions").get().n, 5);
  db.close();
  console.log(
    "PASS: legacy Node SQLite compatibility, JSON contract, restart persistence, atomic concurrent writes, validation parity, origin/content-type guards, bounded/streaming body limits, API routing and static frontend.",
  );
} finally {
  await server?.close();
  rmSync(directory, { recursive: true, force: true });
}
