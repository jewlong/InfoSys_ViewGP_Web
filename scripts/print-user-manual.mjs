import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.VIEWX_BROWSER_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.setContent(
    readFileSync(resolve("docs/ViewGP-操作手冊.html"), "utf8"),
    { waitUntil: "load" },
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll("figure img")].map((i) => i.decode()),
    );
  });
  assert.equal(await page.locator("figure img").count(), 22);
  assert.equal(await page.locator(".sidebar nav a").count(), 15);
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll('a[href^="#"]')].every((a) =>
        document.getElementById(a.getAttribute("href").slice(1)),
      ),
    ),
  );
  assert.ok(
    await page.evaluate(() =>
      [...document.querySelectorAll("figure img")].every(
        (i) => i.complete && i.naturalWidth > 0,
      ),
    ),
  );
  await page.locator("figure img").first().click();
  assert.equal(await page.locator("dialog[open]").count(), 1);
  await page.getByRole("button", { name: "關閉", exact: true }).click();
  await page.pdf({
    path: resolve("docs/ViewGP-操作手冊.pdf"),
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#65798e;padding:0 14mm;display:flex;justify-content:space-between;font-family:Arial"><span>ViewGP v0.2.0 | 2026-10-12</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  });
  await page.screenshot({
    path: "/tmp/viewgp-manual-html.png",
    fullPage: false,
  });
  console.log(
    "PDF exported; 22 embedded images, chapter links and image zoom verified.",
  );
} finally {
  await browser.close();
}
