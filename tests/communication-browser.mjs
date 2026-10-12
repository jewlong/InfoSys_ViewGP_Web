import assert from "node:assert/strict";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { startBackend } from "../scripts/backend-test-server.mjs";
import { communicationProject } from "./helpers/modbus-fixture.mjs";
import { startModbusSimulator } from "./helpers/modbus-simulator.mjs";
import { makeElement, validateProject } from "../src/model.ts";
import { defaultMapping } from "../src/services/communicationRules.ts";

const temp = mkdtempSync(join(tmpdir(), "viewgp-modbus-"));
let server, browser, simulator, serial, serialPort;
async function until(check, label = "condition") {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Timed out: " + label);
}
try {
  simulator = await startModbusSimulator();
  server = await startBackend(
    join(temp, "test.db"),
    Number(process.env.VIEWX_TEST_PORT) || 3190,
  );
  const base = server.base;
  const post = (path, body) =>
    fetch(base + "/api/communication/" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const p = communicationProject(simulator.port);
  p.variables.find((v) => v.id === "count").modbus = {
    ...defaultMapping("plc", "number"),
    address: 10,
  };
  p.variables.find((v) => v.id === "target").modbus = {
    ...defaultMapping("plc", "number"),
    address: 11,
  };
  p.variables.push({
    id: "float",
    name: "浮點",
    type: "number",
    initial: 0,
    modbus: {
      ...defaultMapping("plc", "number"),
      address: 20,
      dataType: "float32",
      wordOrder: "lowFirst",
      access: "readWrite",
    },
  });
  p.variables.push({
    id: "input",
    name: "Input",
    type: "number",
    initial: 0,
    modbus: { ...defaultMapping("plc", "number"), area: "inputRegister" },
  });
  p.variables.push({
    id: "discrete",
    name: "Discrete",
    type: "boolean",
    initial: false,
    modbus: { ...defaultMapping("plc", "boolean"), area: "discreteInput" },
  });
  p.alarmAreas = [
    {
      id: "area",
      name: "PLC Alarm",
      variableId: "count",
      maskVariableId: "target",
      group: "PLC",
      enabled: true,
      updateIntervalMs: 100,
      rules: [
        {
          id: "bit0",
          bit: 0,
          message: "PLC bit 0 alarm",
          severity: "critical",
        },
      ],
    },
  ];
  p.alarmTicker = { enabled: true, position: "top", intervalMs: 1000 };
  p.screens[0].elements = [
    {
      ...makeElement("number", 20, 20),
      name: "溫度顯示",
      variableId: "temperature",
    },
    {
      ...makeElement("input", 240, 20),
      name: "溫度設定",
      variableId: "temperature",
    },
    {
      ...makeElement("switch", 480, 20),
      name: "運轉控制",
      variableId: "running",
    },
    {
      ...makeElement("button", 620, 20),
      name: "唯讀操作",
      text: "唯讀操作",
      variableId: "count",
      action: "increment",
      actionValue: "1",
    },
    {
      ...makeElement("button", 620, 90),
      name: "點動操作",
      text: "點動操作",
      variableId: "running",
      action: "momentary",
    },
    {
      ...makeElement("alarm", 20, 180),
      name: "PLC Alarms",
      alarmSource: "global",
      alarmRules: [],
      width: 700,
    },
  ];
  assert.ok(validateProject(p));
  const save = await fetch(base + "/api/projects/" + p.id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project: p, revision: 0 }),
  });
  assert.equal(save.status, 200);
  assert.deepEqual(
    (await (await fetch(base + "/api/projects/" + p.id)).json()).project,
    p,
  );
  // Start, read every Modbus data area, write and read back through actual TCP.
  let r = await post("sessions", { project: p });
  assert.equal(r.status, 200);
  const id = (await r.json()).sessionId;
  const get = async () =>
    (await fetch(base + "/api/communication/sessions/" + id)).json();
  await until(
    async () => (await get()).tags.temperature?.quality === "good",
    "TCP first sample",
  );
  let snapshot = await get();
  assert.equal(snapshot.tags.temperature.value, 26.5);
  assert.equal(snapshot.tags.input.value, 77);
  assert.equal(snapshot.tags.discrete.value, true);
  r = await post("sessions/" + id + "/write", {
    variableId: "temperature",
    value: 31.2,
  });
  assert.equal(r.status, 200);
  assert.ok(Math.abs((await r.json()).value - 31.2) < 1e-9);
  assert.equal(simulator.holding[0], 312);
  assert.equal(
    (await post("sessions/" + id + "/write", { variableId: "count", value: 2 }))
      .status,
    400,
  );
  assert.equal(
    (
      await post("sessions/" + id + "/write", {
        variableId: "temperature",
        value: 31.25,
      })
    ).status,
    400,
  );
  r = await post("sessions/" + id + "/write", {
    variableId: "float",
    value: -12.5,
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).value, -12.5);
  r = await post("sessions/" + id + "/write", {
    variableId: "running",
    value: true,
  });
  assert.equal(r.status, 200);
  assert.equal(simulator.coils[0], 1);
  // Reads reconnect; faults invalidate cached samples and writes never retry.
  for (const mode of [
    "wrongTransaction",
    "exception",
    "silent",
    "disconnect",
  ]) {
    simulator.setMode(mode);
    simulator.disconnect();
    await until(
      async () => (await get()).tags.temperature.quality === "bad",
      mode,
    );
    simulator.setMode("good");
    await until(
      async () => (await get()).tags.temperature.quality === "good",
      mode + " recovery",
    );
  }
  const countBefore = simulator.requests.filter((r) => r.fc === 6).length;
  simulator.setMode("silentWrite");
  r = await post("sessions/" + id + "/write", {
    variableId: "temperature",
    value: 22,
  });
  assert.equal(r.status, 502);
  await new Promise((r) => setTimeout(r, 650));
  assert.equal(
    simulator.requests.filter((r) => r.fc === 6).length,
    countBefore + 1,
  );
  simulator.setMode("good");
  await until(async () => (await get()).tags.temperature.quality === "good");
  assert.equal((await post("sessions/" + id + "/end", {})).status, 200);
  assert.equal(
    (await fetch(base + "/api/communication/sessions/" + id)).status,
    404,
  );
  for (const edit of [
    (p) => (p.variables[0].modbus.area = "inputRegister"),
    (p) => (p.variables[1].modbus.scale = 0),
    (p) => (p.variables[1].modbus.deviceId = "missing"),
    (p) =>
      (p.variables[1].modbus = {
        ...p.variables[1].modbus,
        dataType: "float32",
        address: 65535,
      }),
    (p) => (p.variables[1].modbus.area = "inputRegister"),
    (p) => delete p.variables[1].modbus.wordOrder,
    (p) => (p.devices[0].unitId = 256),
    (p) => (p.devices[0].host = "https://127.0.0.1"),
    (p) => p.devices.push({ ...p.devices[0] }),
  ]) {
    const invalid = structuredClone(p);
    edit(invalid);
    assert.equal(validateProject(invalid), false);
    assert.equal((await post("sessions", { project: invalid })).status, 400);
  }
  assert.equal(
    (
      await fetch(base + "/api/communication/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://invalid.example",
        },
        body: JSON.stringify({ project: p }),
      })
    ).status,
    403,
  );
  // Real SerialPort through a Linux PTY: RTU framing, CRC, bit/register writes.
  if (process.platform === "linux") {
    serial = spawn("python3", ["tests/helpers/modbus-rtu-simulator.py"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = createInterface({ input: serial.stdout });
    let serialMode;
    lines.on("line", (line) => {
      const m = JSON.parse(line);
      if (m.port) serialPort = m.port;
      if (m.mode) serialMode = m.mode;
    });
    await until(() => serialPort, "PTY startup");
    const s = communicationProject();
    s.devices = [
      {
        id: "plc",
        name: "RTU",
        transport: "rtu",
        serialPort,
        baudRate: 9600,
        parity: "none",
        dataBits: 8,
        stopBits: 1,
        unitId: 1,
        pollIntervalMs: 100,
        timeoutMs: 300,
        enabled: true,
      },
    ];
    s.variables.find((v) => v.id === "temperature").modbus.scale = 1;
    r = await post("sessions", { project: s });
    assert.equal(r.status, 200);
    const sid = (await r.json()).sessionId;
    const serialGet = async () =>
      (await fetch(base + "/api/communication/sessions/" + sid)).json();
    await until(
      async () => (await serialGet()).tags.temperature.quality === "good",
      "RTU first sample",
    );
    assert.equal((await serialGet()).tags.temperature.value, 42);
    assert.equal(
      (await post("sessions", { project: s })).status,
      409,
      "port must have one owner",
    );
    r = await post("sessions/" + sid + "/write", {
      variableId: "temperature",
      value: 1234,
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).value, 1234);
    r = await post("sessions/" + sid + "/write", {
      variableId: "running",
      value: true,
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).value, true);
    serial.stdin.write(JSON.stringify({ mode: "badCrc" }) + "\n");
    await until(() => serialMode === "badCrc");
    await until(
      async () => (await serialGet()).tags.temperature.quality === "bad",
      "RTU CRC rejection",
    );
    serial.stdin.write(JSON.stringify({ mode: "good" }) + "\n");
    await until(() => serialMode === "good");
    await until(
      async () => (await serialGet()).tags.temperature.quality === "good",
      "RTU reconnect",
    );
    await post("sessions/" + sid + "/end", {});
    lines.close();
  }
  // Browser: configure, persist, start online, control, alarms and masks.
  simulator.holding[0] = 265;
  simulator.holding[10] = 1;
  simulator.holding[11] = 0;
  simulator.coils[0] = 0;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.VIEWX_BROWSER_PATH,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1500, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(base);
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  await page.getByRole("status").filter({ hasText: "專案已開啟" }).waitFor();
  const menu = async (name) => {
    await page.getByRole("button", { name: "檔案", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
  };
  await menu("通訊設備與標籤");
  const dialog = page.getByRole("dialog", { name: "通訊設備與標籤" });
  await dialog.getByLabel("選擇設備").selectOption("plc");
  assert.equal(
    await dialog.getByLabel("IP／主機名稱").inputValue(),
    "127.0.0.1",
  );
  if (process.env.VIEWX_SCREENSHOT_PATH)
    await page.screenshot({ path: process.env.VIEWX_SCREENSHOT_PATH });
  await dialog.getByRole("button", { name: "新增設備", exact: true }).click();
  await dialog.getByLabel("通訊協定").selectOption("rtu");
  await dialog.getByLabel("串列埠").fill("COM42");
  await dialog.getByLabel("同位元檢查").selectOption("none");
  await dialog
    .getByRole("button", { name: "重新掃描後端串列埠", exact: true })
    .click();
  await dialog.getByRole("button", { name: "刪除設備", exact: true }).click();
  await dialog.getByLabel("選擇設備").selectOption("plc");
  await dialog.getByRole("button", { name: "刪除設備", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "設備仍被標籤引用" })
    .waitFor();
  await dialog.getByRole("button", { name: "標籤映射", exact: true }).click();
  const tempTag = dialog.locator(".communication-tag").filter({
    has: page.getByRole("heading", { name: "溫度 number", exact: true }),
  });
  assert.equal(await tempTag.getByLabel("倍率").inputValue(), "0.1");
  await tempTag.getByLabel("位址（從 0 起算）").fill("1");
  await tempTag.getByLabel("位址（從 0 起算）").fill("0");
  await dialog.getByLabel("執行資料來源").selectOption("online");
  await dialog.getByRole("button", { name: "完成", exact: true }).click();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await until(
    async () =>
      (await (await fetch(base + "/api/projects/" + p.id)).json()).revision ===
      2,
    "UI mapping save",
  );
  await page.getByRole("button", { name: "執行專案", exact: true }).click();
  const watch = page.locator(".watch-row").filter({ hasText: "溫度" });
  await until(
    async () => (await watch.innerText()).includes("26.5"),
    "browser device reading",
  );
  assert.ok(
    await page
      .getByRole("button", { name: "唯讀操作", exact: true })
      .isDisabled(),
  );
  await until(
    async () =>
      await page
        .locator(".global-alarm-ticker")
        .innerText()
        .then((s) => s.includes("PLC bit 0 alarm")),
    "Word alarm",
  );
  await page.getByLabel("溫度設定", { exact: true }).fill("35.6");
  await page.getByLabel("溫度設定", { exact: true }).press("Enter");
  await until(() => simulator.holding[0] === 356, "browser numeric write");
  await until(
    async () => (await watch.innerText()).includes("35.6"),
    "browser readback",
  );
  await page.getByRole("button", { name: "運轉控制", exact: true }).click();
  await until(() => simulator.coils[0] === 1, "browser coil write");
  await page
    .getByRole("button", { name: "點動操作", exact: true })
    .dispatchEvent("pointerdown", { pointerId: 1, button: 0 });
  await until(() => simulator.coils[0] === 1);
  await page
    .getByRole("button", { name: "點動操作", exact: true })
    .dispatchEvent("pointerup", { pointerId: 1, button: 0 });
  await until(() => simulator.coils[0] === 0, "momentary release");
  simulator.setMode("disconnect");
  simulator.disconnect();
  await until(
    async () => (await watch.innerText()).includes("資料失效"),
    "browser invalid quality",
  );
  assert.ok(await page.getByLabel("溫度設定", { exact: true }).isDisabled());
  assert.ok(
    (await page.locator(".global-alarm-ticker").innerText()).includes(
      "PLC bit 0 alarm",
    ),
    "no false recovery on disconnect",
  );
  simulator.setMode("good");
  await until(
    async () => (await watch.innerText()).includes("35.6"),
    "browser reconnect",
  );
  simulator.holding[11] = 1;
  await until(
    async () =>
      !(await page.locator(".global-alarm-ticker").innerText()).includes(
        "PLC bit 0 alarm",
      ),
    "mask clears alarm",
  );
  simulator.holding[11] = 0;
  await until(
    async () =>
      (await page.locator(".global-alarm-ticker").innerText()).includes(
        "PLC bit 0 alarm",
      ),
    "unmask reactivates",
  );
  await page.getByRole("button", { name: "停止執行", exact: true }).click();
  await until(async () => {
    const history = await (
      await fetch(base + "/api/projects/" + p.id + "/alarm-events")
    ).json();
    return (
      history.items.length === 2 && history.items.every((e) => e.clearedAt)
    );
  }, "hardware alarm history");
  if (serialPort) {
    await menu("通訊設備與標籤");
    await dialog.getByLabel("通訊協定").selectOption("rtu");
    await dialog.getByLabel("串列埠").fill(serialPort);
    await dialog.getByLabel("同位元檢查").selectOption("none");
    await dialog.getByRole("button", { name: "完成", exact: true }).click();
    const ids = [];
    page.on("response", async (response) => {
      if (
        response.request().method() === "POST" &&
        response.url().endsWith("/api/communication/sessions") &&
        response.ok()
      )
        ids.push((await response.json()).sessionId);
    });
    await page.getByRole("button", { name: "執行專案", exact: true }).click();
    await until(
      async () => (await watch.innerText()).includes("123.4"),
      "RTU browser read",
    );
    await page
      .getByRole("button", { name: "重新開始設備連線", exact: true })
      .click();
    await until(
      async () =>
        ids.length === 2 && (await watch.innerText()).includes("123.4"),
      "RTU restart waits for port release",
    );
    assert.equal(
      (await fetch(base + "/api/communication/sessions/" + ids[0])).status,
      404,
    );
    await page.getByRole("button", { name: "停止執行", exact: true }).click();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Modbus TCP/RTU API, mapping persistence, browser writes, reconnect, masks and alarm history passed",
  );
} finally {
  if (browser) await browser.close();
  if (serial) {
    serial.stdin.end();
    serial.kill();
  }
  if (server) await server.close();
  if (simulator) await simulator.close();
  rmSync(temp, { recursive: true, force: true });
}
