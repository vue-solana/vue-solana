---
title: "Migración a Kit"
description: Cómo migrar una app de Vue o Nuxt de la API legacy de web3-compat a @solana/kit. v2.0.0 eliminó web3-compat por completo.
ogSection: Guias
surroundOrder: 7
---

Vue Solana migró de `@solana/web3-compat` a `@solana/kit` en v2.0.0. Esta guía explica por qué se hizo el cambio, cuáles son los equivalentes de Kit para cada símbolo legacy y cómo migrar una app de Vue o Nuxt que todavía está en la superficie v1.x.

## Por Qué Migrar

`@solana/web3-compat` está superado. La guía oficial de Solana indica que las apps nuevas se construyan directamente sobre `@solana/kit` y sus plugins (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`). `web3-compat` existe únicamente como una vía de interoperabilidad legacy. Dos problemas concretos motivaron el cambio:

- `@solana/web3-compat@0.0.21` distribuye metadatos de TypeScript rotos, lo que obliga a usar shims `.d.ts` locales y del paquete además de un script de declaraciones posterior al build.
- La API de clases `Connection` / `PublicKey` / `Transaction` es la forma legacy. El ecosistema de Solana se ha movido a `Address`, codecs, clientes plugin y el planificador de transacciones. Seguir en `web3-compat` hacía que `@vue-solana/*` se sintiera anticuado y empujaba una segunda migración a cada usuario.

Kit también aporta el beneficio de la modularidad: importas solo las piezas que usas. En v2 los subpaths legacy `web3` y la `Connection` legacy desaparecen por completo; los paquetes son Kit-first y el contexto solo expone `client`.

## Cronología

| Versión              | Qué pasó                                                                                                                                                                                                                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x (previous)**  | Compatibilidad dual. `connection`, los subpaths `web3` y todos los helpers legacy siguen funcionando igual, mientras se añade la superficie Kit: `createSolanaClient()`, los subpaths `@vue-solana/*/kit` y `useSolanaClient()`. Los helpers legacy se marcan `@deprecated`. |
| **v2.0.0 (current)** | Solo Kit. `@solana/web3-compat` se elimina de todos los paquetes. El contexto ya no lleva `connection` y se borran los subpaths `web3`. `useRpc()` se convierte en el composable de RPC de Kit y la wallet expone `publicKey: Address`.                                      |

Migra actualizando a `^2.0.0`, resolviendo errores del compilador y eliminando los imports legacy que el compilador señala. El mapa completo de antes/después está a continuación.

## Mapa de Migración

La tabla siguiente asigna cada símbolo legacy a su reemplazo de Kit.

| Legacy                                                                         | Reemplazo de Kit                                                                                                                                                   |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Connection`                                                                   | `client.rpc` / `useSolanaClient()`                                                                                                                                 |
| `new Connection(url)`                                                          | `client.rpc` de `createSolanaClient({ endpoint: url })`                                                                                                            |
| `PublicKey`                                                                    | `Address` (`address("...")`)                                                                                                                                       |
| `new PublicKey(s)` / `.toBase58()`                                             | `address(s)` — los strings base58 ya tienen forma de `Address`                                                                                                     |
| `Keypair` / `Keypair.generate()`                                               | `generateKeyPairSigner()` de `@solana/kit`, o las variantes de `@solana/kit-plugin-signer` (`signer`, `payer`, `identity`, `generated*`, `airdrop*`)               |
| `keypair.publicKey`                                                            | `.address` del signer                                                                                                                                              |
| `SystemProgram.transfer`                                                       | `getTransferSolInstruction` de `@solana-program/system`                                                                                                            |
| operaciones con `LAMPORTS_PER_SOL`                                             | `lamports()` de `@solana/kit`                                                                                                                                      |
| `sendAndConfirmTransaction`                                                    | planificación de transacciones de Kit (executors del upstream `@solana/kit-plugin-rpc`); para flujos firmados por wallet usa `signAndSendTransaction(client, ...)` |
| airdrop en devnet vía `requestAirdrop`                                         | `client.airdrop` (upstream, habilitado por `solanaDevnetRpc()` / `airdropSigner`)                                                                                  |
| `Transaction` / `VersionedTransaction`                                         | constructores de instrucciones y mensajes de Kit; `SolanaTransaction` son bytes de la red (wire) serializados                                                      |
| `connection.getBalance`                                                        | `client.rpc.getBalance(...).send()` — devuelve lamports como `bigint`                                                                                              |
| `getTokenAccountsByOwner` / `getTokenBalance` / helpers de `@solana/spl-token` | `getTokenAccountsByOwner(client, ...)` / `getTokenBalance(client, ...)` de `@vue-solana/core/token-accounts` (lecturas Kit RPC `jsonParsed`)                       |
| `connection.confirmTransaction` / `getSignatureStatuses`                       | `confirmTransactionSignature(client, ...)` (polls `client.rpc.getSignatureStatuses(...).send()`)                                                                   |
| flujos wallet-standard                                                         | sin cambios — la adaptación del discovery de wallet-standard sigue siendo la base de `useWallets()` / `useWallet()`                                                |

> Algunas filas referencian plugins upstream de `@solana/kit` (signer, planner, system program). Vue Solana no los incluye; instálalos directamente desde el ecosistema de `@solana/kit` cuando los necesites.

A qué se corresponden los helpers después de v2:

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient()` (mantenido en v2 como alias deprecado que devuelve el cliente Kit)
- `useRpc()` → `solana.client` (el `useRpc()` de v2 devuelve estado del clúster más el `client` inyectado)
- `parsePublicKey(value)` → `parseAddress(value)` de `@vue-solana/core/address`
- `signAndSendTransaction(connection, ...)` / `confirmTransactionSignature(connection, ...)` → `signAndSendTransaction(client, ...)` / `confirmTransactionSignature(client, ...)`; el argumento `SolanaTransaction` ahora son bytes de la red (wire) serializados
- `getTokenAccountsByOwner(connection, ...)` y compañía → `getTokenAccountsByOwner(client, ...)` y lecturas basadas en `getTokenAccountsByOwner(client, ...)` que devuelven `TokenAccountInfo`

## Actualizar una App de Vue

### Paso 1: Actualiza a v2

```sh
pnpm add @vue-solana/vue@^2.0.0
```

El compilador ahora te señalará cada referencia legacy restante porque los subpaths `web3` ya no existen.

### Paso 2: Cambia a la API de Kit

Las llamadas RPC de solo lectura pasan de la `connection` inyectada al cliente Kit:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

Los helpers y tipos que fluyen a través de la API propia de Vue Solana (`address`, `lamports`, `Address`, `Commitment`, ...) se re-exportan:

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

Los constructores de mensajes no se re-exportan. Añade `@solana/kit` a tu propio `package.json` — el `node_modules` estricto de pnpm no sube la copia transitivity, así que no es importable a través de `@vue-solana/vue`. Las instrucciones de programa vienen de sus propios plugins, p. ej. `@solana-program/system` para `getTransferSolInstruction`.

La dirección de la wallet conectada es un string base58 `Address` plano:

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.publicKey is `Address | null`
```

Para código independiente del framework, usa el paquete core directamente:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

No hay configuración de red ni shims: el endpoint se resuelve desde la configuración de clúster, y `createSolanaContext()` ahora devuelve el mismo `client`.

### Paso 3: Elimina la superficie legacy

- todos los imports de `@vue-solana/vue/web3` y `@vue-solana/core/web3`,
- el uso de `useConnection()` (sustituido por `useSolanaClient()`),
- `@solana/web3-compat` de tu `package.json`,
- los shims `.d.ts` locales que añadiste por los metadatos rotos de `web3-compat`,
- `buffer-polyfill` si solo lo importabas para rutas de transacción web3-compat.

## Actualizar una App de Nuxt

### Paso 1: Actualiza a v2

```sh
pnpm add @vue-solana/nuxt@^2.0.0
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

Añade `@solana/kit` a tu propio `package.json` para la construcción de mensajes — el módulo de Nuxt solo re-exporta los helpers y tipos que fluyen a través de su propia API.

### Paso 3: Elimina la superficie legacy

Elimina los imports de `@vue-solana/nuxt/web3`, las dependencias web3-compat y los shims locales. El módulo de Nuxt eliminó las entradas `optimizeDeps` de web3-compat en v2.

## Notas Sobre Números Y Bytes En RPC

Los métodos RPC REST de Kit devuelven tipos nativos de JavaScript:

- Lamports, slots y alturas de bloque son `bigint`. `JSON.stringify` sobre `bigint` lanza un error; convierte con `Number(...)` o `toString()`.
- Los datos de cuenta obtenidos de `client.rpc` están codificados en base64; los composites de lectura de Vue Solana los normalizan a `Uint8Array`. El shim `buffer/` solo es necesario para el polyfill de Buffer usado por rutas de serialización de transacciones del navegador.
- El `client.rpc` de Kit no aplica el `commitment` de tu `SolanaConfig`; usa los valores predeterminados por llamada de Kit. Si dependes de un commitment personalizado, pásalo en cada llamada (p. ej. `rpc.getBalance(account, { commitment: "confirmed" }).send()`).

## Nota De Puente (Opcional)

Si quieres la API clásica de clases, `@solana/web3.js@rc` (v3) es la vía de actualización: `PublicKey` es un alias deprecado de `Address`, y un `Keypair` de v3 satisface estructuralmente el `KeyPairSigner` de Kit. Consulta la [guía oficial de migración web3.js v1 → v3](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).

## Relacionados

- [`RPC y Clusters`](/es/guides/rpc-and-clusters) — configuración de clúster y endpoints
- [`Primeros Pasos`](/es/getting-started) — instalación y primeras lecturas en devnet
- [`@vue-solana/core`](/es/packages/core), [`@vue-solana/vue`](/es/packages/vue), [`@vue-solana/nuxt`](/es/packages/nuxt) — referencia de paquetes
