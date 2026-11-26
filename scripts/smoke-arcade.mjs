import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium, firefox, webkit } = require(process.env.ARCADE_PLAYWRIGHT_PATH || "playwright");
const engines = { chromium, firefox, webkit };
const engine = process.env.ARCADE_BROWSER || "chromium";
const channel = process.env.ARCADE_CHROMIUM_CHANNEL;
assert.ok(engines[engine], "ARCADE_BROWSER must be chromium, firefox, or webkit");
const rootDir = fileURLToPath(new URL("../", import.meta.url));
const browser = await engines[engine].launch(engine === "chromium" && channel ? { channel } : {});
try {
  const page = await browser.newPage();
  const baseUrl = process.env.ARCADE_SMOKE_URL || "http://127.0.0.1:4173";
  // Mirror the production Vercel rewrites when running the static smoke server locally.
  await page.route("**/ggg/**", async route => {
    const requested = new URL(route.request().url());
    const parts = requested.pathname.split("/").filter(Boolean);
    if (parts.length === 1 || parts[1] === "index.html") {
      await route.fulfill({ path: path.join(rootDir, "index.html"), contentType: "text/html; charset=utf-8" });
      return;
    }
    let destination = "/" + parts.slice(1).join("/");
    if (parts[1] === "play" && parts[2]) destination = `/play.html?game=${encodeURIComponent(parts[2])}`;
    else if (parts[1] === "info" && parts[2]) destination = `/game.html?game=${encodeURIComponent(parts[2])}`;
    else if (parts[1] === "test" && parts[2]) destination = `/tester/index.html?game=${encodeURIComponent(parts[2])}`;
    await route.continue({ url: requested.origin + destination });
  });
  await page.goto(`${baseUrl}/index.html#all-games`);
  const search = page.getByRole("searchbox", { name: "Search games, genres, and tags" });
  await search.fill("Platform Wars");
  // Wait for debounced search to update state + filter the grid (card exists before search too).
  await page.waitForFunction(() => document.querySelectorAll("#game-grid .game-card").length === 1);
  const card = page.locator("#game-grid .game-card[data-slug='platform-wars']");
  await card.waitFor();
  const play = card.locator(".gcard-play");
  await play.click();
  await page.frameLocator("#game-frame").locator("#arena").waitFor({ state: "attached" });
  await page.getByRole("link", { name: "Back to game select" }).click();
  await page.waitForFunction(() => document.getElementById("catalog-search")?.value === "Platform Wars");
  assert.equal(await search.inputValue(), "Platform Wars");
  await card.waitFor();

  await card.locator(".gcard-cover-link").click();
  await page.frameLocator("#game-frame").locator("#arena").waitFor({ state: "attached" });
  await page.getByRole("link", { name: "Back to game select" }).click();
  await card.waitFor();

  await card.getByRole("button", { name: /Add to favorites: Platform Wars/ }).click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.locator("#filter-collection").getByRole("button", { name: "Favorites", exact: true }).click();
  await page.getByRole("button", { name: /Show \d+ results?/ }).click();
  assert.equal(await page.locator("#game-grid .game-card").count(), 1);
  await card.locator(".gcard-title a").click();
  await page.getByRole("heading", { name: "Platform Wars: Phone vs Desktop" }).waitFor();

  await page.goto(`${baseUrl}/index.html#settings`);
  await page.locator("#settings details.fold").evaluate((details) => { details.open = true; });
  await page.locator("#save-file-input").setInputFiles({
    name: "backup.txt",
    mimeType: "text/plain",
    buffer: Buffer.from(JSON.stringify({
      format: "givegigsgames-backup",
      version: 1,
      saves: [{ type: "localStorage", key: "platform-wars-smoke", value: "progress" }]
    }))
  });
  await page.getByRole("button", { name: "Restore selected" }).click();
  await page.waitForFunction(() => localStorage.getItem("platform-wars-smoke") === "progress");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all saves" }).click();
  assert.equal((await download).suggestedFilename(), "givegigsgames-backup.txt");
} finally {
  await browser.close();
}
