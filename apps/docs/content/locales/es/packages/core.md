---
title: "@vue-solana/core"
description: Configuración Solana independiente del framework, RPC, tipos de wallet y helpers de transacción.
ogSection: Packages
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) contiene primitivas Solana independientes del framework usadas por los paquetes Vue Solana.

Usa este paquete directamente cuando quieras clientes Kit, helpers de endpoint, tipos de wallet compartidos, helpers de registro de Android Mobile Wallet Adapter, helpers de wallet de navegador iOS, lecturas de cuentas de token y helpers de transacción sin instalar el plugin de Vue.

`@vue-solana/core` se basa en el moderno [`@solana/kit`](https://www.npmjs.com/package/@solana/kit). `createSolanaClient()` y el subpath `@vue-solana/core/kit` reexportan primitivas de Kit. La API legacy `@solana/web3-compat` y el subpath `web3` se eliminaron en v2.0.0 — consulta [Kit Migration](/guides/kit-migration) para el mapa completo antes/después.

## Instalar

```sh
pnpm add @vue-solana/core
```

## Inicio rápido

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

También puedes crear un cliente Kit directamente:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()` devuelve `{ cluster, endpoint, wsEndpoint, client }`; el `client` lleva `client.rpc` y `client.rpcSubscriptions`.

La exportación raíz sigue estando soportada. También hay exportaciones directas por subpath para imports más específicos:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Subpaths directos:

- `@vue-solana/core/address`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/token-accounts`

## Guías relacionadas

- [RPC and Clusters](/guides/rpc-and-clusters): configura nombres de cluster, endpoints RPC personalizados, endpoints WebSocket y helpers de cliente.
- [Wallets](/guides/wallets): descubre wallets Wallet Standard, registra fuentes de wallet móvil y comprueba capacidades de wallet.
- [Transactions](/guides/transactions): firma, envía, confirma y maneja timeouts de transacción de forma segura.
- [Errors](/guides/errors): ramifica con códigos `SolanaError` estables y mantén las causas sin procesar fuera de la UI orientada al usuario.

## Configuración

```ts
type SolanaCluster = "mainnet-beta" | "mainnet" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  payer?: TransactionSigner;
  payerSecretKey?: string;
}
```

Los clusters soportados son `mainnet` (alias heredado `mainnet-beta`), `testnet`, `devnet` y `localnet`. Los helpers de wallet usan identificadores de cadena Wallet Standard como `solana:devnet`, derivados de los clusters por `getSolanaChain()`. Si se omite `endpoint`, el paquete usa el endpoint RPC público de Solana para el cluster seleccionado. Si se omite `wsEndpoint`, se deriva del endpoint RPC.

`autoConnect` usa `false` por defecto. Cuando se activa mediante el plugin de Vue o el módulo Nuxt, Vue Solana reconecta solo una identidad de wallet que el usuario seleccionó antes y que se descubre otra vez en el cliente. Solo guarda metadatos de identidad de wallet en `localStorage["vue-solana:selected-wallet"]`: `name`, y `platform`/`source` cuando están disponibles. Nunca guarda claves privadas, datos de sesión ni datos de transacción, y nunca conecta una wallet instalada arbitraria.

`payer` es un `TransactionSigner` de Kit que se usa como payer de comisiones y signer del cliente para transacciones enviadas por el cliente. `payerSecretKey` es un keypair Ed25519 de 64 bytes codificado en base64, con la secret key primero, y se resuelve como signer al crear el cliente. Ambos son compatibles con clientes core/Vue directos.

`createSolanaClient()` compone por defecto el stack oficial de `@solana/kit-plugin-rpc`: `solanaRpc()`, `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()`. El fallback custom anterior no se usa. El cliente expone lecturas y suscripciones RPC, `planTransaction(s)` y `sendTransaction(s)`. El executor oficial agrega un blockhash nuevo, maneja limites de recursos y preflight, firma con los signers disponibles, envia la transaccion y espera al commitment `confirmed` antes de resolver el envio. Un envio del cliente requiere un signer `payer`.

Nunca pongas un secreto crudo o `payerSecretKey` en la configuracion runtime publica de Nuxt. No envíes una clave de firma con fondos al navegador de un usuario final; usa un servidor o relayer, o un signer efimero sin fondos para demos.

Usa `mainnet` para la mainnet de Solana. Este es el nombre oficial del mainnet de Solana. La grafía heredada `mainnet-beta` sigue siendo aceptada y redirige al mismo endpoint `https://api.mainnet.solana.com`.

## Contexto

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` es un cliente de [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) creado por `createSolanaClient()` y expone `client.rpc`, `client.rpcSubscriptions`, `planTransaction(s)` y `sendTransaction(s)`.

## Interfaz de wallet

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: Signature }>;
}
```

Las wallets de navegador descubiertas mediante Solana Wallet Standard y los enlaces soportados de wallets de navegador iOS se adaptan a esta interfaz. También puedes proporcionar un objeto personalizado que implemente `SolanaWallet`. Una wallet descubierta permanece desconectada hasta que `connect()` se resuelve correctamente, incluso si la extensión del navegador expone cuentas autorizadas previamente.

`publicKey` es el `Address` de Kit codificado en base58 (un string) de la cuenta conectada. `SolanaTransaction` es `Uint8Array` — bytes de transacción en la red (wire) que la wallet firma tal cual; el byte inicial distingue las transacciones legacy de las versioned.

Android Mobile Wallet Adapter se registra mediante `@solana-mobile/wallet-standard-mobile` y luego se adapta con el mismo adaptador Wallet Standard.

## Metadatos de wallet

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly SolanaWalletAccountInfo[];
  wallet: unknown;
}
```

Valores de metadatos actuales:

- Las wallets de extensión de navegador usan `platform: "browser"` y `source: "wallet-standard"`.
- Android Mobile Wallet Adapter usa `platform: "mobile"` y `source: "mobile-wallet-adapter"`.
- Las wallets de navegador iOS usan `platform: "mobile"` y `source: "deep-link"`.
- `protocol-link` está reservado para posibles adaptadores futuros de wallet nativa de escritorio.

## Helpers de Wallet Standard

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` es el identificador de cadena Wallet Standard usado por el descubrimiento de wallets, el registro de wallets móviles, los enlaces de wallet iOS y las opciones de firma del adaptador de wallet. Usa `getSolanaChain(cluster)` cuando necesites derivarlo desde un cluster Solana configurado.

