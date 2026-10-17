import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packages = ["packages/core", "packages/vue", "packages/nuxt"];

let failed = false;

for (const pkg of packages) {
  const cwd = resolve(root, pkg);
  let output;
  try {
    output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    console.error(`FAIL: ${pkg}: npm pack failed`);
    failed = true;
    continue;
  }

  let packed;
  try {
    packed = JSON.parse(output)[0];
  } catch {
    console.error(`FAIL: ${pkg}: could not parse npm pack output`);
    failed = true;
    continue;
  }

  const forbidden = packed.files.filter((file) => file.path.endsWith(".d.mts"));
  const budgets = { "packages/core": 50000, "packages/vue": 80000, "packages/nuxt": 20000 };
  const budget = budgets[pkg] ?? 100000;

  if (forbidden.length > 0) {
    console.error(
      `FAIL: ${pkg}: tarball contains .d.mts files: ${forbidden.map((f) => f.path).join(", ")}`,
    );
    failed = true;
  } else if (packed.size > budget) {
    console.error(`FAIL: ${pkg}: tarball size ${packed.size} bytes exceeds budget ${budget} bytes`);
    failed = true;
  } else {
    console.log(
      `ok: ${pkg} (${packed.files.length} files, ${packed.size} bytes, no .d.mts, under ${budget} bytes)`,
    );
  }
}

if (failed) process.exit(1);
