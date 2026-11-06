import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject, makeElement, validateProject } from "../src/model.ts";
import {
  getLvglWasm,
  packRgbaLe,
} from "../src/services/lvglWasmRuntime.ts";
test("demo round-trips through versioned JSON schema", () =>
  assert.ok(validateProject(JSON.parse(JSON.stringify(demoProject())))));
test("rejects malformed imports and unsupported schema versions", () => {
  const p = demoProject();
  for (const invalid of [
    null,
    {},
    { ...p, schemaVersion: 2 },
    { ...p, screens: [null] },
    { ...p, screens: [{ ...p.screens[0], width: -1 }] },
    {
      ...p,
      variables: [{ id: "x", name: "bad", type: "number", initial: "bad" }],
    },
  ])
    assert.equal(validateProject(invalid), false);
});
test("rejects duplicate IDs, unsafe image sources, invalid dimensions and optional properties", () => {
  const p = demoProject();
  let q = structuredClone(p);
  q.screens[0].elements[1].id = q.screens[0].elements[0].id;
  assert.equal(validateProject(q), false);
  q = structuredClone(p);
  q.screens[0].elements[0].image = "https://example.com/pixel";
  assert.equal(validateProject(q), false);
  q = structuredClone(p);
  q.screens[0].elements[0].variableId = { bad: true };
  assert.equal(validateProject(q), false);
  q = structuredClone(p);
  q.screens[0].elements[0].width = 0;
  assert.equal(validateProject(q), false);
});

test("appearance settings round-trip and reject invalid values", () => {
  const p = demoProject();
  const properties = {
    fontFamily: "serif",
    fontWeight: "bold",
    italic: true,
    underline: true,
    textAlign: "center",
    verticalAlign: "bottom",
    wordWrap: false,
    lineHeight: 1.5,
    textBackground: true,
    borderWidth: 4,
    borderColor: "#aabbcc",
    borderStyle: "dashed",
    borderRadius: 20,
    shapeFilled: false,
    imageFit: "cover",
    imagePosition: "left",
    buttonHoverBackground: "#ff0000",
    buttonPressedColor: "#00ff00",
  };
  Object.assign(p.screens[0].elements[0], properties);
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));
  for (const [key, value] of [
    ["fontFamily", ""],
    ["fontWeight", "heavy"],
    ["italic", null],
    ["underline", 1],
    ["textAlign", "justify"],
    ["verticalAlign", "baseline"],
    ["wordWrap", "yes"],
    ["lineHeight", 4],
    ["borderWidth", -1],
    ["borderColor", "#abc"],
    ["borderStyle", "double"],
    ["borderRadius", 1001],
    ["shapeFilled", "true"],
    ["imageFit", "stretch"],
    ["imagePosition", "outside"],
    ["buttonHoverBackground", "red"],
  ]) {
    const q = structuredClone(p);
    q.screens[0].elements[0][key] = value;
    assert.equal(validateProject(q), false, `${key} must be validated`);
  }
});

test("Priority 1 widgets (datetime, multistate, scale, table) round-trip and validate", () => {
  const p = demoProject();
  const dt = makeElement("datetime");
  dt.dateTimeFormat = "YYYY/MM/DD HH:mm:ss";

  const ms = makeElement("multistate");
  ms.multistateItems = [
    { value: 0, label: "停止", color: "#64748b" },
    { value: 1, label: "運轉", color: "#22c55e" },
  ];

  const sc = makeElement("scale");
  sc.scaleOrientation = "vertical";
  sc.scaleMajorTicks = 10;
  sc.scaleMinorTicks = 2;
  sc.scaleShowAxis = true;
  sc.scaleShowLabels = true;

  const tb = makeElement("table");
  tb.tableCols = 5;
  tb.tableRows = 6;
  tb.gridColor = "#223344";
  tb.tableDiagonal = true;

  p.screens[0].elements.push(dt, ms, sc, tb);
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));

  // Rejects invalid scale ticks
  const q1 = structuredClone(p);
  q1.screens[0].elements.find((e) => e.kind === "scale").scaleMajorTicks = 0;
  assert.equal(validateProject(q1), false);

  // Rejects invalid table columns
  const q2 = structuredClone(p);
  q2.screens[0].elements.find((e) => e.kind === "table").tableCols = -1;
  assert.equal(validateProject(q2), false);

  // Rejects invalid multistate item color
  const q3 = structuredClone(p);
  q3.screens[0].elements.find((e) => e.kind === "multistate").multistateItems[0].color = "not-color";
  assert.equal(validateProject(q3), false);
});

test("LVGL v9 widgets (slider, arc, spinbox, dropdown) and WASM runtime instantiate and validate", () => {
  const wasm = getLvglWasm();
  assert.equal(wasm.lv_wasm_get_version(), 90200);
  const fbPtr = wasm.lv_wasm_get_fb_ptr();
  assert.equal(fbPtr, 1024);

  wasm.lv_wasm_begin_frame(16, 16, packRgbaLe(10, 20, 30, 255));
  wasm.lv_wasm_fill_rect(16, 16, 2, 2, 4, 4, packRgbaLe(255, 128, 64, 255));
  const heap = new Uint8Array(wasm.memory.buffer, fbPtr, 16 * 16 * 4);
  assert.deepEqual(Array.from(heap.slice(0, 4)), [10, 20, 30, 255]);
  const pixel2x2 = (2 * 16 + 2) * 4;
  assert.deepEqual(Array.from(heap.slice(pixel2x2, pixel2x2 + 4)), [255, 128, 64, 255]);

  const p = demoProject();
  const slider = makeElement("slider");
  const arc = makeElement("arc");
  const spinbox = makeElement("spinbox");
  const dropdown = makeElement("dropdown");
  p.screens[0].elements.push(slider, arc, spinbox, dropdown);
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));
});
