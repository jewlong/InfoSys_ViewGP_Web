import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";
import { startBackend } from "../scripts/backend-test-server.mjs";
const directory = mkdtempSync(join(tmpdir(), "viewx-dev-"));
let backend, frontend, browser;
try {
  backend = await startBackend(join(directory, "test.db"), 3196);
  frontend = await createServer({
    server: {
      host: "127.0.0.1",
      port: 3199,
      strictPort: true,
      proxy: { "/api": { target: backend.base, changeOrigin: false } },
    },
  });
  await frontend.listen();
  browser = await chromium.launch({
    headless: true,
    ...(process.env.VIEWX_BROWSER_PATH
      ? { executablePath: process.env.VIEWX_BROWSER_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:3199");
  await page.locator(".canvas-element").first().waitFor();
  await page.getByRole("button", { name: "儲存專案", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "已儲存至 SQLite" })
    .waitFor();
  const list = await (await fetch(backend.base + "/api/projects")).json();
  assert.equal(list.length, 1);
  assert.equal(list[0].revision, 1);
  await page.getByRole("button", { name: "開啟專案", exact: true }).click();
  await page.locator(".project-list button").first().click();
  assert.equal(await page.locator(".canvas-element").count(), 21);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Vite development proxy preserves browser origin and saves/reopens through the separate C# API.",
  );
} finally {
  await browser?.close();
  await frontend?.close();
  await backend?.close();
  rmSync(directory, { recursive: true, force: true });
}
