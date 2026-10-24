import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type BuildConfig = { entries?: string[] };

const root = resolve(import.meta.dirname, "..");

const targets = [
  {
    name: "core",
    buildConfig: "packages/core/build.config.ts",
    packageJson: "packages/core/package.json",
    root: "src/index",
    subpathPrefix: "src/",
    extraEntries: [] as string[],
  },
  {
    name: "vue",
    buildConfig: "packages/vue/build.config.ts",
    packageJson: "packages/vue/package.json",
    root: "src/index",
    subpathPrefix: "src/",
    extraEntries: [] as string[],
  },
  {
    name: "nuxt",
    buildConfig: "packages/nuxt/build.config.ts",
    packageJson: "packages/nuxt/package.json",
    root: "src/module",
    subpathPrefix: "src/runtime/",
    extraEntries: ["src/runtime/plugin"],
  },
];

let failed = false;

for (const target of targets) {
  const imported = await import(resolve(root, target.buildConfig));
  const config = (
    Array.isArray(imported.default) ? imported.default[0] : imported.default
  ) as BuildConfig;
  const actualEntries = new Set(config.entries ?? []);

  const packageJson = JSON.parse(readFileSync(resolve(root, target.packageJson), "utf8")) as {
    exports: Record<string, unknown>;
  };
  const expectedEntries = new Set<string>([
    ...Object.keys(packageJson.exports).map((exportPath) =>
      exportPath === "." ? target.root : `${target.subpathPrefix}${exportPath.slice(2)}`,
    ),
    ...target.extraEntries,
  ]);

  const missing = [...expectedEntries].filter((entry) => !actualEntries.has(entry));
  const extra = [...actualEntries].filter((entry) => !expectedEntries.has(entry));

  if (missing.length || extra.length) {
    console.error(`FAIL: ${target.name} build entries and exports disagree`);
    if (missing.length) console.error(`  missing entries: ${missing.join(", ")}`);
    if (extra.length) console.error(`  unexpected entries: ${extra.join(", ")}`);
    failed = true;
  } else {
    console.log(`ok: ${target.name} build entries match exports (${actualEntries.size})`);
  }
}

if (failed) process.exit(1);
