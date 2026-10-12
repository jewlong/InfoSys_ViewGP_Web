import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, makeElement, validateProject } from "../src/model.ts";
import {
  actionPatch,
  bindingProblems,
  bindingTypes,
  evaluateAction,
  inputError,
  parseNumber,
} from "../src/services/dataRules.ts";
import { formatNumber } from "../src/services/numberFormat.ts";
import { checkProject } from "../src/services/projectValidation.ts";
function fixture() {
  const p = newProject();
  p.variables = [
    { id: "n", name: "數值", type: "number", initial: 1 },
    { id: "b", name: "布林", type: "boolean", initial: false },
    { id: "s", name: "文字", type: "string", initial: "開始" },
  ];
  return p;
}
test("number formats preserve defaults and format decimal, integer, percent and scientific values", () => {
  const e = makeElement("number");
  assert.equal(formatNumber(1280.12345, e), "1,280.123");
  assert.equal(
    formatNumber(1280.5, {
      ...e,
      decimals: 2,
      useGrouping: false,
      numberPrefix: "$",
      unit: "元",
    }),
    "$1280.50 元",
  );
  assert.equal(
    formatNumber(-12.6, { ...e, numberFormat: "integer", decimals: 5 }),
    "-13",
  );
  assert.equal(
    formatNumber(0.125, { ...e, numberFormat: "percent", decimals: 1 }),
    "12.5%",
  );
  assert.equal(
    formatNumber(1200, { ...e, numberFormat: "scientific", decimals: 2 }),
    "1.20E3",
  );
  assert.equal(
    formatNumber(1234.5, { ...e, numberLocale: "de-DE", decimals: 2 }),
    "1.234,50",
  );
  assert.equal(formatNumber(Infinity, e), "—");
  assert.equal(formatNumber(undefined, e), "—");
});
test("numeric input rejects empty, non-finite, out-of-range and off-step values", () => {
  const e = {
    ...makeElement("input"),
    inputMin: -1,
    inputMax: 2,
    inputStep: 0.1,
  };
  for (const raw of ["", " ", "NaN", "Infinity", "0x10", "1e999", "bad"])
    assert.equal(parseNumber(raw), undefined);
  for (const raw of ["-1", "0.3", "2", "1e-1"])
    assert.equal(inputError(e, raw), undefined, raw);
  for (const raw of ["-1.1", "2.1", "0.35", ""])
    assert.ok(inputError(e, raw), raw);
  assert.ok(inputError({ ...e, inputMin: 3 }, "1"));
  assert.ok(inputError({ ...e, inputStep: 0 }, "1"));
  assert.equal(inputError(makeElement("input"), "-12.345"), undefined);
});
test("binding checks catch missing references, types, conditions and action values", () => {
  const p = fixture();
  const e = {
    ...makeElement("input"),
    variableId: "n",
    inputMin: 0,
    inputMax: 2,
  };
  assert.deepEqual(bindingProblems(e, p), []);
  assert.ok(bindingProblems({ ...e, variableId: "b" }, p).length);
  assert.ok(bindingProblems({ ...e, enabledId: "n" }, p).length);
  assert.ok(bindingProblems({ ...e, variableId: "missing" }, p).length);
  assert.ok(bindingProblems({ ...e, inputMax: 0.5 }, p).length);
  const button = {
    ...makeElement("button"),
    variableId: "n",
    action: "set",
    actionValue: "",
  };
  assert.ok(bindingProblems(button, p).length);
  assert.ok(
    bindingProblems({ ...button, variableId: "b", actionValue: "1" }, p).length,
  );
  assert.ok(
    bindingProblems(
      { ...button, action: "screen", targetScreenId: "missing" },
      p,
    ).length,
  );
  assert.deepEqual(bindingTypes({ ...button, action: "increment" }), [
    "number",
  ]);
  assert.deepEqual(
    actionPatch({ ...button, variableId: "b" }, "increment", p.variables),
    { action: "increment", variableId: "n", actionValue: "1" },
  );
  p.screens[0].elements = [{ ...e, inputMin: 2, inputMax: 1 }];
  assert.ok(checkProject(p).some((message) => message.includes("最小值")));
});
test("button actions handle typed set, negative increment, toggle, reset, navigation and overflow", () => {
  const p = fixture();
  const e = { ...makeElement("button"), variableId: "n" };
  const values = { n: 5, b: false, s: "改過" };
  assert.deepEqual(
    evaluateAction({ ...e, action: "increment", actionValue: "-2" }, p, values),
    { variableId: "n", value: 3 },
  );
  assert.deepEqual(
    evaluateAction({ ...e, action: "set", actionValue: "2.5" }, p, values),
    { variableId: "n", value: 2.5 },
  );
  assert.deepEqual(
    evaluateAction({ ...e, variableId: "b", action: "toggle" }, p, values),
    { variableId: "b", value: true },
  );
  assert.deepEqual(
    evaluateAction(
      { ...e, variableId: "b", action: "set", actionValue: "true" },
      p,
      values,
    ),
    { variableId: "b", value: true },
  );
  assert.deepEqual(
    evaluateAction(
      { ...e, variableId: "s", action: "set", actionValue: "" },
      p,
      values,
    ),
    { variableId: "s", value: "" },
  );
  assert.deepEqual(
    evaluateAction({ ...e, variableId: "s", action: "reset" }, p, values),
    { variableId: "s", value: "開始" },
  );
  assert.deepEqual(
    evaluateAction(
      { ...e, action: "screen", targetScreenId: p.startScreenId },
      p,
      values,
    ),
    { screenId: p.startScreenId },
  );
  assert.ok(
    "error" in
      evaluateAction({ ...e, action: "increment", actionValue: "1e308" }, p, {
        ...values,
        n: 1e308,
      }),
  );
});
test("new data settings remain optional and reject malformed fields", () => {
  const p = fixture();
  const e = {
    ...makeElement("input"),
    variableId: "n",
    inputMin: -10,
    inputMax: 10,
    inputStep: 0.25,
    numberFormat: "percent",
    numberLocale: "zh-TW",
    useGrouping: false,
    numberPrefix: "$",
    action: "reset",
  };
  p.screens[0].elements = [e];
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));
  for (const [key, value] of [
    ["inputMin", null],
    ["inputMax", "10"],
    ["inputStep", 0],
    ["inputStep", -1],
    ["numberFormat", "unknown"],
    ["numberLocale", "unknown"],
    ["useGrouping", 1],
    ["numberPrefix", 1],
  ]) {
    const q = structuredClone(p);
    q.screens[0].elements[0][key] = value;
    assert.equal(validateProject(q), false, key);
  }
});

