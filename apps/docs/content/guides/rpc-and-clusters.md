---
title: "RPC and Clusters"
description: Configure Solana clusters, RPC endpoints, WebSocket endpoints, and connection helpers.
ogSection: Guides
surroundOrder: 8
---

Vue Solana keeps cluster and endpoint configuration shared across `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt`.

Use this guide when you need to choose a cluster, provide a custom RPC endpoint, or understand what the RPC composables expose.

## Cluster Names

Supported cluster names are:

- `devnet`
- `testnet`
- `mainnet-beta`
- `localnet`

Use `mainnet-beta` for Solana mainnet. Vue Solana intentionally follows Solana's official cluster name and does not use `mainnet` as an alias.

`devnet` is the default because it is the safest cluster for examples and development.

## Core Setup

Use `@vue-solana/core/rpc` when you want framework-agnostic connection setup.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

`createSolanaContext()` returns the resolved `cluster`, HTTP `endpoint`, WebSocket `wsEndpoint`, and `connection`.

## Custom RPC Endpoints

Production apps should usually use a dedicated RPC provider instead of public cluster endpoints.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

If `wsEndpoint` is omitted, Vue Solana derives it from the HTTP endpoint by converting `https` to `wss` and `http` to `ws`.

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Vue Setup

Install the Vue plugin once near app startup.

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

Then read RPC state from components with `useRpc()`.

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

## Nuxt Setup

Configure the module in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt stores module options in public runtime config, so options must be JSON-serializable.

Use the auto-imported `useSolanaRpc()` composable in Nuxt pages and components.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

The Nuxt runtime plugin is client-only. Composables can be called during SSR, but wallet and RPC work should be triggered from client lifecycle hooks or user actions.

## Endpoint Helpers

Use `@vue-solana/core/clusters` when you need the built-in endpoint values without creating a `Connection`.

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## Production Notes

- Prefer a dedicated RPC provider for production traffic.
- Avoid broad or frequent scans on public RPC endpoints.
- Use WebSocket subscriptions intentionally; always clean them up when you no longer need them.
- Treat RPC responses as untrusted input and handle missing, stale, or failed data.
