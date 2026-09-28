#!/usr/bin/env node
// Secret scan: Riot keys and private config must never reach the mobile bundle or git.
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RULES = [
  { name: "Riot API key", re: /RGAPI-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i },
  { name: "private key", re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { name: "secret in EXPO_PUBLIC var", re: /EXPO_PUBLIC_[A-Z_]*(SECRET|API_KEY|TOKEN|PASSWORD)/ },
  { name: "Riot key referenced from mobile", re: /RIOT_API_KEY|RSO_CLIENT_SECRET/, scope: ["src/", "test/", "assets/", "app.json", "eas.json", "package.json", "tsconfig.json"] },
];
const SKIP = new Set(["node_modules", ".git", ".expo", "dist", "coverage"]);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else if (st.size < 2_000_000 && !/\.(png|jpe?g|webp|ttf|otf|sqlite.*|lock)$/i.test(name)) yield full;
  }
}

const hits = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (rel.startsWith("tooling/check-secrets") || rel === ".env" || rel.endsWith("/.env")) continue;
  const text = readFileSync(file, "utf8");
  for (const rule of RULES) {
    if (rule.scope && !rule.scope.some((path) => rel.startsWith(path))) continue;
    if (rule.re.test(text)) hits.push(`${rule.name}: ${rel}`);
  }
}

if (hits.length) {
  console.error("Secret scan failed:\n  " + hits.join("\n  "));
  process.exit(1);
}
console.log("check-secrets: OK");
