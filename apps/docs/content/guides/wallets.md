---
title: "Wallets"
description: Discover wallets, select an active wallet, connect, disconnect, and check capabilities.
ogSection: Guides
surroundOrder: 9
---

Vue Solana exposes browser extension wallets, Android Mobile Wallet Adapter wallets, and supported iOS browser wallet links through one wallet flow.

Use `useWallets()` to discover and select a wallet. Use `useWallet()` to connect, disconnect, read the active public key, and check wallet capabilities.

Current wallet support is built on these libraries:

- Browser extension wallets: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, and `@solana/wallet-standard-features`.
- Android mobile native wallets: `@solana-mobile/wallet-standard-mobile`, which registers Solana Mobile Wallet Adapter as a Wallet Standard wallet on supported Android Chrome mobile web and PWA runtimes.
- iOS browser wallets: wallet-specific universal links for Phantom, Solflare, and Backpack.
- Solana primitives and transaction types: `@vue-solana/vue/web3` for Vue apps, `@vue-solana/nuxt/web3` for Nuxt apps, and `@vue-solana/core/web3` for framework-agnostic core usage.

## Wallet Sources

Current wallet sources are:

- Browser extension wallets through Solana Wallet Standard.
- Android Mobile Wallet Adapter through Wallet Standard registration on supported Android Chrome clients.
- iOS browser wallet links for supported wallets such as Phantom, Solflare, and Backpack.

All sources appear in the same discovered wallet list. Apps should not build separate public flows for browser, Android, and iOS wallets unless they need platform-specific UI copy.

## Support Matrix

| Wallet path                   | v1 status                                   | How it appears                                          | Notes                                                                |
| ----------------------------- | ------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Browser extension wallets     | Supported                                   | `platform: "browser"`, `source: "wallet-standard"`      | Uses Solana Wallet Standard registration.                            |
| Android native mobile wallets | Supported on Android Chrome and Chrome PWAs | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | Registered through `@solana-mobile/wallet-standard-mobile`.          |
| iOS browser wallets           | Supported for configured wallet links       | `platform: "mobile"`, `source: "deep-link"`             | Phantom, Solflare, and Backpack are exposed through universal links. |
| Manual/custom wallet objects  | Supported                                   | App-provided wallet                                     | Must implement the `SolanaWallet` interface.                         |
| Desktop native app wallets    | Deferred from v1                            | Not exposed by default                                  | Reserved `protocol-link` metadata is available for future adapters.  |

What works today:

- Discovering wallets from all supported sources in one `wallets` list.
- Selecting one active wallet without immediately connecting it.
- Persisting selected wallet identity metadata for optional reconnect flows.
- Connecting, disconnecting, signing messages, signing transactions, and signing/sending transactions when the selected wallet supports those capabilities.
- Rendering unsupported-capability UI from `canSignMessage`, `canSignTransaction`, `canSignAllTransactions`, and `canSignAndSendTransaction`.

What is not included in v1:

- A built-in wallet modal or UI package.
- Desktop native protocol-link adapters.
- Server-side wallet prompts.
- Private-key or seed-phrase handling.

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

Call `selectWallet(null)` when users explicitly clear wallet selection. Call `setWallet(customWallet)` from `useWallet()` only when your app owns a custom wallet object; normal app UI should select from `useWallets()`.

If local storage is unavailable, wallet selection still works for the current page session but persisted restore can fail with a normalized `STORAGE_FAILURE` error.

## Message Signing For Auth

Message signing proves wallet control for off-chain auth. It does not authorize an on-chain transaction. Use clear challenge text and verify it on your backend.

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

Keep nonces single-use and short-lived. Do not use raw wallet or RPC error messages as user-facing auth errors.

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

Android notes:

- Android MWA registration is client-only and no-ops during SSR.
- It is expected to work only in Android Chrome or Chrome PWA runtimes that support the mobile wallet adapter bridge.
- The wallet handoff can leave the browser and return to the app; preserve UI state so users can see the submitted signature after redirect.
- Vue Solana adapts MWA wallets into the same `SolanaWallet` interface as extension wallets.
- The mobile wallet package handles installed-wallet fallback UI through its default wallet-not-found handler.
- Browsers may show a one-time Local Network Access prompt before MWA can connect to an installed wallet app.
- For Android MWA transaction sends, Vue Solana asks the mobile wallet to sign and then submits the signed transaction through the app's RPC connection when the wallet supports `signTransaction`. This keeps the returned signature under app control and avoids a mobile handoff edge case where the wallet sends successfully but the browser page does not receive the wallet adapter response.

iOS notes:

| Capability                 | v1 behavior                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Discovery                  | Phantom, Solflare, and Backpack entries can appear on iOS browsers.                     |
| Connection                 | Uses wallet-specific universal links and redirect callbacks.                            |
| Session handling           | Apps should handle callback state before assuming a wallet is connected after redirect. |
| Transactions               | Capability depends on the wallet link and returned session data.                        |
| Desktop Safari native apps | Not implemented as a v1 desktop-native path.                                            |

If you use iOS core helpers directly, call `handleSolanaIosWalletCallback()` early in client startup so redirect data is validated and decrypted before the app reads wallet state.

## Manual Wallet Interface

Custom wallet integrations can provide a `SolanaWallet` object directly through the Vue plugin or `setWallet()`.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

Manual wallet objects should never expose private keys to Vue Solana. Keep key custody inside the wallet provider.

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
- Show disabled or explanatory UI for unsupported capabilities instead of attempting wallet calls blindly.
- Keep devnet as the default for examples and tutorials; use `mainnet-beta` only when real funds are intended.

Official references:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana Documentation](https://solana.com/docs)
