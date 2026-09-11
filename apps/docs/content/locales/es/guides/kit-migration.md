---
title: "Migración a Kit"
description: Migra de la API legacy de conexión web3-compat a @solana/kit paso a paso.
ogSection: Guias
surroundOrder: 7
---

Vue Solana está migrando de `@solana/web3-compat` a `@solana/kit`. Esta guía explica por qué, qué cambia en cada versión y cómo migrar tu app de Vue o Nuxt. Está escrita para apps que usan la API v1.1.0 actual, así que puedes seguirla hoy en la versión de soporte dual y terminar antes de que llegue v2.0.0.

## Por Qué Migrar

`@solana/web3-compat` está superado. La guía oficial de Solana indica que las apps nuevas se construyan directamente sobre `@solana/kit` y sus plugins (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`). `web3-compat` existe únicamente como una vía de interoperabilidad legacy. Dos problemas concretos motivaron el cambio:

- `@solana/web3-compat@0.0.21` distribuye metadatos de TypeScript rotos, lo que obliga a usar shims `.d.ts` locales y del paquete además de un script de declaraciones posterior al build.
- La API de clases `Connection` / `PublicKey` / `Transaction` es la forma legacy. El ecosistema de Solana se ha movido a `Address`, codecs, clientes plugin y el planificador de transacciones. Seguir en `web3-compat` hacía que `@vue-solana/*` se sintiera anticuado y empujaba una segunda migración a cada usuario.

Kit también aporta el beneficio de la modularidad: importas solo las piezas que usas. En v1.x eso significa `useSolanaClient()` y los subpaths `@vue-solana/*/kit`; después de v2 los subpaths legacy `web3` y la `Connection` legacy desaparecen por completo.

## Cronología

| Versión           | Qué cambia                                                                                                                                                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (actual)** | Soporte dual. `connection`, los subpaths `web3` y todos los helpers legacy siguen funcionando igual. Se añade la superficie Kit: `createSolanaClient()`, los subpaths `@vue-solana/*/kit` y `useSolanaClient()`. Los helpers legacy se marcan `@deprecated` en las definiciones de tipos. |
| **v2.0.0**        | Solo Kit. `@solana/web3-compat` se elimina de todos los paquetes. El contexto ya no lleva `connection` y se borran los subpaths `web3`. `useRpc()` se convierte en el composable de RPC de Kit y la wallet expone `publicKey: Address`.                                                   |

Migra durante la ventana v1.x: ambas API funcionan, así que puedes moverte paso a paso y seguir publicando.

## Mapa de Migración

La tabla siguiente asigna cada símbolo legacy a su reemplazo de Kit.

| Legacy                                                                         | Reemplazo de Kit                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                                   | `client.rpc` / `useSolanaClient()`                                                                                                                                                     |
| `new Connection(url)`                                                          | `client.rpc` de `createSolanaClient({ endpoint: url })`                                                                                                                                |
| `PublicKey`                                                                    | `Address` (`address("...")`)                                                                                                                                                           |
| `new PublicKey(s)` / `.toBase58()`                                             | `address(s)` — los strings base58 ya tienen forma de `Address`                                                                                                                         |
| `Keypair` / `Keypair.generate()`                                               | `generateKeyPairSigner()` de `@solana/kit`, o las variantes de `@solana/kit-plugin-signer` (`signer`, `payer`, `identity`, `generated*`, `generated*WithSol`, `*FromFile`, `airdrop*`) |
| `keypair.publicKey`                                                            | `.address` del signer                                                                                                                                                                  |
| `SystemProgram.transfer`                                                       | `getTransferSolInstruction` de `@solana-program/system`                                                                                                                                |
| operaciones con `LAMPORTS_PER_SOL`                                             | `lamports()` de `@solana/kit`                                                                                                                                                          |
| `sendAndConfirmTransaction`                                                    | `client.sendTransaction([...])` devuelve `{ context: { signature } }`; los lotes usan `client.sendTransactions`                                                                        |
| airdrop en devnet vía `requestAirdrop`                                         | `client.airdrop` (habilitado por `solanaDevnetRpc()` / `airdropSigner`)                                                                                                                |
| `Transaction` / `VersionedTransaction`                                         | builders de instrucciones y mensajes de Kit                                                                                                                                            |
| `connection.getBalance`                                                        | `client.rpc.getBalance(...).send()` — devuelve lamports como `bigint`                                                                                                                  |
| `getTokenAccountsByOwner` / `getTokenBalance` / helpers de `@solana/spl-token` | lecturas del plugin `@solana-program/token` vía `client.rpc`                                                                                                                           |
| `connection.confirmTransaction` / `getSignatureStatuses`                       | helpers de confirmación de transacción de Kit / `client.rpc.getSignatureStatuses(...).send()`                                                                                          |
| flujos wallet-standard                                                         | puente al signer de Kit (la wallet conectada se adapta a un `Signer`)                                                                                                                  |

A qué se corresponden los helpers actuales hoy:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient().rpc`
- `useRpc()` → `useSolanaClient().rpc` (el significado de `useRpc()` cambia en v2)
- `parsePublicKey(value)` → `address(value)`
- `signAndSendTransaction(...)` / `confirmTransactionSignature(...)` → `client.sendTransaction([...])` y `client.rpc.getSignatureStatuses(...).send()`
- `getTokenAccountsByOwner(...)` y compañía → lecturas de `@solana-program/token`

## Actualizar una App de Vue

### Paso 1: Actualiza a v1.x

```sh
pnpm add @vue-solana/vue@^1.2.0
```

Tu app sigue compilando y ejecutándose sin cambios, porque el plugin sigue construyendo el contexto legacy y todos los composables existentes siguen funcionando.

### Paso 2: Cambia a la API de Kit

Las llamadas RPC de solo lectura pasan de la `connection` inyectada al cliente de Kit:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

Los helpers y tipos de Kit se re-exportan para que no necesites una segunda dependencia:

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

La dirección de la wallet conectada está disponible en la wallet en v1.x como `Address` de Kit:

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.address es `Address | undefined`
```

Para código independiente del framework, usa el paquete core directamente:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

No hay configuración de red ni shims: el endpoint se resuelve desde la misma configuración de clúster que la conexión legacy.

### Paso 3: Termina después de v2

Después de v2.0.0 elimina:

- todos los imports de `@vue-solana/vue/web3` y `@vue-solana/core/web3`,
- el uso de `useConnection()` (sustituido por `useSolanaClient().rpc`),
- `@solana/web3-compat` de tu `package.json`,
- los shims `.d.ts` locales que añadiste por los metadatos rotos de `web3-compat`,
- `buffer-polyfill` si solo lo importabas para rutas de transacción web3-compat.

Los subpaths `web3` ya no existen, así que el compilador te señalará cada referencia restante.

## Actualizar una App de Nuxt

### Paso 1: Actualiza a v1.x

```sh
pnpm add @vue-solana/nuxt@^1.2.0
```

### Paso 2: Cambia a la API de Kit

`useSolanaClient` se auto-importa:

```ts
const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send();
```

Los helpers de Kit están disponibles desde `@vue-solana/nuxt/kit`:

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";
```

### Paso 3: Termina después de v2

Elimina los imports de `@vue-solana/nuxt/web3`, las dependencias web3-compat y los shims locales. El módulo de Nuxt elimina las entradas `optimizeDeps` de web3-compat en v2.

## Notas Sobre Números Y Bytes En RPC

Los métodos RPC REST de Kit devuelven tipos nativos de JavaScript:

- Lamports, slots y alturas de bloque son `bigint`. `JSON.stringify` sobre `bigint` lanza un error; convierte con `Number(...)` o `toString()`.
- Los datos de cuenta son `Uint8Array`, no `Buffer`. El shim `@solana/buffer/` que quizá uses solo es necesario para rutas legacy de transacción.

## Nota De Puente (Opcional)

Si quieres la API clásica de clases durante la migración, `@solana/web3.js@rc` (v3) es la vía de actualización: `PublicKey` es un alias deprecado de `Address`, y un `Keypair` de v3 satisface estructuralmente el `KeyPairSigner` de Kit. Consulta la [guía oficial de migración web3.js v1 → v3](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).

## Relacionados

- [`RPC y Clusters`](/es/guides/rpc-and-clusters) — configuración de clúster y endpoints
- [`Primeros Pasos`](/es/getting-started) — instalación y primeras lecturas en devnet
- [`@vue-solana/core`](/es/packages/core), [`@vue-solana/vue`](/es/packages/vue), [`@vue-solana/nuxt`](/es/packages/nuxt) — referencia de paquetes
