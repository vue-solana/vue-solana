import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/index",
    "src/clusters",
    "src/ios-wallet",
    "src/mobile-wallet",
    "src/rpc",
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
