# `@vue-solana/nuxt` API Reference

## Module Config

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    endpoint: "https://api.devnet.solana.com",
    wsEndpoint: "wss://api.devnet.solana.com",
    commitment: "confirmed",
    iosWallet: {
      redirectUrl: "https://example.com/wallet-callback",
    },
  },
});
```

Nuxt module options are written to public runtime config, so they must be JSON-serializable. Use `wallet` only with the Vue plugin in client-only Vue code; Nuxt config intentionally omits custom wallet adapter objects.

## Auto-Imports

The Nuxt module installs the runtime plugin on the client only and auto-imports composables from the direct `@vue-solana/vue/*` subpaths. This keeps SSR bundles from pulling in the full Vue package barrel solely because a page uses one composable.

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaSignMessage()`
- `useSolanaSignAndSendTransaction()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`
