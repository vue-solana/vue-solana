---
title: Nuxt 示例
description: 用于 @vue-solana/nuxt 的可运行 Nuxt 示例应用。
ogSection: 示例
surroundOrder: 18
---

Nuxt 示例是一个用于 `@vue-solana/nuxt` 的可运行 Nuxt 应用。

源码：<a href="https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

实时演示：[vue-solana-docs.vercel.app/demo](/zh/demo)

## 演示内容

- 使用 `modules: ['@vue-solana/nuxt']` 安装 Nuxt 模块。
- 使用 `solana: { cluster: 'devnet' }` 配置模块。
- 使用自动导入的 `useSolanaRpc()` 读取 RPC 状态。
- 使用 `useSolanaConnection()` 访问注入的 connection。
- 使用 `useSolanaBalance()` 读取 lamport 余额。
- 使用 `useSolanaWallets()` 发现浏览器扩展钱包、Android Mobile Wallet Adapter 钱包和受支持的 iOS 浏览器钱包条目。
- 使用 `useSolanaWallet()` 管理活动钱包状态。
- 持久化钱包选择元数据，并在重新加载时恢复之前选择的钱包身份。
- 可选的 `autoConnect` 行为：只在之前选择的钱包再次被发现时重新连接它。
- 为无法签署消息或交易的钱包渲染不支持能力的状态。
- 当已连接钱包支持时，使用自动导入的 `useSolanaSignMessage()` 签署认证消息。
- 使用 `useSolanaSignAndSendTransaction()` 发送真实转账，并展示已提交与已确认的交易状态。示例默认使用 devnet，便于安全测试。
- 为已提交签名构建感知集群的 Solana Explorer 链接。
- 使用来自 `@vue-solana/vue/useTransaction` 的 `useTransaction()` 处理通用异步交易状态。

应用默认使用 `devnet`。Devnet SOL 没有真实价值。

## 从仓库根目录运行

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

打开终端输出的 Nuxt URL，通常是 `http://localhost:3000`。

## 可以尝试什么

- 检查初始模块/RPC 状态和最新 blockhash。
- 点击 `Load Blockhash` 直接调用 `connection.getLatestBlockhash()`。
- 粘贴 devnet 钱包地址并刷新余额。
- 安装 Solana 浏览器钱包并切换到 devnet。
- 在 Android Chrome 上安装兼容的 Solana 移动钱包，并查找 `Mobile Wallet Adapter`。
- 在 iOS 浏览器上安装 Phantom、Solflare 或 Backpack，并在同一列表中查找钱包条目。
- 选择并连接一个已发现的钱包。
- 重新加载页面，验证相同的钱包身份会恢复，而不是任意选择已安装钱包。
- 如果钱包报告支持消息签名，签署示例认证消息。
- 当所选钱包不支持 `signMessage` 时，确认消息签名按钮被禁用或有说明。
- 运行通用模拟交易。
- 输入收款地址和金额，然后发送真实转账。测试时保持示例在 devnet。
- 观察交易从已提交签名移动到确认状态。
- 打开 explorer 链接并确认它包含 `?cluster=devnet`。

转账示例会使用来自 `@vue-solana/nuxt/buffer-polyfill` 的 `installSolanaBufferPolyfill()` 初始化浏览器 `Buffer` polyfill。如果 Vite 之前缓存了 externalized Buffer import，请重启 Nuxt dev server。

如果签名出现后确认超时，不要立即提交重复转账。使用示例的签名状态或 explorer 链接检查交易是否稍后确认。

## Devnet SOL

从官方 faucet 请求免费 devnet SOL：

```txt
https://faucet.solana.com
```

## 钱包说明

示例使用统一的钱包发现。测试浏览器扩展钱包流程前，请安装 Phantom、Solflare、Backpack 或其他标准钱包。在受支持的 Android Chrome 运行时，`@solana-mobile/wallet-standard-mobile` 可以通过同一钱包列表中的 `Mobile Wallet Adapter` 暴露已安装的原生移动钱包。在 iOS 浏览器上，Phantom、Solflare 和 Backpack 可以通过钱包专用 universal links 出现。

桌面原生钱包 protocol-link 支持有意不属于 v1 示例流程。
