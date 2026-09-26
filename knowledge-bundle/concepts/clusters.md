---
type: Concept
title: Solana Clusters
description: Overview of Solana cluster types (mainnet, devnet, testnet, localnet) and how to choose the right one.
tags:
  - solana
  - clusters
  - devnet
  - mainnet
  - localnet
resource: https://solana.com/docs/references/clusters
timestamp: 2025-07-17T00:00:00Z
---

# Solana Clusters

A Solana cluster is a network of validators. Apps choose which cluster to connect to.

## Supported Clusters

- `mainnet`: Solana's production cluster. This is the official Solana mainnet cluster name. Use this for production apps and real SOL.
- `mainnet-beta`: legacy spelling of `mainnet`. Still accepted and redirects to the same `https://api.mainnet.solana.com` endpoint.
- `devnet`: developer network. Use this while building apps. SOL on devnet has no real value.
- `testnet`: validator and protocol testing network. It is less common for app development than devnet.
- `localnet`: a local validator running on your machine, usually at `http://127.0.0.1:8899`.

Use `mainnet` in Vue Solana code. Solana's documentation refers to the production cluster as Mainnet, and `mainnet` is the cluster name Solana tooling expects. The legacy `mainnet-beta` spelling is still accepted: both names resolve to the official `https://api.mainnet.solana.com` endpoint.

## Choosing A Cluster

- **Development**: Use `devnet` while building and testing. Devnet SOL has no real value.
- **Testing**: Use `testnet` for validator and protocol testing, or `localnet` for fully local development.
- **Production**: Use `mainnet` only when you are ready to interact with real SOL and production programs.

## Cluster Configuration

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Or in Nuxt:

```ts
export default defineNuxtConfig({
  solana: {
    cluster: "devnet",
  },
});
```

## Related

- [Solana Concepts For Vue Developers](./solana-for-vue-developers.md)
