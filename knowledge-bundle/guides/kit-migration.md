---
type: Guide
title: Kit Migration
description: Migrate from the legacy web3-compat Connection API to @solana/kit using createSolanaClient(), the @vue-solana/*/kit subpaths, and useSolanaClient().
tags:
  - kit
  - migration
  - create-solana-client
  - use-solana-client
resource: https://solana.com/docs/kit
timestamp: 2026-09-11T00:00:00Z
---

# Kit Migration

`@vue-solana/*` is migrating from `@solana/web3-compat` to `@solana/kit`. This guide explains the transition: what stays in v1.x, what disappears in v2.0.0, and the before-to-after mapping.

See the public-facing source of this guide at [`apps/docs/content/guides/kit-migration.md`](../../apps/docs/content/guides/kit-migration.md) and the implementation tracker at [`plans/kit-migration-plan.md`](../../plans/kit-migration-plan.md).

More references:

- [Package API references](../packages/index.md) — `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt`
- [Getting Started](./getting-started.md) — install, configure, and test

Official Solana references:

- [Solana Kit](https://solana.com/docs/kit) — the modern client API
- [web3.js v1 → v3 migration](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md) — legacy class API bridge

## Why Migrate

- `@solana/web3-compat` is superseded; Solana's official guidance is to build on `@solana/kit` and its plugins.
- `@solana/web3-compat@0.0.21` ships broken TypeScript root metadata, forcing repo-local `.d.ts` shims and a post-build declaration-prep script.
- The legacy `Connection` / `PublicKey` / `Transaction` class API is the old shape. Kit exposes `Address`, codecs, plugin clients, and `client.rpc` reads returning `bigint`.
- Kit is modular: import only what you use. In v1.x that means `useSolanaClient()` and the `@vue-solana/*/kit` subpaths; after v2 the legacy `web3` subpaths and `Connection` disappear entirely.

## Timeline

| Release           | State                                                                                                                                                                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.x (current)    | Dual support. Legacy `connection`, `web3` subpaths, and legacy helpers keep working. Added `createSolanaClient()` (from `@vue-solana/core/kit`), `useSolanaClient()` (Vue composable, Nuxt auto-imported), and `SolanaContext.client`. Legacy helpers are `@deprecated` but unchanged. `SolanaWallet` gains `address?: Address`. |
| v2.0.0 (kit only) | `@solana/web3-compat` removed from every package. No `connection` in the context; `web3` subpaths deleted; `useRpc()` becomes the Kit RPC composable; wallet exposes `publicKey: Address`. Shims and the declaration-prep web3-compat logic are deleted.                                                                         |

Migrate now, finish before v2.0.0.

## Migration Map

| Legacy (before)                                          | Kit (after)                                                                                                                                                                     |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                             | `client.rpc` / `useSolanaClient()`                                                                                                                                              |
| `new Connection(url)`                                    | `client.rpc` from `createSolanaClient({ endpoint: url })`                                                                                                                       |
| `PublicKey`                                              | `Address`                                                                                                                                                                       |
| `new PublicKey(s)` / `.toBase58()`                       | `address(s)`                                                                                                                                                                    |
| `Keypair` / `Keypair.generate()`                         | `generateKeyPairSigner()` from `@solana/kit`, or `@solana/kit-plugin-signer` variants (`signer`/`payer`/`identity`, `generated*`, `generated*WithSol`, `*FromFile`, `airdrop*`) |
| `keypair.publicKey`                                      | signer `.address`                                                                                                                                                               |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` from `@solana-program/system`                                                                                                                       |
| `LAMPORTS_PER_SOL` math                                  | `lamports()` from `@solana/kit`                                                                                                                                                 |
| `sendAndConfirmTransaction`                              | `client.sendTransaction([...])` returning `{ context: { signature } }`; batches via `client.sendTransactions`                                                                   |
| devnet `requestAirdrop`                                  | `client.airdrop` via `solanaDevnetRpc()` / `airdropSigner`                                                                                                                      |
| `Transaction` / `VersionedTransaction`                   | Kit instruction/message builders                                                                                                                                                |
| `connection.getBalance`                                  | `client.rpc.getBalance(address).send()` — returns lamports as `bigint`                                                                                                          |
| `@solana/spl-token` helpers                              | `@solana-program/token` plugin reads via `client.rpc`                                                                                                                           |
| `connection.confirmTransaction` / `getSignatureStatuses` | Kit transaction-confirmation helpers / `client.rpc.getSignatureStatuses(...).send()`                                                                                            |
| Wallet Standard flows                                    | Kit signer bridging                                                                                                                                                             |

Today (v1.x) mapping:

- `VueSolanaContext.connection` → `client.rpc`
- `useConnection()` → `useSolanaClient().rpc`
- `useRpc()` → `useSolanaClient().rpc` (meaning changes in v2)
- `parsePublicKey(value)` → `address(value)`
- `signAndSendTransaction` / `confirmTransactionSignature` → `client.sendTransaction` + `getSignatureStatuses`
- `getTokenAccountsByOwner` et al → `@solana-program/token` reads

## Upgrade a Vue App

1. `pnpm add @vue-solana/vue@^1.2.0` — the app compiles unchanged; both APIs work.
2. Use Kit:

   ```ts
   import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
   import { address, lamports, type Address } from "@vue-solana/vue/kit";

   const { client, rpc } = useSolanaClient();
   const slot = await rpc.getSlot().send(); // bigint
   const balance = await rpc.getBalance(address("YOUR_ADDRESS")).send(); // bigint
   ```

   Framework-agnostic code uses `createSolanaClient({ cluster: "devnet" })` from `@vue-solana/core/kit`. No shim or network setup needed. `useWallet().address` is `Address | undefined`.

3. After v2: remove `@vue-solana/vue/web3` and `@vue-solana/core/web3` imports, `useConnection()` usage, the `@solana/web3-compat` dependency, local `.d.ts` shims, and `buffer-polyfill` if it was only needed for web3-compat transaction paths.

## Upgrade a Nuxt App

1. `pnpm add @vue-solana/nuxt@^1.2.0` — unchanged behavior.
2. `useSolanaClient()` is auto-imported; helpers come from `@vue-solana/nuxt/kit` (
   `address`, `lamports`, types).
3. After v2: remove `@vue-solana/nuxt/web3` imports, web3-compat dependencies and shims; the module drops its web3-compat `optimizeDeps` entries in v2.

## RPC Numeric And Bytes Notes

- RPC numerics (lamports, slots, block heights) are `bigint`. `JSON.stringify` throws on `bigint` — convert with `Number()` or `toString()`.
- Account data is `Uint8Array`, not `Buffer`. The `buffer/` shim exists only for legacy transaction paths.

## Bridge Note (Optional)

Developers who want the classic class API during migration can run `@solana/web3.js@rc` (v3): `PublicKey` is a deprecated alias of `Address`, and a v3 `Keypair` structurally satisfies Kit's `KeyPairSigner`. See the official [web3.js v1 → v3 migration guide](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).
