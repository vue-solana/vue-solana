---
title: "钱包"
description: 发现钱包、选择活动钱包、连接、断开连接并检查能力。
ogSection: 指南
surroundOrder: 9
---

Vue Solana 通过一个统一的钱包流程暴露浏览器扩展钱包、Android Mobile Wallet Adapter 钱包和受支持的 iOS 浏览器钱包链接。

使用 `useWallets()` 发现和选择钱包。使用 `useWallet()` 连接、断开、读取活动公钥并检查钱包能力。

当前钱包支持基于这些库：

- 浏览器扩展钱包：`@wallet-standard/app`、`@wallet-standard/base`、`@wallet-standard/features` 和 `@solana/wallet-standard-features`。
- Android 移动原生钱包：`@solana-mobile/wallet-standard-mobile`，它会在受支持的 Android Chrome 移动 Web 和 PWA 运行时把 Solana Mobile Wallet Adapter 注册为 Wallet Standard 钱包。
- iOS 浏览器钱包：Phantom、Solflare 和 Backpack 的钱包专用 universal links。
- Solana primitives 和交易类型：Vue 应用使用 `@vue-solana/vue/web3`，Nuxt 应用使用 `@vue-solana/nuxt/web3`，与框架无关的 core 使用 `@vue-solana/core/web3`。

## 钱包来源

当前钱包来源：

- 通过 Solana Wallet Standard 暴露的浏览器扩展钱包。
- 在受支持的 Android Chrome 客户端上通过 Wallet Standard 注册的 Android Mobile Wallet Adapter。
- 受支持钱包（如 Phantom、Solflare 和 Backpack）的 iOS 浏览器钱包链接。

所有来源都会出现在同一个已发现钱包列表中。除非需要平台特定 UI 文案，应用不应为浏览器、Android 和 iOS 钱包构建分离的公开流程。

## 支持矩阵

| 钱包路径             | v1 状态                           | 显示方式                                                | 说明                                                      |
| -------------------- | --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| 浏览器扩展钱包       | 支持                              | `platform: "browser"`, `source: "wallet-standard"`      | 使用 Solana Wallet Standard 注册。                        |
| Android 原生移动钱包 | Android Chrome 和 Chrome PWA 支持 | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | 通过 `@solana-mobile/wallet-standard-mobile` 注册。       |
| iOS 浏览器钱包       | 支持已配置的钱包链接              | `platform: "mobile"`, `source: "deep-link"`             | Phantom、Solflare 和 Backpack 通过 universal links 暴露。 |
| 手动/自定义钱包对象  | 支持                              | 应用提供的钱包                                          | 必须实现 `SolanaWallet` 接口。                            |
| 桌面原生应用钱包     | v1 推迟                           | 默认不暴露                                              | 保留 `protocol-link` 元数据用于未来 adapter。             |

今天可用的能力：

- 从所有受支持来源发现钱包，并放入同一个 `wallets` 列表。
- 选择一个活动钱包，但不会立即连接。
- 持久化所选钱包身份元数据，用于可选重连流程。
- 当所选钱包支持时，可以连接、断开、签署消息、签署交易以及签署并发送交易。
- 通过 `canSignMessage`、`canSignTransaction`、`canSignAllTransactions` 和 `canSignAndSendTransaction` 渲染不支持能力的 UI。

v1 不包含：

- 内置钱包弹窗或 UI 包。
- 桌面原生 protocol-link adapters。
- 服务端钱包提示。
- 私钥或助记词处理。

## Vue 钱包流程

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

选择钱包不会连接它。钱包会保持断开，直到 `connect()` 成功解析。

## Nuxt 钱包流程

Nuxt 使用 `useSolanaWallets()` 和 `useSolanaWallet()` 自动导入同一钱包流程。

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

从用户操作在客户端触发钱包工作。钱包提示不应在 SSR 期间运行。

## 能力检查

钱包可能支持不同功能。渲染操作前先检查能力。

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

与框架无关的代码可使用 `@vue-solana/core/wallet` 中的钱包断言。

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey.toBase58());

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Auto Connect

`autoConnect` 只会重连用户之前选择、且再次在客户端被发现的钱包身份。

