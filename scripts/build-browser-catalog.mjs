#!/usr/bin/env node
import { lstat, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const catalogUrl = new URL("../games/catalog.json", import.meta.url);
const outputUrl = new URL("../games/catalog-data.js", import.meta.url);
const catalog = JSON.parse(await readFile(catalogUrl, "utf8"));
const gamesRoot = fileURLToPath(new URL("./", catalogUrl));
async function folderSize(folder) {
  let total = 0;
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, entry.name);
    const info = await lstat(fullPath);
    if (info.isSymbolicLink()) throw new Error(`Symlinks are not allowed in game packages: ${fullPath}`);
    if (entry.isDirectory()) total += await folderSize(fullPath);
    else if (entry.isFile()) total += info.size;
  }
  return total;
}
const slugs = new Set();
const registeredFolders = new Set();
for (const game of catalog.games) {
  const fail = (message) => { throw new Error(`${game.slug || "(missing slug)"}: ${message}`); };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(game.slug || "")) fail("Use letters, digits, and hyphens in the slug.");
  const slug = game.slug.toLowerCase();
  if (slugs.has(slug)) fail("Use a unique slug.");
  slugs.add(slug);
  if (typeof game.title !== "string" || !game.title.trim()) fail("Provide a game title.");
  if (game.capsule !== undefined) {
    if (typeof game.capsule !== "string" || !/^(?:[\w-]+\/)+[\w-]+\.(?:webp|jpe?g|png|svg)$/i.test(game.capsule)) {
      fail("Use a relative capsule image path inside games/.");
    }
    const image = await stat(new URL(game.capsule, catalogUrl)).catch(() => null);
    if (!image?.isFile()) fail(`Create the missing capsule ${game.capsule}.`);
  }
  if (game.status !== undefined && !["stable", "preview", "experimental"].includes(game.status)) {
    fail("Set status to stable, preview, or experimental.");
  }
  if (game.inputs !== undefined && (!Array.isArray(game.inputs) ||
      game.inputs.some((input) => !["touch", "keyboard", "gamepad"].includes(input)))) {
    fail("List supported inputs from touch, keyboard, and gamepad.");
  }
  if (game.modes !== undefined && (!Array.isArray(game.modes) ||
      game.modes.some((mode) => !["solo", "multiplayer"].includes(mode)))) {
    fail("List supported modes from solo and multiplayer.");
  }
  if (game.mobilePriority !== undefined &&
      (typeof game.mobilePriority !== "number" || !Number.isFinite(game.mobilePriority))) {
    fail("Set mobilePriority to a finite number when present.");
  }
  if (game.runtimeType === "static") {
    if (!/^(?:[\w-]+\/)+[\w-]+\.html$/.test(game.entrypoint || "")) fail("Use a relative HTML entrypoint inside games/.");
    const file = await stat(new URL(game.entrypoint, catalogUrl)).catch(() => null);
    if (!file?.isFile()) fail(`Create the missing entrypoint ${game.entrypoint}.`);
    const entrypointPath = fileURLToPath(new URL(game.entrypoint, catalogUrl));
    registeredFolders.add(path.posix.dirname(game.entrypoint));
    game.packageBytes = await folderSize(path.dirname(entrypointPath));
    if (game.guideEntrypoint !== undefined) {
      if (!/^(?:[\w-]+\/)+[\w-]+\.html$/.test(game.guideEntrypoint)) fail("Use a relative HTML guide path inside games/.");
      const guide = await stat(new URL(game.guideEntrypoint, catalogUrl)).catch(() => null);
      if (!guide?.isFile()) fail(`Create the missing guide ${game.guideEntrypoint}.`);
    }
  } else if (game.runtimeType === "external") {
    if (!/^https:\/\/[^/\s]+/i.test(game.externalUrl || "")) fail("Provide an HTTPS launch URL.");
  } else {
    fail("Set runtimeType to static or external.");
  }
}

async function indexFolders(directory) {
  const folders = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const index = await stat(path.join(directory, entry.name, "index.html")).catch(() => null);
    if (index?.isFile()) folders.push(entry.name);
  }
  return folders;
}

const topLevelGames = await indexFolders(gamesRoot);
const canonicalNames = new Set(topLevelGames.map((folder) => folder.toLowerCase()));
// These legacy pages link to series whose games have their own packages.
const seriesPages = new Set(["kouzi", "madi"]);
const legacyGames = (await indexFolders(path.join(gamesRoot, "html")))
  .filter((folder) => !canonicalNames.has(folder.toLowerCase()) && !seriesPages.has(folder))
  .map((folder) => `html/${folder}`);
const missing = [...topLevelGames, ...legacyGames].filter((folder) => !registeredFolders.has(folder));
if (missing.length) {
  throw new Error(`Register these game folders in games/catalog.json: ${missing.join(", ")}`);
}

const output = `/* Generated from catalog.json by scripts/build-browser-catalog.mjs. */\nwindow.GIVEGIGSGAMES_CATALOG = ${JSON.stringify(catalog).replace(/</g, "\\u003c")};\n`;

if (process.argv.includes("--check")) {
  const existing = await readFile(outputUrl, "utf8").catch(() => "");
  if (existing !== output) {
    console.error("games/catalog-data.js is stale. Run node scripts/build-browser-catalog.mjs and commit the result.");
    process.exit(1);
  }
  console.log("Offline catalog data is current.");
} else {
  await writeFile(outputUrl, output, "utf8");
  console.log(`Wrote offline catalog data for ${catalog.games.length} titles.`);
}
