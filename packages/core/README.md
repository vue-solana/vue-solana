# @vue-solana/core

[![npm version](https://img.shields.io/npm/v/@vue-solana/core.svg)](https://www.npmjs.com/package/@vue-solana/core)
[![npm downloads](https://img.shields.io/npm/dt/@vue-solana/core.svg)](https://www.npmjs.com/package/@vue-solana/core)
[![license](https://img.shields.io/npm/l/@vue-solana/core.svg)](https://github.com/vue-solana/vue-solana/blob/main/LICENSE)
[![docs](https://img.shields.io/badge/docs-vue--solana-blue)](https://vue-solana-docs.vercel.app/packages/core)

Framework-agnostic Solana primitives for Vue Solana libraries and apps that want shared RPC, wallet, and transaction helpers without installing a Vue plugin.

Use this package directly when you want connection helpers, shared wallet types, Android Mobile Wallet Adapter registration helpers, message signing support, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` wraps `@solana/web3-compat` and re-exports the Solana primitives most Vue Solana apps need, including `Connection`, `PublicKey`, `Transaction`, and `VersionedTransaction`.

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

- Cluster-aware RPC connection helpers with HTTP and WebSocket endpoint defaults.
- Shared `SolanaConfig`, `SolanaContext`, and `SolanaWallet` types for framework integrations.
- Wallet capability assertions for connection, message signing, and transaction signing flows.
- Browser Wallet Standard adaptation primitives.
- Android Mobile Wallet Adapter registration helpers.
- iOS browser wallet link helpers for supported wallets.
- Transaction submission and confirmation helpers.

## Compatibility

| Requirement   | Supported                                       |
| ------------- | ----------------------------------------------- |
| Runtime       | Modern ESM or CommonJS bundlers                 |
| TypeScript    | TypeScript 5.x recommended                      |
| Solana client | `@solana/web3-compat@^0.0.21`                   |
| Clusters      | `mainnet-beta`, `devnet`, `testnet`, `localnet` |

This package depends on `@solana/web3-compat` and exposes the supported compatibility primitives through `@vue-solana/core` and `@vue-solana/core/web3`, so apps do not need to install `@solana/web3-compat` directly for normal Vue Solana usage.

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

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

The root export remains supported. Direct subpath exports are also available for narrower imports:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parsePublicKey } from "@vue-solana/core/address";
import { PublicKey, Transaction } from "@vue-solana/core/web3";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Browser apps that create or serialize legacy transactions can install the Buffer polyfill before transaction code runs:

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
| `commitment`  | Solana commitment                                       | Solana client default         | Default commitment for created connections.                                             |
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
- `@vue-solana/core/clusters`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`

| API                                                                 | Description                                                                                                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DEFAULT_CLUSTER`                                                   | Default cluster, currently `devnet`.                                                                                                               |
| `parsePublicKey(value)`                                             | Parses a `PublicKey`, address string, ref-like `{ value }`, getter, `null`, or `undefined` into a `PublicKey \| null`.                             |
| `createSolanaConnection(config?)`                                   | Creates a Solana `Connection`.                                                                                                                     |
| `createSolanaContext(config?)`                                      | Creates `{ cluster, endpoint, wsEndpoint, connection }`.                                                                                           |
| `getClusterEndpoint(cluster?)`                                      | Returns the HTTP RPC endpoint for a cluster.                                                                                                       |
| `getClusterWebSocketEndpoint(cluster?)`                             | Returns the WebSocket endpoint for a cluster.                                                                                                      |
| `getWebSocketEndpoint(endpoint)`                                    | Converts `http`/`https` RPC URLs to `ws`/`wss` URLs.                                                                                               |
| `isWalletConnected(wallet)`                                         | Checks whether a wallet is connected and has a public key.                                                                                         |
| `assertWalletConnected(wallet)`                                     | Throws if the wallet is not connected.                                                                                                             |
| `assertWalletCanSignMessage(wallet)`                                | Throws if the wallet is disconnected or cannot sign messages.                                                                                      |
| `assertWalletCanSign(wallet)`                                       | Throws if the wallet cannot sign transactions.                                                                                                     |
| `signAndSendTransaction(connection, wallet, transaction, options?)` | Signs and sends a transaction using a configured wallet. Android MWA wallets prefer `signTransaction` plus app-side RPC submission when available. |
| `confirmTransactionSignature(connection, signature, options?)`      | Waits for a submitted signature to reach a requested commitment. Defaults to `confirmed` and a 60 second timeout.                                  |

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
- `@solana/web3-compat@0.0.21` currently has broken TypeScript package metadata. Runtime imports still use the real package, but TypeScript consumers may need a local declaration shim. See [Troubleshooting](https://vue-solana-docs.vercel.app/troubleshooting) for the workaround.
- Desktop native app wallets are planned but not implemented yet.

## Status

This package provides RPC helpers, browser extension wallet primitives, Android mobile wallet registration, message signing, and transaction helpers.
