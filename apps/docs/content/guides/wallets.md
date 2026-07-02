---
title: "Wallets"
description: Discover wallets, select an active wallet, connect, disconnect, and check capabilities.
---

Vue Solana exposes browser extension wallets, Android Mobile Wallet Adapter wallets, and supported iOS browser wallet links through one wallet flow.

Use `useWallets()` to discover and select a wallet. Use `useWallet()` to connect, disconnect, read the active public key, and check wallet capabilities.

## Wallet Sources

Current wallet sources are:

- Browser extension wallets through Solana Wallet Standard.
- Android Mobile Wallet Adapter through Wallet Standard registration on supported Android Chrome clients.
- iOS browser wallet links for supported wallets such as Phantom, Solflare, and Backpack.

All sources appear in the same discovered wallet list. Apps should not build separate public flows for browser, Android, and iOS wallets unless they need platform-specific UI copy.

## Vue Wallet Flow

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Selecting a wallet does not connect it. The wallet remains disconnected until `connect()` resolves successfully.

## Nuxt Wallet Flow

Nuxt auto-imports the same wallet flow with `useSolanaWallets()` and `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

Trigger wallet work on the client from user actions. Wallet prompts should not run during SSR.

## Capability Checks

Wallets may support different features. Check capabilities before rendering actions.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

For framework-agnostic code, use wallet assertions from `@vue-solana/core/wallet`.

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey.toBase58());

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Auto Connect

`autoConnect` reconnects only a wallet identity that the user previously selected and that is discovered again on the client.

Vue Solana stores only wallet identity metadata under `localStorage["vue-solana:selected-wallet"]`: `name`, and `platform`/`source` when available. It never stores private keys, session data, or transaction data.

## Mobile Wallets

Android Mobile Wallet Adapter registration is enabled by default in the Vue plugin and Nuxt module on supported Android Chrome clients.

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

Pass `mobileWallet: false` to disable Android Mobile Wallet Adapter registration.

iOS wallet links are enabled by default on iOS browsers. Pass `iosWallet` options to customize app identity, redirect URL, chains, or cluster. Pass `iosWallet: false` to disable iOS wallet link discovery.

## Direct Core Helpers

Use direct core helpers only when you are building your own wallet integration layer.

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

If you use iOS core helpers directly, call `handleSolanaIosWalletCallback()` before relying on a returned iOS wallet connection after redirect.

## Security Notes

- Never request private keys from users.
- Never store wallet sessions or transaction data in local storage.
- Treat wallet names, icons, and metadata as untrusted display data.
- Ask for explicit user action before signing messages or transactions.
