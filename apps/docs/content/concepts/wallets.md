---
title: Wallets
description: Browser wallet discovery, selection, connection, and transaction signing.
---

Vue Solana discovers browser wallets through the Solana Wallet Standard and adapts selected wallets into the shared `SolanaWallet` interface.

## What Works Today

- Browser wallet discovery with `useWallets()`.
- Wallet selection, connect, and disconnect.
- Wallet state through `useWallet()` and `useSolanaWallet()`.
- Transaction signing and sending when the selected wallet supports compatible Solana signing features.
- Manual wallet injection with `setWallet()` for tests and custom adapters.

## Discover And Connect

Discovery, selection, and connection are separate steps. `refreshWallets()` only updates the list of installed wallets, and `selectWallet()` only configures which wallet the app should use. `connected` stays `false` until `connect()` resolves successfully, even when a browser extension exposes previously authorized accounts after a page refresh.

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

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      {{ connecting ? "Connecting..." : "Connect" }}
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Nuxt apps use the same flow with auto-imported composables:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

## Send A Transfer

The examples include a real transfer form with recipient address and amount fields. It creates a Solana transaction, asks the connected wallet to sign/send, and displays the returned signature.

Browser apps that use `@solana/web3-compat` transaction code should install `buffer` and initialize it from `buffer/` before creating or serializing transactions:

```ts
import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
```

Use devnet for testing. Devnet SOL has no real value, but fees still apply.

## Manual Wallet Interface

Apps can still provide a wallet object that implements `SolanaWallet`.

```ts
import type { SolanaWallet } from "@vue-solana/core";

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connecting: false,
  connect: async () => {},
  disconnect: async () => {},
  signTransaction: async (transaction) => transaction,
};
```

Pass it to the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    wallet,
  }),
);
```

Or set it later:

```ts
const { setWallet } = useWallet();

setWallet(wallet);
```

## Current Limits

- Vue Solana does not render a wallet modal. Build your own selection UI with `useWallets()`.
- Auto-connect to a persisted wallet selection is not implemented yet. Vue Solana does not treat extension-exposed accounts as connected before `connect()` succeeds.
- Signing support depends on each wallet exposing compatible Solana Wallet Standard features.

Official references:

- [Wallet Standard](https://github.com/wallet-standard/wallet-standard)
- [Solana Wallet Standard](https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard)
- [Solana Documentation](https://solana.com/docs)