- `getSolanaChain(cluster)`: asigna `mainnet-beta` o `mainnet`, `devnet`, `testnet` o `localnet` a un ID de cadena Solana Wallet Standard.
- `isSolanaStandardWallet(wallet)`: comprueba si una wallet Wallet Standard soporta Solana.
- `getRegisteredSolanaWallets()`: devuelve wallets Solana Wallet Standard descubiertas en entornos de navegador, incluido Android Mobile Wallet Adapter después de registrarlo en clientes soportados.
- `subscribeSolanaWallets(listener)`: se suscribe a eventos de registro/anulación de registro de Wallet Standard.
- `adaptSolanaStandardWallet(walletInfo, options?)`: adapta una wallet Wallet Standard descubierta a `SolanaWallet`.

## Helpers de wallet móvil

- `registerSolanaMobileWallet(options?)`: registra Android Mobile Wallet Adapter mediante Wallet Standard en clientes Android Chrome soportados.
- `isSolanaMobileWalletSupported()`: devuelve si el runtime actual soporta registro web Android MWA.
- `getDefaultMobileWalletAppIdentity()`: deriva una identidad de app Mobile Wallet Adapter por defecto desde el documento actual.
- `getSolanaIosWallets(options?)`: devuelve entradas de wallet de navegador iOS para Phantom, Solflare y Backpack en navegadores iOS.
- `adaptSolanaIosWallet(walletInfo, options?)`: adapta una entrada de wallet iOS con deep link a `SolanaWallet`.
- `handleSolanaIosWalletCallback(options?)`: valida y descifra callbacks de redirección de wallet iOS.
- `isSolanaIosBrowserWalletSupported()`: devuelve si el runtime actual debería exponer enlaces de wallet de navegador iOS.

Estos helpers son seguros para SSR. El registro de Android devuelve sin registrar cuando `window` no está disponible o cuando el navegador no es un runtime web móvil/PWA de Android Chrome. El descubrimiento de wallets iOS devuelve una lista vacía cuando el navegador no es un runtime de navegador iOS.

## Helpers

La exportación raíz `@vue-solana/core` reexporta los helpers públicos siguientes. Usa subpaths directos cuando quieras imports más específicos o límites de módulo más claros.

