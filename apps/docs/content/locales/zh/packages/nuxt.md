---
title: "@vue-solana/nuxt"
description: 用于 Solana 应用的 Nuxt 模块。
ogSection: 包
surroundOrder: 16
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) 会在 Nuxt 应用中安装 Vue Solana 插件并自动导入 composable。

## 安装

```sh
npx nuxt module add @vue-solana/nuxt
```

这会安装包，并把 `@vue-solana/nuxt` 添加到 `nuxt.config.ts` 的 `modules` 数组中。

创建或序列化交易的浏览器应用可以从 `@vue-solana/nuxt/buffer-polyfill` 初始化 Buffer polyfill。使用 `@vue-solana/nuxt/kit` 获取 Kit API（`createSolanaClient`、`address`、`lamports` 和类型）以及自动导入的 `useSolanaClient()`。

## 模块设置

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

也可以配置自定义 RPC endpoint：

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

支持的 cluster 是 `mainnet`（旧别名 `mainnet-beta`）、`devnet`、`testnet` 和 `localnet`。Solana mainnet 请使用 `mainnet`；这是 Solana 官方的主网集群名称。

Nuxt 模块选项存储在 public runtime config 中，因此必须可 JSON 序列化。自定义 `wallet` adapter 对象有意不包含在 Nuxt 配置中；如果需要注入自定义钱包对象，请在 client-only Vue 代码中直接使用 Vue 插件。

`ModuleOptions` 也有意省略 `payer` 和 `payerSecretKey`。direct `@vue-solana/core` 和 `@vue-solana/vue` client 仍支持这两个字段，但 Nuxt module 不会转发它们，并会从 public runtime config 中删除。永远不要把 raw secret、seed phrase 或 `payerSecretKey` 放入 `nuxt.config.ts` 或 `runtimeConfig.public`：这些值对 browser 可见。如果需要 client-owned signer，请在 client-only plugin 中用 `generateKeyPairSigner()` 创建 ephemeral signer，或使用带有 connected-wallet embedded signer 的交易消息。

模块的客户端运行时插件还会自动安装应用级选定钱包账户上下文，因此无需挂载 provider，`useSolanaSelectedWalletAccount()` 就能在每个组件中工作。若要自定义持久化（`stateSync`）或过滤（`filterWallet`），请在组件树更深处挂载来自 `@vue-solana/vue/useSelectedWalletAccount` 的 `SelectedWalletAccountProvider` 来覆盖默认上下文。

移动钱包选项只包含可 JSON 序列化的应用身份和重定向设置时，可以安全地配置在 `nuxt.config.ts` 中：

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

传入 `mobileWallet: false` 或 `iosWallet: false` 可以禁用对应的移动钱包来源。模块还会预优化常见的 Solana、Wallet Adapter 和移动钱包依赖，让 Vite 能正确打包浏览器交易和钱包代码。

## 自动导入的 Composable

模块从直接 `@vue-solana/vue/*` subpath 自动导入这些 composable，而不是从 Vue 包根 barrel 导入。这样即使页面只使用一个 composable，Nuxt SSR bundle 也不会拉入无关的 Solana 运行时代码。

- `useSolana()`：返回完整注入的 Solana context。
- `useSolanaClient()`：返回 context 中的 Kit `{ client, rpc }`。新代码推荐使用。
- `useSolanaRpc()`：返回 cluster、endpoint、RPC 状态、latest blockhash、注入的 Kit `client` 和 `checkConnection()`。
- `useSolanaConnection()`：返回注入的 Kit `client`（已弃用，推荐使用 `useSolanaClient()`）。
- `useSolanaAccountInfo(address, options?)`：读取账户信息，并可订阅账户变化。
- `useSolanaWallet()`：返回所选钱包状态、连接状态、能力和钱包操作。
- `useSolanaWallets()`：返回已发现钱包和钱包选择/刷新操作。
- `useSolanaBalance(address, commitment?)`：读取 public key 或地址的 lamport 余额。
- `useSolanaTokenAccounts(owner, options?)`：加载某个所有者的所有 SPL token 账户，默认同时查询 Token 和 Token-2022 program。
- `useSolanaTokenBalance(mint, owner)`：通过关联 token 账户加载 mint/owner 对的 SPL token 余额和小数位数。
- `useSolanaProgramAccounts(programId, options?)`：使用过滤器和数据切片读取 program-owned accounts。
- `useSolanaTransactionConfirmation(options?)`：确认现有交易签名。
- `useSolanaSignatureStatus(signature, options?)`：读取、轮询或订阅签名状态。
- `useSolanaSignMessage()`：签署链下认证或所有权 challenge 消息。
- `useSolanaSignAndSendTransaction()`：签名、发送并可选确认交易。
- `useSolanaAction(handler)`：支持 abort-on-redispatch 的通用异步 action 状态机。
- `useSolanaRequest(source, options?)`：source 变化时重新触发的一次性 request，带 stale-while-revalidate。
- `useSolanaSubscription(source, options?)`：来自 RPC 订阅和其他响应式 stream source 的实时数据。
- `useSolanaTrackedData(source, options?)`：由一次性 fetch 播种、按 slot 去重的 RPC 订阅。
- `useSolanaSignIn()`：触发钱包的 Sign In With Solana（SIWS）功能。

