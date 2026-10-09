import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
test("SQLite persists projects and versions across restart", () => {
  const dir = mkdtempSync(join(tmpdir(), "viewx-store-"));
  const path = join(dir, "studio.db");
  let store = createStore(path);
  try {
    const project = {
      id: "p1",
      name: "測試產線",
      screens: [{ elements: [{ x: 120, variableId: "count" }] }],
      variables: [{ id: "count", initial: 3 }],
    };
    assert.equal(store.save(project, 0).revision, 1);
    assert.deepEqual(store.get("p1").project, project);
    store.close();
    store = createStore(path);
    assert.equal(store.list()[0].name, "測試產線");
    assert.deepEqual(store.get("p1").project, project);
    assert.equal(store.save({ ...project, name: "新版" }, 1).revision, 2);
    assert.equal(store.get("p1").project.name, "新版");
  } finally {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("stale writes are rejected without corrupting saved data", () => {
  const store = createStore(":memory:");
  try {
    store.save({ id: "p", name: "original" }, 0);
    assert.throws(
      () => store.save({ id: "p", name: "stale" }, 0),
      (e) => e.status === 409,
    );
    assert.equal(store.get("p").project.name, "original");
    assert.equal(store.get("p").revision, 1);
    assert.equal(store.save({ id: "p", name: "updated" }, 1).revision, 2);
    assert.equal(store.get("missing"), null);
  } finally {
    store.close();
  }
});
