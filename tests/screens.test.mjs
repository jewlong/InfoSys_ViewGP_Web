import { test } from "node:test";
import assert from "node:assert/strict";
import { newProject, makeElement, validateProject } from "../src/model.ts";
import {
  screenElements,
  screenProblems,
  canInherit,
  openPopup,
  screenReferences,
} from "../src/services/screenRules.ts";
import {
  bindingProblems,
  evaluateAction,
  actionPatch,
} from "../src/services/dataRules.ts";
import { checkProject } from "../src/services/projectValidation.ts";

function fixture() {
  const p = newProject();
  const base = p.screens[0];
  base.id = p.startScreenId = "base";
  base.elements = [makeElement("text", 10, 10)];
  const child = {
    ...base,
    id: "child",
    parentScreenId: "base",
    elements: [makeElement("text", 20, 20)],
  };
  const popup = {
    ...base,
    id: "popup",
    type: "popup",
    parentScreenId: "child",
    elements: [],
  };
  p.screens.push(child, popup);
  return p;
}

test("legacy screens remain valid; inheritance resolves ancestor-first without copying and tracks parent edits", () => {
  const p = fixture();
  assert.ok(validateProject(JSON.parse(JSON.stringify(p))));
  const items = screenElements(p, "popup");
  assert.deepEqual(
    items.map((item) => item.ownerScreenId),
    ["base", "child"],
  );
  p.screens[0].elements[0].text = "Updated master";
  assert.equal(screenElements(p, "popup")[0].element.text, "Updated master");
  assert.equal(p.screens[2].elements.length, 0);
  assert.equal(canInherit(p, "base", "popup"), false);
  assert.deepEqual(screenReferences(p, "base"), [
    `${p.screens[1].name}（繼承）`,
  ]);
});

test("invalid screen types, missing parents, self/multi-level cycles and popup starts are rejected", () => {
  const p = fixture();
  for (const changes of [
    (q) => {
      q.screens[1].type = null;
    },
    (q) => {
      q.screens[1].type = "other";
    },
    (q) => {
      q.screens[1].parentScreenId = null;
    },
    (q) => {
      q.screens[1].parentScreenId = "";
    },
    (q) => {
      q.screens[1].parentScreenId = "missing";
    },
    (q) => {
      q.screens[1].parentScreenId = "child";
    },
    (q) => {
      q.screens[0].parentScreenId = "popup";
    },
    (q) => {
      q.startScreenId = "popup";
    },
  ]) {
    const q = structuredClone(p);
    changes(q);
    assert.equal(validateProject(q), false);
    assert.ok(screenProblems(q).length);
    // A malformed in-memory chain cannot hang rendering.
    assert.ok(screenElements(q, "popup").length <= 2);
  }
});

test("popup and screen actions validate target classes without requiring variables; closing is local", () => {
  const p = fixture();
  const button = {
    ...makeElement("button"),
    action: "popup",
    targetScreenId: "popup",
  };
  assert.deepEqual(bindingProblems(button, p), []);
  assert.deepEqual(evaluateAction(button, p, {}), { popupId: "popup" });
  assert.deepEqual(evaluateAction({ ...button, action: "closePopup" }, p, {}), {
    closePopup: true,
  });
  assert.ok(bindingProblems({ ...button, targetScreenId: "base" }, p).length);
  assert.ok(bindingProblems({ ...button, action: "screen" }, p).length);
  assert.deepEqual(
    evaluateAction(
      { ...button, action: "screen", targetScreenId: "child" },
      p,
      {},
    ),
    { screenId: "child" },
  );
  assert.equal(actionPatch(button, "screen", []).targetScreenId, undefined);
  p.screens[0].elements.push(button);
  assert.ok(
    screenReferences(p, "popup").some((ref) => ref.includes(button.name)),
  );
});

test("popup stack rejects duplicate/reentrant dialogs and caps nesting", () => {
  const p = fixture();
  assert.deepEqual(openPopup(p, [], "popup"), ["popup"]);
  assert.equal(openPopup(p, ["popup"], "popup"), undefined);
  assert.equal(openPopup(p, [], "base"), undefined);
  assert.equal(openPopup(p, [], "missing"), undefined);
  assert.equal(
    openPopup(
      p,
      Array.from({ length: 16 }, (_, i) => String(i)),
      "popup",
    ),
    undefined,
  );
});

test("project diagnostics include inherited geometry in the child's dimensions", () => {
  const p = fixture();
  p.screens[2].width = 100;
  assert.ok(
    checkProject(p).some((error) => error.includes("（繼承）：超出畫面範圍")),
  );
});
