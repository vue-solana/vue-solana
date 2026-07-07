---
title: 开始使用
description: 安装 Vue Solana 包、配置 Vue 或 Nuxt，并在 devnet 上测试 RPC 读取。
ogSection: 开始
surroundOrder: 2
---

本指南涵盖安装 Vue Solana 包、配置 Vue 或 Nuxt、测试 Solana RPC 读取、连接受支持的钱包、签署消息、发送真实 devnet 转账，以及验证结果。示例默认使用 devnet，便于安全测试。

## 开始之前

如果你只需要 `Connection`、`PublicKey` 和交易等 Solana primitives，而不需要 Vue/Nuxt 集成，请直接使用 `@vue-solana/core`。如果你需要框架集成，请使用 `@vue-solana/vue` 或 `@vue-solana/nuxt`。

支持的集群：

- `mainnet-beta`: Solana 主网。这是 Solana 官方主网集群名称。
- `devnet`: 应用开发的最佳默认值。
- `testnet`: 验证者和协议测试网络。
- `localnet`: 本地验证者。

学习和测试时使用 `devnet`。只有准备好与真实 SOL 交互时才使用 `mainnet-beta`。

当前钱包支持：

- 通过 Solana Wallet Standard 包支持浏览器扩展钱包。
- 在 Android Chrome 和 Chrome PWA 上通过 `@solana-mobile/wallet-standard-mobile` 支持 Android 原生移动钱包。
- 通过钱包专用 universal links 支持 Phantom、Solflare 和 Backpack 的 iOS 浏览器钱包。
- 实现 `SolanaWallet` 的手动/自定义钱包对象。

计划中但尚未支持：

- 通过钱包专用协议链接或未来原生 Wallet Standard 注册支持桌面原生应用钱包。

## 为 Vue 安装

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Vue 应用可以使用 `@vue-solana/vue/web3` 和 `@vue-solana/vue/buffer-polyfill`，无需直接安装低层 Solana 或 Buffer 包。

## 为 Nuxt 安装

```sh
npx nuxt module add @vue-solana/nuxt
```

这会安装包，并把 `@vue-solana/nuxt` 添加到 `nuxt.config.ts` 的 `modules` 数组。

Nuxt 应用可以使用 `@vue-solana/nuxt/web3` 和 `@vue-solana/nuxt/buffer-polyfill`，无需直接安装 `@vue-solana/core`、`@vue-solana/vue` 或低层 Solana 与 Buffer 包。

## 已知 TypeScript 问题

`@solana/web3-compat@0.0.21` 当前的 TypeScript 包元数据有问题。它的 package metadata 指向 `dist/types/index.d.ts`，但发布包中没有包含该文件。

运行时导入仍然使用真实的 `@solana/web3-compat` 包。当前 Vue Solana 包会发布临时的包内声明 shim，因此按文档使用 `@vue-solana/core`、`@vue-solana/vue` 或 `@vue-solana/nuxt` 导入的应用通常不需要自己的本地 shim。

只有在使用旧版 Vue Solana 包，或从应用代码直接导入 `@solana/web3-compat` 时，才需要添加本地 shim。每次新的 `@solana/web3-compat` 发布后都应重新检查此说明；上游发布有效根声明后应移除包内 shim。

## Vue 设置

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
      iosWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet` 和 `iosWallet` 是可选的。当浏览器运行时支持时，Android Mobile Wallet Adapter 注册以及 iOS Phantom、Solflare 和 Backpack 链接默认启用。传入 `mobileWallet: false` 或 `iosWallet: false` 可以禁用对应来源。

对于 Vue composables，新代码优先使用直接子路径导入：

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
```

## Nuxt 设置

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

Nuxt 模块只在客户端安装运行时插件，并从直接的 `@vue-solana/vue/*` 子路径自动导入 composables。Composables 可以在 SSR 期间安全调用，但真实 RPC 和钱包操作应在 hydration 后运行，例如在 `onMounted()` 或用户操作中。Nuxt `solana` 选项位于 public runtime config 中，因此应保持 JSON 可序列化。

## 无钱包测试 RPC

RPC 读取不需要浏览器钱包。

Vue 中使用 `useRpc()`：

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, connection } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const result = await connection.getLatestBlockhash();
  latestBlockhash.value = result.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

