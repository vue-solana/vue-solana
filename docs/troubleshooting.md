# Troubleshooting

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

The current packages do not discover browser wallets yet. `useWallet().connect()` and `useSignAndSendTransaction()` require a configured wallet object that implements `SolanaWallet`.

RPC reads and balance reads work without a wallet.

## `Solana wallet is not connected`

The transaction helper was called before the wallet reported `connected: true` and a non-null `publicKey`.

Call `connect()` first, or check `connected.value` before sending.

## `Solana wallet does not support signTransaction`

The configured wallet does not expose either `signAndSendTransaction` or `signTransaction`. Use a wallet implementation that supports one of those methods.

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
