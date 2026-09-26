---
title: 开始使用
description: 安装 Vue Solana 包、配置 Vue 或 Nuxt，并在 devnet 上测试 RPC 读取。
ogSection: 开始
surroundOrder: 2
---

本指南涵盖安装 Vue Solana 包、配置 Vue 或 Nuxt、测试 Solana RPC 读取、连接受支持的钱包、签署消息、发送真实 devnet 转账，以及验证结果。示例默认使用 devnet，便于安全测试。

## 开始之前

如果你只需要 Solana primitives，而不需要 Vue/Nuxt 集成，请直接使用 `@vue-solana/core`。它基于 `@solana/kit`，并从 `@vue-solana/core/kit` 重新导出 `createSolanaClient()` 以及 `Address`/`address()`/`lamports()` 和 Kit 交易与 RPC 类型。如果你需要框架集成，请使用 `@vue-solana/vue` 或 `@vue-solana/nuxt`。

支持的集群：

- `mainnet`: Solana 的生产集群。这是 Solana 官方的主网集群名称。
- `devnet`: 应用开发的最佳默认值。
- `testnet`: 验证者和协议测试网络。
- `localnet`: 本地验证者。

学习和测试时使用 `devnet`。只有准备好与真实 SOL 交互时才使用 `mainnet`。

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

Vue 应用可以直接使用 `@vue-solana/vue/kit`（`createSolanaClient`、`address`、`lamports` 和类型）以及 `@vue-solana/vue/buffer-polyfill`，无需直接安装低层 Solana 或 Buffer 包。注入的客户端请从 `@vue-solana/vue/useSolanaClient` 使用 `useSolanaClient()`。

## 为 Nuxt 安装

```sh
npx nuxt module add @vue-solana/nuxt
```

这会安装包，并把 `@vue-solana/nuxt` 添加到 `nuxt.config.ts` 的 `modules` 数组。

Nuxt 应用可以直接使用 `@vue-solana/nuxt/kit` 和 `@vue-solana/nuxt/buffer-polyfill`，无需直接安装 `@vue-solana/core`、`@vue-solana/vue` 或低层 Solana 与 Buffer 包。自动导入的 `useSolanaClient()` 返回注入的 Kit 客户端。

## v2 说明

v2.0.0 移除了旧版 `@solana/web3-compat` 表面。上下文不再携带 `connection`，`@vue-solana/*/web3` 子路径已被删除。所有 composable 都以 Kit 为先，`SolanaWallet.publicKey` 是普通的 base58 `Address` 字符串。早期 v1 文档描述的 `@solana/buffer/` shim 已不存在；保留的包内 shim 只覆盖 Buffer polyfill 使用的浏览器 `buffer/` 子路径。完整的 before/after 对照请参阅 [Kit 迁移指南](/zh/guides/kit-migration)。

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

