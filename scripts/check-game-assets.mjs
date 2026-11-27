#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gamesRoot = path.join(repoRoot, "games");
const catalog = JSON.parse(readFileSync(path.join(gamesRoot, "catalog.json"), "utf8"));
const failures = [];

for (const game of catalog.games.filter((item) => item.runtimeType === "static")) {
  const entrypoint = path.join(gamesRoot, ...game.entrypoint.split("/"));
  const baseDir = path.dirname(entrypoint);
  const html = readFileSync(entrypoint, "utf8");
  const offlineMarkup = html.replace(/vercelAnalyticsScript\.src\s*=\s*["']\/_vercel\/insights\/script\.js["']/g, "");
  for (const [, , url] of offlineMarkup.matchAll(/(?:src|href|poster|data-src)\s*=\s*(["'])(.*?)\1/gi)) {
    const value = url.trim();
    if (!value || /^(?:https?:|mailto:|\/\/|data:|blob:|javascript:|#)/i.test(value)) continue;
    const localPath = decodeURIComponent(value.split(/[?#]/, 1)[0]);
    if (!localPath) continue;
    const resolved = path.resolve(baseDir, localPath);
    if (!resolved.startsWith(gamesRoot + path.sep) || !existsSync(resolved)) {
      failures.push(`${game.slug}: local asset is missing or outside games/: ${value}`);
    }
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(failure));
  process.exit(1);
}
console.log("All local HTML assets resolve inside the downloaded game folder.");
