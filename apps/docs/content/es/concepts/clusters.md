---
title: Clusters
description: Nombres de clusters de Solana, endpoints RPC e instrucciones para faucets.
ogSection: Conceptos
surroundOrder: 6
---

Solana tiene varios clusters. Vue Solana acepta nombres de cluster y endpoints explícitos para que puedas empezar rápido y cambiar a infraestructura propia cuando lo necesites.

## Clusters soportados

- `mainnet-beta`: red principal con valor real.
- `devnet`: red pública para desarrollo.
- `testnet`: red pública para pruebas de validadores.
- `localnet`: validador local.

No firmes ni envíes transacciones en mainnet sin aprobación explícita del usuario.

## Endpoints RPC

Puedes usar el endpoint predeterminado del cluster o configurar uno propio:

```ts
createSolanaContext({
  cluster: "devnet",
  endpoint: "https://api.devnet.solana.com",
});
```

## Endpoints WebSocket

Si no pasas `wsEndpoint`, Vue Solana deriva un endpoint WebSocket compatible cuando es posible.

## Configurar un cluster

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

En Vue usa `createSolanaPlugin({ cluster: "devnet" })`.

## Obtener SOL de devnet o testnet

Usa un faucet público o `solana airdrop` para financiar una cuenta de pruebas. No reutilices claves privadas de mainnet en entornos de desarrollo.
