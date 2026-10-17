import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["packages/core", "packages/vue", "packages/nuxt"];

let failed = false;

for (const pkg of packages) {
  const dir = resolve(root, pkg);
  const packageJson = JSON.parse(readFileSync(resolve(dir, "package.json"), "utf8"));

  const errors = [];

  if (packageJson.type !== "module") errors.push('expected "type": "module"');
  if (packageJson.main) errors.push('unexpected top-level "main" (ESM-only)');
  if (!packageJson.exports || typeof packageJson.exports !== "object")
    errors.push('missing "exports"');

  const exports = packageJson.exports ?? {};
  for (const [key, value] of Object.entries(exports)) {
    const inspect = (entry) => {
      if (typeof entry === "string") return;
      if (entry && typeof entry === "object") {
        if ("require" in entry) errors.push(`${key}: "require" condition present (ESM-only)`);
        if (entry.types && !String(entry.types).endsWith(".d.ts")) {
          errors.push(`${key}: types must point at a .d.ts file`);
        }
        for (const [condition, target] of Object.entries(entry)) {
          if (typeof target === "string" && target.endsWith(".d.mts")) {
            errors.push(`${key}: ${condition} points at a .d.mts file`);
          }
        }
      }
    };
    inspect(value, key);
  }

  const files = packageJson.files ?? [];
  if (files.some((entry) => !String(entry).startsWith("!") && String(entry).includes(".d.mts"))) {
    errors.push('"files" includes .d.mts entries');
  }
  if (!files.includes("!dist/**/*.d.mts")) {
    errors.push('"files" must exclude dist/**/*.d.mts');
  }

  if (errors.length) {
    console.error(`FAIL: ${pkg}`);
    for (const error of errors) console.error(`  - ${error}`);
    failed = true;
  } else {
    console.log(`ok: ${pkg} (ESM-only exports map)`);
  }
}

if (failed) process.exit(1);