| Import path                        | Qué contiene                                                                                                                      | Úsalo cuando                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/address`         | `parseAddress()` y tipos de entrada de dirección.                                                                                 | Aceptas una dirección Solana como string, objeto tipo ref o getter y necesitas un `Address` validado y normalizado.              |
| `@vue-solana/core/clusters`        | Helpers de cluster y endpoint por defecto.                                                                                        | Necesitas el endpoint RPC o WebSocket integrado del paquete para `mainnet`, `mainnet-beta`, `testnet`, `devnet` o `localnet`.    |
| `@vue-solana/core/errors`          | `SolanaError`, fábricas de error y guards de error.                                                                               | Necesitas códigos de error estables para fallos de wallet, RPC, dirección, transacción, timeout o storage orientados al usuario. |
| `@vue-solana/core/ios-wallet`      | Descubrimiento de wallets de navegador iOS, adaptadores deep-link y callbacks.                                                    | Estás conectando enlaces de wallet iOS sin el flujo unificado de wallets del plugin de Vue.                                      |
| `@vue-solana/core/kit`             | `createSolanaClient()` y las reexportaciones de `@solana/kit` (`Address`, `address`, `lamports`, `SolanaRpcApi`, `SolanaClient`). | Quieres la API Kit moderna sin el grafo completo de dependencias de `@solana/kit`.                                               |
| `@vue-solana/core/mobile-wallet`   | Helpers de registro de Android Mobile Wallet Adapter.                                                                             | Necesitas registrar Android MWA antes de leer wallets Wallet Standard.                                                           |
| `@vue-solana/core/rpc`             | `createSolanaContext()`.                                                                                                          | Quieres un cliente Kit configurado y endpoints de cluster resueltos sin instalar el plugin de Vue.                               |
| `@vue-solana/core/timeout`         | Helpers de timeout de Promise que producen errores de timeout Solana.                                                             | Necesitas comportamiento de timeout coherente con los helpers de confirmación de transacción.                                    |
| `@vue-solana/core/transaction`     | Helpers de envío y confirmación de transacciones.                                                                                 | Necesitas una ruta de envío consciente de wallet o un resultado de confirmación para una firma existente.                        |
| `@vue-solana/core/token-accounts`  | Lecturas de cuenta SPL Token sin estado (`getTokenAccountsByOwner`, `getTokenAccount`, `getTokenBalance`).                        | Necesitas lecturas de cuenta de token o balance mediante la API `jsonParsed` del RPC Kit.                                        |
| `@vue-solana/core/types`           | Tipos TypeScript compartidos.                                                                                                     | Necesitas `SolanaConfig`, `SolanaContext`, `SolanaWallet`, metadatos de wallet o tipos de opciones de transacción.               |
| `@vue-solana/core/wallet`          | Aserciones de estado de wallet y errores de capacidad de wallet.                                                                  | Necesitas validar que una wallet seleccionada está conectada o soporta firma antes de llamar métodos de wallet.                  |
| `@vue-solana/core/wallet-standard` | Mapeo de cadenas Wallet Standard, descubrimiento, suscripciones y helpers de adaptador.                                           | Estás creando tu propia capa de descubrimiento de wallets sobre Solana Wallet Standard.                                          |

### Clusters y RPC

- `DEFAULT_CLUSTER`: cluster por defecto, actualmente `devnet`.
- `getClusterEndpoint(cluster?)`: devuelve el endpoint HTTP RPC para un cluster.
- `getClusterWebSocketEndpoint(cluster?)`: devuelve el endpoint WebSocket para un cluster.
- `getWebSocketEndpoint(endpoint)`: convierte URLs RPC `http`/`https` a URLs `ws`/`wss`.
- `createSolanaClient(config?)`: crea un cliente de `@solana/kit` cuyo `rpc` está conectado al endpoint resuelto y a las suscripciones WebSocket, con el planner y el executor de envio de transacciones oficiales instalados por defecto.
- `createSolanaContext(config?)`: crea `{ cluster, endpoint, wsEndpoint, client }` para configuración de app independiente del framework.

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

El equivalente con `createSolanaContext`:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

El subpath `@vue-solana/core/kit` exporta todo lo que la mayoría de apps necesitan de `@solana/kit` sin instalarlo directamente:

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)`: construye un cliente Kit para el `SolanaConfig` dado. Reutiliza la resolución de endpoint de `clusters.ts`, conecta `rpcSubscriptionsUrl` desde el endpoint WebSocket resuelto e instala por defecto el planner y el executor oficiales de envio de transacciones RPC.
- `client.rpc` expone la API completa de lectura de Solana (`getSlot`, `getBalance`, `getBlockHeight`, `getSignatureStatuses` y más) como funciones RPC llamadas con `.send()`.
- `address(value)`: valida y devuelve un `Address` (marca de string base58) — el reemplazo de Kit para `new PublicKey(...)`.
- `lamports(value: bigint)`: devuelve un valor `Lamports` — el reemplazo de Kit para números de lamports sin procesar.
- Types: `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`.

Los resultados numéricos de RPC son `bigint`, y los datos de cuenta son `Uint8Array` en vez de `Buffer`. Consulta [Kit Migration](/guides/kit-migration) para más detalles.

### Acciones

`createSolanaActionStore()` envuelve cualquier función asíncrona que reciba un `AbortSignal` nuevo por llamada en una máquina de estados de acciones con abort-on-redispatch. El composable de Vue `useAction()` se construye sobre este store; `isSolanaActionAborted()` detecta llamadas canceladas o superadas.

### Direcciones

