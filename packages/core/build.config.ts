import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/index",
    "src/address",
    "src/buffer-polyfill",
    "src/clusters",
    "src/errors",
    "src/ios-wallet",
    "src/mobile-wallet",
    "src/rpc",
    "src/timeout",
    "src/transaction",
    "src/types",
    "src/wallet",
    "src/wallet-standard",
    "src/web3",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
