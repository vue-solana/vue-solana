---
title: "钱包"
description: 发现钱包、选择活跃钱包、连接、断开连接并检查能力。
ogSection: 指南
surroundOrder: 9
---

Vue Solana 通过同一个钱包流程暴露浏览器扩展钱包、Android Mobile Wallet Adapter 钱包，以及受支持的 iOS 浏览器钱包链接。

使用 `useWallets()` 发现并选择钱包。使用 `useWallet()` 连接、断开连接、读取活跃公钥，并检查钱包能力。

当前钱包支持基于以下库：

- 浏览器扩展钱包：`@wallet-standard/app`、`@wallet-standard/base`、`@wallet-standard/features` 和 `@solana/wallet-standard-features`。
- Android 移动端原生钱包：`@solana-mobile/wallet-standard-mobile`，它会在受支持的 Android Chrome 移动网页和 PWA 运行时中，将 Solana Mobile Wallet Adapter 注册为 Wallet Standard 钱包。
- iOS 浏览器钱包：Phantom、Solflare 和 Backpack 的钱包专属 universal links。
- Solana 基础类型和交易类型：Vue 应用使用 `@vue-solana/vue/web3`，Nuxt 应用使用 `@vue-solana/nuxt/web3`，框架无关的 core 用法使用 `@vue-solana/core/web3`。

## 钱包来源

当前钱包来源包括：

- 通过 Solana Wallet Standard 暴露的浏览器扩展钱包。
- 在受支持的 Android Chrome 客户端上，通过 Wallet Standard 注册的 Android Mobile Wallet Adapter。
- 面向 Phantom、Solflare 和 Backpack 等受支持钱包的 iOS 浏览器钱包链接。

所有来源都会出现在同一个发现到的钱包列表中。除非需要平台特定的 UI 文案，否则应用不应为浏览器、Android 和 iOS 钱包构建分离的公开流程。

## 支持矩阵

| 钱包路径               | v1 状态                              | 呈现方式                                                | 说明                                                      |
| ---------------------- | ------------------------------------ | ------------------------------------------------------- | --------------------------------------------------------- |
| 浏览器扩展钱包         | 已支持                               | `platform: "browser"`, `source: "wallet-standard"`      | 使用 Solana Wallet Standard 注册。                        |
| Android 原生移动端钱包 | 在 Android Chrome 和 Chrome PWA 支持 | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | 通过 `@solana-mobile/wallet-standard-mobile` 注册。       |
| iOS 浏览器钱包         | 支持已配置的钱包链接                 | `platform: "mobile"`, `source: "deep-link"`             | Phantom、Solflare 和 Backpack 通过 universal links 暴露。 |
| 手动/自定义钱包对象    | 已支持                               | 应用提供的钱包                                          | 必须实现 `SolanaWallet` 接口。                            |
| 桌面原生应用钱包       | 从 v1 延后                           | 默认不暴露                                              | 预留的 `protocol-link` 元数据可用于未来适配器。           |

今天可用的功能：

- 在一个 `wallets` 列表中发现所有受支持来源的钱包。
- 选择一个活跃钱包，而不立即连接它。
- 持久化已选择的钱包身份元数据，用于可选的重新连接流程。
- 当所选钱包支持相关能力时，连接、断开连接、签署消息、签署交易，以及签署并发送交易。
- 基于 `canSignMessage`、`canSignTransaction`、`canSignAllTransactions` 和 `canSignAndSendTransaction` 渲染不支持能力的 UI。

v1 不包含的内容：

