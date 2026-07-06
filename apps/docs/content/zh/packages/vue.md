---
title: "@vue-solana/vue"
description: 用于 Solana 应用的 Vue 插件和 composable。
ogSection: 包
surroundOrder: 15
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) 提供用于 Solana RPC 访问、余额读取、钱包状态和交易 helper 状态的 Vue 插件与 composable。

## 安装

```sh
pnpm add @vue-solana/vue
```

创建或序列化交易的浏览器应用可以从 `@vue-solana/vue/buffer-polyfill` 初始化 Buffer polyfill。

## 插件设置

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
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

Android Mobile Wallet Adapter 注册会在支持的 Android Chrome 客户端上默认启用。传入 `mobileWallet` 选项可以自定义 MWA 应用身份，或传入 `mobileWallet: false` 禁用 Android 移动钱包注册。

iOS 浏览器钱包链接会在 iOS 浏览器上为 Phantom、Solflare 和 Backpack 默认启用。传入 `iosWallet` 选项可以自定义应用身份、重定向 URL、chains 或 cluster，或传入 `iosWallet: false` 禁用 iOS 钱包链接发现。

也可以传入自定义 RPC endpoint：

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

## Composables

根导出仍然受支持。对于 composable，新代码优先使用直接 subpath 导入，这样 bundler 可以避免执行无关的包入口代码：

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

