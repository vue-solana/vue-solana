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
        createError: "readonly",
        queryCollection: "readonly",
        useAsyncData: "readonly",
        useHead: "readonly",
        useRoute: "readonly",
        useSolana: "readonly",
        useSolanaBalance: "readonly",
        useSolanaConnection: "readonly",
        useSolanaRpc: "readonly",
        useSolanaSignAndSendTransaction: "readonly",
        useSolanaWallet: "readonly",
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
