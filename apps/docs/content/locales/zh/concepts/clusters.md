---
title: 集群
description: Solana 集群名称、RPC 端点和水龙头使用说明。
ogSection: 概念
surroundOrder: 6
---

Solana 集群是由一组验证者组成的网络。应用需要选择要连接到哪个集群。

## 支持的集群

Vue Solana 支持这些集群名称：

- `mainnet`: Solana 的生产集群。这是 Solana 官方的主网集群名称。生产应用和真实 SOL 请使用它。
- `mainnet-beta`: `mainnet` 的旧写法。仍然被接受，并重定向到相同的 `https://api.mainnet.solana.com` 端点。
- `devnet`: 开发者网络。构建应用时使用它。Devnet SOL 没有真实价值。
- `testnet`: 验证者和协议测试网络。与 devnet 相比，它在应用开发中不太常用。
- `localnet`: 运行在你机器上的本地验证者，通常位于 `http://127.0.0.1:8899`。

在 Vue Solana 代码中请使用 `mainnet`。Solana 官方文档将生产集群称为 Mainnet，`mainnet` 是 Solana 工具链所期望的集群名称。旧的 `mainnet-beta` 写法仍然被接受：两个名称都解析到官方 `https://api.mainnet.solana.com` 端点。

官方参考：[Solana Clusters](https://solana.com/docs/references/clusters)

## RPC 端点

RPC 端点是应用用来从 Solana 读取数据或向 Solana 写入数据的 HTTP URL。

示例：

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

RPC 请求通过 `useSolanaClient()` 或 `useSolanaRpc()` 的 `client.rpc` 发送，或通过 `@vue-solana/core` 中的 `createSolanaClient()` / `createSolanaContext()` 发送。旧版 `Connection` 类和 `web3` 子路径已在 v2.0.0 中被移除。公共端点适合入门，但生产应用通常会使用专用 RPC provider，以获得更好的可靠性和速率限制。

官方参考：[Solana RPC](https://solana.com/docs/rpc)

## 托管 RPC 提供商

Solana 的公开端点由所有人共享。用它们完成第一次 `getLatestBlockhash()` 或 `getBalance()` 调用最快，但对于要给别人使用的应用来说，它们不是可靠的基础。端点繁忙时请求可能被限流，延迟更难预测，而且没有用量面板或支持协议。托管 RPC 提供商会给你一个带密钥的 HTTP 和 WebSocket 端点、公开的配额、指标，以及流量增长时清晰的升级路径。

Vue Solana 不依赖任何特定提供商。所有 RPC 调用都经过由 `endpoint`（以及可选的 `wsEndpoint`）构建的 Kit 客户端，因此更换提供商只是改配置，不需要重写 composable。代码见[自定义 RPC 端点](/zh/guides/rpc-and-clusters#自定义-rpc-端点)。

### 为什么需要

- **可预测的限额。** 公开端点让所有用户共享同一个预算。使用提供商后，你的密钥有独立配额，超出配额时的行为也有文档说明。
- **订阅。** `useSubscription()` 和 `useTrackedData()` 需要 WebSocket 连接。提供商提供对应的 `wss://` URL，通常也允许更多并发订阅。
- **可观测性。** 面板会显示请求量、错误和延迟，方便判断故障来自应用还是 RPC 层。
- **通往生产的路径。** 当教程变成真正的应用时，你可以提高限额而不改组件代码。

### 选择前需要检查的内容

- **套餐支持哪些方法。** 可用性因 cluster 和提供商而异。Chainstack 将部分较重的 Solana 扫描方法列为 mainnet 付费功能，并且 devnet 没有归档节点。
- **用量如何计量。** Chainstack 使用 Request Units（完整节点每次请求 1 RU）；Alchemy 使用随方法变化的 Compute Units。只比较“每秒请求数”可能产生误导。
- **WebSocket、webhook 或 gRPC 是否包含在免费套餐内。** 即使简单的 HTTP 读取可用，应用也可能需要其中某项。
- **API 密钥放在哪里。** 浏览器包中的端点 URL 对用户可见。请在提供商面板中限制密钥，或把它放在服务端路由之后。

### 可免费开始的选择

| 提供商                                        | 免费套餐                                                                          | 适合                                                                       | 需要注意                                                                                                                                                                                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chainstack](https://chainstack.com/pricing/) | Developer：每月 0 美元、每月 3,000,000 RU、总计 25 RPS、1 个项目、WebSockets。    | 按 Request Units 计费清晰，各网络限额明确。适合从共享公开端点往前迈一步。  | [吞吐量指南](https://docs.chainstack.com/docs/limits) 显示 Developer 在 Solana devnet 为 25 RPS，但在 Solana mainnet 只有 5 RPS。`getProgramAccounts`、`getSupply` 和 `getTokenAccountsByOwner` 在 mainnet 为付费方法；devnet 没有归档节点。超出配额后每增加 100 万 RU 收费 20 美元。 |
| [Alchemy](https://www.alchemy.com/pricing)    | Free：每月 3,000 万 CU、15 RPS、5 个应用、5 个 webhook、所有 mainnet 和 testnet。 | 可直接粘贴的 devnet HTTP / WSS URL、用量面板，以及学习和演示用的 webhook。 | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) 列出了端点以及 devnet 上不可用的 API（Token、NFT、Prices、Debug、Trace 等）。按 Compute Units 而非原始请求数计费；gRPC 为付费功能。                                                                                    |

配额和价格会变化。请以链接的提供商页面为准；上面的数字只是起点，并非 Vue Solana 的承诺。

提供商提供的是 RPC 访问，不是测试用 SOL。要发送交易，仍需从下方的 faucet 获取 devnet SOL。

## WebSocket 端点

WebSocket 端点用于订阅和实时更新。除非你显式传入 `wsEndpoint`，否则 Vue Solana 会从 RPC 端点推导 WebSocket 端点。

示例：

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
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
  cluster: "mainnet",
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
