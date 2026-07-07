---
title: Vue Vite 示例
description: 面向 @vue-solana/vue 的可运行 Vue 3 和 Vite 示例应用。
ogSection: 示例
surroundOrder: 17
---

Vue Vite 示例是一个用于 `@vue-solana/vue` 的可运行 Vue 3 应用。

Source: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

Live demo: [vue-solana-docs.vercel.app/demo](/zh/demo)

## 它演示了什么

- 使用 `createSolanaPlugin()` 安装 Vue Solana 插件。
- 使用 `useRpc()` 读取 RPC 状态。
- 使用注入的 `Connection` 和 `useConnection()`。
- 使用 `useBalance()` 读取 lamport 余额。
- 使用 `useWallets()` 发现浏览器扩展钱包、Android Mobile Wallet Adapter 钱包，以及受支持的 iOS 浏览器钱包条目。
- 使用 `useWallet()` 管理当前活跃钱包状态。
- 持久化钱包选择元数据，并在重新加载时恢复之前选择的钱包身份。
- 可选的 `autoConnect` 行为：只有在之前选择的钱包再次被发现时才重新连接它。
- 为无法签署消息或交易的钱包渲染不支持能力的状态。
- 使用 `useTransaction()` 跟踪异步交易状态。
- 当已连接钱包支持时，使用 `useSignMessage()` 签署认证消息。
- 使用 `useSignAndSendTransaction()` 发送真实转账，并显示已提交和已确认的交易状态。示例默认使用 devnet，以便安全测试。
- 为已提交的签名构建带有集群信息的 Solana Explorer 链接。

该应用默认使用 `devnet`。Devnet SOL 没有真实价值。

## 从仓库根目录运行

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

打开终端中打印出的 Vite URL，通常是 `http://localhost:5173`。

## 可以尝试的内容

- 检查初始 RPC 状态和最新 blockhash。
- 点击 `Load Blockhash` 直接调用 `connection.getLatestBlockhash()`。
- 粘贴 devnet 钱包地址并刷新余额。
- 安装 Solana 浏览器钱包，并切换到 devnet。
- 在 Android Chrome 上，安装兼容的 Solana 移动钱包，并查找 `Mobile Wallet Adapter`。
- 在 iOS 浏览器中，安装 Phantom、Solflare 或 Backpack，并在同一个列表中查找对应的钱包条目。
- 选择并连接一个已发现的钱包。
- 重新加载页面，并确认同一个已选钱包身份被恢复，而不是任意选择一个已安装的钱包。
- 如果钱包报告支持消息签名，签署示例认证消息。
- 确认当所选钱包不支持 `signMessage` 时，消息签名按钮会被禁用或给出说明。
- 运行通用 mock transaction。
- 输入收款地址和金额，然后发送真实转账。测试时请让示例保持在 devnet。
- 观察交易从已提交签名移动到确认状态。
- 打开 explorer 链接，并确认其中包含 `?cluster=devnet`。

转账示例使用来自 `@vue-solana/vue/buffer-polyfill` 的 `installSolanaBufferPolyfill()` 初始化浏览器 `Buffer` polyfill。如果 Vite 之前缓存了 externalized Buffer import，请重启 Vite 开发服务器。

如果签名出现后确认超时，不要立即提交重复转账。请使用示例中的签名状态或 explorer 链接检查交易之后是否确认。

## Devnet SOL

从官方水龙头请求免费的 devnet SOL：

```txt
https://faucet.solana.com
```

## 钱包说明

该示例使用统一钱包发现。测试浏览器扩展钱包流程前，请安装 Phantom、Solflare、Backpack 或其他标准钱包。在受支持的 Android Chrome 运行环境中，`@solana-mobile/wallet-standard-mobile` 可以通过同一个钱包列表中的 `Mobile Wallet Adapter` 暴露已安装的原生移动钱包。在 iOS 浏览器中，Phantom、Solflare 和 Backpack 可以通过各自钱包专用的 universal links 出现。

桌面原生钱包 protocol-link 支持有意不包含在 v1 示例流程中。
