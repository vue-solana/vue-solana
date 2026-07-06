---
title: 集群
description: Solana 集群名称、RPC 端点和 faucet 使用说明。
ogSection: 概念
surroundOrder: 6
---

Solana 集群是一组验证者网络。应用需要选择要连接的集群。

## 支持的集群

Vue Solana 支持这些集群名称：

- `mainnet-beta`: Solana 主网。这是 Solana 官方主网集群名称。生产应用和真实 SOL 使用它。
- `devnet`: 开发者网络。构建应用时使用。Devnet SOL 没有真实价值。
- `testnet`: 验证者和协议测试网络。应用开发中不如 devnet 常用。
- `localnet`: 运行在本机的本地验证者，通常是 `http://127.0.0.1:8899`。

请使用 `mainnet-beta`，而不是 `mainnet`。Vue Solana 有意不添加 `mainnet` 别名。

官方参考：[Solana Clusters](https://solana.com/docs/references/clusters)

## RPC 端点

RPC 端点是应用用于从 Solana 读取或写入的 HTTP URL。

示例：

- `https://api.devnet.solana.com`
- `https://api.mainnet-beta.solana.com`
- `http://127.0.0.1:8899`

来自 `@vue-solana/vue/web3`、`@vue-solana/nuxt/web3` 或 `@vue-solana/core/web3` 的 `Connection` 对象会向该端点发送 RPC 请求。公共端点适合入门，但生产应用通常应使用专用 RPC provider 以获得可靠性和速率限制。

官方参考：[Solana RPC](https://solana.com/docs/rpc)

## WebSocket 端点

WebSocket 端点用于订阅和实时更新。除非显式传入 `wsEndpoint`，Vue Solana 会从 RPC 端点推导 WebSocket 端点。

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

也可以传入自定义端点：

```ts
createSolanaPlugin({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## 获取 Devnet 或 Testnet SOL

使用官方 faucet：

```txt
https://faucet.solana.com
```

选择 `Devnet` 或 `Testnet`，粘贴钱包地址并请求 SOL。

如果你已安装 Solana CLI，也可以请求空投：

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet 和 testnet SOL 没有真实价值。测试时不要使用包含真实资金的钱包。
