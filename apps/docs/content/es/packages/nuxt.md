---
title: "@vue-solana/nuxt"
description: Módulo Nuxt para aplicaciones Solana.
ogSection: Paquetes
surroundOrder: 16
---

`@vue-solana/nuxt` instala el plugin de Vue Solana desde `nuxt.config.ts` y autoimporta composables.

## Instalar

```sh
pnpm add @vue-solana/nuxt
```

## Configuración del módulo

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

## Composables autoimportados

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaBalance()`
- `useSolanaWallet()`
- `useSolanaSignAndSendTransaction()`

## Guías relacionadas

- [RPC y clusters](/es/guides/rpc-and-clusters)
- [Wallets](/es/guides/wallets)
- [Transacciones](/es/guides/transactions)

## Leer estado RPC

```vue
<script setup lang="ts">
const { cluster, endpoint } = useSolanaRpc();
</script>
```

## Leer balance

```ts
const balance = useSolanaBalance(address);
```

## Manejo de errores

Los composables exponen refs de error y carga para que la UI pueda reaccionar de forma declarativa.

## Leer datos de cuenta

Usa `useSolanaConnection()` para acceder a la conexión y llamar métodos RPC directamente.

## Estado de wallet

```ts
const wallet = useSolanaWallet();
```

## Firma de mensajes

La firma de mensajes debe usar challenges claros y verificables.

## Firmar, enviar y confirmar una transacción

Usa el composable de transacciones y muestra el resultado solo después de confirmar.

## Confirmar una firma existente

```ts
await connection.confirmTransaction(signature, "confirmed");
```

## Seguir estado de firma

Consulta `getSignatureStatuses()` para mostrar progreso cuando el usuario ya tiene una firma.

## Aplicación de ejemplo

Consulta [Ejemplo Nuxt](/es/examples/nuxt).
