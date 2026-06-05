import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#app": fileURLToPath(new URL("./test/stubs/nuxt-app.ts", import.meta.url)),
      "@vue-solana/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@vue-solana/vue": fileURLToPath(new URL("./packages/vue/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/**/*.test.ts", "packages/**/*.d.ts"],
    },
  },
});
