---
type: Guide
title: Kit Migration
description: Migrate from the legacy web3-compat API to @solana/kit. v2.0.0 removed web3-compat everywhere; this guide maps every legacy symbol to its Kit replacement.
tags:
  - kit
  - migration
  - create-solana-client
  - use-solana-client
resource: https://solana.com/docs/kit
timestamp: 2026-09-11T00:00:00Z
---

# Kit Migration

`@vue-solana/*` moved from `@solana/web3-compat` to `@solana/kit` in v2.0.0. This guide explains why, what changed, and how to migrate a Vue or Nuxt app that is still on the v1.x surface.

See the public-facing source of this guide at [`apps/docs/content/guides/kit-migration.md`](../../apps/docs/content/guides/kit-migration.md) and the implementation tracker at [`plans/kit-migration-plan.md`](../../plans/kit-migration-plan.md).

More references:

- [Package API references](../packages/index.md) — `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt`
- [Getting Started](./getting-started.md) — install, configure, and test

Official Solana references:

- [Solana Kit](https://solana.com/docs/kit) — the modern client API
- [web3.js v1 → v3 migration](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md) — legacy class API bridge

## Why Migrate

- `@solana/web3-compat` is superseded; Solana's official guidance is to build on `@solana/kit` and its plugins.
- `@solana/web3-compat@0.0.21` shipped broken TypeScript root metadata, forcing repo-local `.d.ts` shims and a post-build declaration-prep script.
- The legacy `Connection` / `PublicKey` / `Transaction` class API is the old shape. Kit exposes `Address`, codecs, plugin clients, and `client.rpc` reads returning `bigint`.
- Kit is modular: import only what you use. In v2 the legacy `web3` subpaths and `Connection` are gone; the context exposes only `client`.

## Timeline

| Release          | State                                                                                                                                                                                                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1.x (previous)  | Dual support. Legacy `connection`, `web3` subpaths, and legacy helpers kept working. Added `createSolanaClient()` (from `@vue-solana/core/kit`), `useSolanaClient()` (Vue composable, Nuxt auto-imported), and `SolanaContext.client`. Legacy helpers were marked `@deprecated`. `SolanaWallet` gained `address?: Address`. |
| v2.0.0 (current) | `@solana/web3-compat` removed from every package. No `connection` in the context; `web3` subpaths deleted; `useRpc()` became the Kit RPC composable; wallet exposes `publicKey: Address`. Shims and the declaration-prep web3-compat logic are deleted.                                                                     |

Migrate by updating to `^2`, resolving compiler errors, and removing the legacy imports the compiler flags.

## Migration Map

| Legacy (before)                                          | Kit (after)                                                                                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                             | `client.rpc` / `useSolanaClient()`                                                                                                            |
| `new Connection(url)`                                    | `client.rpc` from `createSolanaClient({ endpoint: url })`                                                                                     |
| `PublicKey`                                              | `Address`                                                                                                                                     |
| `new PublicKey(s)` / `.toBase58()`                       | `address(s)`                                                                                                                                  |
| `Keypair` / `Keypair.generate()`                         | `generateKeyPairSigner()` from `@solana/kit`, or `@solana/kit-plugin-signer` variants (`signer`/`payer`/`identity`, `generated*`, `airdrop*`) |
| `keypair.publicKey`                                      | signer `.address`                                                                                                                             |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` from `@solana-program/system`                                                                                     |
| `LAMPORTS_PER_SOL` math                                  | `lamports()` from `@solana/kit`                                                                                                               |
| `sendAndConfirmTransaction`                              | Kit transaction planning (upstream `@solana/kit-plugin-rpc` executors); for wallet-signed flows use `signAndSendTransaction(client, ...)`     |
| devnet `requestAirdrop`                                  | `client.airdrop` (upstream, via `solanaDevnetRpc()` / `airdropSigner`)                                                                        |
| `Transaction` / `VersionedTransaction`                   | Kit instruction/message builders; `SolanaTransaction` is now raw serialized bytes                                                             |
| `connection.getBalance`                                  | `client.rpc.getBalance(address).send()` — returns lamports as `bigint`                                                                        |
| `@solana/spl-token` helpers                              | `getTokenAccountsByOwner(client, ...)` / `getTokenBalance(client, ...)` from `@vue-solana/core/token-accounts` (Kit RPC `jsonParsed` reads)   |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)` (polls `client.rpc.getSignatureStatuses(...).send()`)                                              |
| Wallet Standard flows                                    | unchanged — discovery and adaptation still power `useWallets()` / `useWallet()`                                                               |

After v2 mapping:

- `VueSolanaContext.connection` → `client.rpc`
- `useConnection()` → `useSolanaClient()` (kept as a deprecated alias returning the Kit client)
- `useRpc()` → `solana.client` (v2 `useRpc()` returns cluster state plus the injected `client`)
- `parsePublicKey(value)` → `parseAddress(value)` from `@vue-solana/core/address`
- `signAndSendTransaction(connection, ...)` / `confirmTransactionSignature(connection, ...)` → `signAndSendTransaction(client, ...)` / `confirmTransactionSignature(client, ...)` with wire-byte transactions
- `getTokenAccountsByOwner` et al → `getTokenAccountsByOwner(client, ...)` reads returning `TokenAccountInfo`

## Upgrade a Vue App

1. `pnpm add @vue-solana/vue@^2.0.0` — the compiler points out every remaining legacy reference.
2. Use Kit:

   ```ts
   import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
   import { address, lamports, type Address } from "@vue-solana/vue/kit";

   const { client, rpc } = useSolanaClient();
   const slot = await rpc.getSlot().send(); // bigint
   const balance = await rpc.getBalance(address("YOUR_ADDRESS")).send(); // bigint
   ```

   Framework-agnostic code uses `createSolanaClient({ cluster: "devnet" })` from `@vue-solana/core/kit`. No shim or network setup needed. `useWallet().publicKey` is `Address | null`.

   Message builders are **not** re-exported — add `@solana/kit` to the consumer's own `package.json` (pnpm does not hoist the transitive copy from `@vue-solana/vue` → `@vue-solana/core`). Program instructions come from their own plugins, e.g. `@solana-program/system`.

3. Remove `@vue-solana/vue/web3` and `@vue-solana/core/web3` imports, `useConnection()` usage, the `@solana/web3-compat` dependency, local `.d.ts` shims, and `buffer-polyfill` if it was only needed for legacy web3-compat transaction paths.

## Upgrade a Nuxt App

1. `pnpm add @vue-solana/nuxt@^2.0.0`.
2. `useSolanaClient()` is auto-imported; helpers come from `@vue-solana/nuxt/kit` (`address`, `lamports`, types).
3. Remove `@vue-solana/nuxt/web3` imports, web3-compat dependencies and shims; the module dropped its web3-compat `optimizeDeps` entries in v2.

## RPC Numeric And Bytes Notes

- RPC numerics (lamports, slots, block heights) are `bigint`. `JSON.stringify` throws on `bigint` — convert with `Number()` or `toString()`.
- Account data fetched from `client.rpc` is base64-encoded; the Vue Solana read composables normalize it to `Uint8Array`. The `buffer/` shim exists only for the browser Buffer polyfill path.
- `client.rpc` does not apply the `commitment` from `SolanaConfig`; pass a per-call commitment if you rely on one (e.g. `rpc.getBalance(account, { commitment: "confirmed" }).send()`).

## Bridge Note (Optional)

Developers who want the classic class API can run `@solana/web3.js@rc` (v3): `PublicKey` is a deprecated alias of `Address`, and a v3 `Keypair` structurally satisfies Kit's `KeyPairSigner`. See the official [web3.js v1 → v3 migration guide](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).
