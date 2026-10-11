import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { makeElement, newProject } from "../src/model.ts";
const temp = mkdtempSync(join(tmpdir(), "viewx-advanced-"));
let server, browser;
try {
  server = await startBackend(join(temp, "advanced.db"), 3194);
  const project = newProject();
  project.name = "進階元件測試";
  project.variables = [
    { id: "temperature", name: "模擬溫度", type: "number", initial: 25 },
    { id: "fault", name: "設備故障", type: "boolean", initial: false },
  ];
  const mainId = project.startScreenId;
  project.screens.push({
    id: "other",
    name: "第二頁",
    width: 960,
    height: 600,
    background: "#101c2e",
    elements: [
      {
        ...makeElement("button", 40, 40),
        text: "返回主畫面",
        action: "screen",
        targetScreenId: mainId,
      },
    ],
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
    viewport: { width: 1600, height: 1100 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto(server.base);
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  const properties = page.locator(".right-panel");
  async function add(name, x, y) {
    await page
      .locator(".component-grid")
      .getByRole("button", { name, exact: true })
      .click();
    await properties.getByLabel("X 座標", { exact: true }).fill(String(x));
    await properties.getByLabel("Y 座標", { exact: true }).fill(String(y));
  }
  await add("儀表", 20, 20);
  await properties.getByLabel("警戒門檻", { exact: true }).fill("60");
  await properties.getByLabel("危險門檻", { exact: true }).fill("90");
  await properties.getByLabel("小數位數", { exact: true }).fill("1");
  await properties.getByLabel("單位", { exact: true }).fill("°C");
  await add("長條顯示", 20, 240);
  await properties
    .getByLabel("長條方向", { exact: true })
    .selectOption("vertical");
  await properties.getByLabel("高度", { exact: true }).fill("200");
  await add("趨勢圖", 280, 20);
  await properties.getByLabel("取樣間隔", { exact: true }).fill("100");
  await properties.getByLabel("保留點數", { exact: true }).fill("10");
  await add("警報清單", 280, 260);
  const rule1 = properties.locator(".alarm-rule-fields").nth(0);
  await rule1.getByLabel("警報訊息", { exact: true }).fill("設備故障警報");
  await properties
    .getByRole("button", { name: "新增警報規則", exact: true })
    .click();
  const rule2 = properties.locator(".alarm-rule-fields").nth(1);
  await rule2
    .getByLabel("警報變數", { exact: true })
    .selectOption("temperature");
  await rule2.getByLabel("警報訊息", { exact: true }).fill("高溫警報");
  await rule2.getByLabel("警報門檻", { exact: true }).fill("80");
  await rule2.getByLabel("警報等級", { exact: true }).selectOption("critical");
  // Alarm rules protect variable deletion, including references outside variableId.
  await page
    .locator(".left-tabs")
    .getByRole("button", { name: /變數/ })
    .click();
  await page
    .getByRole("button", { name: "刪除 設備故障", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "此變數仍被元件引用" })
    .waitFor();
  assert.equal(await page.locator(".variable-card").count(), 2);
  await page
    .locator(".left-tabs")
    .getByRole("button", { name: "元件庫", exact: true })
    .click();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  const saved = await (
    await page.request.get(server.base + "/api/projects/" + project.id)
  ).json();
  assert.deepEqual(
    saved.project.screens[0].elements.map((e) => e.kind),
    ["gauge", "bar", "trend", "alarm"],
  );
  assert.equal(saved.project.screens[0].elements[2].sampleInterval, 100);
  assert.equal(
    saved.project.screens[0].elements[3].alarmRules[1].threshold,
    80,
  );
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  assert.equal(await page.locator(".gauge-value").textContent(), "25.0 °C");
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector(".trend-line")?.getAttribute("data-samples"),
      ) >= 2,
  );
  assert.equal(
    await page.locator(".bar-fill").getAttribute("data-ratio"),
    "0.25",
  );
  assert.equal(
    await page.locator(".gauge-needle").getAttribute("data-ratio"),
    "0.25",
  );
  // Sampling and alarms keep running while their screen is not visible.
  await page
    .locator(".screen-list")
    .getByRole("button", { name: /第二頁/ })
    .click();
  await page.getByLabel("執行值 模擬溫度").fill("95");
  await page
    .locator(".watch-row")
    .filter({ hasText: "設備故障" })
    .getByRole("button")
    .click();
  await page.waitForTimeout(650);
  await page
    .locator(".design-canvas")
    .getByRole("button", { name: "返回主畫面", exact: true })
    .click();
  assert.ok(
    Number(await page.locator(".trend-line").getAttribute("data-samples")) >= 5,
  );
  assert.equal(
    await page.locator(".gauge-needle").getAttribute("data-ratio"),
    "0.95",
  );
  assert.equal(await page.locator(".gauge-value").textContent(), "95.0 °C");
  assert.equal(
    await page.locator(".gauge-widget path").nth(1).getAttribute("stroke"),
    "#ef4444",
  );
  const alarm = page.locator(".alarm-widget");
  const hot = alarm.locator("tbody tr").filter({ hasText: "高溫警報" });
  const fault = alarm.locator("tbody tr").filter({ hasText: "設備故障警報" });
  await hot.waitFor();
  await fault.waitFor();
  assert.equal(await hot.getAttribute("data-severity"), "critical");
  await hot.getByRole("button", { name: "確認 高溫警報", exact: true }).click();
  assert.ok((await hot.innerText()).includes("已確認"));
  assert.ok(
    (await hot.innerText()).includes("發生中"),
    "acknowledgment does not clear an active condition",
  );
  await page.getByLabel("執行值 模擬溫度").fill("40");
  await hot.getByText("已解除", { exact: true }).waitFor();
  await alarm
    .getByRole("checkbox", { name: "警報清單只看發生中", exact: true })
    .check();
  assert.equal(await hot.count(), 0);
  await alarm
    .getByRole("checkbox", { name: "警報清單只看發生中", exact: true })
    .uncheck();
  await page.getByLabel("執行值 模擬溫度").fill("110");
  await page.waitForFunction(
    () =>
      document.querySelector(".gauge-needle")?.getAttribute("data-ratio") ===
      "1",
  );
  assert.equal(await page.locator(".gauge-value").textContent(), "110.0 °C");
  assert.equal(await hot.count(), 2, "reactivation creates another occurrence");
  await page.waitForFunction(
    () =>
      document.querySelector(".trend-line")?.getAttribute("data-samples") ===
      "10",
  );
  await page.getByRole("button", { name: "重設模擬資料", exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector(".gauge-needle")?.getAttribute("data-ratio") ===
      "0.25",
  );
  assert.equal(await alarm.locator("tbody tr[data-severity]").count(), 0);
  assert.ok(
    Number(await page.locator(".trend-line").getAttribute("data-samples")) <
      10 || (await page.locator(".trend-line").count()) === 0,
  );
  await page.keyboard.press("Escape");
  await page
    .locator(".layers-list")
    .getByRole("button", { name: "儀表", exact: true })
    .click();
  await properties.getByLabel("量程最小值", { exact: true }).fill("100");
  await page.getByRole("button", { name: "預覽", exact: true }).click();
  const check = page.getByRole("dialog", { name: "專案檢查", exact: true });
  await check.waitFor();
  assert.ok((await check.innerText()).includes("量程最大值須大於最小值"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: advanced widget creation/configuration, SQLite reopen, gauge/bar scaling, bounded off-screen trend sampling, alarm activation/acknowledgment/clear/reactivation, reset and validation.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(temp, { recursive: true, force: true });
}
