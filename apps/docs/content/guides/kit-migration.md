---
title: "Kit Migration"
description: Migrate from the legacy web3-compat connection API to @solana/kit step by step.
ogSection: Guides
surroundOrder: 7
---

Vue Solana is migrating from `@solana/web3-compat` to `@solana/kit`. This guide explains why, what changes at each release, and how to move your Vue or Nuxt app over. It is written for apps on the current v1.1.0 API, so you can follow it today on the dual-support release and finish before v2.0.0 lands.

## Why Migrate

`@solana/web3-compat` is superseded. Solana's official guidance is that new apps build directly on `@solana/kit` and its plugins (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`). `web3-compat` exists only as a legacy-interop path. Two concrete problems motivated the move:

- `@solana/web3-compat@0.0.21` ships broken TypeScript package metadata, forcing repo-local and package-owned `.d.ts` shims plus a post-build declaration script.
- The `Connection` / `PublicKey` / `Transaction` class API is the legacy shape. Solana's ecosystem has moved to `Address`, codecs, plugin clients, and the transaction planner. Staying on `web3-compat` made `@vue-solana/*` feel stale and pushed a second migration onto every user.

Kit also brings the modularity benefit: you import only the pieces you use. In v1.x that means `useSolanaClient()` and the `@vue-solana/*/kit` subpaths; after v2 the legacy `web3` subpaths and the legacy `Connection` disappear entirely.

## Timeline

| Release            | What changes                                                                                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (current)** | Dual support. `connection`, `web3` subpaths, and all legacy helpers keep working unchanged. New Kit surface is added alongside: `createSolanaClient()`, `@vue-solana/*/kit` subpaths, and `useSolanaClient()`. Legacy helpers are marked `@deprecated` in the type definitions. |
| **v2.0.0**         | Kit only. `@solana/web3-compat` is removed from every package. The context no longer carries `connection`, and the `web3` subpaths are deleted. `useRpc()` becomes the Kit RPC composable, and the wallet exposes `publicKey: Address`.                                         |

Migrate during the v1.x window: both APIs work, so you can move step by step and keep shipping.

## Migration Map

The table below maps every legacy symbol to its Kit replacement.

| Legacy                                                                      | Kit replacement                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                                | `client.rpc` / `useSolanaClient()`                                                                                                                                                    |
| `new Connection(url)`                                                       | `client.rpc` from `createSolanaClient({ endpoint: url })`                                                                                                                             |
| `PublicKey`                                                                 | `Address` (`address("...")`)                                                                                                                                                          |
| `new PublicKey(s)` / `.toBase58()`                                          | `address(s)` — base58 strings are already `Address`-shaped                                                                                                                            |
| `Keypair` / `Keypair.generate()`                                            | `generateKeyPairSigner()` from `@solana/kit`, or the `@solana/kit-plugin-signer` variants (`signer`, `payer`, `identity`, `generated*`, `generated*WithSol`, `*FromFile`, `airdrop*`) |
| `keypair.publicKey`                                                         | signer `.address`                                                                                                                                                                     |
| `SystemProgram.transfer`                                                    | `getTransferSolInstruction` from `@solana-program/system`                                                                                                                             |
| `LAMPORTS_PER_SOL` math                                                     | `lamports()` from `@solana/kit`                                                                                                                                                       |
| `sendAndConfirmTransaction`                                                 | `client.sendTransaction([...])` returning `{ context: { signature } }`; batches use `client.sendTransactions`                                                                         |
| devnet airdrop via `requestAirdrop`                                         | `client.airdrop` (enabled by `solanaDevnetRpc()` / `airdropSigner`)                                                                                                                   |
| `Transaction` / `VersionedTransaction`                                      | Kit instruction and message builders                                                                                                                                                  |
| `connection.getBalance`                                                     | `client.rpc.getBalance(...).send()` — returns lamports as `bigint`                                                                                                                    |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` helpers | `@solana-program/token` plugin reads via `client.rpc`                                                                                                                                 |
| `connection.confirmTransaction` / `getSignatureStatuses`                    | Kit transaction-confirmation helpers / `client.rpc.getSignatureStatuses(...).send()`                                                                                                  |
| wallet-standard flows                                                       | Kit signer bridging (the connected wallet is adapted into a `Signer`)                                                                                                                 |

What the current helpers map to today:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient().rpc`
- `useRpc()` → `useSolanaClient().rpc` (the meaning of `useRpc()` changes in v2)
- `parsePublicKey(value)` → `address(value)`
- `signAndSendTransaction(...)` / `confirmTransactionSignature(...)` → `client.sendTransaction([...])` and `client.rpc.getSignatureStatuses(...).send()`
- `getTokenAccountsByOwner(...)` & friends → `@solana-program/token` reads

## Upgrade a Vue App

### Step 1: Update to v1.x

```sh
pnpm add @vue-solana/vue@^1.2.0
```

Your app keeps compiling and running unchanged, because the plugin still builds the legacy context and every existing composable still works.

### Step 2: Switch to the Kit API

Read-only RPC calls move from the injected `connection` to the Kit client:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

Kit helpers and types are re-exported so you do not need a second dependency:

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

The connected wallet's address is available on the wallet in v1.x as a Kit `Address`:

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.address is `Address | undefined`
```

For framework-agnostic code, use the core package directly:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

There is no network setup and no shim: the endpoint resolves from the same cluster configuration as the legacy connection.

### Step 3: Finish after v2

After v2.0.0 remove:

- every `@vue-solana/vue/web3` and `@vue-solana/core/web3` import,
- `useConnection()` usage (replaced by `useSolanaClient().rpc`),
- `@solana/web3-compat` from your `package.json`,
- the local `.d.ts` shims you added for the broken `web3-compat` metadata,
- `buffer-polyfill` if you only imported it for web3-compat transaction paths.

The `web3` subpaths no longer exist, so the compiler will point you at every remaining reference.

## Upgrade a Nuxt App

### Step 1: Update to v1.x

```sh
pnpm add @vue-solana/nuxt@^1.2.0
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

### Step 3: Finish after v2

Remove `@vue-solana/nuxt/web3` imports, web3-compat dependencies, and local shims. The Nuxt module drops the web3-compat `optimizeDeps` entries in v2.

## RPC Numeric And Bytes Notes

Kit REST RPC methods return native JavaScript types:

- Lamports, slots, and block heights are `bigint`. `JSON.stringify` on `bigint` throws; convert with `Number(...)` or `toString()`.
- Account data is `Uint8Array`, not `Buffer`. The `@solana/buffer/` shim you may be using is only needed for legacy transaction paths.

## Bridge Note (Optional)

If you want the classic class API during the migration, `@solana/web3.js@rc` (v3) is the upgrade path: `PublicKey` is a deprecated alias of `Address`, and a v3 `Keypair` structurally satisfies Kit's `KeyPairSigner`. See the official [web3.js v1 → v3 migration guide](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).

## Related

- [`RPC and Clusters`](/guides/rpc-and-clusters) — cluster and endpoint configuration
- [`Getting Started`](/getting-started) — install and first devnet reads
- [`@vue-solana/core`](/packages/core), [`@vue-solana/vue`](/packages/vue), [`@vue-solana/nuxt`](/packages/nuxt) — package reference