Vue Solana 只在 `localStorage["vue-solana:selected-wallet"]` 下存储钱包身份元数据：`name`，以及可用时的 `platform`/`source`。它从不存储私钥、会话数据或交易数据。

当用户明确清除钱包选择时调用 `selectWallet(null)`。只有在应用拥有自定义钱包对象时，才从 `useWallet()` 调用 `setWallet(customWallet)`；普通应用 UI 应从 `useWallets()` 中选择。

如果 local storage 不可用，当前页面会话仍可选择钱包，但持久化恢复可能失败并返回标准化的 `STORAGE_FAILURE` 错误。

## 用于认证的消息签名

消息签名证明钱包控制权，用于链下认证。它不授权链上交易。请使用清晰的挑战文本，并在后端验证。

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

保持 nonce 一次性且短期有效。不要把原始钱包或 RPC 错误消息直接作为面向用户的认证错误。

## 移动钱包

在受支持的 Android Chrome 客户端上，Vue 插件和 Nuxt 模块默认启用 Android Mobile Wallet Adapter 注册。

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

传入 `mobileWallet: false` 可禁用 Android Mobile Wallet Adapter 注册。

iOS 钱包链接默认在 iOS 浏览器上启用。传入 `iosWallet` 选项可自定义 app identity、redirect URL、chains 或 cluster。传入 `iosWallet: false` 可禁用 iOS 钱包链接发现。

Android 注意事项：

- Android MWA 注册仅在客户端运行，SSR 期间无操作。
- 预期仅在支持 mobile wallet adapter bridge 的 Android Chrome 或 Chrome PWA 运行时工作。
- 钱包 handoff 可能离开浏览器并返回应用；保留 UI 状态，让用户回到页面后能看到已提交签名。
- Vue Solana 会把 MWA 钱包适配到与扩展钱包相同的 `SolanaWallet` 接口。
- 移动钱包包通过默认 wallet-not-found handler 处理已安装钱包缺失时的 fallback UI。
- 浏览器可能会在 MWA 连接已安装钱包应用前显示一次性 Local Network Access 提示。
- Android MWA 交易发送时，如果钱包支持 `signTransaction`，Vue Solana 会请求移动钱包签名，然后通过应用 RPC connection 提交签名交易。这样签名由应用掌控，避免钱包发送成功但浏览器页面收不到 wallet adapter 响应的边缘情况。

iOS 注意事项：

| 能力                    | v1 行为                                                     |
| ----------------------- | ----------------------------------------------------------- |
| 发现                    | Phantom、Solflare 和 Backpack 条目可以出现在 iOS 浏览器上。 |
| 连接                    | 使用钱包专用 universal links 和 redirect callbacks。        |
| 会话处理                | 应用应先处理 callback 状态，再假设 redirect 后钱包已连接。  |
| 交易                    | 能力取决于钱包链接和返回的会话数据。                        |
| Desktop Safari 原生应用 | 不作为 v1 桌面原生路径实现。                                |

如果直接使用 iOS core helpers，请在客户端启动早期调用 `handleSolanaIosWalletCallback()`，让 redirect 数据在应用读取钱包状态前完成验证和解密。

## 手动钱包接口

自定义钱包集成可以通过 Vue 插件或 `setWallet()` 直接提供 `SolanaWallet` 对象。

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

手动钱包对象绝不应向 Vue Solana 暴露私钥。密钥托管应保留在钱包 provider 内部。

## 直接 Core 工具

只有在构建自己的钱包集成层时才直接使用 core helpers。

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

如果直接使用 iOS core helpers，请在 redirect 后依赖返回的 iOS 钱包连接前调用 `handleSolanaIosWalletCallback()`。

## 安全注意事项

- 绝不要向用户请求私钥。
- 绝不要在 local storage 中存储钱包会话或交易数据。
- 将钱包名称、图标和元数据视为不可信展示数据。
- 签署消息或交易前要求明确的用户操作。
- 对不支持的能力展示禁用或解释性 UI，而不是盲目调用钱包方法。
- 示例和教程默认使用 devnet；只有在确实打算使用真实资金时才使用 `mainnet-beta`。

官方参考：

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana Documentation](https://solana.com/docs)
