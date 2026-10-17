import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

const checks = [
  {
    file: "packages/core/dist/kit.mjs",
    markers: ["from '@solana/kit'", 'from "@solana/kit"'],
  },
  {
    file: "packages/vue/dist/shared",
    markers: ["from '@vue-solana/core"],
    directory: true,
  },
  {
    file: "packages/nuxt/dist/runtime/plugin.mjs",
    markers: ["from '@vue-solana/vue'"],
  },
];

let failed = false;

for (const check of checks) {
  const target = resolve(root, check.file);

  if (check.directory) {
    // At least one file in the directory must retain the external import.
    const { readdirSync } = await import("node:fs");
    const files = existsSync(target)
      ? readdirSync(target).filter((name) => name.endsWith(".mjs"))
      : [];
    const contents = files.map((name) => readFileSync(resolve(target, name), "utf8")).join("\n");
    if (!files.length) {
      console.error(`FAIL: ${check.file} not built (run pnpm build:packages first)`);
      failed = true;
      continue;
    }
    if (!check.markers.some((marker) => contents.includes(marker))) {
      console.error(
        `FAIL: ${check.file} does not retain external imports (${check.markers.join(" / ")})`,
      );
      failed = true;
    } else {
      console.log(`ok: ${check.file} retains external imports`);
    }
    continue;
  }

  if (!existsSync(target)) {
    console.error(`FAIL: ${check.file} not built (run pnpm build:packages first)`);
    failed = true;
    continue;
  }

  const content = readFileSync(target, "utf8");
  if (!check.markers.some((marker) => content.includes(marker))) {
    console.error(
      `FAIL: ${check.file} does not retain external imports (${check.markers.join(" / ")})`,
    );
    failed = true;
  } else {
    console.log(`ok: ${check.file} retains external imports`);
  }
}

if (failed) process.exit(1);
