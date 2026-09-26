---
name: vue-solana
description: Build, debug, review, and document Solana apps using @vue-solana/core, @vue-solana/vue, and @vue-solana/nuxt. Use when working with Vue Solana package setup, composables, Nuxt module config, wallet discovery, Android Mobile Wallet Adapter, iOS browser wallets, RPC, balances, transactions, or Solana primitives in Vue/Nuxt apps.
license: MIT
metadata:
  author: vue-solana
---

# Vue Solana

Use this skill when helping with apps or libraries that use the Vue Solana ecosystem.

## Package Selection

- Use `@vue-solana/vue/kit` in Vue apps and `@vue-solana/nuxt/kit` in Nuxt apps for Kit primitives (types and values such as `Address`, `Commitment`, `Signature`, `address()`, `lamports()`, and `createSolanaClient()`). Build transaction messages with `@solana/kit` helpers (e.g. `createTransactionMessage()`, `compileTransaction()`); transactions flow through the packages as raw `Uint8Array` wire bytes. The default client composes the official `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` stack; the old custom fallback sender is not used.
- Use `@vue-solana/core` for framework-agnostic config, cluster endpoint helpers, wallet types, Wallet Standard adapters, Android Mobile Wallet Adapter registration, iOS browser wallet helpers, transaction helpers, and core subpath exports.
- Use `@vue-solana/vue` in Vue 3 apps for the plugin and composables.
- Use `@vue-solana/nuxt` in Nuxt apps for module setup and auto-imported composables.
- Prefer `devnet` for examples and tests. Use `mainnet` for Solana mainnet; this is Solana's official mainnet cluster name. The legacy `mainnet-beta` spelling is still accepted and redirects to the same endpoint.

## Install Commands

For Vue:

```sh
pnpm add @vue-solana/vue
```

Vue apps do not need `@vue-solana/core` or `buffer` directly for primary composable, Kit primitive, or Buffer-helper usage.

For Nuxt:

```sh
npx nuxt module add @vue-solana/nuxt
```

Nuxt apps do not need `@vue-solana/core`, `@vue-solana/vue`, or `buffer` directly for primary module, composable, Kit primitive, or Buffer-helper usage.

## Vue Setup

Install the plugin once in the app entry:

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

Prefer direct composable subpath imports in Vue apps:

```ts
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";
import { useRpc } from "@vue-solana/vue/useRpc";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";
```

## Nuxt Setup

Register the module in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Nuxt auto-imports these composables:

- `useSolana()`, `useSolanaClient()`
- `useSolanaRpc()`, `useSolanaConnection()`
- `useSolanaWallet()`, `useSolanaWallets()`, `useSolanaSelectedWalletAccount()`
- `useSolanaAccountInfo()`, `useSolanaBalance()`, `useSolanaProgramAccounts()`, `useSolanaSignatureStatus()`, `useSolanaTokenAccounts()`, `useSolanaTokenBalance()`
- `useSolanaRequest()`, `useSolanaSubscription()`, `useSolanaTrackedData()`, `useSolanaAction()`
- `useSolanaSignMessage()`, `useSolanaSignIn()`
- `useSolanaSignAndSendTransaction()`, `useSolanaSignTransactions()`, `useSolanaSignAndSendTransactions()`
- `useSolanaPayer()`, `useSolanaIdentity()`, `useSolanaPlanTransaction()`, `useSolanaPlanTransactions()`

`useClientCapability` is intentionally not auto-imported.

The Nuxt runtime plugin is client-only. Composables are SSR-safe and may return inert state during SSR; run real RPC and wallet work after hydration, in client lifecycle hooks, or from user actions.

Nuxt `ModuleOptions` intentionally omits `payer` and `payerSecretKey`. Direct `@vue-solana/core` and `@vue-solana/vue` clients accept both: `payer` is a Kit `TransactionSigner`, and `payerSecretKey` is a base64 64-byte Ed25519 keypair. Never put a raw secret or `payerSecretKey` in Nuxt public runtime config. Install a client-owned `payer` in a client-only plugin; a client-sent transaction always needs one.

## Wallet Flow

Use one public wallet flow for all supported wallet sources:

1. Use `useWallets()` or `useSolanaWallets()` to discover wallets and select one.
2. Use `useWallet()` or `useSolanaWallet()` for active wallet state.
3. Call `connect()` only after selecting a wallet.
4. Treat `connected` as false until `connect()` resolves, even if an extension exposes previously authorized accounts.
5. Call `disconnect()` from the active wallet composable.

To persist a wallet choice across sessions, mount `SelectedWalletAccountProvider` once near the app root and use `useSelectedWalletAccount()` (or `useSolanaSelectedWalletAccount()` in Nuxt) to read and set the selected account. The Nuxt runtime plugin installs an app-wide selected-wallet-account context automatically, so `useSolanaSelectedWalletAccount()` works without a provider. The selection persists as `${walletName}:${accountAddress}` through `stateSync` (default `localStorage`), syncs across tabs, and is restored when the wallet reconnects.

