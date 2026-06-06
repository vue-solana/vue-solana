---
title: "@vue-solana/vue"
description: Vue plugin and composables for Solana applications.
---

`@vue-solana/vue` provides a Vue plugin and composables for Solana RPC access, balance reads, wallet state, and transaction helper state.

## Install

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

The `buffer` package is needed for browser apps that create or serialize `@solana/web3-compat` transactions.

## Plugin Setup

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
    }),
  )
  .mount("#app");
```

You can also pass a custom RPC endpoint:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

## Composables

- `useSolana()`: returns the full injected Solana context.
- `useRpc()`: returns cluster, endpoint, connection status, latest blockhash, and `checkConnection()`.
- `useConnection()`: returns the Solana `Connection`.
- `useWallet()`: returns active wallet refs, computed connection state, and wallet actions.
- `useWallets()`: returns discovered browser wallets and wallet selection actions.
- `useBalance(address, commitment?)`: loads lamport balance for a `PublicKey` or address string.
- `useTransaction(handler)`: generic async transaction state helper.
- `useSignAndSendTransaction()`: signs and sends a transaction through the configured wallet.

## Read RPC State

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">Error: {{ error }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Read Balance

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useBalance } from "@vue-solana/vue";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);
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
import { useWallet, useWallets } from "@vue-solana/vue";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
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
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser wallets are discovered through the Solana Wallet Standard. `connect()` works after selecting a discovered wallet or configuring a custom `SolanaWallet` with `setWallet()`.

## Transaction State

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue";

const { signature, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  skipPreflight: false,
});
```

The current wallet must be connected and support either `signAndSendTransaction` or `signTransaction`.

## Example App

For a complete runnable Vue and Vite flow, see the [Vue Vite example](/examples/vue-vite).
