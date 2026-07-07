---
title: "账户读取"
description: 在 Vue 或 Nuxt 中安全读取余额、账户数据、程序账户和签名状态。
ogSection: 指南
surroundOrder: 10
---

Vue Solana 为常见的 Solana 读取路径提供了组合式函数：余额、账户信息、程序账户和签名状态。

当你的应用需要读取链上状态，但不需要签署交易时，请使用本指南。

## 解析地址

与框架无关的代码可以使用 `parsePublicKey()` 规范化 Solana 地址。

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");

if (publicKey) {
  const balance = await connection.getBalance(publicKey);
}
```

`parsePublicKey()` 接受 `PublicKey`、地址字符串、类似 ref 的对象、getter、`null` 或 `undefined`。无效的地址字符串会抛出 `INVALID_ADDRESS`。

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
      return "请输入有效的 Solana 地址。";
    case "RPC_FAILURE":
      return "无法加载余额。";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "未知" }}</p>
    <p v-if="loading">加载中...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">刷新</button>
  </section>
</template>
```

## 读取账户信息

使用 `useAccountInfo()` 读取单个账户。当你需要实时账户更新时，启用 `watch`。

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

启用 `watch: true` 时，Vue Solana 会在组件卸载时自动移除 WebSocket 监听器。调用 `stopWatching()` 可以更早移除当前监听器，并阻止该组合式函数实例自动重启监听。

## 读取程序账户

使用 `useProgramAccounts()` 读取由某个程序 id 拥有的账户。

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

> 警告：程序账户扫描可能成本很高。生产环境读取时，请使用精确过滤器、`dataSlice`、缓存、分页、索引或专用 RPC 基础设施。

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

轮询适合短时间的进度 UI。避免在高流量页面中无限期轮询。

## Nuxt 自动导入

Nuxt 以自动导入的组合式函数暴露相同的读取辅助工具：

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

Nuxt 组合式函数可以在 SSR 期间调用，并会返回惰性状态，直到 hydration 提供真实的客户端上下文。如果数据依赖仅浏览器可用的上下文，请从客户端生命周期钩子或用户操作触发网络刷新。

## Null 和无效输入

当地址、程序 id 或签名为 `null` 时，读取组合式函数会清空状态，并且不会调用 RPC。

无效地址字符串会清除过期数据、设置 `error`，并且不会调用 RPC 方法。根据 `error.value.code` 分支处理面向用户的消息。

## RPC 成本检查清单

- 尽可能优先使用直接的单账户读取。
- 对程序账户扫描使用过滤器。
- 只需要部分账户数据时使用 `dataSlice`。
- 避免从落地页或每次路由导航发起宽泛扫描。
- 避免在公共 RPC 端点上使用激进的轮询间隔。
- 缓存或索引许多用户会重复请求的数据。
