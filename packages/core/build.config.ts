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
    emitCJS: true,
  },
});
