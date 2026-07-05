import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: ["src/module", "src/runtime/buffer-polyfill", "src/runtime/plugin", "src/runtime/web3"],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: [
    "#app",
    "@nuxt/kit",
    /^@vue-solana\/core(?:\/.*)?$/,
    /^@vue-solana\/vue(?:\/.*)?$/,
    "nuxt",
    "vue",
  ],
});
