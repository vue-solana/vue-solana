---
title: "@vue-solana/core"
description: Configuración Solana independiente del framework, RPC, tipos de wallet y helpers de transacción.
ogSection: Paquetes
surroundOrder: 14
---

`@vue-solana/core` contiene las primitivas compartidas por Vue y Nuxt. Úsalo directamente si necesitas lógica Solana fuera de componentes Vue.

## Instalar

```sh
pnpm add @vue-solana/core
```

## Inicio rápido

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({ cluster: "devnet" });
```

## Guías relacionadas

- [RPC y clusters](/es/guides/rpc-and-clusters)
- [Wallets](/es/guides/wallets)
- [Transacciones](/es/guides/transactions)

## Configuración

La configuración acepta `cluster`, `endpoint` y `wsEndpoint`. Puedes empezar con un cluster y pasar endpoints propios cuando lo necesites.

## Contexto

El contexto combina configuración resuelta, conexión RPC y estado compartido usado por paquetes superiores.

## Interfaz de wallet

El core define tipos de wallet para conectar, desconectar, firmar mensajes y firmar transacciones según capacidades disponibles.

## Metadatos de wallet

Los metadatos incluyen nombre, icono, fuente y capacidades. Úsalos para mostrar opciones al usuario sin asumir una implementación concreta.

## Helpers de Wallet Standard

Los helpers adaptan wallets compatibles con Solana Wallet Standard al flujo unificado de Vue Solana.

## Helpers de wallet móvil

La compatibilidad móvil se expone sin crear composables públicos separados, para mantener un único flujo de wallets.

## Helpers

- `createSolanaConnection()`
- `createSolanaContext()`
- `signAndSendTransaction()`
- Validaciones y aserciones de wallet conectada.

## Modelo de error

Los errores se normalizan para que Vue y Nuxt puedan mostrar estados consistentes.

## Problema conocido de TypeScript

El paquete incluye shims de declaraciones para el problema actual de `@solana/web3-compat`.
