import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";
import { defineConfig } from "vitest/config";

// Auto-aliases every top-level source file so tests can import
// `@vue-solana/<pkg>/<name>` without an enumerated list. Parity with the
// published exports map is enforced separately by scripts/check-export-map.ts
// (run as `pnpm check:entries`).
function aliasFor(packageName: string, sourceDir: string, entryFile: string) {
  const alias: Record<string, string> = {};
  for (const file of readdirSync(new URL(sourceDir, import.meta.url))) {
    if (!file.endsWith(".ts")) continue;
    const name = file.replace(/\.ts$/, "");
    alias[`@vue-solana/${packageName}/${name}`] = fileURLToPath(
      new URL(`${sourceDir}/${file}`, import.meta.url),
    );
  }
  alias[`@vue-solana/${packageName}`] = fileURLToPath(
    new URL(`${sourceDir}/${entryFile}`, import.meta.url),
  );
  return alias;
}

const alias = {
  "#app": fileURLToPath(new URL("./test/stubs/nuxt-app.ts", import.meta.url)),
  "buffer/": "node:buffer",
  ...aliasFor("core", "./packages/core/src", "index.ts"),
  ...aliasFor("vue", "./packages/vue/src", "index.ts"),
};

// Nuxt keeps its public entry in `src/module.ts` and runtime files in
// `src/runtime`, so map those separately instead of the flat `src` layout.
for (const file of readdirSync(new URL("./packages/nuxt/src/runtime", import.meta.url))) {
  if (!file.endsWith(".ts")) continue;
  const name = file.replace(/\.ts$/, "");
  alias[`@vue-solana/nuxt/${name}`] = fileURLToPath(
    new URL(`./packages/nuxt/src/runtime/${file}`, import.meta.url),
  );
}
alias["@vue-solana/nuxt"] = fileURLToPath(
  new URL("./packages/nuxt/src/module.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias,
  },
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts", "apps/docs/**/*.test.ts"],
  },
});
