---
title: "RPC Y Clusters"
description: Configura clusters de Solana, endpoints RPC, endpoints WebSocket y helpers de cliente.
ogSection: Guías
surroundOrder: 8
---

Vue Solana mantiene la configuración de clusters y endpoints compartida entre `@vue-solana/core`, `@vue-solana/vue` y `@vue-solana/nuxt`.

Usa esta guía cuando necesites elegir un cluster, proporcionar un endpoint RPC personalizado o entender qué exponen los composables RPC.

## Nombres de Clusters

Los nombres de cluster admitidos son:

- `devnet`
- `testnet`
- `mainnet`
- `mainnet-beta` (alias heredado de `mainnet`)
- `localnet`

Usa `mainnet` para la mainnet de Solana. Este es el nombre oficial del mainnet de Solana. La grafía heredada `mainnet-beta` sigue siendo aceptada y redirige al mismo endpoint.

`devnet` es el valor predeterminado porque es el cluster más seguro para ejemplos y desarrollo.

## Configuración Core

Usa `@vue-solana/core/rpc` cuando quieras configuración de cliente agnóstica al framework.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

`createSolanaContext()` devuelve el `cluster` resuelto, el `endpoint` HTTP, el `wsEndpoint` WebSocket y un `client` de Kit cuyo `rpc` envía solicitudes RPC.

## Endpoints RPC Personalizados

Las aplicaciones de producción normalmente deberían usar un proveedor RPC dedicado en lugar de endpoints públicos de cluster.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

Si se omite `wsEndpoint`, Vue Solana lo deriva del endpoint HTTP convirtiendo `https` a `wss` y `http` a `ws`.

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Configuración en Vue

Instala el plugin de Vue una vez cerca del arranque de la aplicación.

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

Luego lee el estado RPC desde componentes con `useRpc()`.

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

## Configuración en Nuxt

Configura el módulo en `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt guarda las opciones del módulo en runtime config público, así que las opciones deben ser serializables como JSON. El módulo Nuxt omite intencionalmente `payer` y `payerSecretKey`; nunca pongas un secreto crudo en la configuración runtime pública. Instala un `payer` efimero en un plugin solo de cliente con `clientPlugin: false`.

Los clientes directos core y Vue pueden pasar `payer` o `payerSecretKey` a `createSolanaClient()` / `createSolanaPlugin()`. El cliente por defecto usa la composición oficial `solanaRpc()`, `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()` para las transacciones enviadas por el cliente.

Usa el composable autoimportado `useSolanaRpc()` en páginas y componentes Nuxt.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

El plugin runtime de Nuxt es solo de cliente. Los composables se pueden llamar durante SSR, pero el trabajo de wallets y RPC debe iniciarse desde hooks del cliente o acciones del usuario.

## Helpers de Endpoint

Usa `@vue-solana/core/clusters` cuando necesites los valores de endpoint incorporados sin crear un cliente.

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## Notas de Producción

- Prefiere un proveedor RPC dedicado para tráfico de producción.
- Evita escaneos amplios o frecuentes en endpoints RPC públicos.
- Usa suscripciones WebSocket intencionalmente; límpialas siempre cuando ya no las necesites.
- Trata las respuestas RPC como entrada no confiable y maneja datos ausentes, obsoletos o fallidos.
