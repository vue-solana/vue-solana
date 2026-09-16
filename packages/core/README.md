# @vue-solana/core

[![npm version](https://img.shields.io/npm/v/@vue-solana/core.svg)](https://www.npmjs.com/package/@vue-solana/core)
[![npm downloads](https://img.shields.io/npm/dt/@vue-solana/core.svg)](https://www.npmjs.com/package/@vue-solana/core)
[![license](https://img.shields.io/npm/l/@vue-solana/core.svg)](https://github.com/vue-solana/vue-solana/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-vue--solana-blue)](https://vue-solana-docs.vercel.app/packages/core)

Framework-agnostic Solana primitives for Vue Solana libraries and apps that want shared RPC, wallet, and transaction helpers without installing a Vue plugin.

Use this package directly when you want Kit RPC client helpers, shared wallet types, Android Mobile Wallet Adapter registration helpers, message signing support, token account reads, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` builds on `@solana/kit`. It exposes `createSolanaClient()` and re-exports Kit primitives (`address`, `lamports`, and the `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, and `SolanaRpcApi` types) from `@vue-solana/core/kit`. The legacy `@solana/web3-compat` surface and the `web3` subpaths were removed in v2.0.0; transactions flow through the packages as raw `Uint8Array` wire bytes.

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
- A Kit `client` with lazy `rpc` and `rpcSubscriptions` through `createSolanaClient()` / `createSolanaContext()`.
- Shared `SolanaConfig`, `SolanaContext`, and `SolanaWallet` types for framework integrations.
- Wallet capability assertions for connection, message signing, and transaction signing flows.
- Browser Wallet Standard adaptation primitives.
- Android Mobile Wallet Adapter registration helpers.
- iOS browser wallet link helpers for supported wallets.
- Transaction submission and confirmation helpers.
- SPL token account reads through Kit RPC `jsonParsed`.

## Compatibility

| Requirement   | Supported                                           |
| ------------- | --------------------------------------------------- |
| Runtime       | Modern ESM or CommonJS bundlers                     |
| TypeScript    | TypeScript 5.x recommended                          |
| Solana client | `@solana/kit@^8.3.0` (and `@solana/kit-plugin-rpc`) |
| Clusters      | `mainnet-beta`, `devnet`, `testnet`, `localnet`     |

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

| Option        | Type                                                    | Default                       | Description                                                                             |
| ------------- | ------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------- |
| `cluster`     | `"mainnet-beta" \| "devnet" \| "testnet" \| "localnet"` | `"devnet"`                    | Solana cluster used when `endpoint` is omitted.                                         |
| `endpoint`    | `string`                                                | Public endpoint for `cluster` | HTTP RPC endpoint. Use a dedicated RPC provider for production apps.                    |
| `wsEndpoint`  | `string`                                                | Derived from `endpoint`       | WebSocket RPC endpoint.                                                                 |
| `commitment`  | Solana commitment                                       | Solana client default         | Default commitment for RPC calls.                                                       |
| `autoConnect` | `boolean`                                               | `false`                       | Consumed by Vue/Nuxt integrations to reconnect a previously selected discovered wallet. |

Supported clusters are `mainnet-beta`, `testnet`, `devnet`, and `localnet`. If `endpoint` is omitted, the package uses the public Solana RPC endpoint for the selected cluster. If `wsEndpoint` is omitted, it is derived from the RPC endpoint.

`autoConnect` is consumed by the Vue plugin and Nuxt module. It defaults to `false`; when set to `true`, Vue Solana reconnects only a previously selected wallet identity that is discovered again on the client.

Use `mainnet-beta` for Solana mainnet. This is Solana's official cluster name; the package intentionally does not use `mainnet` as an alias.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## API

Direct subpaths:

- `@vue-solana/core/types`
- `@vue-solana/core/address`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/token-accounts`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`

| API                                                             | Description                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_CLUSTER`                                               | Default cluster, currently `devnet`.                                                                                                                          |
| `parseAddress(value)`                                           | Parses an `Address`, address string, ref-like `{ value }`, getter, `null`, or `undefined` into an `Address \| null`. Invalid strings throw `INVALID_ADDRESS`. |
| `createSolanaClient(config?)`                                   | Creates a Kit client exposing lazy `rpc` and `rpcSubscriptions`.                                                                                              |
| `createSolanaContext(config?)`                                  | Creates `{ cluster, endpoint, wsEndpoint, client }`.                                                                                                          |
| `getClusterEndpoint(cluster?)`                                  | Returns the HTTP RPC endpoint for a cluster.                                                                                                                  |
| `getClusterWebSocketEndpoint(cluster?)`                         | Returns the WebSocket endpoint for a cluster.                                                                                                                 |
| `getWebSocketEndpoint(endpoint)`                                | Converts `http`/`https` RPC URLs to `ws`/`wss` URLs.                                                                                                          |
| `isWalletConnected(wallet)`                                     | Checks whether a wallet is connected and has an address.                                                                                                      |
| `assertWalletConnected(wallet)`                                 | Throws if the wallet is not connected.                                                                                                                        |
| `assertWalletCanSignMessage(wallet)`                            | Throws if the wallet is disconnected or cannot sign messages.                                                                                                 |
| `assertWalletCanSign(wallet)`                                   | Throws if the wallet cannot sign transactions.                                                                                                                |
| `signAndSendTransaction(client, wallet, transaction, options?)` | Signs and sends raw wire bytes (`SolanaTransaction = Uint8Array`) using a configured wallet.                                                                  |
| `confirmTransactionSignature(client, signature, options?)`      | Waits for a submitted signature to reach a requested commitment by polling `getSignatureStatuses`. Defaults to `confirmed` and a 60 second timeout.           |
| `getTokenAccountsByOwner(client, owner, options?)`              | Returns SPL token accounts for an owner (token and token-2022 programs by default).                                                                           |
| `getTokenAccount(client, address, commitment?)`                 | Reads a single token account, returning `null` when it does not exist.                                                                                        |
| `getTokenBalance(client, mint, owner, commitment?)`             | Reads the token balance for an owner's associated token account as `{ amount, decimals }`.                                                                    |

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

## AI Agent Skill

If you use an AI coding agent, install the Vue Solana Agent Skill for package selection, setup patterns, wallet flow guidance, Solana-specific gotchas, and verification commands:

```sh
npx skills add vue-solana/vue-solana --skill vue-solana
```

Docs: [Vue Solana Agent Skill](https://vue-solana-docs.vercel.app/agent-skill)

## Caveats

- Public Solana RPC endpoints are useful for development, but production apps should use dedicated RPC infrastructure.
- Use `mainnet-beta` for Solana mainnet. `mainnet` is intentionally not accepted as a cluster alias.
- Transactions are raw wire bytes. Build transaction messages with `@solana/kit` (`createTransactionMessage()`, `compileTransaction()`) and serialize them before passing them to wallet flows.
- v2.0.0 removed `@solana/web3-compat` and the `web3` subpaths. See the [Kit Migration guide](https://vue-solana-docs.vercel.app/guides/kit-migration) for migrating from v1.
- Desktop native app wallets are planned but not implemented yet.

## Status

This package provides Kit RPC helpers, browser extension wallet primitives, Android mobile wallet registration, message signing, token account reads, and transaction helpers.
