---
title: Clusters
description: Nombres de clusters de Solana, endpoints RPC e instrucciones para faucet.
ogSection: Conceptos
surroundOrder: 6
---

Un cluster de Solana es una red de validadores. Las apps eligen a qué cluster conectarse.

## Clusters soportados

Vue Solana soporta estos nombres de cluster:

- `mainnet-beta`: mainnet de Solana. Este es el nombre oficial del cluster mainnet de Solana. Úsalo para apps de producción y SOL real.
- `devnet`: red para desarrolladores. Úsala mientras construyes apps. El SOL de devnet no tiene valor real.
- `testnet`: red de pruebas de validadores y protocolo. Es menos común para desarrollo de apps que devnet.
- `localnet`: un validador local ejecutándose en tu máquina, normalmente en `http://127.0.0.1:8899`.

Usa `mainnet-beta` en lugar de `mainnet`. Vue Solana intencionalmente no agrega un alias `mainnet`.

Referencia oficial: [Solana Clusters](https://solana.com/docs/references/clusters)

## Endpoints RPC

Un endpoint RPC es la URL HTTP que tu app usa para leer o escribir en Solana.

Ejemplos:

- `https://api.devnet.solana.com`
- `https://api.mainnet-beta.solana.com`
- `http://127.0.0.1:8899`

El objeto `Connection` de `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3` o `@vue-solana/core/web3` envía solicitudes RPC a este endpoint. Los endpoints públicos son útiles para empezar, pero las apps de producción normalmente usan un proveedor RPC dedicado por fiabilidad y límites de tasa.

Referencia oficial: [Solana RPC](https://solana.com/docs/rpc)

## Endpoints WebSocket

Los endpoints WebSocket se usan para suscripciones y actualizaciones en tiempo real. Vue Solana deriva un endpoint WebSocket desde tu endpoint RPC, salvo que pases `wsEndpoint` explícitamente.

Ejemplos:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet-beta.solana.com`
- `ws://127.0.0.1:8900`

## Configurar un cluster

Para Vue:

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Para Nuxt:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

También puedes pasar un endpoint personalizado:

```ts
createSolanaPlugin({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## Obtener SOL de devnet o testnet

Usa el faucet oficial:

```txt
https://faucet.solana.com
```

Elige `Devnet` o `Testnet`, pega la dirección de tu wallet y solicita SOL.

Si tienes instalada la CLI de Solana, también puedes solicitar un airdrop:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

El SOL de devnet y testnet no tiene valor real. Nunca uses una wallet con fondos reales mientras pruebas.
