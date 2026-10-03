import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/.vite/**",
      "**/coverage/**",
      "**/node_modules/**",
      ".agents-dev/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      globals: {
        computed: "readonly",
        defineOgImage: "readonly",
        createError: "readonly",
        formatError: "readonly",
        queryCollection: "readonly",
        queryCollectionItemSurroundings: "readonly",
        useAsyncData: "readonly",
        useHead: "readonly",
        useI18n: "readonly",
        useLocalePath: "readonly",
        useRoute: "readonly",
        useSwitchLocalePath: "readonly",
        useSeoMeta: "readonly",
        useToast: "readonly",
        useSolana: "readonly",
        useSolanaAccountInfo: "readonly",
        useSolanaAction: "readonly",
        useSolanaAirdrop: "readonly",
        useSolanaBalance: "readonly",
        useSolanaClient: "readonly",
        useSolanaConnection: "readonly",
        useSolanaProgramAccounts: "readonly",
        useSolanaRpc: "readonly",
        useSolanaRequest: "readonly",
        useSolanaRequestSwr: "readonly",
        useSolanaSignIn: "readonly",
        useSolanaSignMessage: "readonly",
        useSolanaSignAndSendTransaction: "readonly",
        useSolanaSignAndSendTransactions: "readonly",
        useSolanaSignTransactions: "readonly",
        useSolanaSignatureStatus: "readonly",
        useSolanaSubscription: "readonly",
        useSolanaSubscriptionSwr: "readonly",
        useSolanaPayer: "readonly",
        useSolanaIdentity: "readonly",
        useSolanaPlanTransaction: "readonly",
        useSolanaPlanTransactions: "readonly",
        useSolanaSelectedWalletAccount: "readonly",
        useSolanaSendTransaction: "readonly",
        useSolanaSendTransactions: "readonly",
        useSolanaTrackedData: "readonly",
        useSolanaTrackedDataSwr: "readonly",
        useSolanaTokenAccounts: "readonly",
        useSolanaTokenBalance: "readonly",
        useSolanaTransaction: "readonly",
        useSolanaTransactionConfirmation: "readonly",
        useSolanaWallet: "readonly",
        useSolanaWallets: "readonly",
      },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ["**/*.{js,cjs,mjs,ts,vue}"],
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "off",
    },
  },
  {
    files: ["**/*.test.ts"],
    rules: {
      "vue/one-component-per-file": "off",
    },
  },
  prettier,
);
