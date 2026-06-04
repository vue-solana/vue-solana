---
title: Clusters
description: Solana cluster names, RPC endpoints, and faucet instructions.
---

A Solana cluster is a network of validators. Apps choose which cluster to connect to.

## Supported Clusters

Vue Solana supports these cluster names:

- `mainnet-beta`: Solana mainnet. This is Solana's official mainnet cluster name. Use this for production apps and real SOL.
- `devnet`: developer network. Use this while building apps. Devnet SOL has no real value.
- `testnet`: validator and protocol testing network. It is less common for app development than devnet.
- `localnet`: a local validator running on your machine, usually at `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`. Vue Solana intentionally does not add a `mainnet` alias.

Official reference: [Solana Clusters](https://solana.com/docs/references/clusters)

## RPC Endpoints

An RPC endpoint is the HTTP URL your app uses to read from or write to Solana.

Examples:

- `https://api.devnet.solana.com`
- `https://api.mainnet-beta.solana.com`
- `http://127.0.0.1:8899`

The `Connection` object from `@solana/web3-compat` sends RPC requests to this endpoint. Public endpoints are useful for getting started, but production apps usually use a dedicated RPC provider for reliability and rate limits.

Official reference: [Solana RPC](https://solana.com/docs/rpc)

## WebSocket Endpoints

WebSocket endpoints are used for subscriptions and real-time updates. Vue Solana derives a WebSocket endpoint from your RPC endpoint unless you pass `wsEndpoint` explicitly.

Examples:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet-beta.solana.com`
- `ws://127.0.0.1:8900`

## Configure A Cluster

For Vue:

```ts
createSolanaPlugin({
  cluster: 'devnet'
})
```

For Nuxt:

```ts
export default defineNuxtConfig({
  modules: ['@vue-solana/nuxt'],
  solana: {
    cluster: 'devnet'
  }
})
```

You can also pass a custom endpoint:

```ts
createSolanaPlugin({
  cluster: 'mainnet-beta',
  endpoint: 'https://your-rpc.example.com',
  commitment: 'confirmed'
})
```

## Get Devnet Or Testnet SOL

Use the official faucet:

```txt
https://faucet.solana.com
```

Choose `Devnet` or `Testnet`, paste your wallet address, and request SOL.

If you have the Solana CLI installed, you can also request an airdrop:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet and testnet SOL have no real value. Never use a wallet with real funds while testing.
