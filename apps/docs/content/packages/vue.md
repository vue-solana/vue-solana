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
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

Android Mobile Wallet Adapter registration is enabled by default on supported Android Chrome clients. Pass `mobileWallet` options to customize the MWA app identity, or pass `mobileWallet: false` to disable Android mobile wallet registration.

iOS browser wallet links are enabled by default on iOS browsers for Phantom, Solflare, and Backpack. Pass `iosWallet` options to customize app identity, redirect URL, chains, or cluster, or pass `iosWallet: false` to disable iOS wallet link discovery.

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

The root export remains supported. For composables, prefer direct subpath imports in new code so bundlers can avoid evaluating unrelated package entry code:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Direct composable subpaths:

- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignAndSendTransaction`

- `useSolana()`: returns the full injected Solana context.
- `useRpc()`: returns cluster, endpoint, connection status, latest blockhash, and `checkConnection()`.
- `useConnection()`: returns the Solana `Connection`.
- `useAccountInfo(address, options?)`: loads account data and can subscribe to account changes.
- `useProgramAccounts(programId, options?)`: loads accounts owned by a program id with optional filters and data slicing.
- `useWallet()`: returns active wallet refs, computed connection state, and wallet actions.
- `useWallets()`: returns discovered browser extension wallets, Android Mobile Wallet Adapter wallets, supported iOS browser wallet entries, and wallet selection actions.
- `useBalance(address, commitment?)`: loads lamport balance for a `PublicKey` or address string.
- `useTransaction(handler, options?)`: generic async transaction state helper with optional timeout settings.
- `useTransactionConfirmation(options?)`: confirms a submitted signature with reactive status and timeout/error state.
- `useSignatureStatus(signature, options?)`: reads, polls, or subscribes to signature status updates.
- `useSignAndSendTransaction()`: signs and sends a transaction through the configured wallet, with optional confirmation waiting.

## Read RPC State

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

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
import { useBalance } from "@vue-solana/vue/useBalance";

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

## Read Account Info

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <pre v-if="error">{{ error }}</pre>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()` clears state without calling RPC when the address is null. Invalid address strings clear stale `accountInfo`, set `error`, and do not call `getAccountInfo()`. When `watch: true` is enabled, the websocket listener is removed automatically on component unmount. Calling `stopWatching()` removes the current listener and prevents automatic restarts for that composable instance.

## Read Program Accounts

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <pre v-if="error">{{ error }}</pre>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()` clears state without calling RPC when the program id is null. Invalid program id strings clear stale `accounts`, set `error`, and do not call `getProgramAccounts()`.

> Warning: `useProgramAccounts()` can be expensive. Each refresh may scan a large program-owned account set, consume significant RPC credits, hit provider rate limits, or time out. Do not run broad scans from high-traffic UI paths. Use narrow filters, `dataSlice`, caching, indexing, pagination strategies, or dedicated RPC infrastructure for production reads.

## Wallet State

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
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallets are discovered through the Solana Wallet Standard. Android Mobile Wallet Adapter wallets are registered through `@solana-mobile/wallet-standard-mobile` and exposed through the same `useWallets()` list on supported Android Chrome clients. iOS Phantom, Solflare, and Backpack entries are exposed through wallet-specific universal links on iOS browsers. `refreshWallets()` only updates the discovered wallet list, and `selectWallet()` only configures the active wallet. `connected` remains false until `connect()` succeeds, even if the extension exposes previously authorized accounts after a page refresh.

Desktop native app wallet adapters are not implemented yet. Desktop native support requires wallet-specific protocol links or future native Wallet Standard registration.

Composables return inert SSR-safe state when no plugin context is available. Real RPC and wallet operations still require the plugin-provided client context.

## Transaction State

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

The current wallet must be connected and support either `signAndSendTransaction` or `signTransaction`. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available. This avoids a mobile handoff edge case where the wallet sends successfully but the browser page does not receive the wallet adapter's returned signature.

Without `confirm: true`, `execute()` returns after submission and sets `status` to `sent`. With confirmation enabled, status moves through `sending`, `confirming`, and then `processed`, `confirmed`, or `finalized` to match the requested commitment. If confirmation times out or fails, the submitted `signature` remains available so the app can link to an explorer.

`useSignAndSendTransaction()` also clears `loading` if a wallet adapter never returns a result. In that stale case, `error` is set and the chain status may be unknown, so check the connected wallet or an explorer before retrying.

## Confirm an Existing Signature

Use `useTransactionConfirmation()` when your app already has a submitted signature and wants to wait for a specific commitment separately from signing and sending:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

The composable preserves the submitted `signature` when confirmation times out or the RPC call fails, so apps can still show an explorer link while surfacing `error` to the user.

## Track Signature Status

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling, stopSubscription } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
    subscribe: true,
    commitment: "confirmed",
  },
);
```

Polling uses `getSignatureStatuses()` on every interval, so stop polling when the UI no longer needs updates. Calling `stopPolling()` clears the current interval and prevents automatic polling restarts for that composable instance. Invalid signatures clear stale `status`, set `error`, and do not call RPC or start polling. Invalid `pollIntervalMs` values less than or equal to `0` set a `RangeError` and do not start polling. `subscribe: true` uses `onSignature()` and removes the listener on component unmount. Calling `stopSubscription()` removes the current signature listener and prevents automatic restarts for that composable instance.

## Example App

For a complete runnable Vue and Vite flow, see the [Vue Vite example](/examples/vue-vite).
