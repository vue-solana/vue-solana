---
type: Concept
title: Solana Clusters
description: Overview of Solana cluster types, RPC endpoints, hosted RPC providers, and how to choose the right one.
tags:
  - solana
  - clusters
  - rpc
  - rpc-providers
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

## Hosted RPC Providers

Solana's public endpoints are shared by everyone. They are fine for a first `getLatestBlockhash()` or `getBalance()` call, but throttling, unpredictable latency, and no usage dashboard make them a poor foundation for an app other people will use. A hosted RPC provider gives you a keyed HTTP and WebSocket endpoint, published quotas, metrics, and a clear upgrade path when traffic grows.

Vue Solana does not depend on a particular provider. Every RPC call goes through the Kit client built from `endpoint` (and optional `wsEndpoint`), so changing providers is a configuration change, not a rewrite of your composables. `wsEndpoint` is optional: Vue Solana converts `https` to `wss` and preserves the path. Pass it explicitly only when the provider uses a different host or port.

Check before choosing:

- **Method availability by tier and cluster.** Chainstack lists some heavy Solana scan methods as paid-only on mainnet and has no archive nodes for devnet.
- **How usage is metered.** Chainstack uses Request Units (1 RU per full-node request); Alchemy uses Compute Units, which vary by method. Comparing only requests per second is misleading.
- **Whether WebSockets, webhooks, or gRPC are in the free tier.** Your app may need one even when plain HTTP reads work.
- **Where the API key will live.** An endpoint string in a browser bundle is visible to users. Restrict the key in the provider dashboard or put it behind a server route.

| Provider                                      | Free tier                                                                 | Good for                                                              | Details                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chainstack](https://chainstack.com/pricing/) | Developer: $0/mo, 3,000,000 RU/mo, 25 RPS overall, 1 project, WebSockets. | Predictable request-unit billing and explicit per-network limits.     | [Throughput guidelines](https://docs.chainstack.com/docs/limits) list 25 RPS on Solana devnet but 5 RPS on Solana mainnet for Developer. `getProgramAccounts`, `getSupply`, and `getTokenAccountsByOwner` are paid-only on mainnet; devnet has no archive nodes. Overage is $20 per additional 1M RU. |
| [Alchemy](https://www.alchemy.com/pricing)    | Free: 30M CU/mo, 15 RPS, 5 apps, 5 webhooks, all mainnets and testnets.   | A ready-to-paste devnet HTTP/WSS URL and a usage dashboard for demos. | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) lists the endpoint and APIs unavailable on devnet (Token, NFT, Prices, Debug, Trace, and others). Billing is in Compute Units, not raw requests; gRPC is paid.                                                                         |

Quotas and prices change. Treat the linked provider pages as the source of truth; the numbers above are a starting point, not a promise from Vue Solana. A provider gives you RPC access, not test SOL: you still need devnet SOL from the faucet to send transactions.

In Nuxt, keep a server-only key in private runtime config and read it with `useServerSolanaClient()`. Never put a raw key in `runtimeConfig.public.solana`; public config is bundled into the browser.

## Related

- [Solana Concepts For Vue Developers](./solana-for-vue-developers.md)