Nuxt 中使用自动导入的 `useSolanaRpc()`：

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </main>
</template>
```

## 获取 Devnet 或 Testnet SOL

Devnet 和 testnet SOL 是没有真实价值的测试代币。

使用官方 faucet：

```txt
https://faucet.solana.com
```

跟随本指南时选择 `Devnet`。只有在测试 testnet 集群时才选择 `Testnet`。

如果你安装了 Solana CLI，也可以运行：

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

测试时绝不要使用包含真实资金的钱包。

## 运行示例

要在本地运行示例应用，先克隆 Vue Solana 仓库：

```sh
git clone https://github.com/vue-solana/vue-solana.git
cd vue-solana
pnpm install
pnpm build:packages
```

启动 Vue Vite 示例：

`pnpm dev:vue`

启动 Nuxt 示例：

`pnpm dev:nuxt`

示例演示插件/模块设置、RPC 状态、直接 connection 调用、余额读取、统一钱包发现、持久化钱包选择、钱包状态、消息签名、通用交易状态、交易转账流程、确认状态、explorer 链接，以及不支持能力的 UI。它们默认使用 devnet，便于安全测试。

## 连接钱包

安装 Phantom、Solflare、Backpack 或其他 Solana Wallet Standard 浏览器钱包。测试前把钱包切换到 devnet。

在 Android Chrome 或 Android Chrome PWA 上，安装兼容的 Solana 移动钱包，例如 Phantom、Solflare 或 Seed Vault Wallet。`Mobile Wallet Adapter` 可以在 `refreshWallets()` 后出现在同一钱包列表中。

Vue：

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

Nuxt：

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

从 `wallets` 中选择钱包，然后调用 `connect()`。选择钱包只会配置活动钱包，不会连接它。有些扩展会在页面刷新后暴露之前授权的账户，但 Vue Solana 仍会保持 `connected` 为 false，直到 `connect()` 成功。

启用 `autoConnect` 时，Vue Solana 只会恢复用户之前选择的钱包身份，并且只在该钱包再次在客户端被发现后恢复。它在 `localStorage` 中存储 `name`、`platform` 和 `source` 元数据，不存储私钥、会话或交易。

iOS 浏览器钱包支持使用钱包专用 universal links，因为 Mobile Wallet Adapter web 支持仅限 Android Chrome。Phantom、Solflare 和 Backpack 会在 iOS 浏览器的同一 `useWallets()` 列表中出现。

## 手动钱包测试

手动验证浏览器扩展、Android MWA 钱包或 iOS 浏览器钱包时使用此清单。

1. 将应用配置为 `devnet`，并确认 UI 显示 devnet 端点。
2. 安装受支持的钱包，并把钱包本身切换到 devnet。
3. 从 `https://faucet.solana.com` 给钱包充值 devnet SOL。
4. 打开示例应用并点击钱包刷新操作。
5. 确认钱包以预期来源显示在统一钱包列表中。
6. 选择钱包，并验证仅选择不会连接。
7. 点击连接并批准钱包提示。
8. 确认 `connect()` 解析后公钥和 `connected` 状态更新。
9. 重新加载页面，确认之前选择的钱包身份可以恢复，而不是任意选择钱包。
10. 断开连接，确认公钥和连接状态被清除。

预期钱包来源：

| 平台                         | 预期来源                | 说明                                                             |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------- |
| 桌面浏览器扩展               | `wallet-standard`       | 安装后 Phantom、Solflare、Backpack 和其他标准钱包可能出现。      |
| Android Chrome 或 Chrome PWA | `mobile-wallet-adapter` | 需要兼容的原生钱包和 Android MWA 浏览器支持。                    |
| iOS 浏览器                   | `deep-link`             | Phantom、Solflare 和 Backpack 条目使用钱包专用 universal links。 |
| 桌面原生应用                 | v1 未实现               | 桌面原生协议链接已明确推迟到 v1 之后。                           |

## 签署消息

使用消息签名做钱包所有权检查或认证挑战。它不会提交交易，也不会授权链上状态变更。

Vue：

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Nuxt：

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

当 `canSignMessage` 为 false 时渲染禁用的认证按钮。有些钱包可以连接和签署交易，但不支持任意消息签名。

手动测试时，使用包含域名、nonce 和过期时间的清晰挑战字符串。不要要求用户签署空白或含糊的消息。

```ts
const challenge = new TextEncoder().encode(
  "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

签名后，验证 UI 显示返回的签名字节，并且不会把消息签名当作链上交易。

## 发送转账

Vue 和 Nuxt 示例包含用于真实转账的收款地址和金额字段。它们默认使用 devnet，因此你可以用没有真实价值的 SOL 测试。对于 mainnet，请配置 `mainnet-beta` 或 mainnet RPC 端点，并使用有真实 SOL 支付费用的钱包。

测试时从 `0.000001` SOL 这样的小金额开始。

创建或序列化交易的浏览器应用应在交易代码前初始化框架包的 Buffer polyfill：

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

钱包会提示你批准交易。批准后，示例会显示交易签名、确认状态和 explorer 链接。在 Android Mobile Wallet Adapter 上，Vue Solana 会优先使用钱包签名加应用侧 RPC 提交（如果支持），这样钱包跳转回浏览器后返回签名更可靠。

手动转账测试：

1. 让应用和钱包都保持在 devnet。
2. 使用你控制的收款地址，或新生成的 devnet 钱包。
3. 从 `0.000001` SOL 开始。
4. 批准前检查钱包提示。
5. 提交后等待示例显示确认状态。
6. 打开 explorer 链接并确认它使用 devnet 集群查询。
7. 刷新发送方和接收方余额。

Explorer URL 应感知集群：

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

如果返回签名后确认超时，不要立即重新提交。先检查签名状态或 explorer；交易可能仍会确认。

## 最终验证

在依赖某个应用流程前，在 devnet 上验证这些行为：

- RPC 读取不需要钱包。
- 钱包发现只显示当前平台支持的钱包来源。
- 钱包选择和连接是两个独立的用户操作。
- 可选 `autoConnect` 只恢复之前选择的钱包身份。
- UI 中禁用不支持的消息签名或交易签名能力。
- 消息签名返回签名而不提交链上交易。
- 转账提交返回签名和确认状态。
- Explorer 链接指向和应用相同的集群。
- 只有在你明确配置 mainnet 并理解真实 SOL 风险时才使用 `mainnet-beta`。

## 更多阅读

- [面向 Vue 开发者的 Solana](/zh/concepts/solana-for-vue-developers)
- [集群](/zh/concepts/clusters)
- [钱包](/zh/guides/wallets)
- [交易指南](/zh/guides/transactions)
- [故障排查](/zh/troubleshooting)
- [Solana Documentation](https://solana.com/docs)
