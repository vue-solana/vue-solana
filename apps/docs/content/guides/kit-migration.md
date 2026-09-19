---
title: "Kit Migration"
description: How to move a Vue or Nuxt app from the legacy web3-compat API to @solana/kit. v2.0.0 removed web3-compat everywhere.
ogSection: Guides
surroundOrder: 7
---

Vue Solana moved from `@solana/web3-compat` to `@solana/kit` in v2.0.0. This guide explains why the change happened, what the Kit equivalents of each legacy symbol are, and how to migrate a Vue or Nuxt app that is still on the v1.x surface.

## Why Migrate

`@solana/web3-compat` is superseded. Solana's official guidance is that new apps build directly on `@solana/kit` and its plugins (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`). `web3-compat` exists only as a legacy-interop path. Two concrete problems motivated the move:

- `@solana/web3-compat@0.0.21` ships broken TypeScript package metadata, forcing repo-local and package-owned `.d.ts` shims plus a post-build declaration script.
- The `Connection` / `PublicKey` / `Transaction` class API is the legacy shape. Solana's ecosystem has moved to `Address`, codecs, plugin clients, and the transaction planner. Staying on `web3-compat` made `@vue-solana/*` feel stale and pushed a second migration onto every user.

Kit also brings the modularity benefit: you import only the pieces you use. In v2 the legacy `web3` subpaths and the legacy `Connection` are gone; the packages are Kit-first and the context exposes only `client`.

## Timeline

| Release              | What happened                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (previous)**  | Dual support. `connection`, `web3` subpaths, and all legacy helpers kept working unchanged, while the new Kit surface was added alongside: `createSolanaClient()`, `@vue-solana/*/kit` subpaths, and `useSolanaClient()`. Legacy helpers were marked `@deprecated`. |
| **v2.0.0 (current)** | Kit only. `@solana/web3-compat` is removed from every package. The context no longer carries `connection`, and the `web3` subpaths are deleted. `useRpc()` becomes the Kit RPC composable, and the wallet exposes `publicKey: Address`.                             |

Migrate by updating to `^2.0.0`, resolving compiler errors, and removing the legacy imports the compiler flags. The full before/after map is below.

## Migration Map

The table below maps every legacy symbol to its Kit replacement.

| Legacy                                                                      | Kit replacement                                                                                                                                     |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                                | `client.rpc` / `useSolanaClient()`                                                                                                                  |
| `new Connection(url)`                                                       | `client.rpc` from `createSolanaClient({ endpoint: url })`                                                                                           |
| `PublicKey`                                                                 | `Address` (`address("...")`)                                                                                                                        |
| `new PublicKey(s)` / `.toBase58()`                                          | `address(s)` — base58 strings are already `Address`-shaped                                                                                          |
| `Keypair` / `Keypair.generate()`                                            | `generateKeyPairSigner()` from `@solana/kit`, or the `@solana/kit-plugin-signer` variants (`signer`, `payer`, `identity`, `generated*`, `airdrop*`) |
| `keypair.publicKey`                                                         | signer `.address`                                                                                                                                   |
| `SystemProgram.transfer`                                                    | `getTransferSolInstruction` from `@solana-program/system`                                                                                           |
| `LAMPORTS_PER_SOL` math                                                     | `lamports()` from `@solana/kit`                                                                                                                     |
| `sendAndConfirmTransaction`                                                 | Kit transaction planning (upstream `@solana/kit-plugin-rpc` executors); for wallet-signed flows use `signAndSendTransaction(client, ...)`           |
| devnet airdrop via `requestAirdrop`                                         | `client.airdrop` (upstream, enabled by `solanaDevnetRpc()` / `airdropSigner`)                                                                       |
| `Transaction` / `VersionedTransaction`                                      | Kit instruction and message builders; `SolanaTransaction` is now raw serialized bytes                                                               |
| `connection.getBalance`                                                     | `client.rpc.getBalance(...).send()` — returns lamports as `bigint`                                                                                  |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` helpers | `getTokenAccountsByOwner(client, ...)` / `getTokenBalance(client, ...)` from `@vue-solana/core/token-accounts` (Kit RPC `jsonParsed` reads)         |
| `connection.confirmTransaction` / `getSignatureStatuses`                    | `confirmTransactionSignature(client, ...)` (polls `client.rpc.getSignatureStatuses(...).send()`)                                                    |
| wallet-standard flows                                                       | unchanged — wallet-standard discovery and adaptation still power `useWallets()` / `useWallet()`                                                     |

> Some rows reference upstream `@solana/kit` plugins (signer, planner, system program). Vue Solana does not bundle those; install them directly from the `@solana/kit` ecosystem when you need them.

What the helpers map to after v2:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient()` (kept in v2 as a deprecated alias returning the Kit client)
- `useRpc()` → `solana.client` (v2 `useRpc()` returns cluster state plus the injected `client`)
- `parsePublicKey(value)` → `parseAddress(value)` from `@vue-solana/core/address`
- `signAndSendTransaction(connection, ...)` / `confirmTransactionSignature(connection, ...)` → `signAndSendTransaction(client, ...)` / `confirmTransactionSignature(client, ...)`; the `SolanaTransaction` argument is now serialized wire bytes
- `getTokenAccountsByOwner(connection, ...)` & friends → `getTokenAccountsByOwner(client, ...)` and `getTokenAccountsByOwner(client, ...)`-based reads returning `TokenAccountInfo`

