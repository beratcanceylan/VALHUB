#!/usr/bin/env node
// Release gate: the mobile app must not bundle VALORANT media or content dumps.
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MOBILE = ROOT;
const MAX_ASSET_DIR_BYTES = 2 * 1024 * 1024; // app icon + splash only
const FORBIDDEN_NAMES = [/PublicContentCatalog/i, /voice[-_ ]?lines?\b/i, /ability[-_ ]?videos?\b/i, /(skins?|agents?|maps?)\b/i];
const MEDIA_EXT = /\.(mp4|webm|mov|mp3|ogg|wav|m4a|zip)$/i;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

const problems = [];
let assetBytes = 0;
for (const file of walk(join(MOBILE, "assets"))) {
  const rel = relative(MOBILE, file);
  assetBytes += statSync(file).size;
  if (MEDIA_EXT.test(file)) problems.push(`media file in app assets: ${rel}`);
  if (FORBIDDEN_NAMES.some((re) => re.test(rel))) problems.push(`suspicious asset path: ${rel}`);
}
if (assetBytes > MAX_ASSET_DIR_BYTES) problems.push(`assets is ${assetBytes} bytes (limit ${MAX_ASSET_DIR_BYTES})`);

// No source file may require/import a local media or large JSON dump.
for (const file of walk(join(MOBILE, "src"))) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  if (/require\(\s*["'][^"']+\.(png|jpe?g|webp|mp4|webm|mp3|json)["']\s*\)/.test(text) || /from\s+["'][^"']+\.json["']/.test(text)) {
    problems.push(`local asset/JSON import in ${relative(MOBILE, file)}`);
  }
  if (/prefetch\(/.test(text)) problems.push(`image prefetch in ${relative(MOBILE, file)} (unbounded prefetch is not allowed)`);
}

if (problems.length) {
  console.error("Bundled asset policy violations:\n  " + problems.join("\n  "));
  process.exit(1);
}
console.log(`check-bundled-assets: OK (assets ${(assetBytes / 1024).toFixed(0)} KB)`);
