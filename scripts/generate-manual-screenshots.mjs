// Build screenshots against an isolated database. Never touches .data/viewx.db.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { newProject, makeElement, validateProject } from "../src/model.ts";
import { checkProject } from "../src/services/projectValidation.ts";
import { defaultMapping } from "../src/services/communicationRules.ts";
import { startBackend } from "./backend-test-server.mjs";
import { startModbusSimulator } from "../tests/helpers/modbus-simulator.mjs";
const directory = resolve("docs/manual"),
  images = join(directory, "images"),
  examples = join(directory, "examples");
mkdirSync(images, { recursive: true });
mkdirSync(examples, { recursive: true });
const p = newProject();
p.id = "viewgp-pump-tutorial";
p.name = "泵浦監控教學";
p.description =
  "操作手冊教學專案。預設離線模式；設備連線需另設定實際 IP 或串列埠。";
p.startScreenId = "home";
p.variables = [
  {
    id: "running",
    name: "運轉狀態",
    type: "boolean",
    initial: false,
    category: "泵浦",
  },
  {
    id: "temperature",
    name: "溫度",
    type: "number",
    initial: 26.5,
    category: "泵浦",
  },
  {
    id: "setpoint",
    name: "設定值",
    type: "number",
    initial: 35,
    category: "泵浦",
  },
  {
    id: "alarmWord",
    name: "警報 Word",
    type: "number",
    initial: 0,
    category: "警報",
  },
  {
    id: "alarmMask",
    name: "警報遮罩",
    type: "number",
    initial: 0,
    category: "警報",
  },
];
const add = (kind, id, x, y, props = {}) => ({
  ...makeElement(kind, x, y),
  id,
  name: id,
  ...props,
});
const screen = (id, name, elements, props = {}) => ({
  id,
  name,
  width: 960,
  height: 600,
  background: "#f1f4f7",
  type: "normal",
  elements,
  ...props,
});
p.assets = [
  {
    id: "infosystem",
    name: "InfoSystem 公司標誌",
    data:
      "data:image/jpeg;base64," +
      readFileSync("src/assets/infosystem-logo.jpg").toString("base64"),
  },
];
p.screens = [
  screen(
    "home",
    "主畫面",
    [
      add("rectangle", "溫度背景", 24, 106, {
        width: 280,
        height: 162,
        background: "#ffffff",
        borderColor: "#bccad6",
        borderWidth: 1,
      }),
      add("text", "溫度標題", 40, 120, {
        text: "環境溫度",
        width: 220,
        height: 30,
        fontSize: 18,
        color: "#4f6376",
      }),
      add("number", "溫度顯示", 45, 164, {
        width: 235,
        height: 65,
        fontSize: 42,
        color: "#1b6ca0",
        variableId: "temperature",
        decimals: 1,
        unit: "°C",
      }),
      add("text", "運轉標題", 330, 114, {
        text: "泵浦運轉",
        width: 200,
        height: 28,
        fontSize: 18,
        color: "#4f6376",
      }),
      add("indicator", "運轉指示燈", 350, 152, {
        width: 36,
        height: 36,
        variableId: "running",
      }),
      add("switch", "運轉開關", 426, 150, {
        width: 88,
        height: 42,
        variableId: "running",
      }),
      add("button", "啟動停止按鈕", 330, 210, {
        text: "啟動／停止",
        width: 210,
        height: 44,
        variableId: "running",
        action: "toggle",
        background: "#34698f",
      }),
      add("text", "設定值標題", 560, 114, {
        text: "目標溫度（°C）",
        width: 200,
        height: 28,
        fontSize: 18,
        color: "#4f6376",
      }),
      add("input", "目標溫度輸入", 560, 154, {
        width: 165,
        height: 42,
        variableId: "setpoint",
        inputMin: 0,
        inputMax: 100,
        inputStep: 0.5,
        color: "#254c6c",
        background: "#ffffff",
        fontSize: 22,
      }),
      add("button", "開啟設定", 560, 210, {
        text: "參數設定",
        width: 165,
        height: 44,
        action: "popup",
        targetScreenId: "settings",
        background: "#34698f",
      }),
      add("button", "開啟趨勢", 760, 210, {
        text: "趨勢檢視",
        width: 166,
        height: 44,
        action: "screen",
        targetScreenId: "trend",
        background: "#49687d",
      }),
      add("bar", "溫度長條", 38, 299, {
        width: 550,
        height: 50,
        variableId: "temperature",
        scaleMin: 0,
        scaleMax: 100,
        warningThreshold: 60,
        criticalThreshold: 80,
        showValue: true,
        background: "#ffffff",
        color: "#294c66",
      }),
      add("text", "量程提示", 620, 298, {
        text: "量程 0–100°C\n警戒 60°C／危險 80°C",
        width: 270,
        height: 56,
        fontSize: 16,
        color: "#4f6376",
      }),
      add("alarm", "全域警報清單", 24, 392, {
        text: "泵浦警報",
        width: 870,
        height: 138,
        alarmSource: "global",
        alarmRules: [],
        alarmMaxRows: 10,
        background: "#ffffff",
        color: "#30485f",
      }),
      add("text", "操作提示", 24, 552, {
        text: "教學範例｜先離線測試，再連接設備",
        width: 600,
        height: 26,
        fontSize: 14,
        color: "#64788b",
      }),
      add("image", "公司標誌", 790, 545, {
        width: 140,
        height: 40,
        imageAssetId: "infosystem",
        imageFit: "contain",
        background: "#ffffff",
      }),
    ],
    { parentScreenId: "master" },
  ),
  screen(
    "trend",
    "趨勢檢視",
    [
      add("text", "趨勢標題", 24, 87, {
        text: "溫度趨勢｜切換畫面仍持續取樣",
        width: 860,
        height: 32,
        fontSize: 20,
        color: "#3d586e",
      }),
      add("trend", "溫度趨勢", 24, 140, {
        width: 870,
        height: 280,
        variableId: "temperature",
        sampleInterval: 1000,
        historyPoints: 120,
        scaleMin: 0,
        scaleMax: 100,
        background: "#ffffff",
        color: "#365b76",
      }),
      add("button", "返回主畫面", 24, 470, {
        text: "回上一畫面",
        width: 180,
        height: 44,
        action: "previousScreen",
        background: "#49687d",
      }),
    ],
    { parentScreenId: "master" },
  ),
  screen(
    "master",
    "共用頁首",
    [
      add("rectangle", "共用標題背景", 0, 0, {
        width: 960,
        height: 72,
        background: "#dce6ee",
        borderWidth: 0,
      }),
      add("text", "共用標題", 24, 20, {
        text: "泵浦監控教學",
        width: 410,
        height: 35,
        fontSize: 24,
        color: "#274e6b",
        fontWeight: "bold",
      }),
      add("datetime", "日期時間", 620, 20, {
        width: 315,
        height: 35,
        fontSize: 16,
        color: "#274e6b",
        background: "#e9f0f5",
        dateTimeFormat: "YYYY/MM/DD HH:mm:ss",
      }),
    ],
    { type: "popup", height: 100 },
  ),
  screen(
    "settings",
    "參數設定",
    [
      add("text", "設定視窗標題", 20, 22, {
        text: "輸入目標溫度",
        width: 400,
        height: 28,
        fontSize: 22,
        color: "#315b7a",
      }),
      add("input", "Popup 目標溫度", 20, 76, {
        width: 210,
        height: 44,
        variableId: "setpoint",
        inputMin: 0,
        inputMax: 100,
        inputStep: 0.5,
        color: "#254c6c",
        background: "#ffffff",
        fontSize: 23,
      }),
      add("text", "數值範圍", 250, 82, {
        text: "0–100°C",
        width: 160,
        height: 30,
        fontSize: 18,
        color: "#5b7184",
      }),
      add("text", "輸入說明", 20, 137, {
        text: "按 Enter 或離開欄位即寫入。\n關閉視窗不會撤銷已寫入的數值。",
        width: 420,
        height: 54,
        fontSize: 14,
        color: "#5b7184",
      }),
      add("button", "關閉設定", 310, 216, {
        text: "關閉",
        width: 125,
        height: 42,
        action: "closePopup",
        background: "#34698f",
      }),
    ],
    { type: "popup", width: 460, height: 280 },
  ),
];
p.alarmAreas = [
  {
    id: "pump-alarms",
    name: "泵浦警報",
    variableId: "alarmWord",
    maskVariableId: "alarmMask",
    group: "泵浦",
    updateIntervalMs: 500,
    enabled: true,
    rules: [
      { id: "overload", bit: 0, message: "泵浦過載", severity: "critical" },
      { id: "hot", bit: 2, message: "溫度過高", severity: "warning" },
    ],
  },
];
p.alarmTicker = { enabled: true, position: "top", intervalMs: 3000 };
assert.ok(validateProject(p));
assert.deepEqual(checkProject(p), []);
writeFileSync(
  join(examples, "泵浦監控教學.json"),
  JSON.stringify(p, null, 2) + "\n",
);
const temp = mkdtempSync(join(tmpdir(), "viewgp-manual-"));
let server, browser, sim;
const shots = [];
try {
  server = await startBackend(
    join(temp, "manual.db"),
    Number(process.env.VIEWX_TEST_PORT) || 3186,
  );
  sim = await startModbusSimulator();
  sim.holding[10] = 0;
  sim.holding[11] = 0;
  sim.holding[12] = 35;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.VIEWX_BROWSER_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Taipei",
    locale: "zh-TW",
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const wait = async (check, label) => {
    for (let n = 0; n < 120; n++) {
      if (await check()) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw Error("Manual capture timed out: " + label);
  };
  const menu = async (name, item) => {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: item, exact: true }).click();
  };
  const close = async () => {
    await page.getByRole("button", { name: "關閉對話框", exact: true }).click();
  };
  const save = async () => {
    await page.getByRole("button", { name: "儲存專案", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "已儲存至 SQLite" })
      .waitFor();
  };
  const select = async (name) =>
    page.locator(".screen-list .screen-row").filter({ hasText: name }).click();
  const shot = async (file, caption, locator = page) => {
    await locator.screenshot({
      path: join(images, file),
      animations: "disabled",
    });
    shots.push({ file, caption });
  };
  await page.goto(server.base);
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "泵浦監控教學.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByRole("status").filter({ hasText: "專案已匯入" }).waitFor();
  await save();
  await page.evaluate(() => {
    const callouts = [
      [".app-header", 1, 480, 12],
      [".menu-bar", 2, 500, 10],
      [".toolbar", 3, 570, 14],
      [".widget-toolbar", 4, 620, 18],
      [".project-tree", 5, 183, 18],
      [".screen-frame", 6, 350, 210],
      [".right-panel", 7, 240, 12],
      [".status-bar", 8, 700, 8],
    ];
    for (const [selector, text, dx, dy] of callouts) {
      const el = document.querySelector(selector);
      const r = el.getBoundingClientRect();
      const badge = document.createElement("span");
      badge.className = "manual-callout";
      badge.textContent = String(text);
      badge.style.cssText =
        "position:fixed;left:" +
        Math.min(r.left + dx, innerWidth - 30) +
        "px;top:" +
        Math.min(r.top + dy - 7, innerHeight - 28) +
        "px;z-index:40;background:#135f98;color:white;border:2px solid white;width:26px;height:26px;border-radius:50%;font:bold 14px Arial;display:grid;place-items:center;box-shadow:0 1px 4px #0005;pointer-events:none";
      document.body.appendChild(badge);
    }
  });
  await shot("01-workspace.png", "工程工作台八個區域");
  await page.evaluate(() =>
    document.querySelectorAll(".manual-callout").forEach((e) => e.remove()),
  );
  await menu("檔案", "專案設定");
  await shot(
    "02-project.png",
    "專案名稱、起始畫面與自動儲存",
    page.getByRole("dialog", { name: "專案設定", exact: true }),
  );
  await close();
  await menu("變數", "新增變數");
  const vd = page.getByRole("dialog", { name: "變數設定", exact: true });
  await vd.getByLabel("變數名稱").fill("教學溫度");
  await vd.getByLabel("初始值").fill("26.5");
  await shot("03-variable.png", "新增數值變數", vd);
  await close();
  await page
    .locator(".left-tabs")
    .getByRole("button", { name: /變數/ })
    .click();
  await shot(
    "04-variables.png",
    "專案變數清單",
    page.locator(".variable-panel"),
  );
  await page
    .locator(".left-tabs")
    .getByRole("button", { name: "元件庫", exact: true })
    .click();
  await page.locator(".layer-name").filter({ hasText: "溫度顯示" }).click();
  await page
    .locator(".inspector-navigation")
    .getByRole("button", { name: "資料", exact: true })
    .click();
  await shot(
    "05-number.png",
    "數值顯示與資料綁定",
    page.locator('.right-panel [data-inspector-group="data"]'),
  );
  await page.locator(".layer-name").filter({ hasText: "啟動停止按鈕" }).click();
  await page
    .locator(".inspector-navigation")
    .getByRole("button", { name: "資料", exact: true })
    .click();
  await shot(
    "06-button.png",
    "按鈕動作與變數綁定",
    page.locator('.right-panel [data-inspector-group="data"]'),
  );
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  await page.getByRole("button", { name: "啟動／停止", exact: true }).click();
  await page.getByLabel("執行值 溫度", { exact: true }).fill("70");
  await shot("07-offline.png", "離線模擬、數值與變數監看");
  await page.getByRole("button", { name: "參數設定", exact: true }).click();
  await page.getByLabel("Popup 目標溫度", { exact: true }).fill("40");
  await page.getByLabel("Popup 目標溫度", { exact: true }).press("Enter");
  await shot(
    "08-popup.png",
    "Popup 輸入設定值",
    page.locator(".runtime-popup"),
  );
  await page.getByRole("button", { name: "關閉", exact: true }).click();
  await page.getByRole("button", { name: "趨勢檢視", exact: true }).click();
  await new Promise((r) => setTimeout(r, 1500));
  await shot("09-trend.png", "趨勢畫面與返回按鈕");
  await page.getByRole("button", { name: "停止執行", exact: true }).click();
  await select("趨勢檢視");
  await page.keyboard.press("Escape");
  await shot("10-inheritance.png", "子畫面指定共用頁首，圖層顯示繼承來源");
  await menu("畫面", "重新命名 / 畫面設定");
  await shot(
    "11-screen.png",
    "畫面類別、尺寸與繼承設定",
    page.getByRole("dialog", { name: "畫面設定", exact: true }),
  );
  await close();
  await select("主畫面");
  await menu("檔案", "全域警報管理與歷史");
  await shot(
    "12-alarm-settings.png",
    "Word、遮罩、位元訊息及跑馬燈",
    page.getByRole("dialog", { name: "全域警報管理與歷史", exact: true }),
  );
  await close();
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  await page.getByLabel("執行值 警報 Word", { exact: true }).fill("5");
  await wait(
    async () =>
      (await page.locator(".global-alarm-ticker").innerText()).includes(
        "2 項發生中",
      ),
    "two alarms",
  );
  await page.getByRole("button", { name: "開啟警報管理", exact: true }).click();
  const ad = page.getByRole("dialog", {
    name: "全域警報管理與歷史",
    exact: true,
  });
  await ad.getByRole("button", { name: "即時警報", exact: true }).click();
  await ad.getByRole("button", { name: "確認 泵浦過載", exact: true }).click();
  await shot("13-alarm-live.png", "即時警報、確認與發生值", ad);
  await close();
  await page.getByLabel("執行值 警報遮罩", { exact: true }).fill("4");
  await wait(
    async () =>
      (await page.locator(".global-alarm-ticker").innerText()).includes(
        "1 項發生中",
      ),
    "mask",
  );
  await page.getByLabel("執行值 警報 Word", { exact: true }).fill("0");
  await wait(
    async () =>
      (await page.locator(".global-alarm-ticker").innerText()).includes(
        "0 項發生中",
      ),
    "alarm recovery",
  );
  await page.getByRole("button", { name: "停止執行", exact: true }).click();
  await page.getByRole("button", { name: "開啟警報管理", exact: true }).click();
  await ad.getByRole("button", { name: "歷史紀錄", exact: true }).click();
  await ad.getByRole("button", { name: "查詢／重新整理", exact: true }).click();
  await wait(
    async () => (await ad.innerText()).includes("遮罩抑制"),
    "saved history",
  );
  await shot("14-alarm-history.png", "查詢警報歷史與解除原因", ad);
  await close();
  await page.getByRole("button", { name: "開啟通訊設定", exact: true }).click();
  const cd = page.getByRole("dialog", { name: "通訊設備與標籤", exact: true });
  await cd.getByRole("button", { name: "新增設備", exact: true }).click();
  await cd.getByLabel("設備名稱").fill("PLC 1");
  await cd.getByLabel("IP／主機名稱").fill("192.168.1.50");
  await shot("15-tcp.png", "Modbus TCP 設備設定範例", cd);
  await cd.getByRole("button", { name: "標籤映射", exact: true }).click();
  await cd.getByLabel("搜尋通訊標籤").fill("溫度");
  const tag = cd.locator(".communication-tag").filter({
    has: page.getByRole("heading", { name: "溫度 number", exact: true }),
  });
  await tag
    .getByLabel("資料來源", { exact: true })
    .selectOption({ label: "PLC 1 · TCP" });
  await tag.getByLabel("倍率", { exact: true }).fill("0.1");
  await tag.getByLabel("讀寫權限", { exact: true }).selectOption("readWrite");
  await shot("16-mapping.png", "溫度標籤位址、倍率及讀寫權限", cd);
  await cd.getByRole("button", { name: "設備設定", exact: true }).click();
  await cd.getByLabel("通訊協定").selectOption("rtu");
  await cd.getByLabel("串列埠").fill("/dev/ttyUSB0");
  await shot("17-rtu.png", "Modbus RTU 串列埠設定", cd);
  await cd.getByLabel("通訊協定").selectOption("tcp");
  await cd.getByLabel("IP／主機名稱").fill("127.0.0.1");
  await cd.getByLabel("TCP Port").fill(String(sim.port));
  await cd.getByLabel("執行資料來源").selectOption("online");
  await cd.getByRole("button", { name: "完成", exact: true }).click();
  await save();
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  await wait(
    async () =>
      (await page.locator(".connection").innerText()).includes("設備連線"),
    "live TCP",
  );
  await page.getByRole("button", { name: "開啟通訊設定", exact: true }).click();
  await shot("18-connection.png", "設備連線狀態及最後成功時間", cd);
  await close();
  await shot("19-online.png", "設備監看與唯讀即時值");
  await page.getByRole("button", { name: "停止執行", exact: true }).click();
  await menu("檔案", "版本紀錄與還原");
  const hd = page.getByRole("dialog", { name: "版本紀錄與還原", exact: true });
  await hd.locator(".version-list button").last().click();
  await hd.getByRole("button", { name: "還原此版本", exact: true }).waitFor();
  await shot("20-versions.png", "版本選取與還原前預覽", hd);
  await close();
  await menu("檔案", "圖片資源管理");
  await shot(
    "21-images.png",
    "圖片資源與引用數",
    page.getByRole("dialog", { name: "圖片資源管理", exact: true }),
  );
  await close();
  await menu("執行", "專案檢查");
  await shot(
    "22-check.png",
    "專案檢查結果",
    page.getByRole("dialog", { name: "專案檢查", exact: true }),
  );
  await close();
  assert.deepEqual(errors, []);
  writeFileSync(
    join(directory, "screenshots.json"),
    JSON.stringify(
      {
        baseline: "4d3fbf1",
        viewport: { width: 1440, height: 1000 },
        timezone: "Asia/Taipei",
        screenshots: shots,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Captured " +
      shots.length +
      " real ViewGP screenshots; tutorial JSON and browser flows validated.",
  );
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
  if (sim) await sim.close();
  rmSync(temp, { recursive: true, force: true });
}
