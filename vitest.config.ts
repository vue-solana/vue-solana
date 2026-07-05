import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#app": fileURLToPath(new URL("./test/stubs/nuxt-app.ts", import.meta.url)),
      "buffer/": "node:buffer",
      "@vue-solana/core/address": fileURLToPath(
        new URL("./packages/core/src/address.ts", import.meta.url),
      ),
      "@vue-solana/core/buffer-polyfill": fileURLToPath(
        new URL("./packages/core/src/buffer-polyfill.ts", import.meta.url),
      ),
      "@vue-solana/core/clusters": fileURLToPath(
        new URL("./packages/core/src/clusters.ts", import.meta.url),
      ),
      "@vue-solana/core/errors": fileURLToPath(
        new URL("./packages/core/src/errors.ts", import.meta.url),
      ),
      "@vue-solana/core/ios-wallet": fileURLToPath(
        new URL("./packages/core/src/ios-wallet.ts", import.meta.url),
      ),
      "@vue-solana/core/mobile-wallet": fileURLToPath(
        new URL("./packages/core/src/mobile-wallet.ts", import.meta.url),
      ),
      "@vue-solana/core/rpc": fileURLToPath(new URL("./packages/core/src/rpc.ts", import.meta.url)),
      "@vue-solana/core/timeout": fileURLToPath(
        new URL("./packages/core/src/timeout.ts", import.meta.url),
      ),
      "@vue-solana/core/transaction": fileURLToPath(
        new URL("./packages/core/src/transaction.ts", import.meta.url),
      ),
      "@vue-solana/core/types": fileURLToPath(
        new URL("./packages/core/src/types.ts", import.meta.url),
      ),
      "@vue-solana/core/wallet": fileURLToPath(
        new URL("./packages/core/src/wallet.ts", import.meta.url),
      ),
      "@vue-solana/core/wallet-standard": fileURLToPath(
        new URL("./packages/core/src/wallet-standard.ts", import.meta.url),
      ),
      "@vue-solana/core/web3": fileURLToPath(
        new URL("./packages/core/src/web3.ts", import.meta.url),
      ),
      "@vue-solana/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@vue-solana/nuxt/buffer-polyfill": fileURLToPath(
        new URL("./packages/nuxt/src/runtime/buffer-polyfill.ts", import.meta.url),
      ),
      "@vue-solana/nuxt/web3": fileURLToPath(
        new URL("./packages/nuxt/src/runtime/web3.ts", import.meta.url),
      ),
      "@vue-solana/nuxt": fileURLToPath(new URL("./packages/nuxt/src/module.ts", import.meta.url)),
      "@vue-solana/vue/buffer-polyfill": fileURLToPath(
        new URL("./packages/vue/src/buffer-polyfill.ts", import.meta.url),
      ),
      "@vue-solana/vue/useBalance": fileURLToPath(
        new URL("./packages/vue/src/useBalance.ts", import.meta.url),
      ),
      "@vue-solana/vue/useAccountInfo": fileURLToPath(
        new URL("./packages/vue/src/useAccountInfo.ts", import.meta.url),
      ),
      "@vue-solana/vue/useConnection": fileURLToPath(
        new URL("./packages/vue/src/useConnection.ts", import.meta.url),
      ),
      "@vue-solana/vue/useProgramAccounts": fileURLToPath(
        new URL("./packages/vue/src/useProgramAccounts.ts", import.meta.url),
      ),
      "@vue-solana/vue/useRpc": fileURLToPath(
        new URL("./packages/vue/src/useRpc.ts", import.meta.url),
      ),
      "@vue-solana/vue/useSignAndSendTransaction": fileURLToPath(
        new URL("./packages/vue/src/useSignAndSendTransaction.ts", import.meta.url),
      ),
      "@vue-solana/vue/useSignMessage": fileURLToPath(
        new URL("./packages/vue/src/useSignMessage.ts", import.meta.url),
      ),
      "@vue-solana/vue/useSignatureStatus": fileURLToPath(
        new URL("./packages/vue/src/useSignatureStatus.ts", import.meta.url),
      ),
      "@vue-solana/vue/useSolana": fileURLToPath(
        new URL("./packages/vue/src/useSolana.ts", import.meta.url),
      ),
      "@vue-solana/vue/useTransaction": fileURLToPath(
        new URL("./packages/vue/src/useTransaction.ts", import.meta.url),
      ),
      "@vue-solana/vue/useTransactionConfirmation": fileURLToPath(
        new URL("./packages/vue/src/useTransactionConfirmation.ts", import.meta.url),
      ),
      "@vue-solana/vue/useWallet": fileURLToPath(
        new URL("./packages/vue/src/useWallet.ts", import.meta.url),
      ),
      "@vue-solana/vue/useWallets": fileURLToPath(
        new URL("./packages/vue/src/useWallets.ts", import.meta.url),
      ),
      "@vue-solana/vue/web3": fileURLToPath(new URL("./packages/vue/src/web3.ts", import.meta.url)),
      "@vue-solana/vue": fileURLToPath(new URL("./packages/vue/src/index.ts", import.meta.url)),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["packages/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/**/*.test.ts", "packages/**/*.test-utils.ts", "packages/**/*.d.ts"],
    },
  },
});
