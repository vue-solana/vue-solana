---
title: Troubleshooting
description: Common setup, TypeScript, wallet, RPC, and Nuxt issues.
---

## TypeScript Cannot Resolve `@solana/web3-compat`

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Runtime imports still use the real package, but TypeScript may report missing declarations.

Add `types/web3-compat.d.ts` to your app:

```ts
declare module "@solana/web3-compat" {
  export type { Commitment, SendOptions, TransactionSignature } from "@solana/web3.js";
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

Make sure your `tsconfig.json` includes the file:

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "types/**/*.d.ts"]
}
```

Re-check new `@solana/web3-compat` versions before keeping this shim. Remove the shim once the package ships valid root declarations.

## `Vue Solana plugin is not installed`

This means client-side code tried to use the Solana connection or wallet actions without installing the plugin. Current composables return inert SSR-safe state when Nuxt renders on the server, but real RPC and wallet operations still require the client plugin context.

For Vue:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

For Nuxt, register the module:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

The Nuxt module keeps the Vue Solana plugin client-only. Auto-imported composables can be called during SSR, but avoid doing direct RPC or wallet work on the server. Trigger RPC reads from client lifecycle hooks or user actions when you need the real Solana connection.

## `No Solana wallet is configured`

No wallet has been selected or manually configured. Use `useWallets()` or `useSolanaWallets()` to select a discovered wallet before calling `connect()` or sending a transaction.

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

RPC reads and balance reads work without a wallet.

## No Browser Wallets Are Detected

Common causes:

- No Solana wallet extension is installed.
- The wallet extension is disabled for the current browser profile.
- The app is running in SSR or a non-browser environment.
- The wallet does not implement the Wallet Standard.

Install a wallet such as Phantom, Solflare, or Backpack, then call `refreshWallets()` after the page loads.

## `Solana wallet is not connected`

The transaction helper was called before the wallet reported `connected: true` and a non-null `publicKey`.

Call `connect()` first, or check `connected.value` before sending.

## Wallet Appears Connected After Refresh During Local Development

Selecting a discovered wallet should not mark it connected. `connected` should become true only after `connect()` succeeds, even if the browser extension exposes previously authorized accounts.

If local Vue or Nuxt examples still appear connected immediately after refresh, rebuild the workspace packages and fully restart the dev server so Vite/Nuxt drop stale package output:

```sh
pnpm build:packages
pnpm dev:vue
```

For Nuxt, use `pnpm dev:nuxt` after rebuilding packages.

## `Solana wallet does not support signTransaction`

The configured wallet does not expose either `signAndSendTransaction` or `signTransaction`. Use a wallet that supports transaction signing for the selected Solana chain.

## Wallet Transaction Did Not Return A Result

This can happen when a wallet adapter starts a mobile handoff but never settles its browser promise. Vue Solana clears `loading` and sets `error` instead of leaving the app stuck in a sending state. The transaction may still have succeeded if the wallet submitted it before the response was lost, so check the wallet activity or a Solana explorer before retrying.

Android Mobile Wallet Adapter wallets prefer wallet signing plus app-side RPC submission when `signTransaction` is available. That path avoids the common case where the wallet sends successfully but the browser page never receives the adapter's returned signature.

## `Buffer is not defined`

Some `@solana/web3-compat` transaction paths still expect a Node-compatible `Buffer` global. In browser apps, install `buffer` and initialize the polyfill before creating or serializing transactions:

```sh
pnpm add buffer
```

```ts
import { Buffer } from "buffer/";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
```

Use the trailing slash in `buffer/`. Importing from `buffer` can make Vite or Nuxt externalize the Node builtin and fail in the browser.

## Module `buffer` Has Been Externalized

If the console says `Module "buffer" has been externalized for browser compatibility`, change imports from `buffer` to `buffer/`, then restart the dev server. Vite may cache the previously optimized dependency.

## Balance Reads Fail

Common causes:

- The address string is not a valid Solana public key.
- The RPC endpoint is unavailable or rate-limited.
- The wallet address is on a different cluster than the configured RPC endpoint.

Check the configured cluster and endpoint with `useRpc()` or `useSolanaRpc()`.

## Nuxt Auto-Imports Are Missing

Make sure `@vue-solana/nuxt` is listed in `modules` and restart the Nuxt dev server after installing the package.

If TypeScript still does not recognize auto-imports, regenerate Nuxt types:

```sh
npx nuxi prepare
```
