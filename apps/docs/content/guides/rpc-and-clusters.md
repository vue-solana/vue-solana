---
title: "RPC and Clusters"
description: Configure Solana clusters, RPC endpoints, WebSocket endpoints, and client helpers.
ogSection: Guides
surroundOrder: 7
---

Vue Solana keeps cluster and endpoint configuration shared across `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt`.

Use this guide when you need to choose a cluster, provide a custom RPC endpoint, or understand what the RPC composables expose.

## Cluster Names

Supported cluster names are:

- `devnet`
- `testnet`
- `mainnet`
- `mainnet-beta` (legacy alias for `mainnet`)
- `localnet`

Use `mainnet` for Solana mainnet. This is Solana's official mainnet cluster name. The legacy `mainnet-beta` spelling is still accepted and redirects to the same endpoint.

`devnet` is the default because it is the safest cluster for examples and development.

## Core Setup

Use `@vue-solana/core/rpc` when you want framework-agnostic client setup.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

`createSolanaContext()` returns the resolved `cluster`, HTTP `endpoint`, WebSocket `wsEndpoint`, and a Kit `client` whose `rpc` sends RPC requests.

## Custom RPC Endpoints

Production apps should usually use a dedicated RPC provider instead of public cluster endpoints.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet",
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

Nuxt stores module options in public runtime config, so options must be JSON-serializable. The Nuxt module intentionally omits `payer` and `payerSecretKey`; never place a raw secret in public runtime config. Install an ephemeral `payer` in a client-only plugin with `clientPlugin: false`.

Direct core and Vue clients can pass `payer` or `payerSecretKey` to `createSolanaClient()` / `createSolanaPlugin()`. The default client uses the official `solanaRpc()` stack for client-sent transactions, and `solanaRpc()` installs the transaction planner and the plan-signing and plan-sending executors itself.

Use the auto-imported `useSolanaRpc()` composable in Nuxt pages and components.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

The Nuxt browser runtime plugin is client-only, but a server plugin installs a request-scoped context during SSR using the configured cluster and endpoints, so `useSolanaRpc()` renders the configured cluster instead of a hardcoded `devnet`. Wallet state is inert until hydration; keep wallet work in client lifecycle hooks or user actions.

## Server-Side RPC During SSR

For data that must be in the initial HTML, keep the RPC URL and any API key in **private** runtime config under `solanaServer` and read them through `useServerSolanaClient()` from `@vue-solana/nuxt/server` in a Nitro server route. The utility accepts only read-side options (`cluster`, `endpoint`, `wsEndpoint`, `commitment`) and strips `wallet`, `payer`, and `payerSecretKey` at runtime. Private config is never bundled into the browser; never put credentials in `runtimeConfig.public.solana`.

Configure the private endpoint in `nuxt.config.ts` (or with the `NUXT_SOLANA_SERVER_ENDPOINT` environment variable):

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
  },
  runtimeConfig: {
    solanaServer: {
      // Private: this value is never bundled into the browser.
      endpoint: process.env.SOLANA_RPC_URL,
      commitment: "confirmed",
    },
  },
});
```

Read only the fields the page needs from a Nitro server route:

```ts
// server/api/slot.get.ts
import { useServerSolanaClient } from "@vue-solana/nuxt/server";

export default defineEventHandler(async () => {
  const { rpc } = useServerSolanaClient();
  const slot = await rpc.getSlot().send();
  return { slot: slot.toString() };
});
```

Then fetch it during SSR with `useAsyncData()`:

```vue
<script setup lang="ts">
const { data, refresh } = await useAsyncData("solana-slot", () =>
  $fetch<{ slot: string }>("/api/slot"),
);
</script>

<template>
  <p>Slot: {{ data?.slot ?? "Loading..." }}</p>
  <button type="button" @click="refresh()">Refresh</button>
</template>
```

`useAsyncData()` places the result in the Nuxt payload so the client does not refetch it during hydration. Convert `bigint` results such as slot numbers and balances to strings in the server route; only the fields you return are exposed to the browser. Wallet discovery, signing, and prompts must stay in client components after hydration.

## Endpoint Helpers

Use `@vue-solana/core/clusters` when you need the built-in endpoint values without creating a client.

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
