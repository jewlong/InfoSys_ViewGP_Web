import test from "node:test";
import assert from "node:assert/strict";
import { demoProject, validateProject } from "../src/model.ts";
import {
  defaultMapping,
  validDevice,
  mappingWriteError,
  communicationProblems,
} from "../src/services/communicationRules.ts";
import { updateGlobalAlarmEvents } from "../src/services/globalAlarms.ts";
import { updateAlarmEvents } from "../src/services/advancedRules.ts";

import { communicationProject } from "./helpers/modbus-fixture.mjs";
test("Modbus mapping validation rejects incompatible types, addresses and writable inputs", () => {
  const p = communicationProject();
  assert.ok(validateProject(p));
  for (const edit of [
    (p) => (p.variables[1].modbus.address = -1),
    (p) => (p.variables[1].modbus.deviceId = "missing"),
    (p) => (p.variables[1].modbus.area = "coil"),
    (p) => (p.variables[1].modbus.scale = 0),
    (p) =>
      (p.variables[1].modbus = {
        ...p.variables[1].modbus,
        dataType: "uint32",
        address: 65535,
      }),
    (p) => (p.variables[1].modbus.area = "inputRegister"),
    (p) => (p.devices[0].unitId = 256),
    (p) => p.devices.push({ ...p.devices[0] }),
    (p) => p.variables.push(null),
  ]) {
    const bad = structuredClone(p);
    edit(bad);
    assert.equal(validateProject(bad), false);
  }
  assert.equal(
    validDevice({ ...p.devices[0], host: "http://127.0.0.1" }),
    false,
  );
  const rtu = {
    id: "serial",
    name: "串列",
    transport: "rtu",
    serialPort: "COM3",
    baudRate: 9600,
    parity: "even",
    dataBits: 8,
    stopBits: 1,
    unitId: 1,
    pollIntervalMs: 500,
    timeoutMs: 1000,
    enabled: true,
  };
  assert.equal(validDevice({ ...p.devices[0], unitId: 255 }), true);
  assert.equal(validDevice({ ...p.devices[0], unitId: 0 }), true);
  assert.equal(validDevice({ ...rtu, unitId: 0 }), false);
  p.devices.push(rtu);
  assert.ok(validateProject(p));
  p.devices.push({ ...rtu, id: "serial2", serialPort: "com3" });
  assert.equal(validateProject(p), false);
});
test("Read-write mapping checks scales, bounds and read-only access", () => {
  const m = {
    ...defaultMapping("plc", "number"),
    access: "readWrite",
    scale: 0.1,
  };
  assert.equal(mappingWriteError(m, 12.3), undefined);
  assert.ok(mappingWriteError(m, 12.35));
  assert.ok(mappingWriteError(m, -1));
  assert.ok(mappingWriteError({ ...m, access: "read" }, 10));
  assert.ok(
    mappingWriteError(
      { ...defaultMapping("plc", "boolean"), access: "readWrite" },
      1,
    ),
  );
  assert.ok(mappingWriteError({ ...m, dataType: "float32", scale: 1 }, 1e40));
});
test("Unavailable device values freeze existing alarms until a valid reading returns", () => {
  const p = communicationProject();
  p.alarmAreas = [
    {
      id: "area",
      name: "PLC 警報",
      variableId: "count",
      group: "",
      updateIntervalMs: 100,
      enabled: true,
      rules: [{ id: "r", bit: 0, message: "警報", severity: "critical" }],
    },
  ];
  p.variables.find((v) => v.id === "count").modbus = defaultMapping(
    "plc",
    "number",
  );
  const check = new Map();
  let events = updateGlobalAlarmEvents(
    [],
    p.alarmAreas,
    { count: 1 },
    1000,
    check,
  );
  assert.equal(events.length, 1);
  assert.equal(
    updateGlobalAlarmEvents(
      events,
      p.alarmAreas,
      { count: undefined },
      1200,
      check,
      new Set(["count"]),
    ),
    events,
  );
  events = updateGlobalAlarmEvents(
    events,
    p.alarmAreas,
    { count: 0 },
    1400,
    check,
  );
  assert.equal(events[0].clearedAt, 1400);
  p.variables.find((v) => v.id === "count").modbus.scale = 0.1;
  assert.match(communicationProblems(p).join(), /uint16/);
  const alarm = {
    ...p.screens[0].elements[0],
    kind: "alarm",
    alarmRules: [
      {
        id: "rule",
        message: "運轉警報",
        variableId: "running",
        operator: "true",
        severity: "warning",
      },
    ],
  };
  p.screens[0].elements.push(alarm);
  const local = updateAlarmEvents([], p, { running: true }, 1000);
  assert.equal(
    updateAlarmEvents(
      local,
      p,
      { running: undefined },
      1200,
      new Set(["running"]),
    ),
    local,
  );
});
