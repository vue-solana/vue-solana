import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/module",
    "src/runtime/buffer-polyfill",
    "src/runtime/kit",
    "src/runtime/plugin",
    "src/runtime/server",
    "src/runtime/server-plugin",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    // See packages/core/build.config.ts: hoisted bare imports of externals force
    // bundlers to keep dependencies the consumer never uses.
    output: { hoistTransitiveImports: false },
  },
  externals: [
    "#app",
    "#imports",
    "@nuxt/kit",
    "@nuxt/schema",
    /^@vue-solana\/core(?:\/.*)?$/,
    /^@vue-solana\/vue(?:\/.*)?$/,
    "nuxt",
    "vue",
  ],
});
