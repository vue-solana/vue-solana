---
title: 面向 Vue 开发者的 Solana
description: 面向 Vue 和 Nuxt 开发者的实用 Solana 概念。
ogSection: 概念
surroundOrder: 5
---

本页解释你在使用 Vue Solana 包时会遇到的 Solana 术语。内容偏实用，不追求穷尽。

官方参考：

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Transactions](https://solana.com/docs/core/transactions)

## Connections 和 RPC

前端应用通过 RPC 端点读取 Solana 数据。`@vue-solana/vue/web3` 和 `@vue-solana/nuxt/web3` 暴露受支持的 `Connection` 类，用于向该端点发送请求。

Vue Solana 包会为 Vue 和 Nuxt 代码创建并提供这个 connection，让 composables 共享同一个集群、端点、commitment 和钱包状态。

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## 公钥和地址

公钥就是 Solana 账户地址。你可以在前端应用中安全地展示公钥。

```ts
import { PublicKey } from "@vue-solana/vue/web3";

const publicKey = new PublicKey("PASTE_A_SOLANA_ADDRESS");
```

不要在前端代码中暴露私钥、助记词或 secret key 数组。

## Lamports 和 SOL

SOL 是 Solana 的原生代币。Lamports 是 SOL 的最小单位。

```txt
1 SOL = 1,000,000,000 lamports
```

RPC 余额方法返回 lamports。只在展示时把 lamports 转换为 SOL。

```ts
const lamports = await connection.getBalance(publicKey);
const sol = lamports / 1_000_000_000;
```

## 钱包

钱包保存密钥并签署交易。浏览器扩展钱包包括 Phantom、Solflare 和 Backpack。Android 原生移动钱包可以在受支持的 Android Chrome 运行时通过 Solana Mobile Wallet Adapter 连接。Phantom、Solflare 和 Backpack 也可以在 iOS 浏览器中通过钱包专用 universal links 连接。

Vue Solana 通过统一的 `useWallets()` 流程发现 Solana Wallet Standard 浏览器扩展钱包、Android Mobile Wallet Adapter 钱包和受支持的 iOS 浏览器钱包链接。RPC 读取和余额读取不需要钱包。连接、签名和发送交易需要已发现的钱包，或实现 `SolanaWallet` 接口的自定义对象。

查看[钱包](/zh/guides/wallets)了解当前支持范围和桌面原生钱包的 post-v1 状态。

## 交易和签名

交易是一组会改变 Solana 状态的指令。示例包括转账 SOL、创建账户或与程序交互。

签名证明钱包所有者批准该交易。前端应用应请求用户的钱包签名，不应持有私钥。

## Commitment 级别

Commitment 控制返回数据应达到的最终性。

- `processed`: 最快，最终性最低。
- `confirmed`: 大多数应用 UI 读取的良好默认值。
- `finalized`: 最慢，最终性最高。

示例：

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

官方参考：[Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## 安全提示

- 构建和测试时使用 `devnet`。
- 开发时不要使用包含真实资金的钱包。
- 不要在前端应用中硬编码私钥。
- 只有准备好与真实 SOL 和生产程序交互时才使用 `mainnet-beta`。
