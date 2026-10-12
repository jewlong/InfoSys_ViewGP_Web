import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { newProject, makeElement } from "../src/model.ts";

const temp = mkdtempSync(join(tmpdir(), "viewx-screens-"));
const port = Number(process.env.VIEWX_TEST_PORT) || 3194;
let browser, server;
const errors = [];
function element(kind, text, x, y, props = {}) {
  return { ...makeElement(kind, x, y), text, ...props };
}
const p = newProject();
p.name = "Popup inheritance test";
p.startScreenId = "home";
p.variables = [{ id: "count", name: "Count", type: "number", initial: 0 }];
const screen = (id, name, elements, props = {}) => ({
  id,
  name,
  width: 640,
  height: 400,
  background: "#101c2e",
  elements,
  ...props,
});
const opener = () =>
  element("button", "Open Popup", 20, 180, {
    action: "popup",
    targetScreenId: "confirm",
  });
p.screens = [
  screen("home", "Home", [element("text", "Home content", 20, 20), opener()]),
  screen("master", "Master", [
    element("text", "Shared header", 20, 10),
    element("button", "Shared increment", 20, 70, {
      action: "increment",
      actionValue: "1",
      variableId: "count",
    }),
  ]),
  screen("child", "Child", [opener()]),
  screen(
    "template",
    "Popup Template",
    [
      element("text", "Shared popup", 20, 10),
      element("button", "Cancel", 20, 160, {
        action: "closePopup",
        width: 130,
      }),
    ],
    { type: "popup", width: 360, height: 240, parentScreenId: "master" },
  ),
  screen(
    "confirm",
    "Confirm",
    [
      element("button", "Popup increment", 20, 80, {
        action: "increment",
        actionValue: "1",
        variableId: "count",
      }),
      element("button", "Open Nested", 190, 160, {
        action: "popup",
        targetScreenId: "nested",
        width: 150,
      }),
    ],
    { type: "popup", width: 360, height: 240, parentScreenId: "template" },
  ),
  screen(
    "nested",
    "Nested",
    [element("button", "Nested close", 20, 60, { action: "closePopup" })],
    { type: "popup", width: 240, height: 140 },
  ),
];

