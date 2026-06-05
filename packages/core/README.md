# @vue-solana/core

Framework-agnostic Solana primitives used by the Vue Solana packages.

Use this package directly when you want connection helpers, shared wallet types, and transaction helpers without installing the Vue plugin.

`@vue-solana/core` does not replace `@solana/web3-compat`. Use `@solana/web3-compat` for raw Solana primitives like `Connection`, `PublicKey`, and transactions. Use `@vue-solana/core` for Vue Solana shared configuration, cluster endpoint defaults, wallet interfaces, and transaction helpers.

Official Solana docs:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)

Full Vue Solana docs:

- [`@vue-solana/core`](https://github.com/vue-solana/vue-solana/tree/main/apps/docs/content/packages/core.md)
- [Getting Started](https://github.com/vue-solana/vue-solana/tree/main/apps/docs/content/getting-started.md)
- [Troubleshooting](https://github.com/vue-solana/vue-solana/tree/main/apps/docs/content/troubleshooting.md)

## Install

```sh
pnpm add @vue-solana/core @solana/web3-compat
```

```sh
npm install @vue-solana/core @solana/web3-compat
```

## Quick Start

```ts
import { createSolanaContext } from '@vue-solana/core'

const solana = createSolanaContext({
  cluster: 'devnet'
})

const { blockhash } = await solana.connection.getLatestBlockhash()

console.log(solana.endpoint, blockhash)
```

## Configuration

```ts
import type { SolanaConfig } from '@vue-solana/core'

const config: SolanaConfig = {
  cluster: 'devnet',
  endpoint: 'https://api.devnet.solana.com',
  wsEndpoint: 'wss://api.devnet.solana.com',
  commitment: 'confirmed',
  autoConnect: false
}
```

Supported clusters are `mainnet-beta`, `testnet`, `devnet`, and `localnet`. If `endpoint` is omitted, the package uses the public Solana RPC endpoint for the selected cluster. If `wsEndpoint` is omitted, it is derived from the RPC endpoint.

Use `mainnet-beta` for Solana mainnet. This is Solana's official cluster name; the package intentionally does not use `mainnet` as an alias.

For development, use `devnet` and request free test SOL from the official faucet:

```txt
https://faucet.solana.com
```

## API

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
import type { SolanaWallet } from '@vue-solana/core'

const wallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  connect: async () => {},
  disconnect: async () => {},
  signTransaction: async transaction => transaction
}
```

Browser wallet discovery is not included yet. If you need wallet connection or transaction signing today, provide an object that implements `SolanaWallet`.

## Examples

For complete runnable Vue and Nuxt examples that use this package through the framework integrations, see:

- [`examples/vue-vite`](https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite)
- [`examples/nuxt`](https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt)

## Known TypeScript Issue

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Runtime imports still use the real package, but TypeScript consumers may need a local declaration shim.

If TypeScript cannot resolve `@solana/web3-compat`, add `types/web3-compat.d.ts` to your app:

```ts
declare module '@solana/web3-compat' {
  export type {
    Commitment,
    SendOptions,
    TransactionSignature
  } from '@solana/web3.js'
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction
  } from '@solana/web3.js'
}
```

Make sure your `tsconfig.json` includes `types/**/*.d.ts` or another pattern that includes the shim.

## Status

This package is early-stage. RPC helpers and transaction primitives are usable; first-class browser wallet adapter support is planned.