为了在多次挂载之间进行 cache keying，SWR adapter 不会自动导入。请从 Vue 包 subpath 显式导入：

```ts
import { useRequestSwr } from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

request、subscription、tracked-data 和 SWR-cache composable 的完整语义请参阅 [Data Fetching Composables](/packages/vue#data-fetching-composables)。

- `useSolanaSelectedWalletAccount()`：读取运行时插件安装的应用级选定钱包账户上下文。
- `useSolanaSignTransactions()`：在一次钱包请求中签名多笔交易。
- `useSolanaSignAndSendTransactions()`：在一次钱包请求中签名并发送多笔交易。
- `useSolanaPayer()` / `useSolanaIdentity()`：响应式 Kit client signer（需要 signer 插件）。
- `useSolanaPlanTransaction()` / `useSolanaPlanTransactions()`：根据 instruction input 规划交易消息。
- `useSolanaSendTransaction()` / `useSolanaSendTransactions()`：使用默认 client 安装的官方 planner 和 executor，进行 plan、sign、submit 并等待 `confirmed`，不显示 wallet popup。请在 client-only Vue plugin 中配置 signer 或提供 embedded signer；当 connected wallet 必须批准每笔交易时，使用 `useSolanaSignAndSendTransaction(s)`。

这些是 Vue composable 的 Nuxt alias。

模块创建的默认 client 会组合官方 `solanaRpc()`、`rpcTransactionPlanner()` 和 `rpcTransactionPlanSendingExecutor()` plugin。旧的 custom fallback sender 不再使用。`useSolanaSendTransaction()` 和 `useSolanaSendTransactions()` 暴露官方 client-sending capability，但由于 `ModuleOptions` 省略了 `payer` 和 `payerSecretKey`，模块不会配置 payer。只有官方 executor 在 `confirmed` commitment 完成 send-and-confirm 后，状态才会变为 `sent`。

Vue 包使用 `useRpc()` 这样的短名称，因为调用方会从 `@vue-solana/vue/useRpc` 显式导入。

Nuxt 模块暴露 `useSolanaRpc()` 这样的前缀名称，因为自动导入的 composable 共享整个 Nuxt 应用命名空间，应避免与应用代码或其他模块冲突。

`useSolana()` 是例外，因为它已经带命名空间，并且在 Vue 和 Nuxt 中都是规范的 context accessor。

在 Nuxt 应用中使用 `useSolana*` 名称，这样自动导入无需显式 import 即可工作。

原始交易字节和浏览器 Buffer helper 是显式导入，不是自动导入：

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
```

Kit API 既可以作为自动导入，也可以作为显式导入使用：

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";

