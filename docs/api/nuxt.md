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

## Error Handling

Nuxt auto-imported composables expose the same normalized `SolanaError` values as `@vue-solana/vue`. Branch on `error.value?.code` for UI states and use `error.value?.cause` for diagnostics.

```vue
<script setup lang="ts">
const rpc = useSolanaRpc();
const rpcError = rpc.error;

async function checkConnection() {
  await rpc.checkConnection();
}
</script>

<template>
  <button type="button" @click="checkConnection">Check RPC</button>

  <p v-if="rpcError?.code === 'RPC_FAILURE'">RPC is unavailable. Try again in a moment.</p>
</template>
```
