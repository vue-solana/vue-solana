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

### 客户端与插件生命周期

`createSolanaPlugin()` 会在 `install()` 期间构建一次 Kit client。请在模块作用域创建插件并复用该实例：

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

再次调用 `createSolanaPlugin()` 会构建新的 client 和 context，并丢弃现有的钱包选择和 RPC 状态。如果你的配置是响应式的——例如 cluster 切换——请基于配置做 memoize，只在值真正变化时构建新的插件（和 client），而不是每次渲染都构建：

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Kit client 会在构建期间运行其 `createClient().use(...)` 插件。当其中某个插件是异步的，client——以及由它构建的任何 context——只会在该 promise resolve 后才激活。请把真正的 RPC 和钱包工作推迟到 hydration 之后的客户端生命周期钩子或用户操作，而不要在 setup 或 SSR 期间运行。

## Composables

根导出仍然受支持。对于 composable，新代码优先使用直接 subpath 导入，这样 bundler 可以避免执行无关的包入口代码：

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

直接包 subpath：

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
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
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/kit`

浏览器交易代码需要 Buffer polyfill 时，使用 `@vue-solana/vue/buffer-polyfill`。需要 Kit API（`createSolanaClient`、`address`、`lamports` 和类型）时，使用 `@vue-solana/vue/kit`。较底层 core 用法仍然支持直接 `@vue-solana/core/*` 导入。

- `useSolana()`：返回完整注入的 Solana context。
- `useSolanaClient()`：返回 context 中的 Kit `{ client, rpc }`。新代码推荐使用。
- `useRpc()`：返回 cluster、endpoint、连接状态、latest blockhash、注入的 Kit `client` 和 `checkConnection()`。
- `useConnection()`：返回注入的 Kit `client`（已弃用，推荐使用 `useSolanaClient()`）。
- `useAccountInfo(address, options?)`：加载规范化账户数据（executable、lamports、owner、space、data 字节）。
- `useProgramAccounts(programId, options?)`：使用可选过滤器和数据切片加载 program id 拥有的账户。
- `useWallet()`：返回活跃钱包 ref、计算出的连接状态和钱包操作。
- `useWallets()`：返回已发现的浏览器扩展钱包、Android Mobile Wallet Adapter 钱包、受支持的 iOS 浏览器钱包条目和钱包选择操作。
- `useBalance(address, commitment?)`：加载地址字符串的 lamport 余额。
- `useAirdrop()`：在测试网络和本地验证器上将 SOL 空投到账户。
- `useTokenAccounts(owner, options?)`：加载某个所有者的所有 SPL token 账户，默认同时查询 Token 和 Token-2022 program。
- `useTokenBalance(mint, owner)`：通过关联 token 账户加载 mint/owner 对的 SPL token 余额和小数位数。
- `useTransaction(handler, options?)`：通用异步交易状态 helper，带可选超时设置。
- `useTransactionConfirmation(options?)`：用响应式状态和超时/错误状态确认已提交签名。
- `useSignatureStatus(signature, options?)`：读取、轮询或订阅签名状态更新。
- `useSignMessage()`：在配置的钱包支持时签署任意认证消息。
- `useSignAndSendTransaction()`：通过配置的钱包签名并发送交易，可选等待确认。
- `useAction(handler)`：通用异步 action 状态机，重新派发时中止。
- `useRequest(source, options?)`：源变更时重新触发的单次请求，支持 stale-while-revalidate。
- `useSubscription(source, options?)`：来自 RPC 订阅和其他响应式流源的实时数据。
- `useTrackedData(source, options?)`：由单次请求播种的 RPC 订阅，按 slot 去重。
- `useSignIn()`：触发钱包的 Sign In With Solana（SIWS）功能。
- `useSelectedWalletAccount()`：读取应用级选中钱包账户 context，带持久化和过滤。
- `useSignTransactions()` / `useSignAndSendTransactions()`：在一次钱包请求中签署（或签署并发送）多笔交易。
- `usePayer()` / `useIdentity()`：Kit client 的响应式 signer（需要 signer 插件）。
- `usePlanTransaction()` / `usePlanTransactions()`：从 instruction 输入规划交易消息。
- `useClientCapability(name)`：断言某能力已安装在 client 上，缺失时抛出描述性错误。

## 相关指南

- [RPC 和 Clusters](/zh/guides/rpc-and-clusters)：读取连接状态并配置 endpoint。
- [钱包](/zh/guides/wallets)：发现、选择、连接、断开连接并检查钱包能力。
- [账户读取](/zh/guides/account-reads)：读取余额、账户信息、program accounts 和签名状态。
- [交易](/zh/guides/transactions)：签名、发送、确认并展示交易进度。
- [消息签名](/zh/guides/message-signing)：签署链下认证或所有权 challenge。
- [E2E 测试](/zh/guides/e2e-testing)：在 Playwright 测试中模拟 RPC、RPC 订阅和钱包。
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

## 使用 Kit 客户端

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Check Slot</button>
  </section>
</template>
```

`useSolanaClient()` 返回与 `useSolana()` 相同的 context，但为 Kit 读取塑形：`client` 是完整的 `@solana/kit` 客户端，`rpc` 是它的读取 API。RPC 结果是 `bigint`，账户数据是 `Uint8Array`。参见 [Kit 迁移](/zh/guides/kit-migration)。

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

## 读取 Token 账户

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load token accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Token accounts: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenAccounts()` 在 owner 为 null 时清除状态且不调用 RPC。在选项中传入 `programId` 可将结果限制为单个 token program。

## 读取 Token 余额

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter valid mint and owner addresses.";
    case "RPC_FAILURE":
      return "Unable to load token balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimals)</p>
    <p v-else>No token account found.</p>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenBalance()` 在关联 token 账户不存在时返回 null balance 和 decimals，不会将其视为错误。

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
    <p>Public key: {{ publicKey }}</p>
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

## Sign In With Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Sign in to My App",
    // 在服务端生成 nonce，并在服务端验证。
    nonce: await fetchNonceFromBackend(),
  });

  // 将 { account.address, signature, signedMessage } 发送到后端，
  // 在创建会话前完成验证。
}
```

钱包必须支持 SIWS 功能（否则 `canSignIn` 为 false，且 `signIn()` 会以 `WALLET_FEATURE_UNSUPPORTED` 错误拒绝）。没有已选账户的钱包会先连接。

### 在服务端验证签名

钱包返回的是对 `signedMessage`（用户同意的 SIWS 消息）的签名。若不经验证就信任该结果，恶意客户端便可伪造身份，因此在签发会话前必须在服务端验证：

1. **检查消息**：解码 `signedMessage`，确认域名与你的 origin 一致、`uri` 属于你、`nonce` 与服务端为本次会话签发的一致，且 statement/resources 与预期相符。
2. **验证签名**：该签名是 SIWS 消息字节的 Ed25519 签名。使用 `tweetnacl`（`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`）或任何 Ed25519 库，对照登录结果中账户的 `publicKey` 进行验证。
3. **绑定会话**：只有在消息检查与签名验证都通过后才应创建会话——以 `account.address` 为键。

服务端必须从其签发的 nonce 重新推导预期消息（或验证收到消息的每个字段），以拒绝过期或重放的 nonce。

## 数据获取 Composables

`useRequest`、`useSubscription` 和 `useTrackedData` 是构建在 Kit 响应式 store 原语之上的 SWR 风格数据层：

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value 是 SolanaRpcResponse 封套：data.value.value 和
// data.value.context.slot。
```

- `useRequest` 在 ref/computed 源身份变化时重新触发；传入 `null` 会禁用它（状态 `disabled`）。
- `useSubscription` 在重连期间保留过期值；`reconnect()` 重新打开流。
- `useTrackedData` 对请求和订阅做 slot 去重，乱序到达也不会使值回退。

`rpcValueMapper` 和 `rpcSubscriptionValueMapper` 回调接收**解包后**的响应值（余额是 `value.lamports`），而返回的 `data` ref 保留完整的 `SolanaRpcResponse` 封套，因此可以读取 `data.value?.context.slot`。

### 使用 `useRequest` 的单次请求

`useRequest` 是通用的 SWR 请求。它接受请求函数、Kit 请求对象（任何带 `send()` 的对象）、两者的 `ref`/`computed`，或用于禁用的 `null`：

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // 可选的按次取消，与内部 signal 组合。
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value 是原始响应值；status 是
// "fetching" | "success" | "error" | "disabled"。
```

重新验证运行期间，先前的 `data` 和 `error` 保持填充，UI 继续渲染。`refresh()` 手动重新触发并解析出本次结果。

### 使用 `useSubscription` 的流订阅

`useSubscription` 消费任何 Kit 响应式流源（基于 `reactiveStore()` 的鸭子类型），在组件卸载时拆除连接，并支持带 stale-while-revalidate 的手动重连：

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// 状态为 "loading" | "loaded" | "error" | "disabled"。
// reconnect() 在 data 保留最后已知值的同时重新打开流。
```

错误会保留最后已知的 `data`；`null` 源禁用订阅并清除状态。

### 跨挂载的缓存键

跨挂载缓存键使用 `@vue-solana/vue/swr` 中的 SWR 适配器：

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

以相同键挂载的组件在自身请求重新验证期间，会立即从最后已知值播种。没有 `useAction` 适配器——action 是变更，不是可缓存的读取；请使用你数据层的变更 API（或 `useAction` 本身）。

缓存行为细节：

- 键按适配器命名空间隔离（`request:`、`subscription:`、`tracked:`），因此同一键可安全地跨适配器使用。
- `null`/`undefined` 源会禁用 composable 并**清除**该键的缓存条目——即使组件以已禁用的源挂载也是如此。
- `useTrackedDataSwr` 缓存完整的 `SolanaRpcResponse` 封套，因此重挂载的组件同时恢复值和 slot context。
- 缓存是模块级 `Map`。在服务器端，按请求为键命名空间化，或在请求之间调用 `clearSwrCache()` 以避免跨请求泄漏。

针对 devnet 的全部五个 composable 的可运行演示（包括 SWR 重挂载行为），请参阅 [Vue Vite 示例](/zh/examples/vue-vite)中的 Live Data Panels。

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

### 钱包请求的输入与返回值

钱包签名流程接受符合 Solana 交易 schema 的原始 `Uint8Array` wire bytes 作为交易输入。请用 `@solana/kit` 构建它们（或从 base64/base58 RPC 响应中解码）；这里不接受 base64 字符串、交易对象和指令列表。

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` 接受要签名的原始消息 bytes。每个钱包发送请求也都接受 Kit 的 `SendTransactionOptions`：

| Option                | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `skipPreflight`       | 发送前跳过 preflight 模拟。                                                 |
| `maxRetries`          | RPC 节点重试次数（`bigint`）。                                              |
| `minContextSlot`      | 交易中任何 blockhash 或 nonce 已知存在的最早 slot；在此之前发送可能被拒绝。 |
| `preflightCommitment` | 用于 preflight 模拟的 commitment。                                          |

返回值形式：

- `useSignMessage().execute(bytes)` resolve 为 `{ signedMessage, signature }`，两者都是 `Uint8Array`。
- `useSignTransactions().execute(transactions)` resolve 为已签名的 `Uint8Array[]`（也以 `signedTransactions` 暴露）；单个交易请传入单元素数组。
- `useSignAndSendTransaction().execute(transaction)` resolve 为已提交的 `signature` 字符串；使用 `confirm: true` 时还会填充 `confirmation`。
- `useSignAndSendTransactions().execute(transactions)` resolve 为签名的 `string[]`（也以 `signatures` 暴露）。

钱包可能在签名前修改消息或交易——例如添加自己的指令或更改 fee payer——Wallet Standard 明确允许这样做。请重新读取返回的 `signedMessage` 或已签名交易 bytes，而不要假设它们与你的输入逐字节一致。

## 批量交易

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// 一次钱包请求处理 N 笔交易。
const signed = await signMany([transactionA, transactionB]);

// 一次钱包请求处理 N 个签名。
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

两者都优先使用钱包的批量能力。`useSignTransactions` 回退到旧版批量 `signAllTransactions` 功能；`useSignAndSendTransactions` 回退为按顺序发送单一请求。批量签名是全有或全无（一次拒绝则全部不签名），但“签名并发送”的回退路径可能让前面的交易已经提交。发生这种情况时会以 `PartialSignAndSendError` 拒绝，其 `signatures` 列出已发送的交易，因此重试时可以跳过它们：

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures：已经落地的交易——只重发其余的。
  }
}
```

## 已选钱包账户

对于带持久化和过滤的应用级已选账户状态，在根部附近挂载一次 provider，然后随处读取：

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

选择默认以 `${walletName}:${accountAddress}` 形式持久化在 `localStorage` 中（传入 `stateSync` 可自定义，传入 `null` 可禁用），当钱包与账户可用时会在下次访问时恢复。`filterWallet` 限制提供哪些钱包账户。在 Nuxt 中，模块的 runtime 插件会自动安装此 context。

## 客户端能力与规划

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// 来自 Kit 客户端的响应式签名者（需要 signer 插件）。
const payer = usePayer();
const identity = useIdentity();

// 从指令规划交易消息，而不发送。
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")` 会断言某项能力已安装在客户端上，缺失时在 setup 阶段抛出描述性错误（指出钩子名称及安装方式）。`usePlanTransaction()` / `usePlanTransactions()` 需要规划能力，例如 `@solana/kit-plugin-rpc` 的 `rpcTransactionPlanner()`。

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