## Upgrade a Vue App

### Step 1: Update to v2

```sh
pnpm add @vue-solana/vue@^2.0.0
```

The compiler will now point you at every remaining legacy reference because the `web3` subpaths no longer exist.

### Step 2: Switch to the Kit API

Read-only RPC calls move from the injected `connection` to the Kit client:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

The helpers and types that flow through Vue Solana's own API (`address`, `lamports`, `Address`, `Commitment`, ...) are re-exported:

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

Message builders are not re-exported. Add `@solana/kit` to your own `package.json` — pnpm's strict `node_modules` does not hoist the transitive copy, so it is not importable through `@vue-solana/vue`. Program instructions come from their own plugins, e.g. `@solana-program/system` for `getTransferSolInstruction`.

The connected wallet's address is a plain base58 `Address` string:

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.publicKey is `Address | null`
```

For framework-agnostic code, use the core package directly:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

There is no network setup and no shim: the endpoint resolves from cluster configuration, and `createSolanaContext()` now returns the same `client`.

### Step 3: Remove the legacy surface

- every `@vue-solana/vue/web3` and `@vue-solana/core/web3` import,
- `useConnection()` usage (replaced by `useSolanaClient()`),
- `@solana/web3-compat` from your `package.json`,
- any local `.d.ts` shims you added for the broken `web3-compat` metadata,
- `buffer-polyfill` if you only imported it for legacy web3-compat transaction paths.

## Upgrade a Nuxt App

### Step 1: Update to v2

```sh
pnpm add @vue-solana/nuxt@^2.0.0
```

### Step 2: Switch to the Kit API

`useSolanaClient` is auto-imported:

```ts
const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send();
```

Kit helpers are available from `@vue-solana/nuxt/kit`:

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";
```

Add `@solana/kit` to your own `package.json` for message building — the Nuxt module re-exports only the helpers and types that flow through its own API.

### Step 3: Remove the legacy surface

Remove `@vue-solana/nuxt/web3` imports, web3-compat dependencies, and local shims. The Nuxt module dropped the web3-compat `optimizeDeps` entries in v2.

## RPC Numeric And Bytes Notes

Kit REST RPC methods return native JavaScript types:

- Lamports, slots, and block heights are `bigint`. `JSON.stringify` on `bigint` throws; convert with `Number(...)` or `toString()`.
- Account data fetched from `client.rpc` is base64-encoded; the Vue Solana read composables normalize it to `Uint8Array`. The `buffer/` shim is only needed for the Buffer polyfill used by browser transaction serialization paths.
- The Kit `client.rpc` does not apply the `commitment` from your `SolanaConfig`; it uses Kit's per-call defaults. If you rely on a custom commitment, pass it per call (e.g. `rpc.getBalance(account, { commitment: "confirmed" }).send()`).

## Bridge Note (Optional)

If you want the classic class API, `@solana/web3.js@rc` (v3) is the upgrade path: `PublicKey` is a deprecated alias of `Address`, and a v3 `Keypair` structurally satisfies Kit's `KeyPairSigner`. See the official [web3.js v1 → v3 migration guide](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).

## Related

- [`RPC and Clusters`](/guides/rpc-and-clusters) — cluster and endpoint configuration
- [`Getting Started`](/getting-started) — install and first devnet reads
- [Solana Kit documentation](https://www.solanakit.com/) — official Kit guides, recipes, and API reference
- [`@vue-solana/core`](/packages/core), [`@vue-solana/vue`](/packages/vue), [`@vue-solana/nuxt`](/packages/nuxt) — package reference
