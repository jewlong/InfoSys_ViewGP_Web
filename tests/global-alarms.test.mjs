import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, makeElement, validateProject } from "../src/model.ts";
import {
  globalAlarmProblems,
  isWord,
  updateGlobalAlarmEvents,
  widgetAlarmEvents,
} from "../src/services/globalAlarms.ts";
import { AlarmHistoryWriter } from "../src/services/alarmHistory.ts";
import {
  advancedProblems,
  updateAlarmEvents,
} from "../src/services/advancedRules.ts";

function project() {
  const p = newProject();
  p.variables = [
    { id: "word", name: "Word", type: "number", initial: 0 },
    { id: "mask", name: "Mask", type: "number", initial: 0 },
  ];
  p.alarmTicker = { enabled: true, position: "top", intervalMs: 1000 };
  p.alarmAreas = [
    {
      id: "area",
      name: "Motor",
      variableId: "word",
      maskVariableId: "mask",
      group: "Production",
      updateIntervalMs: 100,
      enabled: true,
      rules: [
        { id: "r0", bit: 0, message: "Motor running", severity: "warning" },
        { id: "r15", bit: 15, message: "Emergency", severity: "critical" },
      ],
    },
  ];
  return p;
}
test("Word bit 0/15, masks, interval and reactivation preserve event identity and acknowledgment", () => {
  const p = project(),
    checks = new Map();
  let events = updateGlobalAlarmEvents(
    [],
    p.alarmAreas,
    { word: 32769, mask: 1 },
    1000,
    checks,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].bit, 15);
  const id = events[0].id;
  events = events.map((e) => ({ ...e, acknowledgedAt: 1001 }));
  assert.equal(
    updateGlobalAlarmEvents(
      events,
      p.alarmAreas,
      { word: 0, mask: 0 },
      1050,
      checks,
    ),
    events,
  );
  events = updateGlobalAlarmEvents(
    events,
    p.alarmAreas,
    { word: 32769, mask: 32768 },
    1100,
    checks,
  );
  assert.equal(events.filter((e) => e.clearedAt === undefined).length, 1);
  assert.equal(events.find((e) => e.id === id).clearedReason, "masked");
  assert.equal(events.find((e) => e.id === id).acknowledgedAt, 1001);
  events = updateGlobalAlarmEvents(
    events,
    p.alarmAreas,
    { word: 32769, mask: 0 },
    1200,
    checks,
  );
  assert.equal(events.filter((e) => e.clearedAt === undefined).length, 2);
  assert.notEqual(
    events.find((e) => e.bit === 15 && e.clearedAt === undefined).id,
    id,
  );
  events = updateGlobalAlarmEvents(
    events,
    p.alarmAreas,
    { word: 0, mask: 0 },
    1300,
    checks,
  );
  assert.ok(events.every((e) => e.clearedAt !== undefined));
});
test("invalid Word values cannot wrap into active bits; disabled areas and invalid masks are diagnosed", () => {
  const p = project();
  for (const value of [-1, 65536, 1.5, Infinity, NaN, "1", true]) {
    assert.equal(isWord(value), false);
    assert.equal(
      updateGlobalAlarmEvents(
        [],
        p.alarmAreas,
        { word: value, mask: 0 },
        1000,
        new Map(),
      ).length,
      0,
    );
    assert.ok(globalAlarmProblems(p, { word: 0, mask: value }).length);
  }
  p.alarmAreas[0].enabled = false;
  assert.deepEqual(globalAlarmProblems(p, { word: 0, mask: NaN }), []);
});
test("alarm project settings round-trip and reject malformed areas, duplicate bits and invalid ticker settings", () => {
  const p = project();
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));
  for (const mutate of [
    (q) => (q.alarmAreas = null),
    (q) => (q.alarmAreas[0].rules[0].bit = 16),
    (q) => (q.alarmAreas[0].rules[1].bit = 0),
    (q) => (q.alarmAreas[0].rules[1].id = "r0"),
    (q) => (q.alarmAreas[0].updateIntervalMs = 99),
    (q) => (q.alarmAreas[0].rules[0].message = ""),
    (q) => (q.alarmTicker.intervalMs = 0),
    (q) => (q.alarmTicker.position = "left"),
    (q) => q.alarmAreas.push(structuredClone(q.alarmAreas[0])),
  ]) {
    const q = structuredClone(p);
    mutate(q);
    assert.equal(validateProject(q), false);
  }
});
test("legacy local widget filters remain isolated while global/all sources support groups", () => {
  const element = makeElement("alarm");
  const events = [
    { id: "a", elementId: element.id },
    { id: "b", elementId: "other" },
    { id: "c", areaId: "area", group: "Production" },
    { id: "d", areaId: "other", group: "Service" },
  ];
  assert.deepEqual(
    widgetAlarmEvents(element, events).map((e) => e.id),
    ["a"],
  );
  assert.deepEqual(
    widgetAlarmEvents(
      { ...element, alarmSource: "global", alarmGroup: "Production" },
      events,
    ).map((e) => e.id),
    ["c"],
  );
  assert.equal(
    widgetAlarmEvents({ ...element, alarmSource: "all" }, events).length,
    4,
  );
});

