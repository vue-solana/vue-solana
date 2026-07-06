---
title: "RPC 和集群"
description: 配置 Solana 集群、RPC 端点、WebSocket 端点和 connection 工具。
ogSection: 指南
surroundOrder: 8
---

Vue Solana 在 `@vue-solana/core`、`@vue-solana/vue` 和 `@vue-solana/nuxt` 之间共享集群和端点配置。

当你需要选择集群、提供自定义 RPC 端点，或理解 RPC composables 暴露的内容时，请使用本指南。

## 集群名称

支持的集群名称：

- `devnet`
- `testnet`
- `mainnet-beta`
- `localnet`

Solana 主网使用 `mainnet-beta`。Vue Solana 遵循 Solana 官方集群名称，并且有意不把 `mainnet` 作为别名。

`devnet` 是默认值，因为它是示例和开发最安全的集群。

## Core 设置

需要与框架无关的 connection 设置时，使用 `@vue-solana/core/rpc`。

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

生产应用通常应使用专用 RPC provider，而不是公共集群端点。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

如果省略 `wsEndpoint`，Vue Solana 会从 HTTP 端点推导：把 `https` 转为 `wss`，把 `http` 转为 `ws`。

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

然后在组件中用 `useRpc()` 读取 RPC 状态。

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, latestBlockhash, error, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">Unable to reach RPC.</p>
    <button type="button" @click="checkConnection">Check RPC</button>
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

Nuxt 会把模块选项存储在 public runtime config 中，因此选项必须可 JSON 序列化。

在 Nuxt 页面和组件中使用自动导入的 `useSolanaRpc()` composable。

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

Nuxt runtime plugin 仅在客户端运行。Composables 可以在 SSR 中调用，但钱包和 RPC 工作应由客户端生命周期或用户操作触发。

## 端点工具

当你只需要内置端点值而不创建 `Connection` 时，使用 `@vue-solana/core/clusters`。

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## 生产注意事项

- 生产流量优先使用专用 RPC provider。
- 避免在公共 RPC 端点上进行宽泛或频繁扫描。
- 有意识地使用 WebSocket 订阅；不再需要时务必清理。
- 将 RPC 响应视为不可信输入，并处理缺失、过期或失败的数据。