对于 Vue composable，新代码优先使用直接子路径导入：

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
```

`useRpc()` 返回已解析的集群状态和注入的 Kit `client`；`useBalance()` 通过 `client.rpc` 读取。`useSolanaClient()` 直接返回同一个 `client` 及其只读 `rpc`，外加来自 `@vue-solana/vue/kit` 的 `address()`/`lamports()`。完整的 before/after 对照请参阅 [Kit 迁移指南](/zh/guides/kit-migration)。

### 客户端与插件生命周期

`createSolanaPlugin()` 在 `install()` 期间构建一次 Kit 客户端。请在模块作用域创建插件并复用该实例：

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

再次调用 `createSolanaPlugin()` 会构建新的客户端和上下文，并丢弃现有的钱包选择和 RPC 状态。如果你的配置是响应式的（例如集群切换），请基于配置进行 memoize，使新插件（和新客户端）仅在该值真正变化时构建，而不是每次渲染都构建：

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Kit 客户端在构造期间运行其 `createClient().use(...)` 插件。当其中某个插件是异步的时，客户端（以及由它构建的任何上下文）只有在该 promise resolve 之后才会激活。请将实际的 RPC 和钱包工作推迟到 hydration 之后的生命周期钩子或用户操作中，而不要在 setup 或 SSR 期间运行。

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

Nuxt 模块只在客户端安装运行时插件，并从直接的 `@vue-solana/vue/*` 子路径自动导入 composable。Composable 可以在 SSR 期间安全调用，但真实 RPC 和钱包操作应在 hydration 后运行，例如在 `onMounted()` 或用户操作中。Nuxt `solana` 选项位于 public runtime config 中，因此应保持 JSON 可序列化。

direct Vue/core client 支持用于 client-sent 交易的 `payer` 和 `payerSecretKey`。`payerSecretKey` 是 base64 编码的 64 字节 Ed25519 keypair，因此不要把它放入 Nuxt public runtime config，也不要把有资金的 key 发送到浏览器。Nuxt `ModuleOptions` 省略这两个字段；请在 client-only plugin 中创建 ephemeral signer，或使用带有 connected-wallet embedded signer 的消息。

## 无钱包测试 RPC

RPC 读取不需要浏览器钱包。

Vue 中使用 `useRpc()`：

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, client } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const { value } = await client.rpc.getLatestBlockhash().send();
  latestBlockhash.value = value.blockhash;
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

新代码可以改用 Kit 客户端。`useSolanaClient()` 不需要钱包，并以 Kit RPC API 的类型返回相同信息（读取调用返回 `bigint`）：

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>

<template>
  <main>
    <p>Slot: {{ slot }}</p>
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

在 Nuxt 中，同样的 Kit 读取来自自动导入的 `useSolanaClient()`：

```vue
<script setup lang="ts">
const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>
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

示例演示插件/模块设置、RPC 状态、直接 connection 调用、余额读取、统一钱包发现、持久化钱包选择、钱包状态、消息签名、通用交易状态、交易转账流程、通过官方 Kit planner 和 RPC plan-sending executor 执行的 client-sent 交易、确认状态、explorer 链接，以及不支持能力的 UI。它们默认使用 devnet，便于安全测试。

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
| 桌面原生应用                 | 尚未实现                | 桌面原生协议链接尚不支持。                                       |

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

Vue 和 Nuxt 示例包含用于真实转账的收款地址和金额字段。它们默认使用 devnet，因此你可以用没有真实价值的 SOL 测试。对于 mainnet，请配置 `mainnet` 或 mainnet RPC 端点，并使用有真实 SOL 支付费用的钱包。

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
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

如果返回签名后确认超时，不要立即重新提交。先检查签名状态或 explorer；交易可能仍会确认。

client-send 演示使用默认 client 安装的官方 `rpcTransactionPlanSendingExecutor()`。连接支持 `signTransaction` 的钱包，在示例需要时为 demo payer 充值，然后使用 `useSendTransaction()` 或 `useSendTransactions()`。executor 提交交易并等待 `confirmed` commitment，随后 composable 才显示 `sent`；没有单独的发送弹窗。在 Nuxt 中，请在 client-only plugin 中创建 demo payer，而不是放在 `nuxt.config.ts`。

## 最终验证

在依赖某个应用流程前，在 devnet 上验证这些行为：

- RPC 读取不需要钱包。
- 钱包发现只显示当前平台支持的钱包来源。
- 钱包选择和连接是两个独立的用户操作。
- 可选 `autoConnect` 只恢复之前选择的钱包身份。
- UI 中禁用不支持的消息签名或交易签名能力。
- 消息签名返回签名而不提交链上交易。
- 转账提交返回签名和确认状态。
- Client-sent 交易使用官方 planner 和 RPC plan-sending executor，需要配置 payer 或 embedded signer，并且只有达到 `confirmed` 后才会进入 `sent`。
- Explorer 链接指向和应用相同的集群。
- 只有在你明确配置 mainnet 并理解真实 SOL 风险时才使用 `mainnet`。

## 更多阅读

- [面向 Vue 开发者的 Solana](/zh/concepts/solana-for-vue-developers)
- [集群](/zh/concepts/clusters)
- [钱包](/zh/guides/wallets)
- [交易指南](/zh/guides/transactions)
- [Kit 迁移](/zh/guides/kit-migration)
- [故障排查](/zh/troubleshooting)
- [Solana Kit 文档](https://www.solanakit.com/) — 官方 Kit 指南、recipes 和 API reference
- [Solana Documentation](https://solana.com/docs)