test("global display widgets do not trigger or validate obsolete local rules", () => {
  const p = project();
  p.screens[0].elements = [
    {
      ...makeElement("alarm"),
      alarmSource: "global",
      alarmRules: [
        {
          id: "obsolete",
          message: "old",
          variableId: "missing",
          operator: "true",
          severity: "warning",
        },
      ],
    },
  ];
  assert.deepEqual(advancedProblems(p.screens[0].elements[0], p), []);
  assert.deepEqual(updateAlarmEvents([], p, { missing: true }, 1000), []);
});

test("simultaneous clears above the display history limit remain observable for persistence", () => {
  const p = project();
  p.alarmAreas = Array.from({ length: 100 }, (_, n) => ({
    ...p.alarmAreas[0],
    id: `area-${n}`,
    rules: Array.from({ length: 16 }, (_, bit) => ({
      id: `r-${bit}`,
      bit,
      message: "Alarm",
      severity: "warning",
    })),
  }));
  const checks = new Map();
  const active = updateGlobalAlarmEvents(
    [],
    p.alarmAreas,
    { word: 65535, mask: 0 },
    1000,
    checks,
  );
  assert.equal(active.length, 1600);
  const cleared = updateGlobalAlarmEvents(
    active,
    p.alarmAreas,
    { word: 0, mask: 0 },
    1100,
    checks,
  );
  assert.equal(cleared.length, 1600);
  assert.ok(cleared.every((e) => e.clearedAt === 1100));
});
test("history writer retains failed writes, coalesces lifecycle changes, and ends sessions after their writes", async () => {
  const calls = [];
  let fail = true;
  const writer = new AlarmHistoryWriter(
    async (p, s, events) => {
      if (fail) throw new Error("offline");
      calls.push(["save", p, s.id, structuredClone(events)]);
    },
    async (p, s) => calls.push(["end", p, s.id]),
  );
  const session = { id: "one", startedAt: 1000 };
  writer.observe("p", session, [{ id: "event", raisedAt: 1000 }]);
  await writer.flush();
  assert.ok(writer.pendingCount());
  writer.observe("p", session, [
    { id: "event", raisedAt: 1000, acknowledgedAt: 1100, clearedAt: 1200 },
  ]);
  writer.finish("p", session);
  fail = false;
  await writer.flush();
  assert.equal(writer.pendingCount(), 0);
  assert.equal(calls[0][3][0].clearedAt, 1200);
  assert.equal(calls[1][0], "end");
});
test("acknowledgment arriving during an in-flight save is flushed before ending the session", async () => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const calls = [];
  let first = true;
  const writer = new AlarmHistoryWriter(
    async (p, s, events) => {
      calls.push(structuredClone(events));
      if (first) {
        first = false;
        await gate;
      }
    },
    async () => calls.push("end"),
  );
  const session = { id: "session", startedAt: 1000 };
  writer.observe("p", session, [{ id: "event", raisedAt: 1000 }]);
  const pending = writer.flush();
  writer.observe("p", session, [
    { id: "event", raisedAt: 1000, acknowledgedAt: 1100 },
  ]);
  writer.finish("p", session);
  release();
  await pending;
  assert.equal(calls[1][0].acknowledgedAt, 1100);
  assert.equal(calls.at(-1), "end");
});
