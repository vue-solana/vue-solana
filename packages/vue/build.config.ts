import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/index",
    "src/useAccountInfo",
    "src/useBalance",
    "src/useConnection",
    "src/useProgramAccounts",
    "src/useRpc",
    "src/useSignAndSendTransaction",
    "src/useSignatureStatus",
    "src/useSolana",
    "src/useTransaction",
    "src/useTransactionConfirmation",
    "src/useWallet",
    "src/useWallets",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: ["vue", "@solana/web3-compat", /^@vue-solana\/core(?:\/.*)?$/],
});
