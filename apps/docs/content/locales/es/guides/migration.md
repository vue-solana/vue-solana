---
title: "Guía de Migración"
description: Cómo migrar entre versiones de Vue Solana. Cubre la actualización de v2 a v3 (ESM, espejo completo de Kit) y la migración de v1.x a v2 (API basada en Kit).
ogSection: Guias
surroundOrder: 13
---

Esta guía cubre la migración entre versiones de Vue Solana. Hay dos migraciones importantes: la actualización de v2 a v3 (más reciente) y la migración de v1.x a v2.

## Migración: de v2 a v3

v3.0.0 es la versión más reciente. Cambia el formato de módulo a solo ESM y convierte los subpaths `kit` en un espejo completo de `@solana/kit`. La migración a Kit ya estaba completa en v2, por lo que v3 se enfoca en el empaquetado y cambios menores de comportamiento.

### ¿Qué ha cambiado?

- **Solo ESM**: Todos los paquetes `@vue-solana/*` ahora se publican solo como ESM. Se eliminaron la condición de exportación `require` y el campo `main` de primer nivel.
- **Espejo completo de Kit**: `@vue-solana/core/kit`, `@vue-solana/vue/kit` y `@vue-solana/nuxt/kit` ahora hacen `export *` de `@solana/kit` (no un subconjunto curado).
- **Comportamiento de composables de lectura**: `useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()` y `useTokenBalance()` (y sus equivalentes `useSolana*` de Nuxt) comparten una máquina de estados unificada con mejor manejo de errores.
- **Superficie de dependencias**: Ya no necesitas añadir `@solana/kit` a tu propio `package.json` al usar los subpaths `kit` del paquete.

### Cómo migrar

#### 1. Actualizar dependencias

```sh
# Para apps de Vue
pnpm add @vue-solana/vue@^3.0.0

# Para apps de Nuxt
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. Manejar paquetes solo ESM

Si tu app o scripts todavía usan CommonJS (`require()`), conviértelos a ESM. Añade `"type": "module"` a tu `package.json` o renombra los archivos a `.mjs`.

```ts
// En lugar de require()
import { createSolanaClient } from "@vue-solana/core/kit";
```

Si no puedes cambiar a ESM, quédate en `@vue-solana/*@^2.x`, que todavía incluye builds `.cjs`.

#### 3. Actualizar imports de Kit

Con el espejo completo, importa todo desde el subpath `kit` del paquete. Si previamente añadiste `@solana/kit` a tus dependencias, puedes eliminarlo.

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt (los composables auto-importados siguen funcionando)
import { address, lamports } from "@vue-solana/nuxt/kit";
```

Nota: Cuatro nombres (`SolanaError`, `SolanaErrorCode`, `isSolanaError`, `TransactionStatus`) se resuelven de manera diferente entre las barras de raíz y los subpaths `/kit`. Si estás capturando errores lanzados por Kit, importa `isSolanaError` desde el subpath `kit`.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. Actualizar el manejo de errores en composables de lectura

`refresh()` ahora rechaza cuando falla (en lugar de resolver). Actualiza el código que lo espera:

```ts
await refresh().catch(() => undefined);
```

`@click="refresh"` en plantillas no se ve afectado.

Cuando las lecturas fallan, los datos vuelven a su valor vacío. Verifica `error` explícitamente:

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="No se pudo cargar el balance." />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`balance` y `decimals` de `useTokenBalance()` son computed refs de solo lectura; elimina cualquier asignación a ellos.

#### 5. Eliminar imports legacy de web3

Elimina cualquier import restante de `@vue-solana/*/web3` y las dependencias de `@solana/web3-compat` (no existen en v3).

## Migración: de v1.x a v2.0.0

Vue Solana v2.0.0 pasó de `@solana/web3-compat` a `@solana/kit` como superficie de API principal. Esto es un cambio incompatible para apps en v1.x.

### ¿Qué ha cambiado?

- **API solo Kit**: `@solana/web3-compat` se elimina de todos los paquetes. El contexto ya no lleva `connection` y se eliminan los subpaths `web3`.
- **Cambios de tipos**: `SolanaWallet.publicKey` ahora es un string base58 `Address` plano (no una clase `PublicKey`).
- **Cambios en composables**: `useConnection()` fue reemplazado por `useSolanaClient()`. `useRpc()` ahora devuelve el estado del clúster más el cliente Kit inyectado.
- **Tipos numéricos**: Los resultados RPC como lamports, slots y alturas de bloque son `bigint`. Los datos de cuenta son `Uint8Array` en lugar de `Buffer` en las salidas normalizadas de los composables.
- **Superficie de transacciones**: Helpers como `signAndSendTransaction` y `confirmTransactionSignature` ahora toman un cliente Kit en lugar de una `Connection`, y las entradas usan tipos de Kit.

### Cómo migrar

#### 1. Actualizar dependencias

```sh
pnpm add @vue-solana/vue@^2.0.0
# o
pnpm add @vue-solana/nuxt@^2.0.0
```

Elimina `@solana/web3-compat` de tus dependencias si está presente.

#### 2. Actualizar llamadas a la API

| Legacy                                                   | Reemplazo                                                                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Connection`, `new Connection(url)`                      | `client.rpc` de `createSolanaClient({ endpoint })` / `useSolanaClient()`                                             |
| `PublicKey`, `new PublicKey(s)`, `.toBase58()`           | `Address` vía `address(s)`                                                                                           |
| `Keypair`, `keypair.publicKey`                           | `generateKeyPairSigner()` de `@vue-solana/*/kit`; `.address` del signer                                              |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` de `@solana-program/system`                                                              |
| operaciones con `LAMPORTS_PER_SOL`                       | `lamports()` de `@vue-solana/*/kit`                                                                                  |
| `sendAndConfirmTransaction`                              | Usa planificación de transacciones de Kit; para flujos firmados por wallet usa `signAndSendTransaction(client, ...)` |
| `requestAirdrop` (devnet)                                | `client.airdrop()`                                                                                                   |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()` (devuelve `bigint`)                                                              |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                                                           |
| `useConnection()`                                        | `useSolanaClient()`                                                                                                  |
| `parsePublicKey(value)`                                  | `parseAddress(value)` de `@vue-solana/core/address`                                                                  |

#### 3. Actualizar ejemplos de código

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. Limpiar

Elimina todos los imports de `@vue-solana/*/web3`, elimina `@solana/web3-compat` de `package.json` y borra cualquier shim `.d.ts` local que hayas añadido para web3-compat. También elimina `buffer-polyfill` si solo lo necesitabas para rutas de transacción legacy de web3-compat.

### Notas

- El `client.rpc` de Kit usa valores predeterminados por llamada para `commitment` en lugar del valor de configuración. Pasa `commitment` explícitamente si es necesario: `rpc.getBalance(account, { commitment: "confirmed" }).send()`.
- Para código independiente del framework, usa `createSolanaClient()` de `@vue-solana/core/kit`.
