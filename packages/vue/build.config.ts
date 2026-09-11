import { defineBuildConfig } from "unbuild";

export default defineBuildConfig({
  entries: [
    "src/buffer-polyfill",
    "src/index",
    "src/useAccountInfo",
    "src/useBalance",
    "src/useConnection",
    "src/useProgramAccounts",
    "src/useRpc",
    "src/useSignAndSendTransaction",
    "src/useSignMessage",
    "src/useSignatureStatus",
    "src/useSolana",
    "src/useSolanaClient",
    "src/useTokenAccounts",
    "src/useTokenBalance",
    "src/useTransaction",
    "src/useTransactionConfirmation",
    "src/useWallet",
    "src/useWallets",
    "src/web3",
    "src/kit",
  ],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
  externals: ["@solana/kit", "@solana/web3-compat", "vue", /^@vue-solana\/core(?:\/.*)?$/],
});
