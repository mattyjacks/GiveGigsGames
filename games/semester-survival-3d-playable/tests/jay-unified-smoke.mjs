import assert from "node:assert/strict";

const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath) throw new Error("PLAYWRIGHT_MODULE must point to the installed Playwright module.");
const { chromium } = await import(modulePath);
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });

try {
  const page = await browser.newPage();
  page.on("pageerror", error => console.error("BROWSER_PAGE_ERROR", error.message));
  await page.goto("http://127.0.0.1:4174/games/semester-survival-runner-3d/tests/jay-unified-smoke.html", {
    waitUntil: "networkidle",
    timeout: 60000
  });
  await page.waitForFunction(() => window.__jayRunTest?.done === true, { timeout: 60000 });
  const result = await page.evaluate(() => window.__jayRunTest);
  console.log("JAY_UNIFIED_BROWSER_RESULT", JSON.stringify(result, null, 2));
  assert.equal(result.ok, true, result.error || "Jay unified browser validation failed.");
  assert.equal(result.checks.loopsSimulated, 101);
  assert.equal(result.checks.actionStillRunning, true);
  assert.ok(result.checks.maxBonePositionErrorAcrossLoops <= 0.003);
  assert.ok(result.checks.maxBoneRotationErrorAcrossLoops <= 0.002);
  assert.ok(result.checks.footMidCycleQuaternionDelta > 0.002);
} finally {
  await browser.close();
}