直接包 subpath：

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/web3`

使用 `@vue-solana/vue/web3` 获取受支持的原始 Solana primitive，例如 `PublicKey`、`Transaction` 和 `TransactionInstruction`。浏览器交易代码需要 Buffer polyfill 时，使用 `@vue-solana/vue/buffer-polyfill`。较底层 core 用法仍然支持直接 `@vue-solana/core/*` 导入。

- `useSolana()`：返回完整注入的 Solana context。
- `useRpc()`：返回 cluster、endpoint、连接状态、latest blockhash 和 `checkConnection()`。
- `useConnection()`：返回 Solana `Connection`。
- `useAccountInfo(address, options?)`：加载账户数据，并可订阅账户变化。
- `useProgramAccounts(programId, options?)`：使用可选过滤器和数据切片加载 program id 拥有的账户。
- `useWallet()`：返回活跃钱包 ref、计算出的连接状态和钱包操作。
- `useWallets()`：返回已发现的浏览器扩展钱包、Android Mobile Wallet Adapter 钱包、受支持的 iOS 浏览器钱包条目和钱包选择操作。
- `useBalance(address, commitment?)`：加载 `PublicKey` 或地址字符串的 lamport 余额。
- `useTransaction(handler, options?)`：通用异步交易状态 helper，带可选超时设置。
- `useTransactionConfirmation(options?)`：用响应式状态和超时/错误状态确认已提交签名。
- `useSignatureStatus(signature, options?)`：读取、轮询或订阅签名状态更新。
- `useSignMessage()`：在配置的钱包支持时签署任意认证消息。
- `useSignAndSendTransaction()`：通过配置的钱包签名并发送交易，可选等待确认。

## 相关指南

- [RPC 和 Clusters](/zh/guides/rpc-and-clusters)：读取连接状态并配置 endpoint。
- [钱包](/zh/guides/wallets)：发现、选择、连接、断开连接并检查钱包能力。
- [账户读取](/zh/guides/account-reads)：读取余额、账户信息、program accounts 和签名状态。
- [交易](/zh/guides/transactions)：签名、发送、确认并展示交易进度。
- [消息签名](/zh/guides/message-signing)：签署链下认证或所有权 challenge。
- [错误](/zh/guides/errors)：把 composable `error` ref 映射为安全 UI 消息。

## 读取 RPC 状态

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "Unable to reach the configured Solana RPC endpoint."
    : "Unable to check the Solana connection.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## 读取余额

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## 错误处理

Composable `error` ref 使用来自 `@vue-solana/core/errors` 的 `SolanaError | null`。面向用户的 UI 请基于 `error.value.code` 分支，并保留 `error.value.cause` 用于调试原始钱包、RPC、地址解析、超时或存储失败。

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
```

## 读取账户信息

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load account data from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()` 会在地址为 null 时清除状态且不调用 RPC。无效地址字符串会清除过期 `accountInfo`、设置 `error`，并且不调用 `getAccountInfo()`。启用 `watch: true` 时，websocket listener 会在组件卸载时自动移除。调用 `stopWatching()` 会移除当前 listener，并阻止该 composable 实例自动重启。

## 读取 Program Accounts

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana program id.";
    case "RPC_FAILURE":
      return "Unable to load program accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()` 会在 program id 为 null 时清除状态且不调用 RPC。无效 program id 字符串会清除过期 `accounts`、设置 `error`，并且不调用 `getProgramAccounts()`。

> 警告：`useProgramAccounts()` 可能成本很高。每次刷新都可能扫描大量 program-owned account、消耗大量 RPC credits、触发 provider 限流或超时。不要从高流量 UI 路径运行宽泛扫描。生产读取请使用窄过滤器、`dataSlice`、缓存、索引、分页策略或专用 RPC 基础设施。

## 钱包状态

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() }}</p>
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

浏览器扩展钱包通过 Solana Wallet Standard 发现。Android Mobile Wallet Adapter 钱包通过 `@solana-mobile/wallet-standard-mobile` 注册，并在支持的 Android Chrome 客户端上暴露到同一个 `useWallets()` 列表中。iOS Phantom、Solflare 和 Backpack 条目通过 iOS 浏览器上的钱包专用 universal link 暴露。`refreshWallets()` 只更新已发现钱包列表，`selectWallet()` 只配置活跃钱包。即使扩展在页面刷新后暴露之前授权的账户，`connected` 也会在 `connect()` 成功前保持 false。

尚未实现桌面原生应用钱包 adapter。桌面原生支持需要钱包专用 protocol link 或未来的原生 Wallet Standard 注册。

没有插件上下文时，composable 会返回惰性的 SSR 安全状态。真实 RPC 和钱包操作仍然需要插件提供的客户端上下文。

## 消息签名

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
```

消息签名用于钱包所有权或认证 challenge。它不是交易签名，也不授权链上状态变更。不暴露消息签名的钱包会让 `canSignMessage` 为 false，`execute()` 会以不支持钱包错误拒绝。

## 交易状态

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

当前钱包必须已连接，并且支持 `signAndSendTransaction` 或 `signTransaction`。Android Mobile Wallet Adapter 钱包在可用时优先使用 `signTransaction` 加应用侧 RPC 提交。这避免了钱包发送成功但浏览器页面没有收到钱包 adapter 返回签名的移动端 handoff 边缘情况。

没有 `confirm: true` 时，`execute()` 会在提交后返回，并把 `status` 设置为 `sent`。启用确认后，状态会经过 `sending`、`confirming`，然后变为 `processed`、`confirmed` 或 `finalized`，以匹配请求的 commitment。如果确认超时或失败，已提交的 `signature` 仍然可用，因此应用可以链接到 explorer。

如果钱包 adapter 从不返回结果，`useSignAndSendTransaction()` 也会清除 `loading`。这种 stale 情况下会设置 `error`，链上状态可能未知，因此重试前请检查连接的钱包或 explorer。

## 确认现有签名

当应用已有已提交签名，并希望独立于签名和发送流程等待特定 commitment 时，请使用 `useTransactionConfirmation()`：

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

当确认超时或 RPC 调用失败时，该 composable 会保留已提交的 `signature`，因此应用仍然可以展示 explorer 链接，同时向用户展示 `error`。

## 跟踪签名状态

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling, stopSubscription } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
    subscribe: true,
    commitment: "confirmed",
  },
);
```

轮询会在每个间隔调用 `getSignatureStatuses()`，因此 UI 不再需要更新时应停止轮询。调用 `stopPolling()` 会清除当前 interval，并阻止该 composable 实例自动重启轮询。无效签名会清除过期 `status`、设置 `error`，且不调用 RPC 或启动轮询。小于或等于 `0` 的无效 `pollIntervalMs` 会设置 `RangeError` 且不启动轮询。`subscribe: true` 使用 `onSignature()`，并在组件卸载时移除 listener。调用 `stopSubscription()` 会移除当前签名 listener，并阻止该 composable 实例自动重启。

## 示例应用

完整可运行的 Vue 和 Vite 流程，请参阅 [Vue Vite 示例](/zh/examples/vue-vite)。