const { client, rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
const owner = address("PASTE_A_SOLANA_ADDRESS");
```

只有较底层 core 用法才直接使用 `@vue-solana/core/*` 导入。

直接包 subpath：

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/kit`

运行时插件仅在客户端运行。自动导入的 composable 可以在 SSR 期间调用，并在 hydration 提供真实客户端上下文前返回惰性状态。请从客户端生命周期钩子或用户操作触发 RPC 和钱包工作。

Android Mobile Wallet Adapter 注册也只在客户端运行。在 Android Chrome 和 Chrome PWA 中，`Mobile Wallet Adapter` 可以与浏览器扩展钱包出现在同一个 `useSolanaWallets()` 列表中。在 iOS 浏览器中，Phantom、Solflare 和 Backpack 可以通过钱包专用 universal link 出现在同一个列表中。桌面原生应用钱包 adapter 已计划但尚未实现。

## 相关指南

- [RPC 和 Clusters](/zh/guides/rpc-and-clusters)：配置 Nuxt 模块并读取 RPC 状态。
- [钱包](/zh/guides/wallets)：在客户端流程中安全使用 `useSolanaWallets()` 和 `useSolanaWallet()`。
- [账户读取](/zh/guides/account-reads)：读取余额、账户数据、program accounts 和签名状态。
- [交易](/zh/guides/transactions)：从 Nuxt 签名、发送、确认并处理交易状态。
- [消息签名](/zh/guides/message-signing)：为链下消息请求钱包签名。
- [E2E Testing](/zh/guides/e2e-testing)：在 Playwright 测试中 mock RPC、RPC 订阅和钱包。
- [错误](/zh/guides/errors)：把自动导入 composable 的错误映射为安全 UI 消息。

## 读取 RPC 状态

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

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
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

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
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useSolanaTokenAccounts(owner);

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

`useSolanaTokenAccounts()` 在 owner 为 null 时清除状态且不调用 RPC。在选项中传入 `programId` 可将结果限制为单个 token program。

## 读取 Token 余额

```vue
<script setup lang="ts">
const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useSolanaTokenBalance(mint, owner);

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

`useSolanaTokenBalance()` 在关联 token 账户不存在时返回 null balance 和 decimals，不会将其视为错误。

## 错误处理

Nuxt 自动导入的 composable 暴露与 `@vue-solana/vue` 相同的规范化 `SolanaError | null` ref。请使用稳定的 `error.value.code` 值进行 UI 分支，并保留 `error.value.cause` 用于记录原始钱包、RPC、解析、超时或存储失败。

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

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
</script>
```

## 读取账户数据

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

在公共 RPC node 上谨慎使用 `useSolanaProgramAccounts()`。优先使用窄过滤器，使用 `dataSlice` 进行部分读取，并避免轮询宽泛扫描。

## 钱包状态

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
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
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

浏览器扩展钱包通过 Solana Wallet Standard 发现。Android Mobile Wallet Adapter 钱包在支持的 Android Chrome 客户端上通过 `@solana-mobile/wallet-standard-mobile` 注册，并暴露到同一个钱包列表中。iOS Phantom、Solflare 和 Backpack 条目通过 iOS 浏览器上的钱包专用 universal link 暴露。`refreshWallets()` 只更新已发现钱包列表，`selectWallet()` 只配置活跃钱包。即使扩展在页面刷新后暴露之前授权的账户，`connected` 也会在 `connect()` 成功前保持 false。

## 消息签名

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
</script>
```

消息签名用于钱包所有权或认证 challenge。它不是交易签名，也不授权链上状态变更。不暴露消息签名的钱包会让 `canSignMessage` 为 false，`execute()` 会以不支持钱包错误拒绝。

## 签名、发送并确认交易

当连接的钱包应签名并提交交易时，请从客户端用户操作使用 `useSolanaSignAndSendTransaction()`。当 UI 应等待确认而不是在提交签名后停止时，传入 `confirm: true`。

```vue
<script setup lang="ts">
import type { SolanaTransaction } from "@vue-solana/nuxt/kit";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction(transaction: SolanaTransaction) {
  // Build the transaction message with @solana/kit and serialize it to wire bytes first.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Submitted: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to complete the transaction.</p>
  </section>
</template>
```

状态会在 RPC 提交后从 `sending` 变为 `sent`。启用确认后，状态会继续经过 `confirming`，并最终到达获得的 commitment，例如 `confirmed` 或 `finalized`。如果提交后确认超时，`signature` 仍然可用，因此应用可以展示 explorer 链接或在重试前轮询签名状态。

client-sent 交易不同：`useSolanaSendTransaction()` 和 `useSolanaSendTransactions()` 使用官方 RPC plan-sending executor。executor 会在 `execute()` resolve 前等待 `confirmed`，因此 `sent` 表示客户端 send-and-confirm 已完成。它们不显示 wallet popup；请使用带有 connected-wallet embedded signer 的消息，或在 client-only Vue plugin 中安装 signer。不要尝试把 raw `payerSecretKey` 配置到 Nuxt public runtime config。

钱包提示必须由 hydration 后的用户交互触发。不要在 SSR、server route 或页面加载时自动调用 `execute()`。

## 确认现有签名

当你已经有签名，并希望响应式确认状态时，请使用 `useSolanaTransactionConfirmation()`。

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirm signature</button>
    <p>Status: {{ status }}</p>
    <p v-if="confirmation">Reached {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to confirm the signature.</p>
  </section>
</template>
```

## 跟踪签名状态

当你需要持续检查已提交签名的状态时，请使用 `useSolanaSignatureStatus()`。这在超时后很有用，因为交易可能在 UI 停止等待后仍然落地。

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling, stopSubscription } = useSolanaSignatureStatus(
  signature,
  {
    pollIntervalMs: 2_000,
  },
);

onBeforeUnmount(() => {
  stopPolling();
  void stopSubscription();
});
</script>
```

Explorer 链接请使用配置的 cluster。Devnet 链接应包含 `?cluster=devnet`；`mainnet` 和旧别名 `mainnet-beta` 链接都不应包含 cluster query。

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## 示例应用

完整可运行的 Nuxt 流程，请参阅 [Nuxt 示例](/zh/examples/nuxt)。
