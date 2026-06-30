---
title: Wallets
description: Browser, Android, and iOS wallet discovery, selection, connection, and transaction signing.
---

Vue Solana exposes supported wallet sources through one flow: `useWallets()` for discovery and selection, then `useWallet()` for active wallet state and actions.

Current wallet support is built on these libraries:

- Browser extension wallets: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, and `@solana/wallet-standard-features`.
- Android mobile native wallets: `@solana-mobile/wallet-standard-mobile`, which registers Solana Mobile Wallet Adapter as a Wallet Standard wallet on supported Android Chrome mobile web and PWA runtimes.
- iOS browser wallets: wallet-specific universal links for Phantom, Solflare, and Backpack.
- Solana primitives and transaction types: `@solana/web3-compat`.

## Support Matrix

| Wallet source                 | Current status | Library path                                                          | Notes                                                                                                    |
| ----------------------------- | -------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Browser extension wallets     | Supported      | Wallet Standard packages plus `@solana/wallet-standard-features`      | Works for wallets that register as Solana Wallet Standard wallets and expose compatible features.        |
| Android native mobile wallets | Supported      | `@solana-mobile/wallet-standard-mobile`                               | Android Chrome and Chrome PWAs only. Appears as `Mobile Wallet Adapter` in the same `useWallets()` list. |
| Manual/custom wallet object   | Supported      | `SolanaWallet` interface                                              | Useful for tests, mocks, and custom adapters via plugin `wallet` or `setWallet()`.                       |
| iOS browser wallets           | Supported      | Wallet-specific universal link adapters                               | Phantom, Solflare, and Backpack on iOS browsers. Requires redirect/callback handling.                    |
| Desktop native app wallets    | Planned        | Wallet-specific protocol links or future Wallet Standard registration | Not supported yet.                                                                                       |
| Wallet modal UI               | Not included   | App-owned UI                                                          | Build your own wallet list/modal with `useWallets()`.                                                    |

## What Works Today

- Browser extension wallet discovery with `useWallets()`.
- Android Mobile Wallet Adapter discovery through the same `useWallets()` list on supported Android Chrome runtimes.
- iOS Phantom, Solflare, and Backpack universal-link discovery through the same `useWallets()` list on iOS browsers.
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

For Android MWA transaction sends, Vue Solana asks the mobile wallet to sign and then submits the signed transaction through the app's RPC connection when the wallet supports `signTransaction`. This keeps the returned signature under app control and avoids a mobile handoff edge case where the wallet sends successfully but the browser page does not receive the wallet adapter response.

## iOS Browser Wallets

iOS browser wallet support uses wallet-specific universal links because Mobile Wallet Adapter web registration is Android Chrome-only. Phantom, Solflare, and Backpack entries are enabled by default on iOS browsers and appear in the same `useWallets()` list as other wallet sources.

Configure iOS wallet identity or redirect behavior when installing the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    iosWallet: {
      appIdentity: {
        name: "My Vue Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
      redirectUrl: "https://example.com",
    },
  }),
);
```

Disable iOS wallet link discovery if your app does not want it:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    iosWallet: false,
  }),
);
```

Platform notes:

- Supported: iOS browsers with Phantom, Solflare, or Backpack installed.
- Not supported by these adapters: desktop native apps and wallets without a supported universal-link flow.
- The Vue plugin handles wallet redirect callbacks during wallet refresh on the client.
- If you use core helpers directly, call `handleSolanaIosWalletCallback()` before relying on a returned iOS wallet connection.
- Capability support differs by wallet. Check each discovered wallet's metadata before rendering transaction actions.

`SolanaWalletInfo.platform` is `"mobile"` and `SolanaWalletInfo.source` is `"deep-link"` for iOS browser wallet entries.

## Send A Transfer

The examples include a real transfer form with recipient address and amount fields. It creates a Solana transaction, asks the connected wallet to sign or send, and displays the returned signature.

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
- Wallet selection is persisted under `localStorage["vue-solana:selected-wallet"]` as non-sensitive identity metadata: `name`, and `platform`/`source` when available. If the same wallet is discovered after reload, the selected wallet is restored. If it is missing, the stored identity is kept so it can restore later. Calling `selectWallet(null)` or `setWallet(customWallet)` clears the stored selection.
- `autoConnect` is opt-in and only calls `connect()` for a restored, previously selected wallet. Vue Solana does not auto-connect arbitrary installed wallets or treat extension-exposed accounts as connected before `connect()` succeeds.
- Signing support depends on each wallet exposing compatible Solana Wallet Standard features.
- iOS browser wallet support is available for Phantom, Solflare, and Backpack through universal links. Capability support differs by wallet.
- Desktop native app wallet support is not implemented yet. It requires wallet-specific protocol links or future native Wallet Standard registration.

Official references:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana Documentation](https://solana.com/docs)
