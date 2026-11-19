import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { demoProject, makeElement, validateProject } from "../src/model.ts";
import {
  PI_ZERO_LIMITS,
  prepareProjectForPiZero,
  validateForPiZero,
} from "../src/services/piZeroExport.ts";

test("demoProject passes Pi Zero pre-export validation with zero errors", () => {
  const proj = demoProject();
  assert.equal(validateProject(proj), true);
  const report = validateForPiZero(proj);
  assert.equal(report.errors.length, 0);
  assert.ok(report.stats.screens >= 1);
  assert.ok(report.jsonBytes > 0);
});

test("shared Pi Zero contract_full.json fixture passes both Designer and Pi Zero validation", () => {
  const fixturePath = path.resolve(
    "D:/Dropbox/Infosystem/MicroOS2LVGL_Proj/outputs/pi-zero-w-ucos2-wifi/tests/fixtures/contract_full.json",
  );
  if (!fs.existsSync(fixturePath)) return;
  const raw = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(
    validateProject(raw),
    true,
    "contract_full.json must satisfy Designer validateProject()",
  );
  const report = validateForPiZero(raw);
  assert.equal(
    report.errors.length,
    0,
    `Unexpected Pi Zero errors: ${JSON.stringify(report.errors)}`,
  );
  assert.equal(report.stats.screens, 3);
  assert.ok(report.stats.elements >= 22);
});

test("prepareProjectForPiZero flattens inheritsScreenId and keeps valid unique IDs", () => {
  const proj = demoProject();
  const baseScreen = proj.screens[0];
  const childScreen = {
    ...structuredClone(baseScreen),
    id: "scr-child",
    name: "子畫面",
    inheritsScreenId: baseScreen.id,
    elements: [
      {
        ...makeElement("text", 10, 10),
        id: "child-lbl",
        name: "子標籤",
        text: "Child",
      },
    ],
  };
  proj.screens.push(childScreen);

  const flattened = prepareProjectForPiZero(proj);
  const flatChild = flattened.screens.find((s) => s.id === "scr-child");
  assert.ok(flatChild);
  assert.equal(flatChild.inheritsScreenId, undefined);
  assert.equal(flatChild.parentScreenId, undefined);
  assert.equal(
    flatChild.elements.length,
    baseScreen.elements.length + 1,
    "Child screen should contain parent elements plus its own",
  );
  assert.equal(
    flatChild.elements[flatChild.elements.length - 1].id,
    "child-lbl",
    "Child elements must remain on top (last in z-order)",
  );
  assert.equal(
    validateProject(flattened),
    true,
    "Flattened project must still pass Designer validateProject()",
  );
});

test("validateForPiZero catches capacity and schemaVersion errors", () => {
  const base = demoProject();

  // Bad schemaVersion
  const badVer = { ...structuredClone(base), schemaVersion: 2 };
  assert.ok(
    validateForPiZero(badVer).errors.some((e) =>
      e.message.includes("schemaVersion"),
    ),
  );

  // Screens > 32
  const manyScreens = structuredClone(base);
  while (manyScreens.screens.length <= PI_ZERO_LIMITS.maxScreens) {
    manyScreens.screens.push({
      ...structuredClone(base.screens[0]),
      id: `scr-${manyScreens.screens.length}`,
      name: `S${manyScreens.screens.length}`,
      elements: [],
    });
  }
  assert.ok(
    validateForPiZero(manyScreens).errors.some((e) =>
      e.location.includes("畫面清單"),
    ),
  );

  // Variables > 256
  const manyVars = structuredClone(base);
  while (manyVars.variables.length <= PI_ZERO_LIMITS.maxVariables) {
    manyVars.variables.push({
      id: `v-${manyVars.variables.length}`,
      name: `V${manyVars.variables.length}`,
      type: "number",
      initial: 0,
    });
  }
  assert.ok(
    validateForPiZero(manyVars).errors.some((e) =>
      e.location.includes("變數清單"),
    ),
  );

  // Elements > 768
  const manyEls = structuredClone(base);
  while (manyEls.screens[0].elements.length <= PI_ZERO_LIMITS.maxTotalElements) {
    manyEls.screens[0].elements.push({
      ...makeElement("rectangle", 0, 0),
      id: `el-${manyEls.screens[0].elements.length}`,
    });
  }
  assert.ok(
    validateForPiZero(manyEls).errors.some((e) =>
      e.location.includes("全專案元件"),
    ),
  );

  // Trends > 16
  const manyTrends = structuredClone(base);
  for (let i = 0; i < PI_ZERO_LIMITS.maxTrends + 1; i++) {
    manyTrends.screens[0].elements.push({
      ...makeElement("trend", 0, 0),
      id: `tr-${i}`,
    });
  }
  assert.ok(
    validateForPiZero(manyTrends).errors.some((e) =>
      e.location.includes("趨勢圖元件"),
    ),
  );
});

test("validateForPiZero reports warnings for long UTF-8 strings, WebP assets, and unsupported appearance", () => {
  const proj = structuredClone(demoProject());
  proj.assets = [
    {
      id: "ast-webp",
      name: "LogoWebP",
      data: "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=",
    },
  ];
  const el = proj.screens[0].elements[0];
  el.text = "這是一段非常長的中文測試文字，用來驗證超過一百二十七個位元組時是否會發出截斷警告。這是一段非常長的中文測試文字。";
  el.fontFamily = "Georgia";
  el.fontWeight = "bold";
  el.italic = true;
  el.buttonHoverBackground = "#ff00ff";
  el.tableDiagonal = true;
  el.borderStyle = "dashed";

  const report = validateForPiZero(proj);
  assert.equal(report.errors.length, 0);
  assert.ok(
    report.warnings.some((w) => w.message.includes("PNG 與 JPEG")),
    "Should warn on WebP asset",
  );
  assert.ok(
    report.warnings.some((w) => w.message.includes("127 bytes")),
    "Should warn on UTF-8 text > 127 bytes",
  );
  assert.ok(
    report.warnings.some(
      (w) =>
        w.message.includes("fontFamily") &&
        w.message.includes("italic") &&
        w.message.includes("buttonHover*") &&
        w.message.includes("tableDiagonal") &&
        w.message.includes("borderStyle(dashed)"),
    ),
    "Should list all unsupported appearance attributes",
  );
});
