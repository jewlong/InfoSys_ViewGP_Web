import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { newProject, makeElement, validateProject } from "../src/model.ts";
const directory = mkdtempSync(join(tmpdir(), "viewx-management-"));
let server, browser;
try {
  server = await startBackend(join(directory, "test.db"), 3193);
  const p = newProject();
  p.name = "專案管理測試";
  p.screens[0].elements.push(makeElement("image", 20, 20));
  const path = `${server.base}/api/projects/${p.id}`;
  const json = { "Content-Type": "application/json" };
  const put = (project, revision) =>
    fetch(path, {
      method: "PUT",
      headers: json,
      body: JSON.stringify({ project, revision }),
    });
  assert.equal((await put(p, 0)).status, 200);
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.VIEWX_BROWSER_PATH,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(server.base);
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  async function menu(name) {
    await page.getByRole("button", { name: "檔案", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
  }
  async function waitFor(check) {
    const deadline = Date.now() + 12000;
    while (Date.now() < deadline) {
      const current = await (await fetch(path)).json();
      if (check(current)) return current;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Timed out waiting for saved project");
  }
  await menu("專案設定");
  await page.getByLabel("啟用自動儲存").check();
  await page.getByLabel("專案名稱", { exact: true }).fill("自動保存專案");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  let saved = await waitFor((x) => x.revision === 2);
  assert.equal(saved.project.name, "自動保存專案");
  assert.equal(saved.project.autoSave, true);
  // An edit made during a delayed save must survive and receive another revision.
  let releaseSave, capturedSave;
  const captured = new Promise((resolve) => {
    capturedSave = resolve;
  });
  const released = new Promise((resolve) => {
    releaseSave = resolve;
  });
  await page.route(path, async (route) => {
    if (
      route.request().method() === "PUT" &&
      route.request().postDataJSON().project.name === "儲存途中第一版"
    ) {
      capturedSave();
      await released;
    }
    await route.continue();
  });
  await menu("專案設定");
  await page.getByLabel("專案名稱", { exact: true }).fill("儲存途中第一版");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await Promise.race([
    captured,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Automatic save did not start")),
        10000,
      ),
    ),
  ]);
  await menu("專案設定");
  await page.getByLabel("專案名稱", { exact: true }).fill("儲存途中第二版");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  releaseSave();
  saved = await waitFor((x) => x.project.name === "儲存途中第二版");
  assert.equal(
    (await (await fetch(path + "/versions/3")).json()).project.name,
    "儲存途中第一版",
  );
  await page.unroute(path);
  // Upload into the selected element, then reuse its resource in another element.
  await page.locator(".canvas-element").first().click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j+1sAAAAASUVORK5CYII=",
    "base64",
  );
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "共用圖片.png",
    mimeType: "image/png",
    buffer: png,
  });
  saved = await waitFor((x) => x.project.assets?.length === 1);
  const assetId = saved.project.assets[0].id;
  assert.equal(saved.project.screens[0].elements[0].imageAssetId, assetId);
  assert.equal(saved.project.screens[0].elements[0].image, undefined);
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  await menu("圖片資源管理");
  await page.getByRole("button", { name: "套用圖片", exact: true }).click();
  saved = await waitFor(
    (x) =>
      x.project.screens[0].elements.filter((e) => e.imageAssetId === assetId)
        .length === 2,
  );
  assert.equal(saved.project.assets.length, 1);
  await menu("圖片資源管理");
  await page.getByRole("button", { name: "刪除圖片", exact: true }).click();
  assert.equal(await page.locator(".resource-card").count(), 1);
  await page.getByRole("button", { name: "上傳圖片", exact: true }).click();
  await page.locator('input[type="file"]').nth(2).setInputFiles({
    name: "相同圖片.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page
    .getByText("上傳中…", { exact: false })
    .waitFor({ state: "hidden" });
  assert.equal(await page.locator(".resource-card").count(), 1);
  // Replace a shared resource without changing its ID or references.
  const replacementData = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const context = canvas.getContext("2d");
    context.fillStyle = "red";
    context.fillRect(0, 0, 2, 2);
    return canvas.toDataURL("image/png");
  });
  await page.getByRole("button", { name: "更換圖片", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .nth(2)
    .setInputFiles({
      name: "replacement.png",
      mimeType: "image/png",
      buffer: Buffer.from(replacementData.split(",")[1], "base64"),
    });
  await page.waitForFunction(
    (data) =>
      document.querySelector(".resource-card img")?.getAttribute("src") ===
      data,
    replacementData,
  );
  await page.getByRole("button", { name: "關閉對話框", exact: true }).click();
  saved = await waitFor((x) => x.project.assets[0].data === replacementData);
  assert.equal(saved.project.assets[0].id, assetId);
  const downloadPromise = page.waitForEvent("download");
  await menu("匯出專案");
  const download = await downloadPromise;
  const exported = JSON.parse(readFileSync(await download.path(), "utf8"));
  assert.equal(validateProject(exported), true);
  assert.equal(exported.assets.length, 1);
  assert.equal(
    exported.screens[0].elements.filter((e) => e.imageAssetId === assetId)
      .length,
    2,
  );
  saved = await (await fetch(path)).json();
  const beforeRestore = saved.revision;
  await menu("版本紀錄與還原");
  await page.locator(".version-list button").last().click();
  await page.locator(".version-preview").waitFor();
  await page.getByRole("button", { name: "還原此版本", exact: true }).click();
  saved = await waitFor((x) => x.revision === beforeRestore + 1);
  assert.equal(saved.project.name, "專案管理測試");
  assert.equal(saved.project.assets, undefined);
  assert.equal(
    (await (await fetch(path + "/versions/" + beforeRestore)).json()).project
      .assets[0].id,
    assetId,
  );
  const old = await (await fetch(path + "/versions/2")).json();
  assert.equal(old.project.name, "自動保存專案");
  const restore = (sourceRevision, revision, headers = json) =>
    fetch(path + "/restore", {
      method: "POST",
      headers,
      body: JSON.stringify({ sourceRevision, revision }),
    });
  assert.equal((await restore(1, beforeRestore)).status, 409);
  assert.equal((await restore(999, saved.revision)).status, 404);
  assert.equal(
    (
      await restore(1, saved.revision, {
        ...json,
        Origin: "http://other.example",
      })
    ).status,
    403,
  );
  assert.equal((await restore(-1, saved.revision)).status, 400);
  // Concurrent writer causes automatic saving to pause, retaining the local draft.
  await menu("專案設定");
  await page.getByLabel("啟用自動儲存").check();
  await page.getByRole("button", { name: "完成", exact: true }).click();
  saved = await waitFor((x) => x.project.autoSave);
  const other = structuredClone(saved.project);
  other.name = "其他人的修改";
  assert.equal((await put(other, saved.revision)).status, 200);
  await menu("專案設定");
  await page.getByLabel("專案名稱", { exact: true }).fill("本機未保存修改");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByText("自動儲存：已暫停", { exact: true }).waitFor();
  assert.equal((await (await fetch(path)).json()).project.name, "其他人的修改");
  await menu("專案設定");
  assert.equal(
    await page.getByLabel("專案名稱", { exact: true }).inputValue(),
    "本機未保存修改",
  );
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  await menu("專案設定");
  await page.getByLabel("專案名稱", { exact: true }).fill("重新開啟後自動儲存");
  await page.getByRole("button", { name: "完成", exact: true }).click();
  await waitFor((x) => x.project.name === "重新開啟後自動儲存");
  exported.autoSave = false;
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "backup.viewx",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(exported)),
    });
  await menu("圖片資源管理");
  assert.equal(await page.locator(".resource-card").count(), 1);
  assert.ok(
    (await page.locator(".resource-card").textContent()).includes(
      "2 個元件引用",
    ),
  );
  await page.getByRole("button", { name: "關閉對話框", exact: true }).click();
  const legacy = structuredClone(p);
  legacy.screens[0].elements = [
    makeElement("image", 20, 20),
    makeElement("image", 200, 20),
  ].map((e) => ({
    ...e,
    image: "data:image/png;base64," + png.toString("base64"),
  }));
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "legacy.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await menu("圖片資源管理");
  await page.getByRole("button", { name: "收集現有圖片", exact: true }).click();
  assert.equal(await page.locator(".resource-card").count(), 1);
  assert.ok(
    (await page.locator(".resource-card").textContent()).includes(
      "2 個元件引用",
    ),
  );
  // A copied image survives deleting its now-unused resource before pasting.
  await page.getByRole("button", { name: "關閉對話框", exact: true }).click();
  await page.locator(".canvas-element").first().click();
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
  await menu("圖片資源管理");
  await page.getByRole("button", { name: "刪除圖片", exact: true }).click();
  assert.equal(await page.locator(".resource-card").count(), 0);
  await page.getByRole("button", { name: "關閉對話框", exact: true }).click();
  await page.keyboard.press("Control+v");
  await page.locator(".canvas-element img").waitFor();
  const fallbackDownload = page.waitForEvent("download");
  await menu("匯出專案");
  const fallback = JSON.parse(
    readFileSync(await (await fallbackDownload).path(), "utf8"),
  );
  assert.equal(validateProject(fallback), true);
  assert.equal(fallback.screens[0].elements[0].imageAssetId, undefined);
  assert.ok(
    fallback.screens[0].elements[0].image.startsWith("data:image/png;"),
  );
  assert.deepEqual(errors, []);
  // Validate assets and dangling references identically on both runtimes.
  for (const invalid of [
    { ...p, assets: [{ id: "a", name: "", data: "x" }] },
    { ...p, autoSave: "yes" },
    {
      ...p,
      screens: [
        {
          ...p.screens[0],
          elements: [{ ...p.screens[0].elements[0], imageAssetId: "missing" }],
        },
      ],
    },
  ]) {
    assert.equal(validateProject(invalid), false);
    assert.equal((await put(invalid, 0)).status, 400);
  }
  console.log(
    "PASS: automatic save and edits during save, image upload/reuse/replacement/deduplication/deletion protection, export/import and legacy image collection, version preview/restore, historical snapshots, restore guards, conflict pause and validation parity.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(directory, { recursive: true, force: true });
}
