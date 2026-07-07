---
title: "Errores"
description: Maneja errores Solana normalizados desde helpers core y composables Vue/Nuxt.
ogSection: Guías
surroundOrder: 13
---

Vue Solana normaliza fallos comunes de wallet, RPC, dirección, transacción, timeout y storage en `SolanaError`.

Usa valores estables de `error.code` para decisiones de UI. Conserva `error.cause` para depuración y logs.

## Forma del error

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` incluye:

- `code`: código de error estable y legible por máquina.
- `message`: mensaje de desarrollo legible por humanos.
- `cause`: error original opcional desde una wallet, llamada RPC, parser, timeout u operación de storage.
- `feature`: nombre opcional de feature de wallet para errores de capacidad no soportada.

## Códigos de error estables

- `NO_WALLET_SELECTED`: no hay wallet activa seleccionada.
- `WALLET_NOT_CONNECTED`: la wallet activa no está conectada o no tiene clave pública.
- `WALLET_FEATURE_UNSUPPORTED`: la wallet activa no soporta la feature solicitada.
- `USER_REJECTED`: el usuario rechazó una solicitud de wallet.
- `INVALID_ADDRESS`: un string de dirección no pudo parsearse como clave pública de Solana.
- `TRANSACTION_TIMEOUT`: una operación relacionada con transacción agotó el tiempo de espera.
- `RPC_FAILURE`: falló un envío, lectura o confirmación RPC.
- `STORAGE_FAILURE`: el storage del navegador no pudo leerse o escribirse.

## Manejo de errores en core

Usa `isSolanaError()` al capturar fallos desconocidos.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(connection, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    console.log(error.code);
    console.debug(error.cause);
  }
}
```

Usa `normalizeSolanaError()` cuando escribas tu propio helper agnóstico al framework que deba seguir el modelo de errores de Vue Solana.

```ts
import { normalizeSolanaError } from "@vue-solana/core/errors";

async function loadData() {
  try {
    return await connection.getLatestBlockhash();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE", "Unable to load blockhash");
  }
}
```

`normalizeSolanaError()` mapea formas comunes de rechazo de wallet a `USER_REJECTED`.

## Refs de error en Vue

Los composables de Vue exponen refs `error`.

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load data from RPC.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
</script>
```

## Refs de error en Nuxt

Los composables autoimportados de Nuxt exponen el mismo modelo de errores.

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## Mensajes orientados al usuario

No muestres detalles crudos de `cause` directamente a usuarios finales salvo que tu app confíe explícitamente en esa fuente. Los mensajes de error de wallets y RPC pueden contener texto específico del proveedor que sea confuso o inseguro para UI.

Mapea códigos de error estables a mensajes cortos específicos de la app.

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "Request canceled.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support that action.";
    case "RPC_FAILURE":
      return "Network request failed. Try again.";
    default:
      return "Something went wrong.";
  }
}
```

## Guía de reintentos

- Reintenta `RPC_FAILURE` solo cuando la operación sea segura de repetir.
- Después de `TRANSACTION_TIMEOUT`, revisa el estado de la firma antes de reintentar.
- No reintentes `USER_REJECTED` automáticamente.
- No reintentes `INVALID_ADDRESS`; pide al usuario corregir el input.
- Oculta o deshabilita acciones que producen `WALLET_FEATURE_UNSUPPORTED`.
