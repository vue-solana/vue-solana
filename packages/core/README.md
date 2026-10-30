# @vue-solana/core

[![npm version](https://img.shields.io/npm/v/@vue-solana/core.svg)](https://www.npmjs.com/package/@vue-solana/core)
[![npm downloads](https://img.shields.io/npm/dt/@vue-solana/core.svg)](https://www.npmjs.com/package/@vue-solana/core)
[![license](https://img.shields.io/npm/l/@vue-solana/core.svg)](https://github.com/vue-solana/vue-solana/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-vue--solana-blue)](https://vue-solana-docs.vercel.app/packages/core)

Framework-agnostic Solana primitives for Vue Solana libraries and apps that want shared RPC, wallet, and transaction helpers without installing a Vue plugin.

## Related packages

This package is part of the Vue Solana family. Choose based on your app framework:

- [`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) — framework-agnostic Solana primitives: Kit RPC client helpers, wallet types, Android MWA registration, iOS browser wallet helpers, message signing, token account reads, and transaction helpers. **Use this directly** when you want shared RPC/wallet/transaction helpers without installing a Vue plugin (non-Vue apps, server/relayer code, or your own framework integration).
- [`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) — Vue 3 plugin plus composables for RPC, account, balance, wallet, message signing, live data, and transactions. **Use this** in plain Vue 3 apps (Vite, etc.).
- [`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) — Nuxt module that installs the Vue plugin and auto-imports the composables. **Use this** in Nuxt 3/4 apps.

This package (`@vue-solana/core`) is the foundation the other two build on; most apps should install `@vue-solana/vue` or `@vue-solana/nuxt` rather than this package directly.

Use this package directly when you want Kit RPC client helpers, shared wallet types, Android Mobile Wallet Adapter registration helpers, message signing support, token account reads, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` builds on `@solana/kit`. It exposes `createSolanaClient()` and re-exports all of `@solana/kit` from `@vue-solana/core/kit`. The legacy `@solana/web3-compat` surface and the `web3` subpaths were removed in v2.0.0; transactions flow through the packages as raw `Uint8Array` wire bytes.

Official Solana docs:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)

Full Vue Solana docs:

- [`@vue-solana/core`](https://vue-solana-docs.vercel.app/packages/core)
- [Live demo](https://vue-solana-docs.vercel.app/demo)
- [Getting Started](https://vue-solana-docs.vercel.app/getting-started)
- [Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)
- [Troubleshooting](https://vue-solana-docs.vercel.app/troubleshooting)

## Features

- Cluster-aware RPC helpers with HTTP and WebSocket endpoint defaults.
- A Kit `client` with lazy `rpc` and `rpcSubscriptions` plus the official transaction planner and RPC plan-sending executor through `createSolanaClient()` / `createSolanaContext()`.
- Shared `SolanaConfig`, `SolanaContext`, and `SolanaWallet` types for framework integrations.
- Wallet capability assertions for connection, message signing, and transaction signing flows.
- Browser Wallet Standard adaptation primitives.
- Android Mobile Wallet Adapter registration helpers.
- iOS browser wallet link helpers for supported wallets.
- Transaction submission and confirmation helpers.
- SPL token account reads through Kit RPC `jsonParsed`.
- Solana Pay transfer request URL encoding and parsing plus QR rendering, implemented directly on Kit.
- A framework-agnostic action state machine (`createSolanaActionStore`) for async Solana work with per-attempt `AbortSignal` handling.

## Compatibility

| Requirement   | Supported                                                         |
| ------------- | ----------------------------------------------------------------- |
| Runtime       | ESM only (modern bundlers; Node needs ESM)                        |
| TypeScript    | TypeScript 5.x recommended                                        |
| Solana client | `@solana/kit@^8.5.0` (and `@solana/kit-plugin-rpc`)               |
| Clusters      | `mainnet` (alias `mainnet-beta`), `devnet`, `testnet`, `localnet` |

Since v3.0.0 this package is ESM only: there is no `require` export condition and no top-level `main`, so `require("@vue-solana/core")` fails with `No "exports" main defined`. Pin to `@vue-solana/core@^2` if you must stay on CommonJS.

This package no longer depends on `@solana/web3-compat`. It depends on `@solana/kit` and `@solana/kit-plugin-rpc`, so apps do not need to install either directly for normal Vue Solana usage.

## Install

```sh
pnpm add @vue-solana/core
```

```sh
npm install @vue-solana/core
```

## Quick Start

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({
  cluster: "devnet",
});

const { value } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, value.blockhash);
```

The root export remains supported. Direct subpath exports are also available for narrower imports:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import type { SolanaConfig } from "@vue-solana/core/types";
import { address, createSolanaClient } from "@vue-solana/core/kit";
```

Browser apps that serialize transactions can install the Buffer polyfill before transaction code runs:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill";

installSolanaBufferPolyfill();
```

The `buffer-polyfill` subpath needs the `buffer` package, declared as an **optional peer dependency**. Apps that use serialization must install it explicitly:

```sh
pnpm add buffer
```

## Configuration

```ts
import type { SolanaConfig } from "@vue-solana/core";

const config: SolanaConfig = {
  cluster: "devnet",
  endpoint: "https://api.devnet.solana.com",
  wsEndpoint: "wss://api.devnet.solana.com",
  commitment: "confirmed",
  autoConnect: false,
};
```

| Option           | Type                                                                 | Default                       | Description                                                                             |
| ---------------- | -------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `cluster`        | `"mainnet" \| "mainnet-beta" \| "devnet" \| "testnet" \| "localnet"` | `"devnet"`                    | Solana cluster used when `endpoint` is omitted.                                         |
| `endpoint`       | `string`                                                             | Public endpoint for `cluster` | HTTP RPC endpoint. Use a dedicated RPC provider for production apps.                    |
| `wsEndpoint`     | `string`                                                             | Derived from `endpoint`       | WebSocket RPC endpoint.                                                                 |
| `commitment`     | Solana commitment                                                    | Solana client default         | Default commitment for RPC calls.                                                       |
| `autoConnect`    | `boolean`                                                            | `false`                       | Consumed by Vue/Nuxt integrations to reconnect a previously selected discovered wallet. |
| `payer`          | `TransactionSigner`                                                  | None                          | Kit client fee payer and signer for client-sent transactions.                           |
| `payerSecretKey` | `string`                                                             | None                          | Base64 64-byte Ed25519 keypair, secret key first, resolved at client creation.          |

Supported clusters are `mainnet` (legacy alias `mainnet-beta`), `testnet`, `devnet`, and `localnet`. If `endpoint` is omitted, the package uses the public Solana RPC endpoint for the selected cluster. If `wsEndpoint` is omitted, it is derived from the RPC endpoint.

`autoConnect` is consumed by the Vue plugin and Nuxt module. It defaults to `false`; when set to `true`, Vue Solana reconnects only a previously selected wallet identity that is discovered again on the client.

`payer` is a Kit `TransactionSigner`; `payerSecretKey` is its serializable base64 64-byte Ed25519 keypair form. Both are supported by direct core/Vue clients. A client-sent transaction requires a payer. Never put a raw secret or `payerSecretKey` in Nuxt public runtime config, and never ship a funded keypair to an end-user browser.

`createSolanaClient()` composes the official `@solana/kit-plugin-rpc` stack by default: `solanaRpc()` followed by `rpcAirdrop()` when no `commitment` is configured (a configured `commitment` builds the same stack explicitly so it reaches the RPC layer). `solanaRpc()` installs `rpcTransactionPlanner()`, `rpcTransactionPlanSigningExecutor()`, and `rpcTransactionPlanSendingExecutor()` itself, so the client exposes RPC reads and subscriptions plus `planTransaction(s)`, `signTransaction(s)`, and `sendTransaction(s)` with no extra plugin. The old custom fallback sender is not used. Its official sending executor adds a fresh blockhash, resource-limit and preflight handling, signs with the available client signers, submits the transaction, and waits for `confirmed` commitment before the send resolves. A client send requires a `payer` signer.

Use `mainnet` for Solana mainnet. This is Solana's official mainnet cluster name. The legacy `mainnet-beta` spelling is still accepted and redirects to the same endpoint.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## API

Direct subpaths:

- `@vue-solana/core/action`
- `@vue-solana/core/types`
- `@vue-solana/core/address`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/mobile-wallet-support`
- `@vue-solana/core/rpc`
- `@vue-solana/core/token-accounts`
- `@vue-solana/core/solana-pay`
- `@vue-solana/core/solana-pay-confirmation`
- `@vue-solana/core/solana-pay-status`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`

| API                                                             | Description                                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DEFAULT_CLUSTER`                                               | Default cluster, currently `devnet`.                                                                                                                                                 |
| `parseAddress(value)`                                           | Parses an `Address`, address string, ref-like `{ value }`, getter, `null`, or `undefined` into an `Address \| null`. Invalid strings throw `INVALID_ADDRESS`.                        |
| `createSolanaClient(config?)`                                   | Creates a Kit client exposing `rpc`, `rpcSubscriptions`, the official transaction planner, and the official RPC transaction-sending executor.                                        |
| `createSolanaContext(config?)`                                  | Creates `{ cluster, endpoint, wsEndpoint, client }`.                                                                                                                                 |
| `getClusterEndpoint(cluster?)`                                  | Returns the HTTP RPC endpoint for a cluster.                                                                                                                                         |
| `getClusterWebSocketEndpoint(cluster?)`                         | Returns the WebSocket endpoint for a cluster.                                                                                                                                        |
| `getWebSocketEndpoint(endpoint)`                                | Converts `http`/`https` RPC URLs to `ws`/`wss` URLs.                                                                                                                                 |
| `isWalletConnected(wallet)`                                     | Checks whether a wallet is connected and has an address.                                                                                                                             |
| `assertWalletConnected(wallet)`                                 | Throws if the wallet is not connected.                                                                                                                                               |
| `assertWalletCanSignMessage(wallet)`                            | Throws if the wallet is disconnected or cannot sign messages.                                                                                                                        |
| `assertWalletCanSign(wallet)`                                   | Throws if the wallet cannot sign transactions.                                                                                                                                       |
| `signAndSendTransaction(client, wallet, transaction, options?)` | Signs and sends raw wire bytes (`SolanaTransaction = Uint8Array`) using a configured wallet.                                                                                         |
| `confirmTransactionSignature(client, signature, options?)`      | Waits for a submitted signature to reach a requested commitment by polling `getSignatureStatuses`. Defaults to `confirmed` and a 60 second timeout.                                  |
| `getTokenAccountsByOwner(client, owner, options?)`              | Returns SPL token accounts for an owner (token and token-2022 programs by default).                                                                                                  |
| `getTokenAccount(client, address, commitment?)`                 | Reads a single token account, returning `null` when it does not exist.                                                                                                               |
| `getTokenBalance(client, mint, owner, commitment?)`             | Reads the token balance for an owner's associated token account as `{ amount, decimals }`.                                                                                           |
| `encodeURL(fields)`                                             | Builds a `solana:` transfer or transaction request URL from Kit `Address` values; transfer amounts are `bigint` lamports encoded as decimal SOL.                                     |
| `parseURL(value)`                                               | Parses a transfer request into typed `recipient`, `amount`, `splToken`, `reference`, `label`, `message`, and `memo` fields, or a transaction request `link`. Throws `ParseURLError`. |
| `createQR(url, size?, background?, color?)`                     | Renders a Solana Pay URL as an SVG string; `createQRDataURL()` and `createQRCanvas()` cover the other render targets. The `qrcode` encoder loads lazily.                             |
| `createSolanaActionStore(fn)`                                   | Wraps an async `(signal, ...args) => Promise` function into a `{ getState, subscribe, dispatch, reset, withSignal }` store; each dispatch aborts the prior in-flight call.           |

The client-sent API is the official Kit `ClientWithTransactionSending` capability installed by `createSolanaClient()`. It does not use a wallet popup; `sent` is reached after the RPC executor completes its send-and-confirm operation at `confirmed` commitment. Use a `payer`, and keep funded keys in a trusted server or relayer context.
| `registerSolanaMobileWallet(config?)` | Registers an Android Mobile Wallet Adapter wallet through `@solana-mobile/wallet-standard-mobile`. |
| `isSolanaMobileWalletSupported()` | Android-support gate used to decide whether to lazy-load the MWA module. |
| `getSolanaIosWallets(options?)` | Builds iOS browser wallet entries (Phantom, Solflare, Backpack) as universal links. |
| `handleSolanaIosWalletCallback()` | Completes a pending iOS wallet deep-link callback after redirect. |
| `adaptSolanaStandardWallet(wallet)` | Adapts a Solana Wallet Standard wallet into `SolanaWallet`. |
| `disconnectSolanaStandardWallet(walletInfo)` | Disconnects a discovered Wallet Standard wallet through its own `standard:disconnect` feature, without adapting it. Resolves `false` if the wallet has no disconnect feature, and ignores failures after a 2 s timeout. |
| `getRegisteredSolanaWallets()` | Returns the Wallet Standard wallets currently registered in the app. |
| `withTimeout(promise, timeoutMs, options?)` | Races a promise against a timeout, with optional abort signal. |
| `withSolanaTimeout(promise, timeoutMs, options?)` | Solana-specific timeout wrapper with abort and error-code support. |
| `normalizeSolanaError(error)` | Normalizes an unknown error into a `SolanaError`. |
| `isSolanaActionAborted(error)` | Detects abort errors from superseded action dispatches. |

## Wallet Interface

```ts
import type { SolanaWallet } from "@vue-solana/core";

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connect: async () => {},
  disconnect: async () => {},
  signMessage: async (message) => ({ signedMessage: message, signature: new Uint8Array() }),
  signTransaction: async (transaction) => transaction,
};
```

`SolanaWallet.publicKey` is an `Address` string (`null` when disconnected). `signTransaction` and `signAllTransactions` accept and return raw `Uint8Array` wire bytes.

Browser extension wallets discovered through the Solana Wallet Standard are adapted into `SolanaWallet`. Android Mobile Wallet Adapter is registered through `@solana-mobile/wallet-standard-mobile` and then adapted through the same Wallet Standard adapter on supported Android Chrome clients. iOS browser wallet entries for Phantom, Solflare, and Backpack are adapted through wallet-specific universal links. Wallet capability metadata exposes whether each wallet supports message signing, transaction signing, and sign-and-send flows. You can also provide a custom object that implements `SolanaWallet` for tests or custom adapters.

The Wallet Standard adapter verifies the signature a wallet returns from `signMessage` / `signIn` against the account's public key before resolving, where Ed25519 (WebCrypto) is available. A signature over the wrong bytes or from a different account rejects with `INVALID_SIGNATURE`. `signIn` also binds the result to the requested account (or active account) and rejects if the account is absent from `wallet.accounts`. This is a best-effort, client-side guard — a malformed signature is rejected even if Ed25519 verification is unavailable, but full verification is skipped where Ed25519 is unavailable — so server-side verification remains mandatory for auth flows. Connecting a wallet disconnects every other discovered wallet (swept over discovery, uncached wallets disconnected via `standard:disconnect`), so only one wallet stays authorized.

Current wallet support:

- Browser extension wallets through Wallet Standard packages.
- Android native mobile wallets through `@solana-mobile/wallet-standard-mobile` on Android Chrome and Chrome PWAs.
- iOS browser wallets for Phantom, Solflare, and Backpack through wallet-specific universal links.
- Message signing when the active wallet exposes `signMessage`.
- Manual/custom wallet objects that implement `SolanaWallet`.

Planned but not supported yet:

- Desktop native app wallets through wallet-specific protocol links or future native Wallet Standard registration.

## Examples

For complete runnable Vue and Nuxt examples that use this package through the framework integrations, see:

- [Live demo](https://vue-solana-docs.vercel.app/demo)
- <a href="https://vue-solana-docs.vercel.app/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>
- <a href="https://vue-solana-docs.vercel.app/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

## Bundle size and lean imports

The root barrel (`@vue-solana/core`) intentionally re-exports the full `@solana/kit` mirror so apps do not need to install Kit directly. It is therefore roughly `117 KB` (minified) and is appropriate for most application code.

Size-sensitive entries can avoid pulling the whole mirror by importing the narrow subpaths instead of the root:

- `@vue-solana/core/address`
- `@vue-solana/core/errors`
- `@vue-solana/core/timeout`
- `@vue-solana/core/clusters`
- `@vue-solana/core/rpc`
- `@vue-solana/core/types`
- `@vue-solana/core/kit` (when you explicitly want the Kit surface)

Avoid importing `@vue-solana/core/ios-wallet` or `@vue-solana/core/mobile-wallet` from lean code paths: they own `tweetnacl` and the Mobile Wallet Adapter protocol graph respectively. The `@vue-solana/core/mobile-wallet-support` subpath ships only the Android-support gate used to decide whether to lazy-load the MWA module.

A repository-level guard (`scripts/check-lean-imports.mjs`, run via `pnpm size:packages`) verifies that these lean entries stay free of the heavy iOS/mobile-wallet edges. Add any new lean entrypoint there before publishing it. The same script walks every `packages/vue/dist/*.mjs` static import graph: the Vue root may reach the iOS wallet entry (known, tracked debt), but no Vue subpath may, and `mobile-wallet`, `qrcode`, `@solana-mobile/*`, and `buffer` must stay behind dynamic imports or their dedicated subpaths.

## AI Agent Skill

If you use an AI coding agent, install the Vue Solana Agent Skill for package selection, setup patterns, wallet flow guidance, Solana-specific gotchas, and verification commands:

```sh
npx skills add vue-solana/vue-solana --skill vue-solana
```

Docs: [Vue Solana Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)

## Caveats

- Public Solana RPC endpoints are useful for development, but production apps should use dedicated RPC infrastructure.
- Use `mainnet` for Solana mainnet. This is Solana's official mainnet cluster name; the legacy `mainnet-beta` spelling is still accepted and redirects to the same endpoint.
- Transactions are raw wire bytes. Build transaction messages with `@vue-solana/core/kit` (`createTransactionMessage()`, `compileTransaction()`) and serialize them before passing them to wallet flows.
- v2.0.0 removed `@solana/web3-compat` and the `web3` subpaths. See the [Kit Migration guide](https://vue-solana-docs.vercel.app/guides/kit-migration) for migrating from v1.
- Desktop native app wallets are planned but not implemented yet.

## Status

This package provides Kit RPC helpers, browser extension wallet primitives, Android mobile wallet registration, message signing, token account reads, transaction helpers, and a framework-agnostic async action state machine.
