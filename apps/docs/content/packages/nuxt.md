---
title: "@vue-solana/nuxt"
description: Nuxt module for Solana applications.
---

`@vue-solana/nuxt` installs the Vue Solana plugin in Nuxt apps and auto-imports composables.

## Install

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

The `buffer` package is needed for browser apps that create or serialize `@solana/web3-compat` transactions.

## Module Setup

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

You can also configure a custom RPC endpoint:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

Supported clusters are `mainnet-beta`, `devnet`, `testnet`, and `localnet`. Use `mainnet-beta` for Solana mainnet; this is Solana's official cluster name.

## Auto-Imported Composables

The module auto-imports these composables from `@vue-solana/vue`:

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaSignAndSendTransaction()`

## Read RPC State

```vue
<script setup lang="ts">
const { cluster, endpoint, status, latestBlockhash, checkConnection } = useSolanaRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Read Balance

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <pre v-if="error">{{ error }}</pre>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Wallet State

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() }}</p>
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser wallets are discovered through the Solana Wallet Standard. `refreshWallets()` only updates the discovered wallet list, and `selectWallet()` only configures the active wallet. `connected` remains false until `connect()` succeeds, even if the extension exposes previously authorized accounts after a page refresh.

## Example App

For a complete runnable Nuxt flow, see the [Nuxt example](/examples/nuxt).
