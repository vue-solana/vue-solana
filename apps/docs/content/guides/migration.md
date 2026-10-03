---
title: "Migration Guide"
description: How to migrate between Vue Solana versions. Covers upgrading from v2 to v3 and migrating from v1.x to v2.
ogSection: Guides
surroundOrder: 13
---

This guide covers migrating between Vue Solana versions. There are two major migrations: upgrading from v2 to v3 (latest), and migrating from v1.x to v2.

## Migration: v2 to v3

v3.0.0 is the latest release. It changes the module format to ESM-only and makes the `kit` subpaths a complete mirror of `@solana/kit`. The Kit migration itself is already complete in v2, so v3 focuses on packaging and minor behavioral changes.

### What's Changed

- **ESM only**: All `@vue-solana/*` packages now ship ESM only. The `require` export condition and top-level `main` field were removed.
- **Complete Kit mirror**: `@vue-solana/core/kit`, `@vue-solana/vue/kit`, and `@vue-solana/nuxt/kit` now `export *` from `@solana/kit` (not a curated subset).
- **Read composable behavior**: `useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()`, and `useTokenBalance()` (and their `useSolana*` Nuxt equivalents) share a unified state machine with improved error handling.
- **Dependency surface**: You no longer need to add `@solana/kit` to your own `package.json` when using the package's `kit` subpaths.

### How to Migrate

#### 1. Update Dependencies

```sh
# For Vue apps
pnpm add @vue-solana/vue@^3.0.0

# For Nuxt apps
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. Handle ESM-Only Packages

If your app or scripts still use CommonJS (`require()`), convert to ESM. Add `"type": "module"` to your `package.json` or rename files to `.mjs`.

```ts
// Instead of require()
import { createSolanaClient } from "@vue-solana/core/kit";
```

If you cannot switch to ESM, stay on `@vue-solana/*@^2.x` which still ships `.cjs` builds.

#### 3. Update Kit Imports

With the full mirror, import everything from the package's `kit` subpath. If you previously added `@solana/kit` to your dependencies, you can remove it.

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt (auto-imported composables still work)
import { address, lamports } from "@vue-solana/nuxt/kit";
```

Note: Four names (`SolanaError`, `SolanaErrorCode`, `isSolanaError`, `TransactionStatus`) are resolved differently between root barrels and `/kit` subpaths. If you're catching errors thrown by Kit, import `isSolanaError` from the `kit` subpath.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. Update Error Handling for Read Composables

`refresh()` now rejects on failure (instead of resolving). Update code that awaits it:

```ts
await refresh().catch(() => undefined);
```

Template `@click="refresh"` is unaffected.

When reads fail, data resets to its empty value. Check `error` explicitly:

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="Could not load the balance." />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`useTokenBalance()`'s `balance` and `decimals` are read-only computed refs - remove any assignments to them.

#### 5. Remove Legacy Web3 Imports

Remove any remaining `@vue-solana/*/web3` imports and `@solana/web3-compat` dependencies (they don't exist in v3).

## Migration: v1.x to v2.0.0

Vue Solana v2.0.0 moved from `@solana/web3-compat` to `@solana/kit` as the core API surface. This is a breaking change for apps on v1.x.

### What's Changed

- **Kit-only API**: `@solana/web3-compat` is removed from all packages. The context no longer carries `connection`, and `web3` subpaths are deleted.
- **Type changes**: `SolanaWallet.publicKey` is now a plain base58 `Address` string (not a `PublicKey` class).
- **Composable changes**: `useConnection()` was replaced by `useSolanaClient()`. `useRpc()` now returns cluster state plus the injected Kit client.
- **Numeric types**: RPC results like lamports, slots, and block heights are `bigint`. Account data is `Uint8Array` rather than `Buffer` in normalized composable outputs.
- **Transaction surface**: Helpers like `signAndSendTransaction` and `confirmTransactionSignature` now take a Kit client instead of a `Connection`, and transaction inputs use Kit types.

### How to Migrate

#### 1. Update Dependencies

```sh
pnpm add @vue-solana/vue@^2.0.0
# or
pnpm add @vue-solana/nuxt@^2.0.0
```

Remove `@solana/web3-compat` from your dependencies if present.

#### 2. Update API Calls

| Legacy                                                   | Replacement                                                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Connection`, `new Connection(url)`                      | `client.rpc` from `createSolanaClient({ endpoint })` / `useSolanaClient()`                      |
| `PublicKey`, `new PublicKey(s)`, `.toBase58()`           | `Address` via `address(s)`                                                                      |
| `Keypair`, `keypair.publicKey`                           | `generateKeyPairSigner()` from `@vue-solana/*/kit`; signer `.address`                           |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` from `@solana-program/system`                                       |
| `LAMPORTS_PER_SOL` math                                  | `lamports()` from `@vue-solana/*/kit`                                                           |
| `sendAndConfirmTransaction`                              | Use Kit transaction planning; for wallet-signed flows use `signAndSendTransaction(client, ...)` |
| `requestAirdrop` (devnet)                                | `client.airdrop()`                                                                              |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()` (returns `bigint`)                                          |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                                      |
| `useConnection()`                                        | `useSolanaClient()`                                                                             |
| `parsePublicKey(value)`                                  | `parseAddress(value)` from `@vue-solana/core/address`                                           |

#### 3. Update Code Examples

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. Clean Up

Remove all imports from `@vue-solana/*/web3`, remove `@solana/web3-compat` from `package.json`, and delete any local `.d.ts` shims you added for web3-compat. Also remove `buffer-polyfill` if you only needed it for legacy web3-compat transaction paths.

### Notes

- The Kit `client.rpc` uses per-call defaults for `commitment` rather than the config value. Pass `commitment` explicitly if needed: `rpc.getBalance(account, { commitment: "confirmed" }).send()`.
- For framework-agnostic code, use `createSolanaClient()` from `@vue-solana/core/kit`.
