---
type: Package Reference
title: "@vue-solana/nuxt API Reference"
description: Nuxt module configuration, auto-imported composables, and explicit imports for Solana integration.
tags:
  - nuxt
  - API
  - module
  - auto-imports
resource: https://github.com/vue-solana/vue-solana
timestamp: 2025-07-17T00:00:00Z
---

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

Nuxt module options are written to public runtime config, so they must be JSON-serializable. Use `wallet` only with the Vue plugin in client-only Vue code; Nuxt config intentionally omits custom wallet adapter objects. `ModuleOptions` also intentionally omits `payer` and `payerSecretKey`: direct core/Vue clients support them, but the module strips them and never forwards a raw secret to public runtime config. Install a client-owned `payer` in a client-only plugin.

## Auto-Imports

The Nuxt module installs the runtime plugin on the client only and auto-imports composables from the direct `@vue-solana/vue/*` subpaths. This keeps SSR bundles from pulling in the full Vue package barrel solely because a page uses one composable.

- `useSolana()`
- `useSolanaAccountInfo()`
- `useSolanaAction()`
- `useSolanaBalance()`
- `useSolanaClient()`
- `useSolanaConnection()`
- `useSolanaIdentity()`
- `useSolanaPayer()`
- `useSolanaPlanTransaction()`
- `useSolanaPlanTransactions()`
- `useSolanaProgramAccounts()`
- `useSolanaRequest()`
- `useSolanaRpc()`
- `useSolanaSelectedWalletAccount()`
- `useSolanaSendTransaction()`
- `useSolanaSendTransactions()`
- `useSolanaSignAndSendTransaction()`
- `useSolanaSignAndSendTransactions()`
- `useSolanaSignIn()`
- `useSolanaSignMessage()`
- `useSolanaSignTransactions()`
- `useSolanaSignatureStatus()`
- `useSolanaSubscription()`
- `useSolanaTokenAccounts()`
- `useSolanaTokenBalance()`
- `useSolanaTrackedData()`
- `useSolanaTransactionConfirmation()`
- `useSolanaWallet()`
- `useSolanaWallets()`

The Nuxt runtime plugin also installs the selected wallet account context app-wide (via `createSelectedWalletAccountContext`), so `useSolanaSelectedWalletAccount()` works in any component without an explicit provider. Apps that need a custom filter or storage can mount `SelectedWalletAccountProvider` deeper in the component tree to shadow the default context.

The default client uses the official `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` composition. The old custom fallback sender is not used. `useSolanaSendTransaction()` and `useSolanaSendTransactions()` use that official sender, which waits for `confirmed` commitment before reporting `sent`; the module does not provide a payer, so install a client-owned `payer` in a client-only plugin.

## Explicit Solana Imports

The browser Buffer helper is an explicit import, not an auto-import:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
```

Use the auto-imported `useSolanaClient()` and explicit imports from `@vue-solana/nuxt/kit` (`createSolanaClient`, `address`, `lamports`, and the types `Address`, `Commitment`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`):

```ts
import { address } from "@vue-solana/nuxt/kit";

const { rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
```

Use direct `@vue-solana/core/*` imports only for lower-level core usage.

Available package subpaths:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/kit`

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
