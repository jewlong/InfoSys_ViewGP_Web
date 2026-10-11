import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { makeElement, newProject } from "../src/model.ts";

const temp = mkdtempSync(join(tmpdir(), "viewx-widgets-"));
let server, browser;
try {
  server = await startBackend(join(temp, "widgets.db"), 3196);
  const project = newProject();
  project.name = "元件外觀測試";
  project.variables = [
    { id: "enabled", name: "按鈕啟用", type: "boolean", initial: false },
    { id: "count", name: "按鈕計數", type: "number", initial: 0 },
    { id: "label", name: "文字資料", type: "string", initial: "即時文字" },
  ];
  const elements = [
    { ...makeElement("text", 40, 40), width: 320, height: 90 },
    { ...makeElement("rectangle", 40, 170), width: 180, height: 100 },
    { ...makeElement("circle", 260, 170), width: 100, height: 100 },
    { ...makeElement("line", 400, 200), width: 100, height: 20 },
    { ...makeElement("image", 40, 300), width: 160, height: 80 },
    {
      ...makeElement("button", 300, 320),
      width: 200,
      height: 60,
      text: "測試按鈕",
      action: "increment",
      variableId: "count",
      enabledId: "enabled",
    },
  ];
  project.screens[0].elements = elements;
  const put = await fetch(server.base + "/api/projects/" + project.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project, revision: 0 }),
  });
  assert.equal(put.status, 200);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.VIEWX_BROWSER_PATH
      ? { executablePath: process.env.VIEWX_BROWSER_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(server.base);
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  const element = (index) => page.locator(".canvas-element").nth(index);
  const dialog = page.getByRole("dialog", { name: "元件屬性設定" });
  const open = async (index) => {
    await element(index).click({ button: "right" });
    await dialog.waitFor();
  };
  const close = () =>
    dialog.getByRole("button", { name: "完成", exact: true }).click();
  const color = (label, value) =>
    dialog
      .locator(".field")
      .filter({ has: page.getByText(label, { exact: true }) })
      .getByLabel("色碼", { exact: true })
      .fill(value);
  const css = (locator, property) =>
    locator.evaluate((node, key) => getComputedStyle(node)[key], property);
  await open(0);
  await dialog
    .getByLabel("文字 / 標籤", { exact: true })
    .fill("第一行\n第二行");
  await dialog.getByLabel("字型", { exact: true }).selectOption("serif");
  await dialog.getByLabel("粗體", { exact: true }).check();
  await dialog.getByLabel("斜體", { exact: true }).check();
  await dialog.getByLabel("底線", { exact: true }).check();
  await dialog.getByLabel("水平對齊", { exact: true }).selectOption("center");
  await dialog.getByLabel("垂直對齊", { exact: true }).selectOption("bottom");
  await dialog.getByLabel("行距倍數", { exact: true }).fill("1.5");
  await dialog.getByLabel("自動換行", { exact: true }).uncheck();
  await dialog.getByLabel("顯示背景色", { exact: true }).check();
  await close();
  const text = element(0).locator(".visual-text");
  assert.equal(await text.innerText(), "第一行\n第二行");
  assert.equal(await css(text, "fontWeight"), "700");
  assert.equal(await css(text, "fontStyle"), "italic");
  assert.ok((await css(text, "textDecorationLine")).includes("underline"));
  assert.equal(await css(text, "textAlign"), "center");
  assert.equal(await css(text, "alignItems"), "flex-end");
  assert.equal(await css(text, "whiteSpace"), "pre");
  await open(1);
  await dialog.getByLabel("線寬", { exact: true }).fill("4");
  await dialog.getByLabel("線型", { exact: true }).selectOption("dotted");
  await color("邊框顏色", "#ff0000");
  await dialog.getByLabel("圓角半徑", { exact: true }).fill("20");
  await close();
  assert.equal(
    await css(element(1).locator("div").first(), "borderTopWidth"),
    "4px",
  );
  assert.equal(
    await css(element(1).locator("div").first(), "borderTopStyle"),
    "dotted",
  );
  await open(2);
  await dialog.getByLabel("線寬", { exact: true }).fill("3");
  await color("邊框顏色", "#ffff00");
  await dialog.getByLabel("填滿背景色", { exact: true }).uncheck();
  await close();
  assert.equal(
    await css(element(2).locator("div").first(), "backgroundColor"),
    "rgba(0, 0, 0, 0)",
  );
  await open(3);
  await dialog.getByLabel("線寬", { exact: true }).fill("2");
  await dialog.getByLabel("線型", { exact: true }).selectOption("dashed");
  await color("邊框顏色", "#00ffff");
  await close();
  assert.equal(
    await css(element(3).locator("div div"), "borderTopStyle"),
    "dashed",
  );
  await open(4);
  await page
    .locator('input[type="file"]')
    .nth(1)
    .setInputFiles({
      name: "sample.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRzUAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await element(4).locator("img").waitFor();
  for (const fit of ["cover", "fill", "none", "contain"]) {
    await dialog.getByLabel("縮放模式", { exact: true }).selectOption(fit);
    assert.equal(await css(element(4).locator("img"), "objectFit"), fit);
  }
  await dialog.getByLabel("圖片位置", { exact: true }).selectOption("top");
  await close();
  await open(5);
  await color("滑鼠移入背景色", "#ff0000");
  await color("滑鼠移入文字色", "#ffffff");
  await color("按下背景色", "#00ff00");
  await color("按下文字色", "#000000");
  await color("停用背景色", "#222222");
  await color("停用文字色", "#aaaaaa");
  await close();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  const saved = await (
    await page.request.get(server.base + "/api/projects/" + project.id)
  ).json();
  assert.equal(saved.project.screens[0].elements[0].lineHeight, 1.5);
  assert.equal(saved.project.screens[0].elements[1].borderStyle, "dotted");
  assert.equal(saved.project.screens[0].elements[4].imagePosition, "top");
  assert.equal(
    saved.project.screens[0].elements[5].buttonPressedBackground,
    "#00ff00",
  );
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  assert.equal(await css(text, "textAlign"), "center");
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  const button = element(5).getByRole("button");
  assert.equal(await button.isDisabled(), true);
  assert.equal(await css(button, "backgroundColor"), "rgb(34, 34, 34)");
  await page
    .locator(".watch-row")
    .filter({ hasText: "按鈕啟用" })
    .getByRole("button")
    .click();
  assert.equal(await button.isEnabled(), true);
  await button.hover();
  assert.equal(await css(button, "backgroundColor"), "rgb(255, 0, 0)");
  await page.mouse.down();
  assert.equal(await css(button, "backgroundColor"), "rgb(0, 255, 0)");
  await page.mouse.up();
  assert.equal(await page.getByLabel("執行值 按鈕計數").inputValue(), "1");
  await page.keyboard.press("Escape");
  await open(0);
  await dialog.getByLabel("綁定變數", { exact: true }).selectOption("label");
  await close();
  assert.equal(await text.innerText(), "即時文字");
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.getByLabel("執行值 文字資料").fill("更新文字");
  assert.equal(await text.innerText(), "更新文字");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: text typography and binding, shape borders, image fit, live button states, SQLite save/reopen and browser errors.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(temp, { recursive: true, force: true });
}