try {
  server = await startBackend(join(temp, "test.db"), port);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.VIEWX_BROWSER_PATH
      ? { executablePath: process.env.VIEWX_BROWSER_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(server.base);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "screens.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByRole("status").filter({ hasText: "專案已匯入" }).waitFor();
  const selectScreen = (name) =>
    page.locator(".screen-list button").filter({ hasText: name }).click();
  const parent = page
    .locator(".right-panel")
    .getByLabel("繼承畫面（共通母片）", { exact: true });

  await selectScreen(/^Child/);
  await parent.selectOption("master");
  assert.equal(
    await page.locator(".design-canvas [data-inherited]").count(),
    2,
  );
  await page.locator(".design-canvas [data-inherited]").first().click();
  assert.equal(await page.locator(".canvas-element.is-selected").count(), 0);
  await page
    .locator(".design-canvas [data-inherited]")
    .first()
    .click({ button: "right" });
  assert.equal(
    await page.getByRole("dialog", { name: "元件屬性設定" }).count(),
    0,
  );
  await page.keyboard.press("Control+a");
  assert.equal(await page.locator(".canvas-element.is-selected").count(), 1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  const [summary] = await (
    await page.request.get(server.base + "/api/projects")
  ).json();
  let stored = await (
    await page.request.get(server.base + "/api/projects/" + summary.id)
  ).json();
  assert.equal(
    stored.project.screens.find((s) => s.id === "child").elements.length,
    1,
  );
  assert.equal(
    stored.project.screens.find((s) => s.id === "child").parentScreenId,
    "master",
  );

  await selectScreen(/^Master/);
  assert.equal(
    await parent.locator('option[value="child"]').count(),
    0,
    "cyclic parent excluded",
  );
  await page.getByRole("button", { name: "畫面", exact: true }).click();
  await page.getByRole("button", { name: "刪除畫面", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "此畫面仍被引用" })
    .waitFor();
  await page.locator(".design-canvas .canvas-element").first().click();
  await page
    .locator(".right-panel")
    .getByLabel("文字 / 標籤", { exact: true })
    .fill("Updated header");
  await selectScreen(/^Child/);
  await page
    .locator(".design-canvas")
    .getByText("Updated header", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();

  // New Popup creation and settings must be available to authors.
  await page.getByRole("button", { name: "畫面", exact: true }).click();
  await page.getByRole("button", { name: "新增對話盒", exact: true }).click();
  assert.equal(
    await page
      .locator(".right-panel")
      .getByLabel("畫面類別", { exact: true })
      .inputValue(),
    "popup",
  );
  await parent.selectOption("template");
  assert.equal(
    await page.locator(".design-canvas [data-inherited]").count(),
    4,
  );
  await page.getByRole("button", { name: "畫面", exact: true }).click();
  await page.getByRole("button", { name: "刪除畫面", exact: true }).click();

  // Version preview and restore must compose inherited content as well.
  await page.getByRole("button", { name: "檔案", exact: true }).click();
  await page
    .getByRole("button", { name: "版本紀錄與還原", exact: true })
    .click();
  await page
    .locator(".version-list button")
    .filter({ hasText: /^版本 1/ })
    .click();
  await page.getByLabel("預覽畫面", { exact: true }).selectOption("child");
  await page
    .locator(".version-preview")
    .getByText("Shared header", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "還原此版本", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "已還原" }).waitFor();
  await selectScreen(/^Child/);
  await page
    .locator(".design-canvas")
    .getByText("Shared header", { exact: true })
    .waitFor();

  // Inherited runtime actions and Popup layering.
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page
    .locator(".design-canvas")
    .getByRole("button", { name: "Shared increment", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("執行值 Count", { exact: true }).inputValue(),
    "1",
  );
  await page
    .locator(".design-canvas")
    .getByRole("button", { name: "Open Popup", exact: true })
    .click();
  const confirm = page.getByRole("dialog", { name: "Confirm", exact: true });
  await confirm.waitFor();
  await confirm.getByText("Shared popup", { exact: true }).waitFor();
  if (process.env.VIEWX_SCREENSHOT_PATH)
    await page.screenshot({ path: process.env.VIEWX_SCREENSHOT_PATH });
  assert.equal(
    await confirm
      .getByRole("button", { name: "Shared increment", exact: true })
      .count(),
    1,
    "the same inherited component is rendered in the background and the Popup",
  );
  assert.equal(
    await page.locator(".design-canvas").evaluate((node) => node.inert),
    true,
  );
  // Even a scripted click from behind the overlay must not change the runtime.
  await page
    .locator(".design-canvas button")
    .filter({ hasText: "Shared increment" })
    .evaluate((node) => node.click());
  assert.equal(
    await page.getByLabel("執行值 Count", { exact: true }).inputValue(),
    "1",
  );
  await confirm
    .getByRole("button", { name: "Popup increment", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("執行值 Count", { exact: true }).inputValue(),
    "2",
  );
  await confirm
    .getByRole("button", { name: "Open Nested", exact: true })
    .click();
  const nested = page.getByRole("dialog", { name: "Nested", exact: true });
  await nested.waitFor();
  await page
    .locator('.runtime-popup[aria-label="Confirm"] button')
    .filter({ hasText: "Popup increment" })
    .evaluate((node) => node.click());
  assert.equal(
    await page.getByLabel("執行值 Count", { exact: true }).inputValue(),
    "2",
  );
  await nested
    .getByRole("button", { name: "Nested close", exact: true })
    .click();
  await confirm.waitFor();
  await confirm.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(await page.locator(".runtime-popup").count(), 0);
  assert.equal(
    await page.getByLabel("執行值 Count", { exact: true }).inputValue(),
    "2",
    "cancel does not write data",
  );
  await page
    .locator(".design-canvas")
    .getByRole("button", { name: "Open Popup", exact: true })
    .click();
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".runtime-popup").count(), 0);
  assert.equal(
    await page.getByLabel("執行值 Count", { exact: true }).count(),
    1,
    "Escape closes Popup without stopping simulation",
  );
  await page.keyboard.press("Escape");

  // Previewing a Popup opens it above the normal start screen; fit smaller viewports.
  await selectScreen(/^Confirm/);
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await confirm.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  const box = await confirm.boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await confirm
    .getByRole("button", { name: "關閉執行對話盒", exact: true })
    .click();
  await page.keyboard.press("Escape");

  // Export, import and reopen retain references rather than flattened copies.
  await page.getByRole("button", { name: "檔案", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出專案", exact: true }).click();
  const download = await downloadPromise;
  const path = join(temp, "export.json");
  await download.saveAs(path);
  const exported = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(
    exported.screens.find((s) => s.id === "confirm").parentScreenId,
    "template",
  );
  await page.locator("input[type=file]").first().setInputFiles(path);
  await page.getByRole("status").filter({ hasText: "專案已匯入" }).waitFor();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  await selectScreen(/^Child/);
  await page
    .locator(".design-canvas")
    .getByText("Shared header", { exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".design-canvas [data-inherited]").count(),
    2,
  );

  // Frontend and server reject corrupt structural imports alike.
  const invalid = structuredClone(exported);
  invalid.screens.find((s) => s.id === "master").parentScreenId = "child";
  assert.equal(
    (
      await page.request.put(server.base + "/api/projects/" + invalid.id, {
        data: { project: invalid, revision: 0 },
      })
    ).status(),
    400,
  );
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "cycle.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(invalid)),
    });
  await page.getByRole("status").filter({ hasText: "專案格式錯誤" }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: inheritance editing/protection, parent propagation, Popup creation/preview/nesting/cancel/Escape, modal isolation, responsive layout, SQLite reopen, version restore, JSON round-trip and cycle rejection.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(temp, { recursive: true, force: true });
}
