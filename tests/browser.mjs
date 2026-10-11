import { chromium } from "playwright";
import assert from "node:assert/strict";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const temp = mkdtempSync(join(tmpdir(), "viewx-browser-"));
const port = Number(process.env.VIEWX_TEST_PORT) || 3197,
  base = `http://127.0.0.1:${port}`;
let server;
let browser;
const errors = [];
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
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base);
  await page.locator(".canvas-element").first().waitFor();
  assert.equal(await page.locator(".canvas-element").count(), 21);
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  await page.getByRole("button", { name: "啟動 / 停止", exact: true }).click();
  await page.getByRole("button", { name: "TRUE", exact: true }).waitFor();
  await page.getByRole("button", { name: "＋ 計數", exact: true }).click();
  await page
    .locator(".design-canvas")
    .getByText("1,281", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "重設模擬資料", exact: true }).click();
  await page
    .locator(".design-canvas")
    .getByText("1,280", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await page
    .locator(".component-grid")
    .getByRole("button", { name: "文字", exact: true })
    .click();
  assert.equal(await page.locator(".canvas-element").count(), 22);
  const selected = page.locator(".canvas-element.is-selected");
  const before = await selected.boundingBox();
  await page.mouse.move(before.x + 40, before.y + 20);
  await page.mouse.down();
  await page.mouse.move(before.x + 70, before.y + 50, { steps: 5 });
  await page.mouse.up();
  const after = await selected.boundingBox();
  assert.ok(after.x > before.x && after.y > before.y, "drag moves component");
  await page.getByRole("button", { name: "復原", exact: true }).click();
  await page.getByRole("button", { name: "復原", exact: true }).click();
  assert.equal(await page.locator(".canvas-element").count(), 21);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  assert.equal(await page.locator(".canvas-element").count(), 22);
  // Selection, clipboard and resize must preserve history across split hooks.
  await page.locator(".canvas-element").nth(0).click();
  await page
    .locator(".canvas-element")
    .nth(1)
    .click({ modifiers: ["Shift"] });
  assert.equal(await selected.count(), 2);
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  assert.equal(await page.locator(".canvas-element").count(), 24);
  assert.equal(await selected.count(), 2);
  await page.keyboard.press("Control+z");
  assert.equal(await page.locator(".canvas-element").count(), 22);
  await page.locator(".canvas-element").last().click();
  const sizeBefore = await selected.boundingBox();
  const handle = await selected.locator(".selection-handle.se").boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle.x + 35, handle.y + 25, { steps: 5 });
  await page.mouse.up();
  assert.ok((await selected.boundingBox()).width > sizeBefore.width);
  await page.keyboard.press("Control+z");
  await page.locator(".canvas-element").last().click();
  assert.equal((await selected.boundingBox()).width, sizeBefore.width);
  // Right-click targets exactly one component and shares live properties.
  await page.locator(".canvas-element").nth(0).click();
  await page
    .locator(".canvas-element")
    .last()
    .click({ modifiers: ["Shift"] });
  await page.locator(".canvas-element").last().click({ button: "right" });
  const propertyDialog = page.getByRole("dialog", { name: "元件屬性設定" });
  await propertyDialog.waitFor();
  assert.equal(await selected.count(), 1);
  const widthInput = propertyDialog.getByLabel("寬度", { exact: true });
  const originalWidth = await widthInput.inputValue();
  await widthInput.fill(String(Number(originalWidth) + 40));
  assert.equal(
    await page
      .locator(".right-panel")
      .getByLabel("寬度", { exact: true })
      .inputValue(),
    String(Number(originalWidth) + 40),
  );
  await page.keyboard.press("Escape");
  assert.equal(await propertyDialog.count(), 0);
  await page.keyboard.press("Control+z");
  await page.locator(".canvas-element").last().click({ button: "right" });
  await propertyDialog.waitFor();
  assert.equal(
    await propertyDialog.getByLabel("寬度", { exact: true }).inputValue(),
    originalWidth,
  );
  await propertyDialog
    .getByRole("button", { name: "完成", exact: true })
    .click();
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.locator(".canvas-element").last().click({ button: "right" });
  assert.equal(await propertyDialog.count(), 0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  let list = await (await page.request.get(base + "/api/projects")).json();
  assert.equal(list.length, 1);
  let saved = await (
    await page.request.get(base + "/api/projects/" + list[0].id)
  ).json();
  assert.equal(saved.project.screens[0].elements.length, 22);
  // A stale writer must not overwrite the browser's version.
  let conflict = await page.request.put(base + "/api/projects/" + list[0].id, {
    data: { project: saved.project, revision: 0 },
  });
  assert.equal(conflict.status(), 409);
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  assert.equal(await page.locator(".canvas-element").count(), 22);
  // Export and reimport as a distinct project.
  await page.getByRole("button", { name: "檔案", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "匯出專案", exact: true }).click();
  const download = await downloadPromise;
  const path = join(temp, "export.json");
  await download.saveAs(path);
  assert.equal(
    JSON.parse(readFileSync(path, "utf8")).screens[0].elements.length,
    22,
  );
  await page.locator("input[type=file]").first().setInputFiles(path);
  await page.getByRole("status").filter({ hasText: "專案已匯入" }).waitFor();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  list = await (await page.request.get(base + "/api/projects")).json();
  assert.equal(list.length, 2);
  await page.getByRole("button", { name: "新增畫面", exact: true }).click();
  await page
    .locator(".component-grid")
    .getByRole("button", { name: "按鈕", exact: true })
    .click();
  await page
    .locator(".properties")
    .getByText("互動動作", { exact: true })
    .waitFor();
  await page
    .locator(".properties")
    .getByLabel("動作", { exact: true })
    .selectOption("screen");
  await page
    .locator(".properties")
    .getByLabel("目標畫面", { exact: true })
    .selectOption({ label: "主畫面" });
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page
    .locator(".design-canvas")
    .getByRole("button", { name: "啟動", exact: true })
    .click();
  await page
    .locator(".design-canvas")
    .getByText("產線即時監控", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  // Box selection uses canvas coordinates at different zoom levels.
  await page.getByRole("button", { name: "新增畫面", exact: true }).click();
  for (let i = 0; i < 2; i++) {
    await page
      .locator(".component-grid")
      .getByRole("button", { name: "文字", exact: true })
      .click();
  }
  await page
    .locator(".right-panel")
    .getByLabel("X 座標", { exact: true })
    .fill("400");
  async function boxSelect(
    reverse = false,
    onlySecond = false,
    additive = false,
  ) {
    const first = await page.locator(".canvas-element").first().boundingBox();
    const last = await page.locator(".canvas-element").last().boundingBox();
    const start = {
      x: (onlySecond ? last.x : first.x) - 12,
      y: Math.min(first.y, last.y) - 12,
    };
    const finish = {
      x: last.x + last.width + 12,
      y: Math.max(first.y + first.height, last.y + last.height) + 12,
    };
    if (additive) await page.keyboard.down("Shift");
    await page.mouse.move(
      reverse ? finish.x : start.x,
      reverse ? finish.y : start.y,
    );
    await page.mouse.down();
    await page.mouse.move(
      reverse ? start.x : finish.x,
      reverse ? start.y : finish.y,
      { steps: 5 },
    );
    assert.equal(await page.locator(".selection-marquee").count(), 1);
    await page.mouse.up();
    if (additive) await page.keyboard.up("Shift");
    assert.equal(await page.locator(".selection-marquee").count(), 0);
  }
  await boxSelect();
  assert.equal(await selected.count(), 2);
  await boxSelect(true, true);
  assert.equal(await selected.count(), 1);
  await page.locator(".canvas-element").first().click();
  await boxSelect(false, true, true);
  assert.equal(await selected.count(), 2);
  await page.getByRole("button", { name: "縮小", exact: true }).click();
  await boxSelect(true);
  assert.equal(await selected.count(), 2);
  await page.keyboard.press("Control+c");
  await page.keyboard.press("Control+v");
  assert.equal(await page.locator(".canvas-element").count(), 4);
  await page.keyboard.press("Control+z");
  assert.equal(await page.locator(".canvas-element").count(), 2);
  const canvasBox = await page.locator(".design-canvas").boundingBox();
  await page.mouse.move(canvasBox.x + 10, canvasBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.equal(await page.locator(".selection-marquee").count(), 0);
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.mouse.move(canvasBox.x + 10, canvasBox.y + 10);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
  assert.equal(await page.locator(".selection-marquee").count(), 0);
  await page.mouse.up();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: join(temp, "desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(temp, "mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  const invalid = await page.request.put(base + "/api/projects/bad", {
    data: {
      project: { schemaVersion: 1, screens: [null], variables: [] },
      revision: 0,
    },
  });
  assert.equal(invalid.status(), 400);
  console.log(
    "PASS: simulation, variable updates, reset, drag, multi-selection copy/paste, resize, marquee selection, undo/redo, SQLite save/reopen, conflict protection, JSON export/import, multi-screen navigation, malformed input and browser errors.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(temp, { recursive: true, force: true });
}
