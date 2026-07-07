---
title: "RPC 和集群"
description: 配置 Solana 集群、RPC 端点、WebSocket 端点和连接辅助函数。
ogSection: 指南
surroundOrder: 8
---

Vue Solana 在 `@vue-solana/core`、`@vue-solana/vue` 和 `@vue-solana/nuxt` 之间共享集群和端点配置。

当你需要选择集群、提供自定义 RPC 端点，或了解 RPC 组合式函数暴露的内容时，请使用本指南。

## 集群名称

支持的集群名称包括：

- `devnet`
- `testnet`
- `mainnet-beta`
- `localnet`

Solana 主网请使用 `mainnet-beta`。Vue Solana 有意遵循 Solana 官方集群名称，并且不使用 `mainnet` 作为别名。

`devnet` 是默认值，因为它是示例和开发中最安全的集群。

## Core 设置

当你需要与框架无关的连接设置时，请使用 `@vue-solana/core/rpc`。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

`createSolanaContext()` 返回解析后的 `cluster`、HTTP `endpoint`、WebSocket `wsEndpoint` 和 `connection`。

## 自定义 RPC 端点

生产应用通常应使用专用 RPC 提供商，而不是公共集群端点。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

如果省略 `wsEndpoint`，Vue Solana 会从 HTTP 端点推导它：将 `https` 转换为 `wss`，将 `http` 转换为 `ws`。

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Vue 设置

在应用启动附近安装一次 Vue 插件。

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      commitment: "confirmed",
    }),
  )
  .mount("#app");
```

然后在组件中使用 `useRpc()` 读取 RPC 状态。

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, latestBlockhash, error, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>集群：{{ cluster }}</p>
    <p>端点：{{ endpoint }}</p>
    <p>状态：{{ status }}</p>
    <p>最新 blockhash：{{ latestBlockhash }}</p>
    <p v-if="error">无法连接 RPC。</p>
    <button type="button" @click="checkConnection">检查 RPC</button>
  </section>
</template>
```

## Nuxt 设置

在 `nuxt.config.ts` 中配置模块。

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt 会将模块选项存储在公共运行时配置中，因此选项必须可 JSON 序列化。

在 Nuxt 页面和组件中使用自动导入的 `useSolanaRpc()` 组合式函数。

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

Nuxt 运行时插件仅在客户端运行。组合式函数可以在 SSR 期间调用，但钱包和 RPC 工作应从客户端生命周期钩子或用户操作触发。

## 端点辅助函数

当你需要内置端点值，但不想创建 `Connection` 时，请使用 `@vue-solana/core/clusters`。

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## 生产环境注意事项

- 生产流量优先使用专用 RPC 提供商。
- 避免在公共 RPC 端点上进行宽泛或频繁的扫描。
- 有意使用 WebSocket 订阅；不再需要时务必清理它们。
- 将 RPC 响应视为不可信输入，并处理缺失、过期或失败的数据。
