---
title: "RPC Y Clusters"
description: Configura clusters de Solana, endpoints RPC, endpoints WebSocket y helpers de conexion.
ogSection: Guias
surroundOrder: 8
---

Vue Solana mantiene la configuracion de clusters y endpoints compartida entre `@vue-solana/core`, `@vue-solana/vue` y `@vue-solana/nuxt`.

Usa esta guia cuando necesites elegir un cluster, proporcionar un endpoint RPC personalizado o entender que exponen los composables RPC.

## Nombres De Clusters

Los nombres de cluster admitidos son:

- `devnet`
- `testnet`
- `mainnet-beta`
- `localnet`

Usa `mainnet-beta` para la mainnet de Solana. Vue Solana sigue intencionalmente el nombre oficial de cluster de Solana y no usa `mainnet` como alias.

`devnet` es el valor predeterminado porque es el cluster mas seguro para ejemplos y desarrollo.

## Configuracion Core

Usa `@vue-solana/core/rpc` cuando quieras configurar conexiones sin depender de un framework.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

`createSolanaContext()` devuelve el `cluster` resuelto, el `endpoint` HTTP, el `wsEndpoint` WebSocket y la `connection`.

## Endpoints RPC Personalizados

Las aplicaciones de produccion normalmente deberian usar un proveedor RPC dedicado en lugar de endpoints publicos de cluster.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

Si se omite `wsEndpoint`, Vue Solana lo deriva del endpoint HTTP convirtiendo `https` a `wss` y `http` a `ws`.

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Configuracion En Vue

Instala el plugin de Vue una vez cerca del arranque de la aplicacion.

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
    <p>Estado: {{ status }}</p>
    <p>Ultimo blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">No se pudo alcanzar el RPC.</p>
    <button type="button" @click="checkConnection">Comprobar RPC</button>
  </section>
</template>
```

## Configuracion En Nuxt

Configura el modulo en `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt guarda las opciones del modulo en runtime config publico, asi que las opciones deben ser serializables como JSON.

Usa el composable autoimportado `useSolanaRpc()` en paginas y componentes Nuxt.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

El plugin runtime de Nuxt es solo de cliente. Los composables se pueden llamar durante SSR, pero el trabajo de wallets y RPC debe iniciarse desde hooks del cliente o acciones del usuario.

## Helpers De Endpoint

Usa `@vue-solana/core/clusters` cuando necesites los valores de endpoint incorporados sin crear una `Connection`.

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## Notas De Produccion

- Prefiere un proveedor RPC dedicado para trafico de produccion.
- Evita escaneos amplios o frecuentes en endpoints RPC publicos.
- Usa suscripciones WebSocket intencionalmente; limpialas siempre cuando ya no las necesites.
- Trata las respuestas RPC como entrada no confiable y maneja datos ausentes, obsoletos o fallidos.