- `parseAddress(value)`: analiza un string de dirección, valor tipo ref o getter, y devuelve `null` para entrada nullish. Lanza `INVALID_ADDRESS` para un string base58 inválido. Acepta valores `Address` sin cambios.

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
```

### Wallets

- `isWalletConnected(wallet)`: comprueba si una wallet está conectada y tiene una clave pública.
- `assertWalletConnected(wallet)`: lanza `WALLET_NOT_CONNECTED` si la wallet no está conectada.
- `assertWalletCanSign(wallet)`: lanza si la wallet está desconectada o no soporta `signTransaction`.
- `assertWalletCanSignMessage(wallet)`: lanza si la wallet está desconectada o no soporta `signMessage`.

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### Transacciones

- `signAndSendTransaction(client, wallet, transaction, options?)`: firma y envía bytes de transacción en la red (wire) usando una wallet configurada y devuelve la firma RPC. Se delega en las wallets que exponen `signAndSendTransaction`; en caso contrario, la transacción se firma con `wallet.signTransaction` y se envía mediante `client.rpc.sendTransaction(...).send()`. Las wallets Android Mobile Wallet Adapter prefieren firma más envío RPC del lado de la app para que la app controle el envío y devuelva de forma fiable la firma RPC después del traspaso a la wallet.
- `confirmTransactionSignature(client, signature, options?)`: espera a que una firma enviada alcance un commitment solicitado. Usa por defecto commitment `confirmed`, timeout de 60 segundos y sondeo de `client.rpc.getSignatureStatuses([signature]).send()`.

El flujo de envio del cliente es separado de este helper consciente de wallet. El cliente expone `sendTransaction()` y `sendTransactions()` mediante el `rpcTransactionPlanSendingExecutor()` oficial instalado por `createSolanaClient()`; los composables de Vue envuelven esos metodos. Planifican, firman, envian y esperan `confirmed`; el estado `sent` se establece solo cuando termina la operacion de envio y confirmacion. El resultado simple expone la firma en `data.context.signature`, y el resultado batch contiene el arbol completo del plan. El sender oficial no muestra popup de wallet.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL Token

Las lecturas de token usan la API `jsonParsed` del RPC Kit — sin dependencia de `@solana/spl-token`.

- `getTokenAccountsByOwner(client, owner, options?)`: devuelve todas las cuentas SPL Token y Token-2022 de un propietario como `TokenAccountInfo[]` (`{ address, mint, owner, amount: bigint, decimals, state, isNative }`). Pasa `programId` para limitar a un solo programa.
- `getTokenAccount(client, address, commitment?)`: devuelve una sola cuenta de token analizada (`TokenAccountInfo | null`). Devuelve `null` cuando la cuenta no existe o no es una cuenta de token.
- `getTokenBalance(client, mint, owner, commitment?)`: lee la cuenta de token del propietario para el mint dado y devuelve `{ amount, decimals }`. Devuelve `null` cuando no existe una cuenta de token.

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### Errores y timeouts

- `SolanaError`: clase de error normalizada con un `code` estable y una `cause` original opcional.
- `createSolanaError(code, message, options?)`: crea un error Solana normalizado.
- `isSolanaError(error)`: estrecha errores desconocidos a `SolanaError`.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: convierte fallos desconocidos en `SolanaError` y mapea rechazos comunes de wallet a `USER_REJECTED`.
- `withTimeout(promise, timeoutMs, createError)`: compite una promise contra un error de timeout proporcionado por el llamador.
- `withSolanaTimeout(promise, timeoutMs, message)`: compite una promise contra un error `TRANSACTION_TIMEOUT`.

## Modelo de error

Vue Solana normaliza fallos comunes de wallet, RPC, dirección, transacción y storage en `SolanaError`. Las apps deberían ramificar con el valor estable `error.code` en vez de analizar mensajes de adaptadores o RPC.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // El usuario rechazó un prompt de wallet.
        break;
      case "TRANSACTION_TIMEOUT":
        // La operación agotó el tiempo; comprueba el estado de la firma antes de reintentar.
        break;
      case "RPC_FAILURE":
        // RPC o confirmación falló.
        console.error(error.cause);
        break;
    }
  }
}
```

Los códigos de error estables son:

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `USER_REJECTED`
- `INVALID_ADDRESS`
- `TRANSACTION_TIMEOUT`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` conserva el error original del adaptador de wallet, RPC, análisis o storage para depuración. No muestres detalles sin procesar de `cause` a usuarios finales a menos que la app confíe explícitamente en esa fuente.

## Buffer Polyfill

El código de navegador que serializa transacciones Solana puede necesitar un global `Buffer` compatible con Node. Inicialízalo antes del código de transacción con `installSolanaBufferPolyfill()` desde `@vue-solana/core/buffer-polyfill`. El único shim de tipos que queda dentro del paquete cubre el subpath `buffer/` de navegador del que importa este polyfill.
