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

- Use `@vue-solana/vue/web3` in Vue apps and `@vue-solana/nuxt/web3` in Nuxt apps for supported raw Solana primitives such as `Connection`, `PublicKey`, `Transaction`, `TransactionInstruction`, and `VersionedTransaction`.
- Use `@vue-solana/core` for framework-agnostic config, cluster endpoint helpers, wallet types, Wallet Standard adapters, Android Mobile Wallet Adapter registration, iOS browser wallet helpers, transaction helpers, and core subpath exports.
- Use `@vue-solana/vue` in Vue 3 apps for the plugin and composables.
- Use `@vue-solana/nuxt` in Nuxt apps for module setup and auto-imported composables.
- Prefer `devnet` for examples and tests. Use `mainnet-beta`, not `mainnet`, for Solana mainnet.

## Install Commands

For Vue:

```sh
pnpm add @vue-solana/vue
```

Vue apps do not need `@vue-solana/core`, `@solana/web3-compat`, or `buffer` directly for primary composable, web3 primitive, or Buffer-helper usage.

For Nuxt:

```sh
npx nuxt module add @vue-solana/nuxt
```

Nuxt apps do not need `@vue-solana/core`, `@vue-solana/vue`, `@solana/web3-compat`, or `buffer` directly for primary module, composable, web3 primitive, or Buffer-helper usage.

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

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaAccountInfo()`
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaProgramAccounts()`
- `useSolanaSignAndSendTransaction()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

The Nuxt runtime plugin is client-only. Composables are SSR-safe and may return inert state during SSR; run real RPC and wallet work after hydration, in client lifecycle hooks, or from user actions.

## Wallet Flow

Use one public wallet flow for all supported wallet sources:

1. Use `useWallets()` or `useSolanaWallets()` to discover wallets and select one.
2. Use `useWallet()` or `useSolanaWallet()` for active wallet state.
3. Call `connect()` only after selecting a wallet.
4. Treat `connected` as false until `connect()` resolves, even if an extension exposes previously authorized accounts.
5. Call `disconnect()` from the active wallet composable.

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

Use `useSignAndSendTransaction()` or `useSolanaSignAndSendTransaction()` after a wallet is selected and connected.

The active wallet must support either `signAndSendTransaction` or `signTransaction`. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available so the app can reliably return the submitted signature.

Use `useTransactionConfirmation()` or `useSolanaTransactionConfirmation()` when an app already has a submitted signature and wants to wait for a requested commitment separately from signing and sending.

When browser transaction code needs `Buffer`, use the framework package helper:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

Use `@vue-solana/nuxt/buffer-polyfill` for the same helper in Nuxt apps. Use `@vue-solana/core/buffer-polyfill` only for framework-agnostic core usage.

Do not assign the Buffer global manually in public examples.

## Common Gotchas

- Do not import Solana primitives from `@solana/web3.js` or direct `@solana/web3-compat` in new Vue Solana examples; use `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3`, or `@vue-solana/core/web3` for framework-agnostic core usage.
- Current Vue Solana packages publish package-owned declaration shims for documented `@vue-solana/*` imports affected by `@solana/web3-compat@0.0.21` metadata. Only suggest a local `types/web3-compat.d.ts` shim for older Vue Solana versions or apps that directly import `@solana/web3-compat`.
- Do not split browser, Android mobile, iOS browser, and future desktop native wallet sources into separate public flows. Keep them unified through `useWallets()` and `useWallet()`.
- Do not mark a discovered wallet as connected just because accounts are visible. Connection state begins after `connect()` succeeds.
- In Nuxt, avoid server-side RPC and wallet actions unless the app explicitly provides server-safe behavior.
- Public Solana RPC endpoints can be rate-limited. For production, suggest a dedicated RPC provider and custom `endpoint`.

## Verification Checklist

For changes inside the Vue Solana repository, prefer these checks from the repo root:

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
```

For consumer app examples, verify the app starts and the relevant flow works on `devnet`. For wallet or transaction work, include manual browser testing with a Solana wallet when feasible.
