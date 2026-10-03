import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/index",
    "src/action",
    "src/address",
    "src/buffer-polyfill",
    "src/clusters",
    "src/errors",
    "src/ios-wallet",
    "src/kit",
    "src/mobile-wallet",
    "src/mobile-wallet-support",
    "src/rpc",
    "src/timeout",
    "src/token-accounts",
    "src/transaction",
    "src/types",
    "src/wallet",
    "src/wallet-standard",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    // rollup hoists transitively-imported externals into the entry facade as
    // bare `import "@wallet-standard/app"` statements. Those force bundlers to
    // keep every dependency alive even when the consumer never touches the
    // re-exported module: 204 KB -> 145 KB min for a client-only import.
    output: { hoistTransitiveImports: false },
  },
});
