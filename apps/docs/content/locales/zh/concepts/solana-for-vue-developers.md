---
title: 面向 Vue 开发者的 Solana
description: 面向 Vue 和 Nuxt 开发者的实用 Solana 概念。
ogSection: 概念
surroundOrder: 5
---

本页解释你在使用 Vue Solana 包时会遇到的 Solana 术语。内容偏向实用，而不是穷尽所有概念。

官方参考：

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Transactions](https://solana.com/docs/core/transactions)
- [Solana 核心概念](https://solana.com/docs/core) — 账户、程序、交易等 Solana 核心概念

## 连接和 RPC

前端应用通过 RPC 端点读取 Solana 数据。Kit 路径通过 `useSolanaClient()`（或 `@vue-solana/core/kit` 中的 `createSolanaClient()`）暴露只读的 `client.rpc`。

Vue Solana 包会为 Vue 和 Nuxt 代码创建并提供 Kit client，让 composables 可以共享同一个集群、端点、commitment 和钱包状态。

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## 公钥和地址

公钥就是 Solana 账户地址。你可以安全地在前端应用中展示公钥。

在 Kit 路径中，地址是使用 `@vue-solana/vue/kit` 中的 `address()` 创建的 `Address` 类型字符串：

```ts
import { address } from "@vue-solana/vue/kit";

const publicKey = address("PASTE_A_SOLANA_ADDRESS");
```

地址是 base58 的 `Address` 字符串；旧版 `PublicKey` 类和 `web3` 子路径已在 v2.0.0 中被移除。

有关两者之间完整的对应关系，请参阅 [Kit 迁移](/zh/guides/kit-migration) 指南。

绝不要在前端代码中暴露私钥、助记词或 secret key 数组。

## Lamports 和 SOL

SOL 是 Solana 上的原生代币。Lamports 是 SOL 的最小单位。

```txt
1 SOL = 1,000,000,000 lamports
```

RPC 余额方法返回 lamports。仅在展示时才把 lamports 转换为 SOL。

Kit RPC 方法以 `bigint` 形式返回 lamports：

```ts
const { value: lamports } = await rpc.getBalance(address("YOUR_ADDRESS")).send();
const sol = Number(lamports) / 1_000_000_000;
```

Kit RPC 调用对数字字段返回 `bigint`，对账户数据返回 `Uint8Array`。

## 钱包

钱包保存密钥并签署交易。浏览器扩展钱包包括 Phantom、Solflare 和 Backpack。Android 原生移动钱包可以在受支持的 Android Chrome 运行环境中通过 Solana Mobile Wallet Adapter 连接。Phantom、Solflare 和 Backpack 也可以通过各自钱包专用的 universal links 从 iOS 浏览器连接。

Vue Solana 会通过统一的 `useWallets()` 流程发现 Solana Wallet Standard 浏览器扩展钱包、Android Mobile Wallet Adapter 钱包，以及受支持的 iOS 浏览器钱包链接。RPC 读取和余额读取不需要钱包。连接、签名和发送交易需要一个已发现的钱包，或一个实现 `SolanaWallet` 接口的自定义对象。

请参阅[钱包](/zh/guides/wallets)，了解当前支持情况以及桌面原生钱包的状态。

## 交易和签名

交易是一组会改变 Solana 状态的指令。示例包括转账 SOL、创建账户，或与程序交互。

签名证明钱包所有者批准该交易。前端应用应该请求用户的钱包进行签名，而不应该持有私钥。

默认 `createSolanaClient()` 还会组合 Solana Kit 官方的 RPC planner 和 transaction-sending executor，因此可信 client context 可以不显示 wallet popup 地 plan 和 send。请为该路径提供 `payer` 或 embedded signer。将有资金的 signer 保存在 server 或 relayer 中；Nuxt public runtime config 不得包含 raw `payerSecretKey` 或其他 secret。

## Commitment 级别

Commitment 控制返回的数据应该达到什么最终确定程度。

- `processed`: 最快，最终确定性最低。
- `confirmed`: 大多数应用 UI 读取的良好默认值。
- `finalized`: 最慢，最终确定性最高。

示例：

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

官方参考：[Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## 安全注意事项

- 构建和测试时使用 `devnet`。
- 开发时不要使用包含真实资金的钱包。
- 不要在前端应用中硬编码私钥。
- 只有在准备好与真实 SOL 和生产程序交互时，才使用 `mainnet`。
