#!/usr/bin/env node
// Fails if any production module imports @valhub/test-fixtures (or a path into it).
// Production = everything under src and packages/*/src except the fixtures package.
import { fileURLToPath } from "node:url";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SCAN = ["src", "packages/core/src", "packages/domain/src", "packages/schemas/src", "packages/api-contract/src", "packages/design-tokens/src"];
/** Module specifiers in `from "x"`, `import("x")` and `require("x")`. */
const SPECIFIER = /(?:\bfrom|\bimport|\brequire)\s*(?:\(\s*)?["']([^"'\n]+)["']/g;
const isFixture = (spec) => spec.startsWith("@valhub/test-fixtures") || spec.includes("packages/test-fixtures");

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(name)) yield full;
  }
}

const offenders = [];
for (const dir of SCAN) {
  for (const file of walk(join(ROOT, dir))) {
    const text = readFileSync(file, "utf8");
    if ([...text.matchAll(SPECIFIER)].some((m) => isFixture(m[1]))) offenders.push(relative(ROOT, file));
  }
}

if (offenders.length) {
  console.error("Production modules must not import test fixtures:\n  " + offenders.join("\n  "));
  process.exit(1);
}
console.log(`check-fixture-imports: OK (${SCAN.length} production roots scanned)`);
