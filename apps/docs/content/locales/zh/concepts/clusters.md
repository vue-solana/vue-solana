---
title: 集群
description: Solana 集群名称、RPC 端点和水龙头使用说明。
ogSection: 概念
surroundOrder: 6
---

Solana 集群是由一组验证者组成的网络。应用需要选择要连接到哪个集群。

## 支持的集群

Vue Solana 支持这些集群名称：

- `mainnet-beta`: Solana 主网。这是 Solana 官方的主网集群名称。生产应用和真实 SOL 请使用它。
- `devnet`: 开发者网络。构建应用时使用它。Devnet SOL 没有真实价值。
- `testnet`: 验证者和协议测试网络。与 devnet 相比，它在应用开发中不太常用。
- `localnet`: 运行在你机器上的本地验证者，通常位于 `http://127.0.0.1:8899`。

请使用 `mainnet-beta`，而不是 `mainnet`。Vue Solana 有意不添加 `mainnet` 这个别名。

官方参考：[Solana Clusters](https://solana.com/docs/references/clusters)

## RPC 端点

RPC 端点是应用用来从 Solana 读取数据或向 Solana 写入数据的 HTTP URL。

示例：

- `https://api.devnet.solana.com`
- `https://api.mainnet-beta.solana.com`
- `http://127.0.0.1:8899`

来自 `@vue-solana/vue/web3`、`@vue-solana/nuxt/web3` 或 `@vue-solana/core/web3` 的 `Connection` 对象会向该端点发送 RPC 请求。公共端点适合入门，但生产应用通常会使用专用 RPC provider，以获得更好的可靠性和速率限制。

官方参考：[Solana RPC](https://solana.com/docs/rpc)

## WebSocket 端点

WebSocket 端点用于订阅和实时更新。除非你显式传入 `wsEndpoint`，否则 Vue Solana 会从 RPC 端点推导 WebSocket 端点。

示例：

- `wss://api.devnet.solana.com`
- `wss://api.mainnet-beta.solana.com`
- `ws://127.0.0.1:8900`

## 配置集群

Vue：

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Nuxt：

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

你也可以传入自定义端点：

```ts
createSolanaPlugin({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## 获取 Devnet 或 Testnet 的 SOL

使用官方水龙头：

```txt
https://faucet.solana.com
```

选择 `Devnet` 或 `Testnet`，粘贴你的钱包地址，然后请求 SOL。

如果你安装了 Solana CLI，也可以请求空投：

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet 和 testnet SOL 没有真实价值。测试时绝不要使用包含真实资金的钱包。
