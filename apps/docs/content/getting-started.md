---
title: Getting Started
description: Install Vue Solana packages, configure Vue or Nuxt, and test RPC reads on devnet.
---

This guide covers installing the Vue Solana packages, configuring Vue or Nuxt, testing Solana RPC reads, connecting browser wallets, and sending a small devnet transfer.

## Before You Start

Use `@solana/web3-compat` directly if you only need raw Solana APIs. Use `@vue-solana/vue` or `@vue-solana/nuxt` when you want framework integration.

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is Solana's official mainnet cluster name.
- `devnet`: best default for app development.
- `testnet`: validator and protocol testing network.
- `localnet`: local validator.

Use `devnet` while learning and testing. Use `mainnet-beta` only when you are ready to interact with real SOL.

## Install For Vue

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

```sh
npm install @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

For local workspace development inside this monorepo, the examples use workspace links instead of published versions.

## Install For Nuxt

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

```sh
npm install @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

## Known TypeScript Issue

`@solana/web3-compat@0.0.21` currently has broken TypeScript package metadata. Its package metadata points to `dist/types/index.d.ts`, but that file is not included in the published package.

Runtime imports still use the real `@solana/web3-compat` package. If TypeScript reports that it cannot find declarations for `@solana/web3-compat`, add this local declaration file to your app as `types/web3-compat.d.ts`:

```ts
declare module "@solana/web3-compat" {
  export type { Commitment, SendOptions, TransactionSignature } from "@solana/web3.js";
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
}
```

Make sure your `tsconfig.json` includes the file. Most Vue and Nuxt apps include `**/*.d.ts` by default. If yours does not, add an include pattern such as `types/**/*.d.ts`.

## Vue Setup

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

## Nuxt Setup

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

## Test RPC Without A Wallet

RPC reads work without a browser wallet.

In Vue, use `useRpc()`:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue";

const { cluster, endpoint, connection } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const result = await connection.getLatestBlockhash();
  latestBlockhash.value = result.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

In Nuxt, use the auto-imported `useSolanaRpc()`:

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </main>
</template>
```

## Get Devnet Or Testnet SOL

Devnet and testnet SOL are testing tokens with no real value.

Use the official faucet:

```txt
https://faucet.solana.com
```

Choose `Devnet` while following this guide. Choose `Testnet` only if you are testing against the testnet cluster.

If you have the Solana CLI installed, you can also run:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Never use a wallet with real funds while testing.

## Run The Examples

From the repository root:

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

For Nuxt:

```sh
pnpm dev:nuxt
```

The examples demonstrate plugin/module setup, RPC state, direct connection calls, balance reads, browser wallet discovery, wallet state, generic transaction state, and real devnet transfers.

## Connect A Browser Wallet

Install Phantom, Solflare, Backpack, or another Solana Wallet Standard browser wallet. Switch the wallet to devnet before testing.

In Vue:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

In Nuxt:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

Select a wallet from `wallets`, then call `connect()`.

## Send A Devnet Transfer

The Vue and Nuxt examples include recipient address and amount fields for a real transfer. Use a tiny amount such as `0.000001` SOL and a devnet wallet with enough devnet SOL for fees.

Browser apps that create or serialize `@solana/web3-compat` transactions should initialize the `buffer` polyfill before transaction code:

```ts
import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
```

The wallet will prompt you to approve the transaction. After approval, the example shows the transaction signature.

## More Reading

- [Solana For Vue Developers](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [Wallets](/concepts/wallets)
- [Troubleshooting](/troubleshooting)
- [Solana Documentation](https://solana.com/docs)
