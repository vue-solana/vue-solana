---
title: Primeros pasos
description: Instala los paquetes de Vue Solana, configura Vue o Nuxt y prueba lecturas RPC en devnet.
ogSection: Inicio
surroundOrder: 2
---

Esta guía muestra la ruta mínima para instalar Vue Solana, configurar una aplicación Vue o Nuxt y comprobar que puedes leer datos de Solana en devnet.

## Antes de empezar

Necesitas Node.js, pnpm y una aplicación Vue o Nuxt. Para pruebas con wallet, instala una wallet compatible con Solana Wallet Standard y cambia la red a devnet.

```sh
pnpm install
pnpm build
pnpm typecheck
```

## Instalar para Vue

```sh
pnpm add @vue-solana/vue
```

El paquete de Vue trae el plugin y los composables. Si necesitas usar las primitivas sin Vue, instala también `@vue-solana/core` directamente.

## Instalar para Nuxt

```sh
pnpm add @vue-solana/nuxt
```

El módulo de Nuxt instala el plugin de Vue y autoimporta composables como `useSolanaRpc()`, `useSolanaWallet()` y `useSolanaBalance()`.

## Problema conocido de TypeScript

`@solana/web3-compat@0.0.21` tiene metadatos de tipos incompletos en npm. Los paquetes publicados de Vue Solana incluyen shims de declaraciones para que los consumidores no tengan que añadirlos manualmente.

## Configuración en Vue

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
    }),
  )
  .mount("#app");
```

Lee estado RPC desde un componente:

```vue
<script setup lang="ts">
const { cluster, endpoint, connection } = useSolanaRpc();
</script>

<template>
  <p>{{ cluster }}: {{ endpoint }}</p>
</template>
```

## Configuración en Nuxt

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Después puedes usar los composables autoimportados en páginas y componentes.

## Probar RPC sin wallet

```vue
<script setup lang="ts">
const { connection } = useSolanaConnection();
const latestBlockhash = ref<string>();

async function loadBlockhash() {
  latestBlockhash.value = (await connection.getLatestBlockhash()).blockhash;
}
</script>
```

Esta prueba no requiere wallet porque solo lee datos públicos desde RPC.

## Obtener SOL de devnet o testnet

Usa un faucet de Solana o el comando `solana airdrop` con una dirección de devnet/testnet. No uses mainnet para pruebas iniciales.

## Ejecutar los ejemplos

Desde la raíz del repositorio:

```sh
pnpm dev:vue
pnpm dev:nuxt
pnpm dev:docs
```

## Conectar una wallet

El flujo recomendado es unificado: descubre wallets, selecciona una, conecta, revisa capacidades y luego firma mensajes o transacciones solo con aprobación del usuario.

## Firmar un mensaje

Usa firma de mensajes para autenticación o prueba de propiedad. No la confundas con una transacción on-chain.

```ts
const { signMessage } = useSolanaWallet();
```

## Enviar una transferencia

Construye la transacción, pide firma explícita al usuario y confirma la firma en devnet antes de mostrar éxito.

## Verificación final

```sh
pnpm typecheck
pnpm build
```

## Más lectura

- [RPC y clusters](/es/guides/rpc-and-clusters)
- [Wallets](/es/guides/wallets)
- [Transacciones](/es/guides/transactions)
