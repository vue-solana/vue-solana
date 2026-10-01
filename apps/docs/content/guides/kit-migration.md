---
title: "Kit Migration"
description: How to move a Vue or Nuxt app from the legacy web3-compat API to @solana/kit. v2.0.0 removed web3-compat; v3.0.0 publishes ESM only.
ogSection: Guides
surroundOrder: 7
---

Vue Solana moved from `@solana/web3-compat` to `@solana/kit` in v2.0.0, and v3.0.0 turned the `kit` subpaths into a complete mirror of `@solana/kit`. This guide explains why the change happened, what the Kit equivalents of each legacy symbol are, and how to migrate a Vue or Nuxt app that is still on the v1.x surface. If you are already on v2, jump straight to [Upgrading v2 to v3](#upgrading-v2-to-v3).

## Why Migrate

`@solana/web3-compat` is superseded. Solana's official guidance is that new apps build directly on `@solana/kit` and its plugins (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`). `web3-compat` exists only as a legacy-interop path. Two concrete problems motivated the move:

- `@solana/web3-compat@0.0.21` ships broken TypeScript package metadata, forcing repo-local and package-owned `.d.ts` shims plus a post-build declaration script.
- The `Connection` / `PublicKey` / `Transaction` class API is the legacy shape. Solana's ecosystem has moved to `Address`, codecs, plugin clients, and the transaction planner. Staying on `web3-compat` made `@vue-solana/*` feel stale and pushed a second migration onto every user.

Kit also brings the modularity benefit: you import only the pieces you use. In v2 the legacy `web3` subpaths and the legacy `Connection` are gone; the packages are Kit-first and the context exposes only `client`.

## Timeline

| Release              | What happened                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (previous)**  | Dual support. `connection`, `web3` subpaths, and all legacy helpers kept working unchanged, while the new Kit surface was added alongside: `createSolanaClient()`, `@vue-solana/*/kit` subpaths, and `useSolanaClient()`. Legacy helpers were marked `@deprecated`. |
| **v2.0.0**           | Kit only. `@solana/web3-compat` is removed from every package. The context no longer carries `connection`, and the `web3` subpaths are deleted. `useRpc()` becomes the Kit RPC composable, and the wallet exposes `publicKey: Address`.                             |
| **v3.0.0 (current)** | ESM only and a complete Kit mirror. The `require` export condition and the top-level `main` field are gone from all three packages, and `@vue-solana/{core,vue,nuxt}/kit` now re-export all of `@solana/kit` instead of a curated list.                             |

The v1 → v2 work is unchanged: update to `^2.0.0`, resolve compiler errors, and remove the legacy imports the compiler flags. The full before/after map is below. If you are on v2 already, see [Upgrading v2 to v3](#upgrading-v2-to-v3).

## Migration Map

The table below maps every legacy symbol to its Kit replacement.

| Legacy                                                                      | Kit replacement                                                                                                                                             |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                                | `client.rpc` / `useSolanaClient()`                                                                                                                          |
| `new Connection(url)`                                                       | `client.rpc` from `createSolanaClient({ endpoint: url })`                                                                                                   |
| `PublicKey`                                                                 | `Address` (`address("...")`)                                                                                                                                |
| `new PublicKey(s)` / `.toBase58()`                                          | `address(s)` — base58 strings are already `Address`-shaped                                                                                                  |
| `Keypair` / `Keypair.generate()`                                            | `generateKeyPairSigner()` from `@vue-solana/core/kit` (or the `@solana/kit-plugin-signer` variants `signer`, `payer`, `identity`, `generated*`, `airdrop*`) |
| `keypair.publicKey`                                                         | signer `.address`                                                                                                                                           |
| `SystemProgram.transfer`                                                    | `getTransferSolInstruction` from `@solana-program/system`                                                                                                   |
| `LAMPORTS_PER_SOL` math                                                     | `lamports()` from `@vue-solana/core/kit`                                                                                                                    |
| `sendAndConfirmTransaction`                                                 | Kit transaction planning (upstream `@solana/kit-plugin-rpc` executors); for wallet-signed flows use `signAndSendTransaction(client, ...)`                   |
| devnet airdrop via `requestAirdrop`                                         | `client.airdrop` (upstream, enabled by `solanaDevnetRpc()` / `airdropSigner`)                                                                               |
| `Transaction` / `VersionedTransaction`                                      | Kit instruction and message builders; `SolanaTransaction` is now raw serialized bytes                                                                       |
| `connection.getBalance`                                                     | `client.rpc.getBalance(...).send()` — returns lamports as `bigint`                                                                                          |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` helpers | `getTokenAccountsByOwner(client, ...)` / `getTokenBalance(client, ...)` from `@vue-solana/core/token-accounts` (Kit RPC `jsonParsed` reads)                 |
| `connection.confirmTransaction` / `getSignatureStatuses`                    | `confirmTransactionSignature(client, ...)` (polls `client.rpc.getSignatureStatuses(...).send()`)                                                            |
| wallet-standard flows                                                       | unchanged — wallet-standard discovery and adaptation still power `useWallets()` / `useWallet()`                                                             |

> Some rows reference upstream `@solana/kit` plugins (signer, planner, system program). The default client from `createSolanaClient()` already installs the official planner and RPC plan-sending executor from `@solana/kit-plugin-rpc`; install the rest (signer, system program) directly from the `@solana/kit` ecosystem when you need them.

What the helpers map to after v2:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient()` (kept in v2 as a deprecated alias returning the Kit client)
- `useRpc()` → `solana.client` (v2 `useRpc()` returns cluster state plus the injected `client`)
- `parsePublicKey(value)` → `parseAddress(value)` from `@vue-solana/core/address`
- `signAndSendTransaction(connection, ...)` / `confirmTransactionSignature(connection, ...)` → `signAndSendTransaction(client, ...)` / `confirmTransactionSignature(client, ...)`; the `SolanaTransaction` argument is now serialized wire bytes
- `getTokenAccountsByOwner(connection, ...)` & friends → `getTokenAccountsByOwner(client, ...)` and `getTokenAccountsByOwner(client, ...)`-based reads returning `TokenAccountInfo`

## Upgrading v2 to v3

v3 has exactly one breaking change and one large convenience change. The Kit migration itself is already done — there is no new symbol mapping to make.

```sh
pnpm add @vue-solana/vue@^3.0.0
```

```sh
pnpm add @vue-solana/nuxt@^3.0.0
```

### ESM Only

Every `@vue-solana/*` package now ships ESM only. The `require` export condition and the top-level `main` field were removed, so a CommonJS `require("@vue-solana/core")` fails with `No "exports" main defined`, and requiring a subpath fails with `Package subpath './kit' is not defined by "exports"`.

Nuxt and Vite apps already bundle ESM and need no change. If a script, config file, or Node tool in your project still uses `require()`, make it ESM — add `"type": "module"` to your `package.json`, or rename the file to `.mjs`. If you genuinely cannot leave CommonJS, stay on `@vue-solana/*@^2`, which still ships a `.cjs` build. See the [`ERR_PACKAGE_PATH_NOT_EXPORTED` entry in Troubleshooting](/troubleshooting).

### The Kit Subpaths Are Now A Full Mirror

`@vue-solana/core/kit`, `@vue-solana/vue/kit`, and `@vue-solana/nuxt/kit` now `export *` from `@solana/kit` instead of re-exporting a curated list. Every Kit value and type is reachable from the subpath you already have installed.

- Drop `@solana/kit` from your own `package.json` if you added it in v2. You no longer need it, and keeping it risks a second Kit copy in the tree.
- Move message builders, codecs, planner helpers, and signer factories to the same `@vue-solana/*/kit` import you already use, so your app has one Solana entry point.

Four names exist in both Kit and this library. They resolve to **this library's** version from the package root, and to **Kit's** version from the `/kit` subpath:

| Name                | Root barrel (`@vue-solana/core`)               | `kit` subpath (`@vue-solana/core/kit`) |
| ------------------- | ---------------------------------------------- | -------------------------------------- |
| `SolanaError`       | `@vue-solana/core`'s own error class           | Kit's `SolanaError`                    |
| `SolanaErrorCode`   | `@vue-solana/core`'s own codes                 | Kit's `SolanaErrorCode`                |
| `isSolanaError`     | `@vue-solana/core`'s own guard                 | Kit's `isSolanaError`                  |
| `TransactionStatus` | `@vue-solana/core`'s confirmation status shape | Kit's `TransactionStatus`              |

This matters if you catch Kit errors. `isSolanaError()` from the root barrel recognises this library's `SolanaError`, not Kit's, so import it from `@vue-solana/*/kit` when you are inspecting an error thrown by Kit itself:

```ts
import { isSolanaError } from "@vue-solana/core/kit"; // Kit's guard, matches Kit's errors

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

Everything else is internal. The composable state machines were deduplicated into shared helpers, so `@solana/kit` moved to `^8.4.0` and the bundles got smaller, but no composable signature or return shape changed.

## Upgrade a Vue App

### Step 1: Update to v3

```sh
pnpm add @vue-solana/vue@^3.0.0
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

Message builders come from the same subpath. `@vue-solana/vue/kit` re-exports all of `@solana/kit`, so nothing here needs `@solana/kit` in your own `package.json`. Program instructions come from their own plugins, e.g. `@solana-program/system` for `getTransferSolInstruction`.

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

### Step 1: Update to v3

```sh
pnpm add @vue-solana/nuxt@^3.0.0
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

`@vue-solana/nuxt/kit` re-exports all of `@solana/kit`, so message builders come from there too — never add `@solana/kit` to your own `package.json`.

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
