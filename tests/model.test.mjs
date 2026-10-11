import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProject, validateProject } from "../src/model.ts";
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
