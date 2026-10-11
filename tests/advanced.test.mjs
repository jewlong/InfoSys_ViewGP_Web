import { test } from "node:test";
import assert from "node:assert/strict";
import { makeElement, newProject, validateProject } from "../src/model.ts";
import {
  advancedProblems,
  alarmIsActive,
  alarmRuleProblems,
  scaleRatio,
  updateAlarmEvents,
  valueColor,
} from "../src/services/advancedRules.ts";
import { bindingProblems } from "../src/services/dataRules.ts";
function fixture() {
  const p = newProject();
  p.variables = [
    { id: "n", name: "溫度", type: "number", initial: 25 },
    { id: "b", name: "故障", type: "boolean", initial: false },
  ];
  return p;
}
const numericRule = {
  id: "rule",
  message: "高溫",
  variableId: "n",
  operator: "gte",
  threshold: 80,
  severity: "critical",
};
test("gauge and bar clamp the drawing, preserve raw values and choose threshold colors", () => {
  const e = {
    ...makeElement("gauge"),
    scaleMin: -10,
    scaleMax: 90,
    warningThreshold: 60,
    criticalThreshold: 80,
  };
  assert.equal(scaleRatio(-20, e), 0);
  assert.equal(scaleRatio(40, e), 0.5);
  assert.equal(scaleRatio(100, e), 1);
  assert.equal(scaleRatio(undefined, e), undefined);
  assert.equal(scaleRatio(10, { ...e, scaleMax: -10 }), undefined);
  assert.equal(valueColor(60, e), "#f59e0b");
  assert.equal(valueColor(80, e), "#ef4444");
  assert.equal(valueColor(25, e), "#38bdf8");
  const p = fixture();
  assert.ok(advancedProblems({ ...e, scaleMin: 100 }, p).length);
  assert.ok(advancedProblems({ ...e, warningThreshold: 100 }, p).length);
  assert.ok(
    bindingProblems({ ...makeElement("trend"), variableId: "b" }, p).length,
  );
});
test("alarm predicates handle numeric comparisons, boolean values and disabled rules", () => {
  const p = fixture();
  assert.deepEqual(alarmRuleProblems(numericRule, p), []);
  for (const [operator, threshold, expected] of [
    ["gt", 80, false],
    ["gte", 80, true],
    ["lt", 90, true],
    ["lte", 80, true],
    ["eq", 80, true],
    ["ne", 80, false],
  ])
    assert.equal(
      alarmIsActive({ ...numericRule, operator, threshold }, { n: 80 }),
      expected,
    );
  assert.equal(
    alarmIsActive(
      { ...numericRule, variableId: "b", operator: "true" },
      { b: true },
    ),
    true,
  );
  assert.equal(
    alarmIsActive(
      { ...numericRule, variableId: "b", operator: "false" },
      { b: false },
    ),
    true,
  );
  assert.equal(
    alarmIsActive({ ...numericRule, enabled: false }, { n: 90 }),
    false,
  );
  assert.ok(alarmRuleProblems({ ...numericRule, variableId: "b" }, p).length);
  assert.ok(alarmRuleProblems({ ...numericRule, operator: "true" }, p).length);
  assert.ok(
    alarmRuleProblems({ ...numericRule, threshold: undefined }, p).length,
  );
});
test("alarm lifecycle does not duplicate active alarms, keeps acknowledgment and records reactivation", () => {
  const p = fixture();
  p.screens[0].elements = [
    { ...makeElement("alarm"), alarmRules: [numericRule] },
  ];
  let events = updateAlarmEvents([], p, { n: 80 }, 100);
  assert.equal(events.length, 1);
  assert.equal(events[0].value, 80);
  assert.equal(updateAlarmEvents(events, p, { n: 90 }, 200), events);
  events = [{ ...events[0], acknowledgedAt: 210 }];
  events = updateAlarmEvents(events, p, { n: 30 }, 300);
  assert.equal(events[0].clearedAt, 300);
  assert.equal(events[0].acknowledgedAt, 210);
  events = updateAlarmEvents(events, p, { n: 85 }, 400);
  assert.equal(events.length, 2);
  assert.equal(events[0].acknowledgedAt, undefined);
  assert.equal(events[0].clearedAt, undefined);
  assert.notEqual(events[0].id, events[1].id);
});
test("all advanced widget settings round-trip and reject malformed or unbounded configuration", () => {
  const p = fixture();
  p.screens[0].elements = ["gauge", "bar", "trend", "alarm"].map((kind) => ({
    ...makeElement(kind),
    ...(kind === "alarm" ? { alarmRules: [numericRule] } : { variableId: "n" }),
  }));
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));
  for (const [key, value] of [
    ["scaleMin", null],
    ["scaleMax", "100"],
    ["fillColor", "red"],
    ["orientation", "diagonal"],
    ["showValue", 1],
    ["sampleInterval", 99],
    ["sampleInterval", 100.5],
    ["historyPoints", 601],
    ["alarmMaxRows", 0],
    ["alarmRules", null],
    ["alarmRules", [null]],
    ["alarmRules", [numericRule, numericRule]],
    [
      "alarmRules",
      Array.from({ length: 21 }, (_, i) => ({ ...numericRule, id: String(i) })),
    ],
  ]) {
    const q = structuredClone(p);
    q.screens[0].elements[0][key] = value;
    assert.equal(validateProject(q), false, key);
  }
  for (const [key, value] of [
    ["operator", "bad"],
    ["severity", "bad"],
    ["variableId", null],
    ["message", 1],
    ["threshold", "80"],
    ["enabled", "yes"],
  ]) {
    const q = structuredClone(p);
    q.screens[0].elements[3].alarmRules[0][key] = value;
    assert.equal(validateProject(q), false, key);
  }
});

test("alarm history is bounded without discarding active occurrences", () => {
  const p = fixture();
  const e = {
    ...makeElement("alarm"),
    alarmRules: [
      numericRule,
      { ...numericRule, id: "boolean", variableId: "b", operator: "true" },
    ],
  };
  p.screens[0].elements = [e];
  const active = {
    id: "active",
    elementId: e.id,
    ruleId: "rule",
    message: "高溫",
    severity: "critical",
    value: 80,
    raisedAt: 1,
  };
  const previous = [
    ...Array.from({ length: 1005 }, (_, i) => ({
      ...active,
      id: `old-${i}`,
      ruleId: "past",
      raisedAt: 10000 - i,
      clearedAt: 10001,
    })),
    active,
  ];
  const events = updateAlarmEvents(previous, p, { n: 90, b: true }, 20000);
  assert.equal(
    events.filter((event) => event.clearedAt === undefined).length,
    2,
  );
  assert.equal(
    events.filter((event) => event.clearedAt !== undefined).length,
    1000,
  );
  assert.ok(events.some((event) => event.id === "active"));
});
