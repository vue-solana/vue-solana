---
title: Getting Started
description: Install Vue Solana packages, configure Vue or Nuxt, and test RPC reads on devnet.
---

This guide covers installing the Vue Solana packages, configuring Vue or Nuxt, testing Solana RPC reads, connecting supported wallets, signing messages, sending a real devnet transfer, and verifying the result. The examples use devnet by default for safe testing.

## Before You Start

Use `@solana/web3-compat` directly if you only need raw Solana APIs. Use `@vue-solana/vue` or `@vue-solana/nuxt` when you want framework integration.

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is Solana's official mainnet cluster name.
- `devnet`: best default for app development.
- `testnet`: validator and protocol testing network.
- `localnet`: local validator.

Use `devnet` while learning and testing. Use `mainnet-beta` only when you are ready to interact with real SOL.

Current wallet support:

- Browser extension wallets through Solana Wallet Standard packages.
- Android native mobile wallets through `@solana-mobile/wallet-standard-mobile` on Android Chrome and Chrome PWAs.
- iOS browser wallets for Phantom, Solflare, and Backpack through wallet-specific universal links.
- Manual/custom wallet objects that implement `SolanaWallet`.

Planned but not supported yet:

- Desktop native app wallets through wallet-specific protocol links or future native Wallet Standard registration.

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
  export type {
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    TransactionSignature,
  } from "@solana/web3.js";
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
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
      iosWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet` and `iosWallet` are optional. Android Mobile Wallet Adapter registration and iOS Phantom, Solflare, and Backpack links are enabled by default when the browser runtime supports them. Pass `mobileWallet: false` or `iosWallet: false` to disable either source.

For Vue composables, prefer direct subpath imports in new code:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
```

## Nuxt Setup

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

The Nuxt module installs the runtime plugin on the client only and auto-imports composables from direct `@vue-solana/vue/*` subpaths. Composables are safe to call during SSR, but real RPC and wallet operations should run after hydration, such as from `onMounted()` or user actions. Nuxt `solana` options live in public runtime config, so keep them JSON-serializable.

## Test RPC Without A Wallet

RPC reads work without a browser wallet.

In Vue, use `useRpc()`:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

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

The examples demonstrate plugin/module setup, RPC state, direct connection calls, balance reads, unified wallet discovery, persisted wallet selection, wallet state, message signing, generic transaction state, transaction transfer flows, confirmation status, explorer links, and unsupported capability UI. They use devnet by default for safe testing.

## Connect A Wallet

Install Phantom, Solflare, Backpack, or another Solana Wallet Standard browser wallet. Switch the wallet to devnet before testing.

On Android Chrome or an Android Chrome PWA, install a compatible Solana mobile wallet such as Phantom, Solflare, or Seed Vault Wallet. `Mobile Wallet Adapter` can appear in the same wallet list after `refreshWallets()`.

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

Select a wallet from `wallets`, then call `connect()`. Selecting a wallet only configures the active wallet; it does not connect it. Some extensions expose previously authorized accounts after a page refresh, but Vue Solana still keeps `connected` false until `connect()` succeeds.

When `autoConnect` is enabled, Vue Solana restores only the wallet identity the user selected previously and only after that wallet is discovered again on the client. It stores `name`, `platform`, and `source` metadata in `localStorage`, not private keys, sessions, or transactions.

iOS browser wallet support uses wallet-specific universal links because Mobile Wallet Adapter web support is Android Chrome-only. Phantom, Solflare, and Backpack appear in the same `useWallets()` list on iOS browsers.

## Manual Wallet Testing

Use this checklist when validating a browser extension, Android MWA wallet, or iOS browser wallet by hand.

1. Configure the app for `devnet` and verify the UI shows the devnet endpoint.
2. Install a supported wallet and switch the wallet itself to devnet.
3. Fund the wallet with devnet SOL from `https://faucet.solana.com`.
4. Open the example app and click the wallet refresh action.
5. Confirm the wallet appears in the unified wallet list with the expected source.
6. Select the wallet and verify selection alone does not connect it.
7. Click connect and approve the wallet prompt.
8. Confirm the public key and `connected` state update after `connect()` resolves.
9. Reload the page and confirm the previously selected wallet identity can be restored without arbitrary wallet selection.
10. Disconnect and verify public key and connected state clear.

Expected wallet sources:

| Platform                     | Expected source         | Notes                                                                              |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| Desktop browser extension    | `wallet-standard`       | Phantom, Solflare, Backpack, and other standard wallets can appear when installed. |
| Android Chrome or Chrome PWA | `mobile-wallet-adapter` | Requires a compatible native wallet and Android MWA browser support.               |
| iOS browser                  | `deep-link`             | Phantom, Solflare, and Backpack entries use wallet-specific universal links.       |
| Desktop native app           | Not implemented in v1   | Desktop native protocol links are explicitly deferred from v1.                     |

## Sign A Message

Use message signing for wallet ownership checks or authentication challenges. It does not submit a transaction and does not authorize on-chain state changes.

In Vue:

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

In Nuxt:

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Render a disabled auth button when `canSignMessage` is false. Some wallets can connect and sign transactions without supporting arbitrary message signing.

For manual testing, use a clear challenge string that includes your domain, a nonce, and an expiration time. Never ask users to sign blank or ambiguous messages.

```ts
const challenge = new TextEncoder().encode(
  "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

After signing, verify that the UI shows the returned signature bytes and does not treat the message signature as an on-chain transaction.

## Send A Transfer

The Vue and Nuxt examples include recipient address and amount fields for a real transfer. They use devnet by default so you can test with SOL that has no real value. For mainnet, configure `mainnet-beta` or a mainnet RPC endpoint and use a wallet with real SOL for fees.

Start with a tiny amount such as `0.000001` SOL while testing.

Browser apps that create or serialize `@solana/web3-compat` transactions should initialize the `buffer` polyfill before transaction code:

```ts
import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
```

The wallet will prompt you to approve the transaction. After approval, the example shows the transaction signature, confirmation state, and explorer link. On Android Mobile Wallet Adapter, Vue Solana prefers wallet signing plus app-side RPC submission when supported, which makes the returned signature more reliable after the wallet redirects back to the browser.

For manual transfer testing:

1. Keep both the app and wallet on devnet.
2. Use a recipient address you control or a newly generated devnet wallet.
3. Start with `0.000001` SOL.
4. Review the wallet prompt before approval.
5. After submission, wait for the example to show confirmation status.
6. Open the explorer link and confirm it uses the devnet cluster query.
7. Refresh the sender and recipient balances.

Explorer URLs should be cluster-aware:

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

If confirmation times out after a signature is returned, do not immediately resubmit. Check the signature status or explorer first; the transaction may still confirm.

## Final Verification

Before relying on an app flow, verify these behaviors on devnet:

- RPC reads work without a wallet.
- Wallet discovery shows only supported wallet sources for the current platform.
- Wallet selection and connection are separate user actions.
- Optional `autoConnect` restores only the previously selected wallet identity.
- Unsupported message signing or transaction signing capabilities are disabled in the UI.
- Message signing returns a signature without submitting an on-chain transaction.
- Transfer submission returns a signature and confirmation status.
- Explorer links point to the same cluster as the app.
- `mainnet-beta` is used only when you intentionally configure mainnet and understand that real SOL is at risk.

## More Reading

- [Solana For Vue Developers](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [Wallets](/concepts/wallets)
- [Wallet Guide](/guides/wallets)
- [Transaction Guide](/guides/transactions)
- [Troubleshooting](/troubleshooting)
- [Solana Documentation](https://solana.com/docs)
