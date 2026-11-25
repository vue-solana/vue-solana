---
title: Clusters
description: Solana cluster names, RPC endpoints, and faucet instructions.
ogSection: Concepts
surroundOrder: 6
---

A Solana cluster is a network of validators. Apps choose which cluster to connect to.

## Supported Clusters

Vue Solana supports these cluster names:

- `mainnet`: Solana's production cluster. This is Solana's official mainnet cluster name. Use this for production apps and real SOL.
- `mainnet-beta`: legacy spelling of `mainnet`. Still accepted and redirects to the same `https://api.mainnet.solana.com` endpoint.
- `devnet`: developer network. Use this while building apps. Devnet SOL has no real value.
- `testnet`: validator and protocol testing network. It is less common for app development than devnet.
- `localnet`: a local validator running on your machine, usually at `http://127.0.0.1:8899`.

Use `mainnet` in Vue Solana code. Solana's documentation refers to the production cluster as Mainnet, and `mainnet` is the cluster name Solana tooling expects. The legacy `mainnet-beta` spelling is still accepted: both names resolve to the official `https://api.mainnet.solana.com` endpoint.

Official reference: [Solana Clusters](https://solana.com/docs/references/clusters)

## RPC Endpoints

An RPC endpoint is the HTTP URL your app uses to read from or write to Solana.

Examples:

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

RPC requests go through `client.rpc` from `useSolanaClient()` or `useSolanaRpc()`, or from `createSolanaClient()` / `createSolanaContext()` in `@vue-solana/core`. The legacy `Connection` class and the `web3` subpaths were removed in v2.0.0. Public endpoints are useful for getting started, but production apps usually use a dedicated RPC provider for reliability and rate limits.

Official reference: [Solana RPC](https://solana.com/docs/rpc)

## Hosted RPC Providers

Solana's public endpoints are shared by everyone. They are the fastest way to make your first `getLatestBlockhash()` or `getBalance()` call, but they are not a good foundation for an app that other people will use. Requests can be throttled when the endpoint is busy, latency is less predictable, and there is no usage dashboard or support contract. A hosted RPC provider gives you a keyed HTTP and WebSocket endpoint, published quotas, metrics, and a clear upgrade path when your traffic grows.

Vue Solana does not depend on a particular provider. Every RPC call goes through the Kit client built from your `endpoint` (and optional `wsEndpoint`), so changing providers is a configuration change, not a rewrite of your composables. See [Custom RPC Endpoints](/guides/rpc-and-clusters#custom-rpc-endpoints) for the code.

### Why Use One

- **Predictable limits.** A public endpoint shares one budget across all of its users. With a provider, your key has its own quota and documented behavior when you exceed it.
- **Subscriptions.** `useSubscription()` and `useTrackedData()` need a WebSocket connection. Providers expose a matching `wss://` URL and usually allow more concurrent subscriptions.
- **Observability.** Dashboards show request volume, errors, and latency, so you can tell whether a failure came from your app or from the RPC layer.
- **A production path.** When a tutorial becomes a real app, you can raise limits without changing component code.

### What To Check Before Choosing

- **Which methods the tier supports.** Availability differs by cluster and provider. Chainstack lists some heavy Solana scan methods as paid-only on mainnet and has no archive nodes for devnet.
- **How usage is counted.** Chainstack uses Request Units (1 RU per full-node request); Alchemy uses Compute Units, which vary by method. Comparing only "requests per second" can be misleading.
- **Whether WebSockets, webhooks, or gRPC are in the free tier.** Your app may need one of them even when plain HTTP reads work.
- **Where the API key will live.** An endpoint string in a browser bundle is visible to users. Restrict the key in the provider dashboard, or keep it behind a server route.

### Free Options To Start

| Provider                                      | Free tier                                                                 | Good for                                                                                                        | Details                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chainstack](https://chainstack.com/pricing/) | Developer: $0/mo, 3,000,000 RU/mo, 25 RPS overall, 1 project, WebSockets. | Predictable request-unit billing and explicit per-network limits. A good step up from a shared public endpoint. | [Throughput guidelines](https://docs.chainstack.com/docs/limits) list 25 RPS on Solana devnet but 5 RPS on Solana mainnet for Developer. `getProgramAccounts`, `getSupply`, and `getTokenAccountsByOwner` are paid-only on mainnet; devnet has no archive nodes. Overage is $20 per additional 1M RU. |
| [Alchemy](https://www.alchemy.com/pricing)    | Free: 30M CU/mo, 15 RPS, 5 apps, 5 webhooks, all mainnets and testnets.   | A ready-to-paste devnet HTTP/WSS URL, a usage dashboard, and Webhooks for learning and demos.                   | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) lists the endpoint and the APIs that are not available on devnet (Token, NFT, Prices, Debug, Trace, and others). Billing is in Compute Units, not raw requests; gRPC is paid.                                                          |

Quotas and prices change. Treat the linked provider pages as the source of truth; the numbers above are a starting point, not a promise from Vue Solana.

A provider gives you RPC access, not test SOL. You still need devnet SOL from the faucet below to send transactions.

## WebSocket Endpoints

WebSocket endpoints are used for subscriptions and real-time updates. Vue Solana derives a WebSocket endpoint from your RPC endpoint unless you pass `wsEndpoint` explicitly.

Examples:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
- `ws://127.0.0.1:8900`

## Configure A Cluster

For Vue:

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

For Nuxt:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

You can also pass a custom endpoint:

```ts
createSolanaPlugin({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
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
