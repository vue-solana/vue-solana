---
title: Wallets
description: Browser and Android mobile wallet discovery, selection, connection, and transaction signing.
---

Vue Solana exposes supported wallet sources through one flow: `useWallets()` for discovery and selection, then `useWallet()` for active wallet state and actions.

Current wallet support is built on these libraries:

- Browser extension wallets: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, and `@solana/wallet-standard-features`.
- Android mobile native wallets: `@solana-mobile/wallet-standard-mobile`, which registers Solana Mobile Wallet Adapter as a Wallet Standard wallet on supported Android Chrome mobile web and PWA runtimes.
- Solana primitives and transaction types: `@solana/web3-compat`.

## Support Matrix

| Wallet source                 | Current status | Library path                                                          | Notes                                                                                                    |
| ----------------------------- | -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Browser extension wallets     | Supported      | Wallet Standard packages plus `@solana/wallet-standard-features`      | Works for wallets that register as Solana Wallet Standard wallets and expose compatible features.        |
| Android native mobile wallets | Supported      | `@solana-mobile/wallet-standard-mobile`                               | Android Chrome and Chrome PWAs only. Appears as `Mobile Wallet Adapter` in the same `useWallets()` list. |
| Manual/custom wallet object   | Supported      | `SolanaWallet` interface                                              | Useful for tests, mocks, and custom adapters via plugin `wallet` or `setWallet()`.                       |
| iOS browser wallets           | Planned        | Wallet-specific universal link or deep link adapters                  | Not supported yet. iOS browsers do not support Mobile Wallet Adapter web flows.                          |
| Desktop native app wallets    | Planned        | Wallet-specific protocol links or future Wallet Standard registration | Not supported yet.                                                                                       |
| Wallet modal UI               | Not included   | App-owned UI                                                          | Build your own wallet list/modal with `useWallets()`.                                                    |

## What Works Today

- Browser extension wallet discovery with `useWallets()`.
- Android Mobile Wallet Adapter discovery through the same `useWallets()` list on supported Android Chrome runtimes.
- Wallet selection, connect, and disconnect.
- Wallet state through `useWallet()` and `useSolanaWallet()`.
- Transaction signing and sending when the selected wallet supports compatible Solana signing features.
- Manual wallet injection with `setWallet()` for tests and custom adapters.

## Discover And Connect

Discovery, selection, and connection are separate steps. `refreshWallets()` only updates the list of installed wallets, and `selectWallet()` only configures which wallet the app should use. `connected` stays `false` until `connect()` resolves successfully, even when a browser extension exposes previously authorized accounts after a page refresh.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

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

## Android Mobile Wallets

Android mobile wallet support uses `@solana-mobile/wallet-standard-mobile`. The Vue plugin registers Mobile Wallet Adapter during wallet refresh on supported Android Chrome clients. The registered adapter then appears as a standard wallet and is adapted through the same Wallet Standard adapter as browser extension wallets.

Configure app identity when installing the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Vue Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
  }),
);
```

Disable Android mobile wallet registration if your app does not want it:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    mobileWallet: false,
  }),
);
```

Platform notes:

- Supported: Android Chrome and Android Chrome PWAs.
- Not supported by MWA web: iOS Safari, iOS Chrome, Firefox Android, Brave Android, Opera Android, and desktop browsers.
- The registration helper is SSR-safe and returns without registering when `window` is unavailable.
- The mobile wallet package handles installed-wallet fallback UI through its default wallet-not-found handler.
- Browsers may show a one-time Local Network Access prompt before MWA can connect to an installed wallet app.

`SolanaWalletInfo.platform` is `"mobile"` and `SolanaWalletInfo.source` is `"mobile-wallet-adapter"` for the Android MWA wallet. Browser extension wallets use `platform: "browser"` and `source: "wallet-standard"`.

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
import type { SolanaWallet } from "@vue-solana/core/types";

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
- iOS browser wallet support is not implemented yet. It requires wallet-specific universal link or deep link adapters and callback handling.
- Desktop native app wallet support is not implemented yet. It requires wallet-specific protocol links or future native Wallet Standard registration.

Official references:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana Documentation](https://solana.com/docs)