Current wallet support:

- Browser extension wallets discovered through Solana Wallet Standard packages.
- Android native mobile wallets through `@solana-mobile/wallet-standard-mobile` on Android Chrome and Chrome PWAs.
- iOS browser wallets through wallet-specific universal links for Phantom, Solflare, and Backpack.
- Manual or custom wallet objects that implement `SolanaWallet`.

Current wallet limits:

- Desktop native app wallets are not implemented yet. They require wallet-specific protocol links or future native Wallet Standard registration.
- There is no built-in wallet modal. Apps should build their own selection UI with `useWallets()`.
- `autoConnect` is active behavior only when explicitly enabled. It may reconnect a restored, previously selected wallet, but must never be used to connect an arbitrary installed wallet.

## RPC, Account, And Balance Reads

Use `useRpc()` or `useSolanaRpc()` to show cluster, endpoint, connection status, latest blockhash, and `checkConnection()`.

Use `useBalance(address, commitment?)` or `useSolanaBalance(address, commitment?)` for lamport balances. The address may be a `PublicKey` or a base58 address string.

Use `useAccountInfo(address, options?)` or `useSolanaAccountInfo(address, options?)` to read account data and optionally subscribe to account changes.

Use `useProgramAccounts(programId, config?)` or `useSolanaProgramAccounts(programId, config?)` for program-owned account scans. Program scans can be expensive on public RPC nodes; prefer narrow filters, `dataSlice`, and dedicated RPC infrastructure for production reads.

Use `useSignatureStatus(signature, options?)` or `useSolanaSignatureStatus(signature, options?)` to read, poll, or subscribe to submitted transaction status.

RPC, balance, account, program-account, and signature-status reads do not require a connected wallet.

## Data Layer (Request, Subscription, Tracked Data)

Use the Kit-reactive data composables for SWR-style reads instead of hand-rolled `watch` + `try/catch` state:

- `useRequest(source, options?)` or auto-imported `useSolanaRequest(source, options?)` for one-shot requests. The source may be a request function, a Kit request object (`rpc.getBalance(address)`), a `ref`/`computed` of either, or `null` to disable. Statuses: `fetching`, `success`, `error`, `disabled`.
- `useSubscription(source, options?)` or `useSolanaSubscription(...)` for live streams. The source is a Kit reactive stream source (for example `rpcSubscriptions.slotNotifications()`), a ref of it, or `null`. Statuses: `loading`, `loaded`, `error`, `disabled`. `reconnect()` re-opens with stale-while-revalidate.
- `useTrackedData(source, options?)` or `useSolanaTrackedData(...)` for RPC data seeded by a fetch and updated by a subscription (for example `getAccountInfo` + `accountNotifications`). The store slot-deduplicates both sources so out-of-order arrivals cannot regress the value.
- SWR cache adapters from `@vue-solana/vue/swr` (`useRequestSwr`, `useSubscriptionSwr`, `useTrackedDataSwr`) key results across mounts. Keys are namespaced per adapter; a `null` source clears the key's cache. Not auto-imported in Nuxt.
- `useAction(handler, options?)` or `useSolanaAction(handler, options?)` for generic async actions, backed by `createSolanaActionStore` from `@vue-solana/core/action`. The handler receives a fresh `AbortSignal` per call. Exposes `data`, `dispatch`, `error`, `isRunning`, `reset`, and `status` (`idle`, `running`, `success`, `error`). Re-dispatch aborts the in-flight call; failures keep the previous `data` for stale-while-revalidate.

For `useTrackedData`, the `rpcValueMapper` / `rpcSubscriptionValueMapper` callbacks receive the unwrapped value; the returned `data` ref keeps the full `SolanaRpcResponse` envelope (`data.value.value`, `data.value.context.slot`).