test("system variables binding, momentary action, and previous screen navigation", () => {
  const p = fixture();
  // Valid binding of system variable to text
  const textElem = {
    ...makeElement("text"),
    variableId: "$SYS.TIME",
  };
  assert.equal(bindingProblems(textElem, p).length, 0);

  // Type mismatch: binding string system variable to numeric widget
  const numElem = {
    ...makeElement("number"),
    variableId: "$SYS.TIME",
  };
  assert.ok(bindingProblems(numElem, p).some((msg) => msg.includes("綁定類型不符")));

  // Button write to system variable is rejected (read-only)
  const btnElem = {
    ...makeElement("button"),
    variableId: "$SYS.TICK_1S",
    action: "toggle",
  };
  assert.ok(bindingProblems(btnElem, p).some((msg) => msg.includes("唯讀")));

  // Momentary button action evaluation
  const momentaryBtn = {
    ...makeElement("button"),
    variableId: "b",
    action: "momentary",
    actionValue: "true",
  };
  const resDown = evaluateAction(momentaryBtn, p, { b: false });
  assert.deepEqual(resDown, { variableId: "b", value: true });

  const momentaryBtnUp = {
    ...momentaryBtn,
    actionValue: "false",
  };
  const resUp = evaluateAction(momentaryBtnUp, p, { b: true });
  assert.deepEqual(resUp, { variableId: "b", value: false });

  // Previous screen button action evaluation
  const prevBtn = {
    ...makeElement("button"),
    action: "previousScreen",
  };
  assert.equal(bindingProblems(prevBtn, p).length, 0);
  assert.deepEqual(evaluateAction(prevBtn, p, {}), { actionType: "previousScreen" });
});

