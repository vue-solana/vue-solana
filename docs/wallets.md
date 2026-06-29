# Wallet Support

Vue Solana exposes supported wallet sources through one flow: `useWallets()` for discovery and selection, then `useWallet()` for active wallet state and actions.

Current wallet support is built on these libraries:

- Browser extension wallets: discovered through `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, and Solana signing features from `@solana/wallet-standard-features`.
- Android mobile native wallets: registered through `@solana-mobile/wallet-standard-mobile`, which exposes Solana Mobile Wallet Adapter as a Wallet Standard wallet on supported Android Chrome mobile web and PWA runtimes.
- iOS browser wallets: exposed as wallet-specific universal link entries for Phantom, Solflare, and Backpack on iOS browsers.
- Solana primitives and transaction types: provided through `@solana/web3-compat`.

Wallets such as Phantom, Solflare, Backpack, and other Solana Wallet Standard-compatible wallets can be discovered at runtime when they register with Wallet Standard. Android users can also see `Mobile Wallet Adapter` when browsing on supported Android Chrome runtimes with compatible native wallet apps. iOS browser users can see Phantom, Solflare, and Backpack universal-link entries even though Mobile Wallet Adapter web flows are not available on iOS.

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
const { publicKey, connected, connecting, disconnecting, connect, disconnect } = useWallet();
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
  </section>
</template>
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

`SolanaWalletInfo.platform` is `"mobile"` and `SolanaWalletInfo.source` is `"mobile-wallet-adapter"` for the Android MWA wallet. Browser extension wallets use `platform: "browser"` and `source: "wallet-standard"`. iOS browser wallet entries use `platform: "mobile"` and `source: "deep-link"`.

## iOS Browser Wallets

iOS browser wallet support uses wallet-specific universal links because iOS browsers do not support Solana Mobile Wallet Adapter web flows. Vue Solana exposes Phantom, Solflare, and Backpack entries through the same `useWallets()` list on iOS browsers.

Supported iOS wallet capabilities:

| Wallet   | Connect | Sign transaction | Sign all transactions | Sign and send transaction |
| -------- | ------- | ---------------- | --------------------- | ------------------------- |
| Phantom  | Yes     | Yes              | Yes                   | No                        |
| Solflare | Yes     | Yes              | Yes                   | Yes                       |
| Backpack | Yes     | Yes              | Yes                   | Yes                       |

Phantom's `signAndSendTransaction` deeplink is deprecated by Phantom, so Vue Solana does not expose that capability for Phantom iOS entries.

Configure app identity and callback URL when installing the Vue plugin:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    iosWallet: {
      appIdentity: {
        name: "My Vue Solana App",
        uri: "https://example.com",
        icon: "https://example.com/favicon.ico",
      },
      redirectUrl: "https://example.com/wallet-callback",
    },
  }),
);
```

Disable iOS browser wallet entries if your app does not want them:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
    iosWallet: false,
  }),
);
```

Callback notes:

- Wallet apps redirect back to `redirectUrl` with encrypted callback data.
- The Vue plugin handles callbacks during `refreshWallets()` and stores iOS wallet sessions in `sessionStorage`.
- Apps with custom callback routes can also call `handleSolanaIosWalletCallback()` from `@vue-solana/core/ios-wallet`.
- Pending iOS callback state expires after 10 minutes and is cleared after success, wallet errors, incomplete callbacks, decrypt failures, or invalid public keys.
- iOS `connect()` opens a wallet app and waits for a redirect; the original promise does not resolve if the user cancels or never returns to the browser. Reflect that possibility in app UI.
- Use an HTTPS callback URL for browser apps. Custom schemes are mainly for native apps.

For Android MWA transaction sends, Vue Solana asks the mobile wallet to sign and then submits the signed transaction through the app's RPC connection when the wallet supports `signTransaction`. This keeps the returned signature under app control and avoids a mobile handoff edge case where the wallet sends successfully but the browser page does not receive the wallet adapter response.

## Real Transfer Flow

After a wallet is selected and connected, create a normal Solana transaction and send it with `useSignAndSendTransaction()`. Browser apps that use `@solana/web3-compat` transaction code should install `buffer` and import from `buffer/` so Vite/Nuxt use the browser polyfill instead of the Node builtin.

```ts
import { Buffer } from "buffer/";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3-compat";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useWallet } from "@vue-solana/vue/useWallet";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

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
- iOS browser wallet support is available for Phantom, Solflare, and Backpack through universal links. Capability support differs by wallet.
- Desktop native app wallet support is not implemented yet. It requires wallet-specific protocol links or future native Wallet Standard registration.

Planned wallet work is tracked in [`docs/native-wallet-plan.md`](./native-wallet-plan.md).
