# @vue-solana/vue

[![npm version](https://img.shields.io/npm/v/@vue-solana/vue.svg)](https://www.npmjs.com/package/@vue-solana/vue)
[![npm downloads](https://img.shields.io/npm/dt/@vue-solana/vue.svg)](https://www.npmjs.com/package/@vue-solana/vue)
[![license](https://img.shields.io/npm/l/@vue-solana/vue.svg)](https://github.com/vue-solana/vue-solana/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-vue--solana-blue)](https://vue-solana-docs.vercel.app/packages/vue)

Solana wallet, RPC, account, message signing, and transaction composables for Vue 3.

Use this package in Vue 3 apps that need Solana RPC access, balance reads, wallet state, message signing, and transaction helper state.

New to Solana? Start with the official docs and the project concepts guide:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Vue Solana Concepts Guide](https://vue-solana-docs.vercel.app/concepts/solana-for-vue-developers)
- [`@vue-solana/vue` docs](https://vue-solana-docs.vercel.app/packages/vue)
- [Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)
- [Live demo](https://vue-solana-docs.vercel.app/demo)

## Features

- Vue plugin for shared Solana RPC and wallet context.
- SSR-safe composables that return inert state when no client plugin context is available.
- RPC status and latest blockhash reads.
- Balance, account info, program account, signature status, token account, and token balance composables.
- Unified wallet discovery and selection for browser extensions, Android Mobile Wallet Adapter, and supported iOS browser wallets.
- Message signing helpers for wallet ownership and authentication challenges.
- Sign In With Solana (SIWS) authentication through `useSignIn()`.
- App-wide selected wallet account context with persistence.
- Transaction submission and confirmation state helpers, including batch signing and sign-and-send.
- Live data composables over Kit reactive stores (`useRequest`, `useSubscription`, `useTrackedData`) plus SWR cache adapters.
- A generic async action state machine (`useAction`) built on `@vue-solana/core/action`.
- Reactive Kit client signers (`usePayer`, `useIdentity`) and transaction planning (`usePlanTransaction`, `usePlanTransactions`) with fail-fast client capability assertions.
- Direct subpath exports for narrower imports.

## Compatibility

| Requirement   | Supported                                       |
| ------------- | ----------------------------------------------- |
| Vue           | `^3.5.0`                                        |
| TypeScript    | TypeScript 5.x recommended                      |
| Solana client | Provided through `@vue-solana/core`             |
| Clusters      | `mainnet-beta`, `devnet`, `testnet`, `localnet` |

## Install

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

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

iOS browser wallet universal links for Phantom, Solflare, and Backpack are enabled by default on iOS browsers. Pass `iosWallet` options to customize the app identity and redirect URL, or pass `iosWallet: false` to disable iOS browser wallet entries.

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

Supported clusters are `mainnet-beta`, `devnet`, `testnet`, and `localnet`. Use `mainnet-beta` for Solana mainnet; this is Solana's official cluster name.

### Plugin Options

| Option         | Type                                                    | Default                              | Description                                                                                   |
| -------------- | ------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `cluster`      | `"mainnet-beta" \| "devnet" \| "testnet" \| "localnet"` | `"devnet"`                           | Solana cluster used when `endpoint` is omitted.                                               |
| `endpoint`     | `string`                                                | Public endpoint for `cluster`        | HTTP RPC endpoint. Use a dedicated RPC provider for production apps.                          |
| `wsEndpoint`   | `string`                                                | Derived from `endpoint`              | WebSocket RPC endpoint.                                                                       |
| `commitment`   | Solana commitment                                       | Solana client default                | Default commitment for created connections.                                                   |
| `autoConnect`  | `boolean`                                               | `false`                              | Reconnects only a previously selected discovered wallet identity when it is discovered again. |
| `wallet`       | `SolanaWallet`                                          | Disabled                             | Custom wallet adapter, useful for tests or custom integrations.                               |
| `mobileWallet` | `MobileWalletOptions \| false`                          | Enabled on supported Android clients | Configures or disables Android Mobile Wallet Adapter registration.                            |
| `iosWallet`    | `iOSWalletOptions \| false`                             | Enabled on iOS browsers              | Configures or disables iOS browser wallet universal links (Phantom, Solflare, Backpack).      |

The root export remains supported. For composables, prefer direct subpath imports in new code so bundlers can avoid evaluating unrelated package entry code:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
```

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

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

### Airdrop on Test Networks

`useAirdrop()` sends SOL to an account on devnet, testnet, or a local validator. It requires an airdrop capability on the Kit client, installed with `createClient().use(solanaRpcConnection({ ... })).use(rpcAirdrop())` from `@solana/kit-plugin-rpc`.

```ts
import { lamports } from "@solana/kit";
import { useAirdrop } from "@vue-solana/vue/useAirdrop";

const { data, status, error, dispatch } = useAirdrop();
await dispatch(address, lamports(1_000_000_000)); // 1 SOL
```

Each `dispatch(address, amount)` runs a fresh airdrop and aborts the previous in-flight call. `data` resolves to the transaction `Signature`, or to `undefined` when the network applies the airdrop without a transaction (some local validators, e.g. LiteSVM).

Airdrops to a single address are rate-limited (public devnets commonly return HTTP 429, and 1 SOL requires enough devnet balance); wait before dispatching again or use a fresh address. Errors surface through `error` / the `error` state.

## Read Account Data

```ts
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const account = useAccountInfo(address, { watch: true });
const programAccounts = useProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
  searchTransactionHistory: true,
});
```

Read SPL token accounts and balances through Kit RPC `jsonParsed`:

```ts
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const tokenAccounts = useTokenAccounts(ownerAddress, { commitment: "confirmed" });
const tokenBalance = useTokenBalance(mintAddress, ownerAddress);
```

`useProgramAccounts()` can be expensive on public RPC nodes. Prefer narrow `filters`, use `dataSlice` when you only need part of account data, and avoid polling broad program scans.

## Wallet State

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, selectWallet, refreshWallets } = useWallets();
const { publicKey, connected, connecting, canSignMessage, connect, disconnect } = useWallet();
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
    <p>Public key: {{ publicKey }}</p>
    <p>Can sign messages: {{ canSignMessage }}</p>
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallets are discovered through the Solana Wallet Standard. Android Mobile Wallet Adapter wallets are registered through `@solana-mobile/wallet-standard-mobile` and exposed through the same `useWallets()` list on supported Android Chrome clients. iOS Phantom, Solflare, and Backpack entries are exposed through wallet-specific universal links on iOS browsers. `connect()` works after selecting a discovered wallet or configuring a custom `SolanaWallet`.

Selected discovered wallets are persisted under `localStorage["vue-solana:selected-wallet"]` as non-sensitive identity metadata: `name`, and `platform`/`source` when available. On reload, Vue Solana restores the selected wallet if the same wallet is discovered again. Pass `autoConnect: true` to opt into calling `connect()` for that restored wallet; arbitrary installed wallets are never auto-connected. Calling `selectWallet(null)` or `setWallet(customWallet)` clears the stored selection.

Desktop native app wallet adapters are planned but not implemented yet.

Composables return inert SSR-safe state when no plugin context is available. Real RPC and wallet operations still require the plugin-provided client context.

## Message Signing

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const message = computed(() => new TextEncoder().encode("Sign in to My Vue Solana App"));

async function signIn() {
  await execute(message.value);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!connected || !canSignMessage" @click="signIn">
      Sign message
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <pre v-if="error">{{ error.message }}</pre>
  </section>
</template>
```

Message signing proves wallet ownership for flows like authentication challenges. It does not sign, submit, or authorize Solana transactions. For authentication, issue a server-generated nonce, include domain and expiration details in the message, and verify the returned signature server-side.

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

Use `useTransactionConfirmation()` when you already have a submitted signature and want to wait for confirmation separately:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const confirmation = useTransactionConfirmation({ commitment: "finalized" });

await confirmation.confirm(signature);
```

`useSignAndSendTransaction()` also clears `loading` if a wallet adapter never returns a result. In that stale case, `error` is set and the chain status may be unknown, so check the connected wallet or an explorer before retrying.

### Live Data

`useRequest()` fetches once per change and revalidates stale data in the background. Pass a request function, a pending Kit RPC request, or a ref/computed of either:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useRequest } from "@vue-solana/vue/useRequest";

const { client } = useSolanaClient();
const { data, error, status, refresh } = useRequest(() => client.rpc.getSlot().send());
```

`useSubscription()` streams live slots from `rpcSubscriptions` reactive stores:

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";

const subscription = useSubscription(() => client.rpcSubscriptions.slotNotifications());
subscription.data; // { value: { slot: number } }
subscription.reconnect();
```

`useTrackedData()` pairs a slot-tracking request with a subscription, reusing a single subscription for concurrent mounts:

```ts
import { useTrackedData } from "@vue-solana/vue/useTrackedData";

const balance = useTrackedData({
  rpcRequest: client.rpc.getBalance(address),
  rpcSubscriptionRequest: client.rpcSubscriptions.balanceNotifications(address),
  rpcValueMapper: (response) => response.value,
});
```

The `swr` adapters seed fresh mounts from the last-known value for the same cache key:

```ts
import { useRequestSwr } from "@vue-solana/vue/swr";

const balance = useRequestSwr(["balance", address], () => client.rpc.getBalance(address).send());
```

### Cancellation & Timeouts

`useRequest()`, `useSubscription()`, and `useTrackedData()` accept a `getAbortSignal` option — a factory called once per attempt (request) or connection (subscription/tracked data). It is the natural place for a timeout:

```ts
const { data, refresh } = useRequest(source, {
  getAbortSignal: (attempt) => AbortSignal.timeout(10_000),
});

await refresh({ abortSignal: AbortSignal.timeout(2_000) });
```

The factory is read fresh from the latest render on every attempt, so inline closures work without `useCallback`-style wrapping. Each manual refresh or reconnect can instead pass a single `{ abortSignal }` override that replaces the factory for that attempt; pass `AbortSignal` explicitly as `undefined` to skip caller cancellation entirely. Aborting the composed signal fails only that attempt — previous `data` is kept and `status` drops back to `error`.

To kill the data hook entirely, set its source to `null` (status becomes `disabled` and in-flight work is cancelled) or unmount the component that owns it.

### Actions with `useAction`

`useAction()` and its derivatives (`useAirdrop()`, `useSignAndSendTransaction()` themes) manage one async action at a time:

```ts
const { data, status, error, dispatch } = useAction(async (signal, input) => {
  /* ... */
});

dispatch(inputA); // runs
await dispatch(inputB); // aborts dispatch(inputA) before starting
```

- `useAction` keeps the handler in a ref — every `dispatch` runs the latest closure, so there is no deps array to keep in sync. In-flight calls keep running with the closure they started with.
- `dispatch` returns a `Promise<TResult>`. If a newer dispatch supersedes it, the older promise rejects with an abort error; awaiters should treat that as "superseded", not a failure, and fresh awaits win.
- Calling `dispatch` again aborts the prior in-flight call with a fresh `AbortSignal`, and resets state to `idle` before the new run starts.

### Sign In With Solana

`useSignIn()` triggers the SIWS flow when the connected wallet supports the `solana:signIn` feature:

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();
await signIn(); // { account, signedMessage, signature } — verify server-side
```

### Selected Wallet Account

`useSelectedWalletAccount()` requires a provider. Use the `SelectedWalletAccountProvider` component (or Nuxt's app-wide context) and read the shared selection anywhere in its subtree:

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue";
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount] = useSelectedWalletAccount();
</script>

<template>
  <SelectedWalletAccountProvider>
    <span>Active account: {{ selectedAccount?.address }}</span>
  </SelectedWalletAccountProvider>
</template>
```

### Batch Transactions

`useSignTransactions()` and `useSignAndSendTransactions()` batch wallet requests and fall back to singular calls when the wallet only supports one at a time:

```ts
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signatures, status, loading, error, execute } = useSignAndSendTransactions();
await execute([transactionOne, transactionTwo]); // signatures: string[]
```

When a wallet falls back to sequential signing and a later send fails, `useSignAndSendTransactions()` throws a `PartialSignAndSendError` whose `signatures` field lists the sends that already landed.

## Example App

This README includes small snippets for quick reference. For a complete runnable Vue + Vite flow, see the example app:

```sh
pnpm dev:vue
```

Docs: <a href="https://vue-solana-docs.vercel.app/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

Live demo: [vue-solana-docs.vercel.app/demo](https://vue-solana-docs.vercel.app/demo)

## AI Agent Skill

If you use an AI coding agent, install the Vue Solana Agent Skill for plugin setup, composable imports, wallet flow guidance, transaction gotchas, and verification commands:

```sh
npx skills add vue-solana/vue-solana --skill vue-solana
```

Docs: [Vue Solana Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)

## API

| API                                                                                        | Description                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `createSolanaPlugin(options?)`                                                             | Installs the Vue Solana context.                                                                                           |
| `VueSolana`                                                                                | Alias for `createSolanaPlugin`.                                                                                            |
| `useSolana()`                                                                              | Returns the full injected Solana context.                                                                                  |
| `useRpc()`                                                                                 | Returns cluster, endpoint, connection status, latest blockhash, the Kit `client`, and `checkConnection()`.                 |
| `useSolanaClient()`                                                                        | Returns the injected Kit client as `{ client, rpc }`. The recommended RPC path.                                            |
| `useConnection()`                                                                          | Returns the Kit `client`. Deprecated in favor of `useSolanaClient()`.                                                      |
| `useWallet()`                                                                              | Returns wallet refs, computed connection state, and wallet actions.                                                        |
| `useWallets()`                                                                             | Returns discovered browser extension wallets, Android MWA wallets, iOS browser wallet links, and wallet selection actions. |
| `useSignMessage()`                                                                         | Signs arbitrary message bytes through the connected wallet when message signing is supported.                              |
| `useBalance(address, commitment?)`                                                         | Loads lamport balance for an address string.                                                                               |
| `useAirdrop()`                                                                             | Airdrops SOL on devnet/testnet/localnets; `data` is the `Signature`, or `undefined` when applied directly.                 |
| `useAccountInfo(address, options?)`                                                        | Loads normalized account info (executable, lamports, owner, space, data bytes).                                            |
| `useProgramAccounts(programId, config?)`                                                   | Loads accounts owned by a program with optional filters, commitment, and `dataSlice`.                                      |
| `useTransaction(handler, options?)`                                                        | Generic async transaction state helper with optional timeout settings.                                                     |
| `useTransactionConfirmation(options?)`                                                     | Confirms a submitted signature with reactive status and timeout/error state.                                               |
| `useSignatureStatus(signature, options?)`                                                  | Reads a transaction signature status with optional polling.                                                                |
| `useSignAndSendTransaction()`                                                              | Signs and sends a transaction through the configured wallet, with optional confirmation waiting.                           |
| `useTokenAccounts(owner, options?)`                                                        | Reads SPL token accounts for an owner.                                                                                     |
| `useTokenBalance(mint, owner, commitment?)`                                                | Reads the token balance for a mint/owner pair.                                                                             |
| `useAction(handler, options?)`                                                             | Generic async action state machine; each dispatch aborts the prior in-flight call.                                         |
| `useRequest(source, options?)`                                                             | One-shot Kit request that re-fires when its source changes, preserving the previous `data` while revalidating.             |
| `useSubscription(source, options?)`                                                        | Live data over a Kit reactive stream store (e.g. RPC subscriptions), torn down on unmount.                                 |
| `useTrackedData(source, options?)`                                                         | Slot-deduplicated fetch plus subscription over Kit's slot-tracking store.                                                  |
| `useRequestSwr(key, ...)` / `useSubscriptionSwr(key, ...)` / `useTrackedDataSwr(key, ...)` | Cache-keyed SWR adapters seeding fresh mounts from the last-known result.                                                  |
| `clearSwrCache()`                                                                          | Clears every cached SWR entry.                                                                                             |
| `useSignIn(input?)`                                                                        | Sign In With Solana (SIWS) trigger returning `{ account, signedMessage, signature }` for server-side verification.         |
| `useSelectedWalletAccount()`                                                               | App-wide selected wallet account context: `[selectedAccount, setSelectedAccount, filteredWallets]`.                        |
| `SelectedWalletAccountProvider`                                                            | Component that provides the selected wallet account context to its subtree.                                                |
| `useSignTransactions()`                                                                    | Batch-signs transactions through the wallet, preferring `signTransactions` and falling back to `signAllTransactions`.      |
| `useSignAndSendTransactions()`                                                             | Signs and sends multiple transactions, returning one signature each, with a singular sequential fallback.                  |
| `useClientCapability(capability, options?)`                                                | Fails fast with a clear error when the configured Solana client lacks a requested capability.                              |
| `usePayer()`                                                                               | Reactive Kit client `payer` signer ref (requires a signer plugin on the client).                                           |
| `useIdentity()`                                                                            | Reactive Kit client `identity` signer ref (requires a signer plugin on the client).                                        |
| `usePlanTransaction()`                                                                     | Plans a single transaction message from instruction inputs without signing or sending.                                     |
| `usePlanTransactions()`                                                                    | Plans a batch of transaction messages from instruction inputs.                                                             |

Direct composable subpaths:

- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`

Other direct subpaths:

- `@vue-solana/vue/swr`
- `@vue-solana/vue/kit`
- `@vue-solana/vue/buffer-polyfill`

## Caveats

- Wallet and RPC operations require the plugin-provided client context. Composables are SSR-safe, but real wallet work should run after hydration or in user actions.
- Public Solana RPC endpoints are useful for development, but production apps should use dedicated RPC infrastructure.
- Broad `useProgramAccounts()` scans can be expensive or blocked on public RPC nodes. Prefer narrow filters and `dataSlice`.
- Use `mainnet-beta` for Solana mainnet. `mainnet` is intentionally not accepted as a cluster alias.
- v2.0.0 removed `@solana/web3-compat` and the `web3` subpaths. Build transaction messages with `@solana/kit` and pass raw `Uint8Array` wire bytes to wallet flows. See the [Kit Migration guide](https://vue-solana-docs.vercel.app/guides/kit-migration) for migrating from v1.
- Desktop native app wallets are planned but not implemented yet.

## Status

This package provides RPC, balance, account, token, browser extension wallet, Android mobile wallet, iOS browser wallet, message signing, SIWS, live data, and transaction composables.
