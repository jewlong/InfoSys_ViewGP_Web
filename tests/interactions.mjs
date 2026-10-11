import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { makeElement, newProject } from "../src/model.ts";
const temp = mkdtempSync(join(tmpdir(), "viewx-interactions-"));
let server, browser;
try {
  server = await startBackend(join(temp, "interaction.db"), 3195);
  const project = newProject();
  project.name = "資料互動測試";
  project.variables = [
    { id: "amount", name: "設定數量", type: "number", initial: 5 },
    { id: "enabled", name: "允許輸入", type: "boolean", initial: true },
    { id: "flag", name: "旗標", type: "boolean", initial: false },
    { id: "message", name: "訊息", type: "string", initial: "初始訊息" },
  ];
  const button = (text, x, y, variableId, action, actionValue = "1") => ({
    ...makeElement("button", x, y),
    text,
    variableId,
    action,
    actionValue,
  });
  project.screens[0].elements = [
    { ...makeElement("number", 40, 40), variableId: "amount" },
    {
      ...makeElement("input", 40, 110),
      name: "數值設定",
      variableId: "amount",
      enabledId: "enabled",
    },
    button("設定數量", 220, 110, "amount", "set", "8"),
    button("減少數量", 220, 180, "amount", "increment", "-0.5"),
    button("重設數量", 220, 250, "amount", "reset"),
    button("切換旗標", 440, 110, "flag", "toggle"),
    button("設定旗標", 440, 180, "flag", "set", "true"),
    button("設定訊息", 660, 110, "message", "set", "完成"),
    button("重設訊息", 660, 180, "message", "reset"),
    { ...makeElement("text", 660, 40), variableId: "message" },
    {
      ...button("下一頁", 440, 250, undefined, "screen"),
      targetScreenId: "next",
    },
  ];
  project.screens.push({
    id: "next",
    name: "第二頁",
    width: 960,
    height: 600,
    background: "#101c2e",
    elements: [{ ...makeElement("text", 40, 40), text: "切換成功" }],
  });
  assert.equal(
    (
      await fetch(server.base + "/api/projects/" + project.id, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, revision: 0 }),
      })
    ).status,
    200,
  );
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
  await open(0);
  assert.equal(
    await dialog
      .getByLabel("綁定變數", { exact: true })
      .locator("option")
      .count(),
    2,
  );
  await dialog.getByLabel("小數位數", { exact: true }).fill("2");
  await dialog.getByLabel("千分位分隔", { exact: true }).uncheck();
  await dialog.getByLabel("數值前綴", { exact: true }).fill("$");
  await dialog.getByLabel("單位", { exact: true }).fill("PCS");
  await dialog.getByLabel("顯示格式", { exact: true }).selectOption("percent");
  assert.equal(
    await element(0).locator(".visual-text").innerText(),
    "$500.00% PCS",
  );
  await dialog.getByLabel("顯示格式", { exact: true }).selectOption("decimal");
  await close();
  await open(1);
  await dialog.getByLabel("最小值", { exact: true }).fill("0");
  await dialog.getByLabel("最大值", { exact: true }).fill("10");
  await dialog.getByLabel("輸入步距", { exact: true }).fill("0.5");
  await close();
  await open(6);
  assert.equal(
    await dialog
      .getByLabel("設定值", { exact: true })
      .locator("option")
      .count(),
    2,
  );
  await dialog.getByLabel("設定值", { exact: true }).selectOption("false");
  await close();
  await open(4);
  await dialog.getByLabel("動作", { exact: true }).selectOption("set");
  await dialog.getByLabel("設定值", { exact: true }).fill("9");
  await dialog.getByLabel("動作", { exact: true }).selectOption("reset");
  await close();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  assert.equal(
    await element(0).locator(".visual-text").innerText(),
    "$5.00 PCS",
  );
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  const input = page.getByRole("spinbutton", { name: "數值設定", exact: true });
  const amount = page.getByLabel("執行值 設定數量");
  await input.fill("1.5");
  assert.equal(
    await amount.inputValue(),
    "5",
    "draft does not change variable",
  );
  await input.press("Enter");
  assert.equal(await amount.inputValue(), "1.5");
  await input.fill("11");
  await input.press("Enter");
  await page.getByRole("alert").filter({ hasText: "不可大於 10" }).waitFor();
  assert.equal(await amount.inputValue(), "1.5");
  assert.equal(await input.inputValue(), "1.5");
  await input.fill("1.2");
  await input.press("Enter");
  await page.getByRole("alert").filter({ hasText: "步距" }).waitFor();
  assert.equal(await amount.inputValue(), "1.5");
  await input.fill("");
  await input.press("Enter");
  await page.getByRole("alert").filter({ hasText: "不能留白" }).waitFor();
  assert.equal(await amount.inputValue(), "1.5");
  await input.fill("6");
  await input.press("Escape");
  assert.equal(await input.inputValue(), "1.5");
  assert.equal(await amount.inputValue(), "1.5");
  await input.fill("2");
  await page
    .locator(".watch-row")
    .filter({ hasText: "允許輸入" })
    .getByRole("button")
    .click();
  assert.equal(await amount.inputValue(), "2", "blur commits valid value");
  assert.equal(await input.isDisabled(), true);
  await page
    .locator(".watch-row")
    .filter({ hasText: "允許輸入" })
    .getByRole("button")
    .click();
  const click = (name) =>
    page
      .locator(".design-canvas")
      .getByRole("button", { name, exact: true })
      .click();
  await click("設定數量");
  assert.equal(await amount.inputValue(), "8");
  await click("減少數量");
  assert.equal(await amount.inputValue(), "7.5");
  await click("重設數量");
  assert.equal(await amount.inputValue(), "5");
  await click("切換旗標");
  assert.equal(
    await page
      .locator(".watch-row")
      .filter({ hasText: "旗標" })
      .getByRole("button")
      .innerText(),
    "TRUE",
  );
  await click("設定旗標");
  assert.equal(
    await page
      .locator(".watch-row")
      .filter({ hasText: "旗標" })
      .getByRole("button")
      .innerText(),
    "FALSE",
  );
  await click("設定訊息");
  assert.equal(await page.getByLabel("執行值 訊息").inputValue(), "完成");
  await click("重設訊息");
  assert.equal(await page.getByLabel("執行值 訊息").inputValue(), "初始訊息");
  await click("下一頁");
  await page
    .locator(".design-canvas")
    .getByText("切換成功", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  // Invalid imported bindings stay visible and block preview with a useful diagnostic.
  const invalid = structuredClone(project);
  invalid.screens[0].elements[0].variableId = "flag";
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "invalid.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(invalid)),
    });
  await page.getByRole("status").filter({ hasText: "專案已匯入" }).waitFor();
  await open(0);
  assert.ok(
    (await dialog.getByLabel("綁定變數", { exact: true }).innerText()).includes(
      "類型不符",
    ),
  );
  await close();
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.getByRole("dialog", { name: "專案檢查", exact: true }).waitFor();
  assert.ok(
    (
      await page
        .getByRole("dialog", { name: "專案檢查", exact: true })
        .innerText()
    ).includes("綁定類型不符"),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: number formats, binding filters, input commit/range/step/cancel/disable, typed button actions, navigation, diagnostics and SQLite reopen.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(temp, { recursive: true, force: true });
}
