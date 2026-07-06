---
title: "账户读取"
description: 从 Vue 或 Nuxt 安全读取余额、账户数据、program accounts 和签名状态。
ogSection: 指南
surroundOrder: 10
---

Vue Solana 为常见的 Solana 读取路径提供 composable：余额、账户信息、program accounts 和签名状态。

当你的应用需要在不签署交易的情况下读取链上状态时，请使用本指南。

## 解析地址

框架无关代码可以使用 `parsePublicKey()` 规范化 Solana 地址。

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");

if (publicKey) {
  const balance = await connection.getBalance(publicKey);
}
```

`parsePublicKey()` 接受 `PublicKey`、地址字符串、类似 ref 的对象、getter、`null` 或 `undefined`。无效地址字符串会抛出 `INVALID_ADDRESS`。

## 在 Vue 中读取余额

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## 读取账户信息

对单个账户使用 `useAccountInfo()`。需要实时账户更新时启用 `watch`。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});
</script>
```

启用 `watch: true` 时，Vue Solana 会在组件卸载时自动移除 WebSocket listener。调用 `stopWatching()` 可以更早移除当前 listener，并阻止该 composable 实例自动重启。

## 读取 Program Accounts

对某个 program id 拥有的账户使用 `useProgramAccounts()`。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> 警告：Program account 扫描可能成本很高。生产读取请使用窄过滤器、`dataSlice`、缓存、分页、索引或专用 RPC 基础设施。

## 读取签名状态

使用 `useSignatureStatus()` 跟踪已知交易签名。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, confirmationStatus, error, refresh } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

短暂的进度 UI 可以使用轮询。避免在高流量页面上无限期轮询。

## Nuxt 自动导入

Nuxt 以自动导入 composable 的形式暴露相同读取 helper：

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Nuxt composable 可以在 SSR 期间调用，并在 hydration 提供真实客户端上下文前返回惰性状态。当数据依赖浏览器专用上下文时，请从客户端生命周期钩子或用户操作触发网络刷新。

## Null 和无效输入

当地址、program id 或签名为 `null` 时，读取 composable 会清除状态且不调用 RPC。

无效地址字符串会清除过期数据，设置 `error`，并且不调用 RPC 方法。使用 `error.value.code` 为用户展示消息。

## RPC 成本检查清单

- 尽量优先使用直接的单账户读取。
- 对 program account 扫描使用过滤器。
- 只需要部分账户数据时使用 `dataSlice`。
- 避免从 landing page 或每次路由导航触发宽泛扫描。
- 避免在公共 RPC endpoint 上使用激进的轮询间隔。
- 对大量用户会重复请求的数据进行缓存或索引。
