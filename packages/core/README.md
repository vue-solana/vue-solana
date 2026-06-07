# @vue-solana/core

Framework-agnostic Solana primitives used by the Vue Solana packages.

Use this package directly when you want connection helpers, shared wallet types, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` does not replace `@solana/web3-compat`. Use `@solana/web3-compat` for raw Solana primitives like `Connection`, `PublicKey`, and transactions. Use `@vue-solana/core` for Vue Solana shared configuration, cluster endpoint defaults, wallet interfaces, and transaction helpers.

Official Solana docs:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)

Full Vue Solana docs:

- [`@vue-solana/core`](https://vue-solana-docs.vercel.app/packages/core)
- [Live demo](https://vue-solana-docs.vercel.app/demo)
- [Getting Started](https://vue-solana-docs.vercel.app/getting-started)
- [Troubleshooting](https://vue-solana-docs.vercel.app/troubleshooting)

## Install

```sh
pnpm add @vue-solana/core @solana/web3-compat
```

```sh
npm install @vue-solana/core @solana/web3-compat
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
import type { SolanaConfig } from "@vue-solana/core/types";
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

Supported clusters are `mainnet-beta`, `testnet`, `devnet`, and `localnet`. If `endpoint` is omitted, the package uses the public Solana RPC endpoint for the selected cluster. If `wsEndpoint` is omitted, it is derived from the RPC endpoint.

Use `mainnet-beta` for Solana mainnet. This is Solana's official cluster name; the package intentionally does not use `mainnet` as an alias.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## API

Direct subpaths:

- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/rpc`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`

- `DEFAULT_CLUSTER`: default cluster, currently `devnet`.
- `createSolanaConnection(config?)`: creates a `Connection`.
- `createSolanaContext(config?)`: creates `{ cluster, endpoint, wsEndpoint, connection }`.
- `getClusterEndpoint(cluster?)`: returns the HTTP RPC endpoint for a cluster.
- `getClusterWebSocketEndpoint(cluster?)`: returns the WebSocket endpoint for a cluster.
- `getWebSocketEndpoint(endpoint)`: converts `http`/`https` RPC URLs to `ws`/`wss` URLs.
- `isWalletConnected(wallet)`: checks whether a wallet is connected and has a public key.
- `assertWalletConnected(wallet)`: throws if the wallet is not connected.
- `assertWalletCanSign(wallet)`: throws if the wallet cannot sign transactions.
- `signAndSendTransaction(connection, wallet, transaction, options?)`: signs and sends a transaction using a configured wallet.

## Wallet Interface

```ts
import type { SolanaWallet } from "@vue-solana/core";

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connect: async () => {},
  disconnect: async () => {},
  signTransaction: async (transaction) => transaction,
};
```

Browser wallets discovered through the Solana Wallet Standard are adapted into `SolanaWallet`. You can also provide a custom object that implements `SolanaWallet` for tests or custom adapters.

## Examples

For complete runnable Vue and Nuxt examples that use this package through the framework integrations, see:

- [Live demo](https://vue-solana-docs.vercel.app/demo)
- <a href="https://vue-solana-docs.vercel.app/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>
- <a href="https://vue-solana-docs.vercel.app/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

## Known TypeScript Issue

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Runtime imports still use the real package, but TypeScript consumers may need a local declaration shim.

If TypeScript cannot resolve `@solana/web3-compat`, add `types/web3-compat.d.ts` to your app:

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

Make sure your `tsconfig.json` includes `types/**/*.d.ts` or another pattern that includes the shim.

## Status

This package is early-stage. RPC helpers, wallet primitives, and transaction helpers are usable.
