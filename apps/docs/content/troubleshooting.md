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

This means a Vue composable was called without installing the plugin.

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

## `Solana wallet does not support signTransaction`

The configured wallet does not expose either `signAndSendTransaction` or `signTransaction`. Use a wallet that supports transaction signing for the selected Solana chain.

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
