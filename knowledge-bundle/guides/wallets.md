---
type: Guide
title: Wallet Support
description: Unified wallet discovery, selection, and connection through useWallets and useWallet in Vue Solana applications.
tags:
  - wallets
  - browser-extension
  - mobile
  - useWallets
  - useWallet
resource: https://solana.com/docs
timestamp: 2025-07-17T00:00:00Z
---

# Wallet Support

Vue Solana exposes supported wallet sources through one flow: `useWallets()` for discovery and selection, then `useWallet()` for active wallet state and actions.

Current wallet support is built on these libraries:

- Browser extension wallets: discovered through `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, and Solana signing features from `@solana/wallet-standard-features`.
- Android mobile native wallets: registered through `@solana-mobile/wallet-standard-mobile`, which exposes Solana Mobile Wallet Adapter as a Wallet Standard wallet on supported Android Chrome mobile web and PWA runtimes.
- iOS browser wallets: exposed as wallet-specific universal link entries for Phantom, Solflare, and Backpack on iOS browsers.
- Solana primitives and transaction types: provided through `@vue-solana/vue/web3` for Vue apps, `@vue-solana/nuxt/web3` for Nuxt apps, and `@vue-solana/core/web3` for framework-agnostic core usage.

Wallets such as Phantom, Solflare, Backpack, and other Solana Wallet Standard-compatible wallets can be discovered at runtime when they register with Wallet Standard. Android users can also see `Mobile Wallet Adapter` when browsing on supported Android Chrome mobile web and PWA runtimes. iOS browser users can see Phantom, Solflare, and Backpack universal-link entries even though Mobile Wallet Adapter web flows are not available on iOS.

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

- RPC connection setup and health checks.
- Balance reads for any public key.
- Browser extension wallet discovery with `useWallets()`.
- Android Mobile Wallet Adapter discovery through the same `useWallets()` list on supported Android Chrome runtimes.
- iOS Phantom, Solflare, and Backpack universal-link discovery through the same `useWallets()` list on iOS browsers.
- Wallet selection, connect, and disconnect.
- Message signing for wallet-auth flows when the active wallet exposes a compatible message signing feature.
- Transaction signing through the active wallet when the wallet exposes compatible signing features.
- Manual wallet injection with `setWallet()` for tests or custom adapters.

## Unified Wallet Flow

Use `useWallets()` to list discovered wallets and select one. Use `useWallet()` for the active wallet state and actions.

Discovery, selection, and connection are separate steps. `refreshWallets()` only updates the list of installed wallets, and `selectWallet()` only configures which wallet the app should use. `connected` stays `false` until `connect()` resolves successfully, even when a browser extension exposes previously authorized accounts after a page refresh.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, selectWallet, refreshWallets } = useWallets();
const { publicKey, connected, connecting, disconnecting, canSignMessage, connect, disconnect } =
  useWallet();
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
    <button type="button" :disabled="!connected || disconnecting" @click="disconnect">
      {{ disconnecting ? "Disconnecting..." : "Disconnect" }}
    </button>

    <p>Message auth: {{ canSignMessage ? "Supported" : "Unsupported" }}</p>
  </section>
</template>
```

## Real Transfer Flow

After a wallet is selected and connected, create a normal Solana transaction and send it with `useSignAndSendTransaction()`. Browser apps that create or serialize transactions should initialize the Vue package Buffer polyfill before transaction code runs.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";
import { PublicKey, Transaction, TransactionInstruction } from "@vue-solana/vue/web3";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useWallet } from "@vue-solana/vue/useWallet";

installSolanaBufferPolyfill();

const connection = useConnection();
const wallet = useWallet();
const sendTransaction = useSignAndSendTransaction();
const systemProgramId = new PublicKey("11111111111111111111111111111111");

async function sendLamports(recipient: string, lamports: number) {
  if (!wallet.publicKey.value) {
    throw new Error("Connect a wallet first");
  }

  const transaction = new Transaction();
  const latestBlockhash = await connection.getLatestBlockhash();
  const recipientPublicKey = new PublicKey(recipient);
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);

  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

  transaction.feePayer = wallet.publicKey.value;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.add(
    new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey.value, isSigner: true, isWritable: true },
        { pubkey: recipientPublicKey, isSigner: false, isWritable: true },
      ],
      programId: systemProgramId,
      data,
    }),
  );

  const signature = await sendTransaction.execute(transaction, {
    skipPreflight: false,
    confirm: true,
    confirmation: { commitment: "confirmed" },
  });

  return {
    signature,
    status: sendTransaction.status.value,
    explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  };
}
```

Use devnet while testing. Devnet SOL has no real value, but transactions still consume fees. The returned signature is safe to display immediately; render the confirmation `status` separately so users can distinguish a submitted transaction from one that reached the requested commitment. If you intentionally want signature-only behavior, omit `confirm: true` and direct users to the explorer link for final status.

## Manual Wallet Interface

Apps can still provide a wallet object that implements `SolanaWallet`. This is useful for tests, mocks, or custom wallet integrations.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connecting: false,
  disconnecting: false,
  platform: "browser",
  source: "wallet-standard",
  connect: async () => {},
  disconnect: async () => {},
  signMessage: async (message) => ({ signedMessage: message, signature: new Uint8Array(64) }),
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

- The library discovers standard wallets and exposes wallet metadata, but it does not render a wallet modal. Build your own selection UI with `useWallets()`.
- Wallet selection is persisted under `localStorage["vue-solana:selected-wallet"]` as non-sensitive identity metadata: `name`, and `platform`/`source` when available. If the same wallet is discovered after reload, the selected wallet is restored. If it is missing, the stored identity is kept so it can restore later. Calling `selectWallet(null)` or `setWallet(customWallet)` clears the stored selection.
- `autoConnect` is opt-in and only calls `connect()` for a restored, previously selected wallet. The library does not auto-connect to an arbitrary installed wallet or treat extension-exposed accounts as connected before `connect()` succeeds.
- Signing support depends on each wallet exposing the relevant Solana Wallet Standard signing feature.
- Message signing support is exposed separately from transaction signing through `canSignMessage` and `signMessage`.
- iOS browser wallet support is available for Phantom, Solflare, and Backpack through universal links. Capability support differs by wallet.
- Desktop native app wallet support is not implemented yet. It requires wallet-specific protocol links or future native Wallet Standard registration.

Planned wallet work is tracked in [`plans/native-wallet-plan.md`](../../plans/native-wallet-plan.md).

## Related

- [Android Mobile Wallets](./wallet-android.md)
- [iOS Browser Wallets](./wallet-ios.md)
- [Message Signing For Authentication](./message-signing.md)
