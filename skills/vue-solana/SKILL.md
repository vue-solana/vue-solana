---
name: vue-solana
description: Build, debug, review, and document Solana apps using @vue-solana/core, @vue-solana/vue, and @vue-solana/nuxt. Use when working with Vue Solana package setup, composables, Nuxt module config, wallet discovery, Android Mobile Wallet Adapter, iOS browser wallets, RPC, balances, transactions, or Solana web3-compat in Vue/Nuxt apps.
license: MIT
metadata:
  author: vue-solana
---

# Vue Solana

Use this skill when helping with apps or libraries that use the Vue Solana ecosystem.

## Package Selection

- Use `@solana/web3-compat` for raw Solana primitives such as `Connection`, `PublicKey`, `Transaction`, `TransactionInstruction`, and `VersionedTransaction`.
- Use `@vue-solana/core` for framework-agnostic config, cluster endpoint helpers, wallet types, Wallet Standard adapters, Android Mobile Wallet Adapter registration, iOS browser wallet helpers, and transaction helpers.
- Use `@vue-solana/vue` in Vue 3 apps for the plugin and composables.
- Use `@vue-solana/nuxt` in Nuxt apps for module setup and auto-imported composables.
- Prefer `devnet` for examples and tests. Use `mainnet-beta`, not `mainnet`, for Solana mainnet.

## Install Commands

For Vue:

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

For Nuxt:

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

Use equivalent `npm install` or `yarn add` commands when the project does not use pnpm.

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
import { useRpc } from "@vue-solana/vue/useRpc";
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
- `useSolanaWallet()`
- `useSolanaWallets()`
- `useSolanaBalance()`
- `useSolanaSignAndSendTransaction()`

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
- `autoConnect` is reserved for future persisted wallet selection and should not be treated as active behavior.

## RPC And Balance Reads

Use `useRpc()` or `useSolanaRpc()` to show cluster, endpoint, connection status, latest blockhash, and `checkConnection()`.

Use `useBalance(address, commitment?)` or `useSolanaBalance(address, commitment?)` for lamport balances. The address may be a `PublicKey` or a base58 address string.

Balance and RPC reads do not require a connected wallet.

## Transactions

Use `useSignAndSendTransaction()` or `useSolanaSignAndSendTransaction()` after a wallet is selected and connected.

The active wallet must support either `signAndSendTransaction` or `signTransaction`. Android Mobile Wallet Adapter wallets prefer `signTransaction` plus app-side RPC submission when available so the app can reliably return the submitted signature.

When browser transaction code needs `Buffer`, install `buffer` and import from `buffer/`:

```ts
import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
```

Use the trailing slash in `buffer/`. Importing from `buffer` can make Vite or Nuxt externalize the Node builtin and fail in the browser.

## Common Gotchas

- Do not import Solana primitives from `@solana/web3.js` in new Vue Solana examples; use `@solana/web3-compat`.
- `@solana/web3-compat@0.0.21` has broken TypeScript package metadata. If TypeScript cannot resolve it, add a local `types/web3-compat.d.ts` shim that re-exports the needed types and classes from `@solana/web3.js`.
- Do not split browser, Android mobile, iOS browser, and future desktop native wallet sources into separate public flows. Keep them unified through `useWallets()` and `useWallet()`.
- Do not mark a discovered wallet as connected just because accounts are visible. Connection state begins after `connect()` succeeds.
- In Nuxt, avoid server-side RPC and wallet actions unless the app explicitly provides server-safe behavior.
- Public Solana RPC endpoints can be rate-limited. For production, suggest a dedicated RPC provider and custom `endpoint`.

## Verification Checklist

For changes inside the Vue Solana repository, prefer these checks from the repo root:

```sh
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
```

For consumer app examples, verify the app starts and the relevant flow works on `devnet`. For wallet or transaction work, include manual browser testing with a Solana wallet when feasible.
