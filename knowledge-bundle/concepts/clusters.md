---
type: Concept
title: Solana Clusters
description: Overview of Solana cluster types (mainnet-beta, devnet, testnet, localnet) and how to choose the right one.
tags:
  - solana
  - clusters
  - devnet
  - mainnet-beta
  - localnet
resource: https://solana.com/docs/references/clusters
timestamp: 2025-07-17T00:00:00Z
---

# Solana Clusters

A Solana cluster is a network of validators. Apps choose which cluster to connect to.

## Supported Clusters

- `mainnet-beta`: Solana mainnet. This is the official Solana cluster name. Use this for production apps and real SOL.
- `devnet`: developer network. Use this while building apps. SOL on devnet has no real value.
- `testnet`: validator and protocol testing network. It is less common for app development than devnet.
- `localnet`: a local validator running on your machine, usually at `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`. Solana's canonical mainnet cluster name is `mainnet-beta`.

## Choosing A Cluster

- **Development**: Use `devnet` while building and testing. Devnet SOL has no real value.
- **Testing**: Use `testnet` for validator and protocol testing, or `localnet` for fully local development.
- **Production**: Use `mainnet-beta` only when you are ready to interact with real SOL and production programs.

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