Tests touching these composables or real Kit reactive stores must run under the `node` vitest environment (Kit stores call Node's `setMaxListeners` on `AbortSignal`); tag the test file with `// @vitest-environment node`.

## Sign In With Solana

Use `useSignIn()` or `useSolanaSignIn()` to trigger a wallet's SIWS feature. `signIn(input?)` resolves `{ account, signedMessage, signature }` for **server-side verification**: verify the signature against `account.publicKey` on your backend before trusting the identity (see the message-signing guide). State exposes `status` (`idle`, `signing-in`, `signed-in`, `error`), `loading`, `error`, and `signInResult`; wallet cancellations normalize to `USER_REJECTED`.

The composable does not auto-connect: `signIn()` rejects with `WALLET_NOT_CONNECTED` when no wallet is connected.

## Error Handling

Vue Solana normalizes common failures into `SolanaError` from `@vue-solana/core/errors`. Public examples and docs should branch on stable `error.code` values instead of rendering raw error objects or parsing wallet/RPC messages.

Stable codes:

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `USER_REJECTED`
- `INVALID_ADDRESS`
- `TRANSACTION_TIMEOUT`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

Use `error.cause` only for debugging/logging the original wallet adapter, RPC, parsing, timeout, or storage failure. Do not show raw `cause` details to users by default.

Vue composables expose `Ref<SolanaError | null>` error refs. Nuxt auto-imported composables expose the same error shape.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
```

## Transactions

Use `useSignAndSendTransaction()` or `useSolanaSignAndSendTransaction()` after a wallet is selected and connected. This wallet flow can return after RPC submission or wait for a selected commitment with `confirm: true`.

Use `useSendTransaction()` / `useSendTransactions()` (and their Nuxt aliases) for client-owned signing. The default client uses the official `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` composition; the official executor waits for `confirmed` commitment before the composable reports `sent`, with no wallet popup. Configure `payer`, and keep funded keys in a trusted server or relayer context.

The active wallet must support either `signAndSendTransaction` or `signTransaction`. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available so the app can reliably return the submitted signature.

Use `useTransactionConfirmation()` or `useSolanaTransactionConfirmation()` when an app already has a submitted signature and wants to wait for a requested commitment separately from signing and sending.

For batch flows, use `useSignTransactions()` / `useSolanaSignTransactions()` (sign multiple transactions in one wallet request) and `useSignAndSendTransactions()` / `useSolanaSignAndSendTransactions()` (sign and send a batch). Both prefer the wallet's batch capability: `useSignTransactions` falls back to the legacy `signAllTransactions` feature, while `useSignAndSendTransactions` falls back to sending sequentially with the singular capability. A partial batch send rejects with `PartialSignAndSendError` (from `@vue-solana/vue/useSignAndSendTransactions`); its `signatures` array lists the transactions already submitted, so inspect it before retrying to avoid double-spends.

When browser transaction code needs `Buffer`, use the framework package helper:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

Use `@vue-solana/nuxt/buffer-polyfill` for the same helper in Nuxt apps. Use `@vue-solana/core/buffer-polyfill` only for framework-agnostic core usage.

Do not assign the Buffer global manually in public examples.

## Client Capabilities, Payer, Identity, And Transaction Planning

- `useClientCapability(methods, options?)` fails fast when the installed Solana client does not expose a named capability, throwing `MissingClientCapabilityError`. Not auto-imported in Nuxt.
- `usePayer()` / `useIdentity()` (or `useSolanaPayer()` / `useSolanaIdentity()`) expose the Kit client's `payer` / `identity` `TransactionSigner`, re-read on change when the client advertises `subscribeToPayer` / `subscribeToIdentity`. A direct Vue/core client can receive `payer` through plugin options; custom clients can install signer plugins (e.g. `generatedPayer()` / `generatedIdentity()` from `@solana/kit-plugin-signer`). Nuxt does not forward payer options through public runtime config.
- `usePlanTransaction()` / `usePlanTransactions()` (or `useSolanaPlanTransaction()` / `useSolanaPlanTransactions()`) expose the client's transaction planning capability. `usePlanTransaction` only requires `planTransaction`; `usePlanTransactions` only requires `planTransactions`.

## Common Gotchas

- Do not import Solana primitives from `@solana/web3.js`, `@solana/web3-compat`, or the removed `@vue-solana/*/web3` subpaths in new Vue Solana examples; use `@vue-solana/vue/kit`, `@vue-solana/nuxt/kit`, or `@vue-solana/core/kit` for the Kit primitive surface.
- v2.0.0 removed `@solana/web3-compat` from every package, deleted the `web3` subpaths, dropped the `connection` field from the context, and removed the declaration shims v1 published for the broken `web3-compat` metadata. Do not suggest local `types/web3-compat.d.ts` shims; upgrade examples to `@vue-solana/*@^2` instead.
- Do not split browser, Android mobile, iOS browser, and future desktop native wallet sources into separate public flows. Keep them unified through `useWallets()` and `useWallet()`.
- Do not mark a discovered wallet as connected just because accounts are visible. Connection state begins after `connect()` succeeds.
- In Nuxt, avoid server-side RPC and wallet actions unless the app explicitly provides server-safe behavior. Keep `payerSecretKey` and all raw secrets out of public runtime config; create client-owned signers in a client-only plugin.
- Public Solana RPC endpoints can be rate-limited. For production, suggest a dedicated RPC provider and custom `endpoint`.
- When example-app behavior changes, extend the Playwright e2e suite (`e2e/`) rather than relying on unit tests alone. `mockSolanaSubscriptions(page)` fakes the Kit RPC-subscriptions websocket protocol (subscribe, id-correlated result, then `<method>Notification` frames keyed on `params.subscription`); see the E2E Testing guide.

## Verification Checklist

For changes inside the Vue Solana repository, prefer these checks from the repo root:

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
```

Before release-facing package changes, also run:

```sh
pnpm smoke:standalone-installs
```

For consumer app examples, verify the app starts and the relevant flow works on `devnet`. For wallet or transaction work, include manual browser testing with a Solana wallet when feasible.
