import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { newProject, makeElement } from "../src/model.ts";

const temp = mkdtempSync(join(tmpdir(), "viewgp-alarms-"));
const port = Number(process.env.VIEWX_TEST_PORT) || 3191;
let server, browser;
const errors = [];
const p = newProject();
p.name = "Global Word Alarms";
p.screens[0].name = "Home";
p.variables = [
  { id: "word", name: "Alarm Word", type: "number", initial: 0 },
  { id: "mask", name: "Alarm Mask", type: "number", initial: 1 },
  { id: "legacy", name: "Legacy Alarm", type: "boolean", initial: false },
];
p.alarmAreas = [
  {
    id: "area",
    name: "Motor",
    group: "Production",
    variableId: "word",
    maskVariableId: "mask",
    enabled: true,
    updateIntervalMs: 200,
    rules: [
      { id: "r0", bit: 0, message: "Lube failure", severity: "warning" },
      { id: "r15", bit: 15, message: "Emergency stop", severity: "critical" },
    ],
  },
];
p.alarmTicker = { enabled: true, position: "top", intervalMs: 1000 };
p.screens[0].elements = [
  {
    ...makeElement("alarm", 20, 70),
    name: "Global list",
    text: "Global list",
    width: 700,
    alarmSource: "global",
    alarmRules: [],
  },
  {
    ...makeElement("alarm", 20, 330),
    name: "Local list",
    text: "Local list",
    width: 700,
    alarmRules: [
      {
        id: "legacy-rule",
        message: "Legacy event",
        variableId: "legacy",
        operator: "true",
        severity: "warning",
      },
    ],
  },
];
p.screens.push({
  ...p.screens[0],
  id: "overview",
  name: "Overview",
  elements: [],
});
async function until(fn) {
  for (let i = 0; i < 100; i++) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Alarm persistence condition timed out");
}
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
    viewport: { width: 1500, height: 1100 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(server.base);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "alarms.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByRole("status").filter({ hasText: "專案已匯入" }).waitFor();
  async function center() {
    await page.getByRole("button", { name: "檔案", exact: true }).click();
    await page
      .getByRole("button", { name: "全域警報管理與歷史", exact: true })
      .click();
  }
  await center();
  const dialog = page.getByRole("dialog", { name: "全域警報管理與歷史" });
  assert.equal(
    await dialog.getByLabel("警報 Word", { exact: true }).inputValue(),
    "word",
  );
  assert.equal(
    await dialog.getByLabel("遮罩 Word", { exact: true }).inputValue(),
    "mask",
  );
  await dialog.getByRole("button", { name: "新增警報區", exact: true }).click();
  assert.ok(
    (
      await dialog.getByLabel("警報區名稱", { exact: true }).inputValue()
    ).startsWith("警報區"),
  );
  await dialog.getByRole("button", { name: "刪除警報區", exact: true }).click();
  await dialog.getByRole("button", { name: "關閉對話框", exact: true }).click();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  const [saved] = await (
    await page.request.get(server.base + "/api/projects")
  ).json();
  const history = async (filters = "") =>
    (
      await page.request.get(
        `${server.base}/api/projects/${saved.id}/alarm-events${filters}`,
      )
    ).json();
  let project = await (
    await page.request.get(`${server.base}/api/projects/${saved.id}`)
  ).json();
  assert.equal(project.project.alarmAreas[0].rules[1].bit, 15);
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  await page.getByLabel("執行值 Alarm Word", { exact: true }).fill("32769");
  await page
    .locator(".global-alarm-ticker")
    .getByText("1 項發生中", { exact: true })
    .waitFor();
  await page
    .locator(".global-alarm-ticker")
    .getByText("[Production] Emergency stop", { exact: true })
    .waitFor();
  await until(async () => (await history()).total === 1);
  assert.equal(
    await page
      .locator(".alarm-widget")
      .first()
      .getByRole("button", { name: "確認 Emergency stop", exact: true })
      .count(),
    1,
  );
  await page
    .locator(".global-alarm-ticker")
    .getByRole("button", { name: "警報中心", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "確認 Emergency stop", exact: true })
    .click();
  await dialog.getByRole("button", { name: "關閉對話框", exact: true }).click();
  await until(async () => (await history()).items[0].acknowledgedAt !== null);
  await page.getByLabel("執行值 Alarm Mask", { exact: true }).fill("32769");
  await page
    .locator(".global-alarm-ticker")
    .getByText("0 項發生中", { exact: true })
    .waitFor();
  await until(
    async () => (await history()).items[0].clearedReason === "masked",
  );
  await page.getByLabel("執行值 Alarm Mask", { exact: true }).fill("0");
  await page
    .locator(".global-alarm-ticker")
    .getByText("2 項發生中", { exact: true })
    .waitFor();
  await page
    .locator(".watch-row")
    .filter({ hasText: "Legacy Alarm" })
    .getByRole("button")
    .click();
  await page
    .locator(".global-alarm-ticker")
    .getByText("3 項發生中", { exact: true })
    .waitFor();
  await page
    .locator(".screen-list button")
    .filter({ hasText: "Overview" })
    .click();
  await page
    .locator(".global-alarm-ticker")
    .getByText("3 項發生中", { exact: true })
    .waitFor();
  await until(async () => (await history()).total === 4);
  await page.keyboard.press("Escape");
  await until(async () =>
    (await history()).items.every((e) => e.clearedAt !== null),
  );
  assert.equal((await history("?severity=critical")).total, 2);
  assert.equal((await history("?group=Production")).total, 3);
  assert.equal((await history("?search=Legacy")).total, 1);
  await center();
  await dialog.getByRole("button", { name: "歷史紀錄", exact: true }).click();
  await dialog.getByText("共 4 筆 · 第 1 頁", { exact: true }).waitFor();
  await dialog.getByLabel("歷史訊息搜尋", { exact: true }).fill("Lube");
  await dialog
    .getByRole("button", { name: "查詢／重新整理", exact: true })
    .click();
  await dialog.getByText("共 1 筆 · 第 1 頁", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "關閉對話框", exact: true }).click();
  // Real backend restart: history is independent of JSON snapshots and runtime memory.
  await server.close();
  server = await startBackend(join(temp, "test.db"), port);
  await page.reload();
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  await center();
  await dialog.getByRole("button", { name: "歷史紀錄", exact: true }).click();
  await dialog.getByText("共 4 筆 · 第 1 頁", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "關閉對話框", exact: true }).click();
  // Temporary network failure and retry must preserve exactly one occurrence.
  let offline = true;
  await page.route("**/api/projects/*/alarm-events", (route) =>
    route.request().method() === "POST" && offline
      ? route.abort()
      : route.continue(),
  );
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  await page.getByLabel("執行值 Alarm Word", { exact: true }).fill("32768");
  await page.getByText("警報歷史：保存失敗", { exact: true }).waitFor();
  offline = false;
  await page.getByRole("button", { name: "重試警報歷史", exact: true }).click();
  await until(async () => (await history()).total === 5);
  await page.getByRole("button", { name: "重設模擬資料", exact: true }).click();
  await page.locator(".global-alarm-ticker").getByText("0 項發生中", { exact: true }).waitFor();
  await until(async () => (await history()).items.every((e) => e.clearedAt !== null));
  await page.keyboard.press("Escape");
  await until(async () =>
    (await history()).items.every((e) => e.clearedAt !== null),
  );
  assert.equal(
    (
      await page.request.get(
        `${server.base}/api/projects/${saved.id}/alarm-events?limit=201`,
      )
    ).status(),
    400,
  );
  const bad = {
    sessionId: "invalid",
    startedAt: 0,
    events: [
      {
        id: "bad",
        areaId: "area",
        ruleId: "rule",
        bit: 16,
        message: "bad",
        severity: "critical",
        value: 1,
        raisedAt: 1000,
      },
    ],
  };
  assert.equal(
    (
      await page.request.post(
        `${server.base}/api/projects/${saved.id}/alarm-events`,
        { data: bad },
      )
    ).status(),
    400,
  );
  await center();
  await dialog.getByRole("button", { name: "歷史紀錄", exact: true }).click();
  await dialog.getByText("共 5 筆 · 第 1 頁", { exact: true }).waitFor();
  if (process.env.VIEWX_SCREENSHOT_PATH)
    await page.screenshot({ path: process.env.VIEWX_SCREENSHOT_PATH });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: global Word bit 0/15, masking/unmasking, ticker, widget display, cross-screen monitoring, acknowledgment, SQLite history/restart/search, session end and failed-write retry without duplicates.",
  );
} finally {
  await browser?.close();
  await server?.close();
  rmSync(temp, { recursive: true, force: true });
}