- 内置钱包弹窗或 UI 包。
- 桌面原生 protocol-link 适配器。
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
    <button type="button" @click="refreshWallets">刷新钱包</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>已选择：{{ selectedWallet?.name ?? "无" }}</p>
    <p>已连接：{{ connected }}</p>
    <p>公钥：{{ publicKey?.toBase58() ?? "无" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      连接
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">断开连接</button>
  </section>
</template>
```

选择钱包不会连接它。钱包会保持断开状态，直到 `connect()` 成功 resolve。

## Nuxt 钱包流程

Nuxt 通过 `useSolanaWallets()` 和 `useSolanaWallet()` 自动导入同一个钱包流程。

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

请从客户端的用户操作触发钱包工作。钱包提示不应在 SSR 期间运行。

## 能力检查

钱包可能支持不同功能。渲染操作前请检查能力。

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">连接</button>
  <button type="button" :disabled="!connected || !canSignMessage">签署消息</button>
  <button type="button" :disabled="!connected || !canSignTransaction">签署交易</button>
</template>
```

对于框架无关代码，请使用来自 `@vue-solana/core/wallet` 的钱包断言。

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey.toBase58());

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## 自动连接

`autoConnect` 只会重新连接用户此前选择过、并且在客户端再次被发现的钱包身份。

Vue Solana 只会在 `localStorage["vue-solana:selected-wallet"]` 下存储钱包身份元数据：`name`，以及可用时的 `platform`/`source`。它永远不会存储私钥、会话数据或交易数据。

当用户明确清除钱包选择时，调用 `selectWallet(null)`。只有当你的应用拥有自定义钱包对象时，才应从 `useWallet()` 调用 `setWallet(customWallet)`；普通应用 UI 应从 `useWallets()` 选择钱包。

如果本地存储不可用，钱包选择仍可在当前页面会话中工作，但持久化恢复可能会失败，并产生标准化的 `STORAGE_FAILURE` 错误。

## 用于认证的消息签名

消息签名用于证明链下认证的钱包控制权。它不会授权链上交易。请使用清晰的挑战文本，并在后端验证它。

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

保持 nonce 一次性且短期有效。不要将原始钱包或 RPC 错误消息作为面向用户的认证错误。

## 移动端钱包

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

iOS 钱包链接在 iOS 浏览器上默认启用。传入 `iosWallet` 选项可自定义应用身份、重定向 URL、chains 或 cluster。传入 `iosWallet: false` 可禁用 iOS 钱包链接发现。

Android 注意事项：

- Android MWA 注册仅在客户端运行，并且在 SSR 期间为空操作。
- 预计只在支持 mobile wallet adapter bridge 的 Android Chrome 或 Chrome PWA 运行时中工作。
- 钱包切换可能会离开浏览器并返回应用；请保留 UI 状态，让用户在重定向后能看到已提交的签名。
- Vue Solana 会把 MWA 钱包适配到与扩展钱包相同的 `SolanaWallet` 接口。
- 移动端钱包包会通过默认 wallet-not-found 处理器处理已安装钱包的回退 UI。
- 在 MWA 连接到已安装的钱包应用之前，浏览器可能会显示一次性的 Local Network Access 提示。
- 对于 Android MWA 交易发送，当钱包支持 `signTransaction` 时，Vue Solana 会请求移动端钱包签署，然后通过应用的 RPC 连接提交已签名交易。这样可以让返回的签名由应用掌控，并避免一种移动端切换边界情况：钱包已成功发送，但浏览器页面没有收到 wallet adapter 响应。

iOS 注意事项：

| 能力                    | v1 行为                                                     |
| ----------------------- | ----------------------------------------------------------- |
| 发现                    | Phantom、Solflare 和 Backpack 条目可以出现在 iOS 浏览器中。 |
| 连接                    | 使用钱包专属 universal links 和重定向回调。                 |
| 会话处理                | 应用应在重定向后先处理回调状态，再假设钱包已连接。          |
| 交易                    | 能力取决于钱包链接和返回的会话数据。                        |
| Desktop Safari 原生应用 | 未作为 v1 桌面原生路径实现。                                |

如果你直接使用 iOS core 辅助函数，请在客户端启动早期调用 `handleSolanaIosWalletCallback()`，以便在应用读取钱包状态前验证并解密重定向数据。

## 手动钱包接口

自定义钱包集成可以通过 Vue 插件或 `setWallet()` 直接提供一个 `SolanaWallet` 对象。

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // 打开你的钱包 UI，并在批准后分配 publicKey。
  },
  async disconnect() {
    // 清除本地钱包状态。
  },
  async signTransaction(transaction) {
    // 返回已签名交易。
    return transaction;
  },
};
```

手动钱包对象永远不应向 Vue Solana 暴露私钥。请将密钥托管保留在钱包提供方内部。

## 直接 Core 辅助函数

只有当你正在构建自己的钱包集成层时，才应使用直接 core 辅助函数。

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

如果你直接使用 iOS core 辅助函数，请在依赖重定向后返回的 iOS 钱包连接之前调用 `handleSolanaIosWalletCallback()`。

## 安全注意事项

- 永远不要向用户请求私钥。
- 永远不要在本地存储中保存钱包会话或交易数据。
- 将钱包名称、图标和元数据视为不可信显示数据。
- 签署消息或交易前要求明确的用户操作。
- 对不支持的能力显示禁用或解释性 UI，而不是盲目尝试钱包调用。
- 示例和教程默认保持使用 devnet；只有在明确涉及真实资金时才使用 `mainnet-beta`。

官方参考：

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana 文档](https://solana.com/docs)
