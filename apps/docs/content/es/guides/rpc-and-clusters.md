---
title: RPC y clusters
description: Configura clusters de Solana, endpoints RPC, endpoints WebSocket y helpers de conexión.
ogSection: Guías
surroundOrder: 8
---

RPC es la forma principal de leer datos de Solana desde una aplicación. Vue Solana centraliza la configuración de cluster y conexión para que los componentes no repitan endpoints.

## Nombres de cluster

Usa `devnet` para desarrollo, `testnet` para pruebas de red, `localnet` para un validador local y `mainnet-beta` solo cuando estés listo para valor real.

## Configuración core

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({
  cluster: "devnet",
});
```

## Endpoints RPC personalizados

```ts
createSolanaContext({
  cluster: "devnet",
  endpoint: "https://api.devnet.solana.com",
  wsEndpoint: "wss://api.devnet.solana.com",
});
```

## Configuración Vue

```ts
app.use(createSolanaPlugin({ cluster: "devnet" }));
```

```ts
const { cluster, endpoint, connection } = useSolanaRpc();
```

## Configuración Nuxt

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: { cluster: "devnet" },
});
```

## Helpers de endpoint

`@vue-solana/core` resuelve endpoints predeterminados por cluster y permite reemplazarlos con infraestructura propia.

## Notas de producción

- Usa un proveedor RPC confiable para producción.
- Implementa límites, reintentos prudentes y mensajes de error claros.
- No dependas de faucets ni endpoints gratuitos para flujos críticos.
