---
title: "@vue-solana/core"
description: Configuracion Solana independiente del framework, RPC, tipos de wallet y helpers de transaccion.
ogSection: Paquetes
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) contiene primitivas Solana independientes del framework usadas por los paquetes Vue Solana.

Usa este paquete directamente cuando quieras helpers de conexion, tipos de wallet compartidos, helpers de registro de Android Mobile Wallet Adapter, helpers de wallet de navegador iOS y helpers de transaccion sin instalar el plugin de Vue.

`@vue-solana/core` envuelve `@solana/web3-compat` y reexporta las primitivas Solana que necesitan la mayoria de apps Vue Solana, incluidas `Connection`, `PublicKey`, `Transaction` y `VersionedTransaction`.

## Instalar

```sh
pnpm add @vue-solana/core
```

## Inicio rapido

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({
  cluster: "devnet",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

La exportacion raiz sigue estando soportada. Tambien hay exportaciones directas por subruta para imports mas especificos:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import { PublicKey, Transaction } from "@vue-solana/core/web3";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Subrutas directas:

- `@vue-solana/core/address`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/web3`

## Guias relacionadas

- [RPC and Clusters](/guides/rpc-and-clusters): configura nombres de cluster, endpoints RPC personalizados, endpoints WebSocket y helpers de conexion.
- [Wallets](/guides/wallets): descubre wallets Wallet Standard, registra fuentes de wallet movil y comprueba capacidades de wallet.
- [Transactions](/guides/transactions): firma, envia, confirma y maneja timeouts de transaccion de forma segura.
- [Errors](/guides/errors): ramifica con codigos `SolanaError` estables y evita mostrar causas sin procesar en UI para usuarios.

## Configuracion

```ts
type SolanaCluster = "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
}
```

Los clusters soportados son `mainnet-beta`, `testnet`, `devnet` y `localnet`. Los helpers de wallet usan identificadores de cadena Wallet Standard como `solana:devnet`, derivados de los clusters por `getSolanaChain()`. Si se omite `endpoint`, el paquete usa el endpoint RPC publico de Solana para el cluster seleccionado. Si se omite `wsEndpoint`, se deriva del endpoint RPC.

`autoConnect` usa `false` por defecto. Cuando se activa mediante el plugin de Vue o el modulo Nuxt, Vue Solana reconecta solo una identidad de wallet que el usuario selecciono antes y que se descubre otra vez en el cliente. Solo guarda metadatos de identidad de wallet en `localStorage["vue-solana:selected-wallet"]`: `name`, y `platform`/`source` cuando estan disponibles. Nunca guarda claves privadas, datos de sesion ni datos de transaccion, y nunca conecta una wallet instalada arbitraria.

Usa `mainnet-beta` para la mainnet de Solana. Este es el nombre oficial del cluster de Solana; el paquete intencionalmente no usa `mainnet` como alias.

## Contexto

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  connection: Connection;
}
```

## Interfaz de wallet

```ts
interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: <T extends SolanaTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends SolanaTransaction>(transactions: T[]) => Promise<T[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendOptions,
  ) => Promise<{ signature: TransactionSignature }>;
}
```

Las wallets de navegador descubiertas mediante Solana Wallet Standard y los enlaces soportados de wallets de navegador iOS se adaptan a esta interfaz. Tambien puedes proporcionar un objeto personalizado que implemente `SolanaWallet`. Una wallet descubierta permanece desconectada hasta que `connect()` se resuelve correctamente, incluso si la extension del navegador expone cuentas autorizadas previamente.

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

- Las wallets de extension de navegador usan `platform: "browser"` y `source: "wallet-standard"`.
- Android Mobile Wallet Adapter usa `platform: "mobile"` y `source: "mobile-wallet-adapter"`.
- Las wallets de navegador iOS usan `platform: "mobile"` y `source: "deep-link"`.
- `protocol-link` esta reservado para posibles adaptadores de wallet nativa de escritorio posteriores a v1.

## Helpers de Wallet Standard

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` es el identificador de cadena Wallet Standard usado por el descubrimiento de wallets, el registro de wallets moviles, los enlaces de wallet iOS y las opciones de firma del adaptador de wallet. Usa `getSolanaChain(cluster)` cuando necesites derivarlo desde un cluster Solana configurado.

- `getSolanaChain(cluster)`: asigna `mainnet-beta`, `devnet`, `testnet` o `localnet` a un ID de cadena Solana Wallet Standard.
- `isSolanaStandardWallet(wallet)`: comprueba si una wallet Wallet Standard soporta Solana.
- `getRegisteredSolanaWallets()`: devuelve wallets Solana Wallet Standard descubiertas en entornos de navegador, incluido Android Mobile Wallet Adapter despues de registrarlo en clientes soportados.
- `subscribeSolanaWallets(listener)`: se suscribe a eventos de registro/anulacion de registro de Wallet Standard.
- `adaptSolanaStandardWallet(walletInfo, options?)`: adapta una wallet Wallet Standard descubierta a `SolanaWallet`.

## Helpers de wallet movil

- `registerSolanaMobileWallet(options?)`: registra Android Mobile Wallet Adapter mediante Wallet Standard en clientes Android Chrome soportados.
- `isSolanaMobileWalletSupported()`: devuelve si el runtime actual soporta registro web Android MWA.
- `getDefaultMobileWalletAppIdentity()`: deriva una identidad de app Mobile Wallet Adapter por defecto desde el documento actual.
- `getSolanaIosWallets(options?)`: devuelve entradas de wallet de navegador iOS para Phantom, Solflare y Backpack en navegadores iOS.
- `adaptSolanaIosWallet(walletInfo, options?)`: adapta una entrada de wallet iOS con deep link a `SolanaWallet`.
- `handleSolanaIosWalletCallback(options?)`: valida y descifra callbacks de redireccion de wallet iOS.
- `isSolanaIosBrowserWalletSupported()`: devuelve si el runtime actual deberia exponer enlaces de wallet de navegador iOS.

Estos helpers son seguros para SSR. El registro de Android devuelve sin registrar cuando `window` no esta disponible o cuando el navegador no es un runtime web movil/PWA de Android Chrome. El descubrimiento de wallets iOS devuelve una lista vacia cuando el navegador no es un runtime de navegador iOS.

## Helpers

La exportacion raiz `@vue-solana/core` reexporta los helpers publicos siguientes. Usa subrutas directas cuando quieras imports mas especificos o limites de modulo mas claros.

| Ruta de import                     | Que contiene                                                                   | Usalo cuando                                                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/address`         | `parsePublicKey()` y tipos de entrada de clave publica.                        | Aceptas una direccion Solana como string, `PublicKey`, objeto tipo ref o getter y necesitas un `PublicKey` normalizado.     |
| `@vue-solana/core/clusters`        | Helpers de cluster y endpoint por defecto.                                     | Necesitas el endpoint RPC o WebSocket integrado del paquete para `mainnet-beta`, `testnet`, `devnet` o `localnet`.          |
| `@vue-solana/core/errors`          | `SolanaError`, fabricas de error y guards de error.                            | Necesitas codigos de error estables para fallos de wallet, RPC, direccion, transaccion, timeout o storage en UI de usuario. |
| `@vue-solana/core/ios-wallet`      | Descubrimiento de wallets de navegador iOS, adaptadores deep-link y callbacks. | Estas conectando enlaces de wallet iOS sin el flujo unificado de wallets del plugin de Vue.                                 |
| `@vue-solana/core/mobile-wallet`   | Helpers de registro de Android Mobile Wallet Adapter.                          | Necesitas registrar Android MWA antes de leer wallets Wallet Standard.                                                      |
| `@vue-solana/core/rpc`             | `createSolanaConnection()` y `createSolanaContext()`.                          | Quieres una `Connection` configurada y endpoints de cluster resueltos sin instalar el plugin de Vue.                        |
| `@vue-solana/core/timeout`         | Helpers de timeout de Promise que producen errores de timeout Solana.          | Necesitas comportamiento de timeout coherente con los helpers de confirmacion de transaccion.                               |
| `@vue-solana/core/transaction`     | Helpers de envio y confirmacion de transacciones.                              | Necesitas una ruta de envio consciente de wallet o un resultado de confirmacion para una firma existente.                   |
| `@vue-solana/core/types`           | Tipos TypeScript compartidos.                                                  | Necesitas `SolanaConfig`, `SolanaContext`, `SolanaWallet`, metadatos de wallet o tipos de opciones de transaccion.          |
| `@vue-solana/core/wallet`          | Aserciones de estado de wallet y errores de capacidad de wallet.               | Necesitas validar que una wallet seleccionada esta conectada o soporta firma antes de llamar metodos de wallet.             |
| `@vue-solana/core/wallet-standard` | Mapeo de cadenas Wallet Standard, descubrimiento, suscripciones y adaptadores. | Estas creando tu propia capa de descubrimiento de wallets sobre Solana Wallet Standard.                                     |

### Clusters y RPC

- `DEFAULT_CLUSTER`: cluster por defecto, actualmente `devnet`.
- `getClusterEndpoint(cluster?)`: devuelve el endpoint HTTP RPC para un cluster.
- `getClusterWebSocketEndpoint(cluster?)`: devuelve el endpoint WebSocket para un cluster.
- `getWebSocketEndpoint(endpoint)`: convierte URLs RPC `http`/`https` a URLs `ws`/`wss`.
- `createSolanaConnection(config?)`: crea una `Connection` usando el endpoint y commitment resueltos.
- `createSolanaContext(config?)`: crea `{ cluster, endpoint, wsEndpoint, connection }` para configuracion de app independiente del framework.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.connection.getSlot();
```

### Direcciones

- `parsePublicKey(value)`: analiza un `PublicKey`, string de direccion, valor tipo ref o getter, y devuelve `null` para entrada nula o indefinida.

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");
const balance = publicKey ? await connection.getBalance(publicKey) : null;
```

### Wallets

- `isWalletConnected(wallet)`: comprueba si una wallet esta conectada y tiene una clave publica.
- `assertWalletConnected(wallet)`: lanza `WALLET_NOT_CONNECTED` si la wallet no esta conectada.
- `assertWalletCanSign(wallet)`: lanza si la wallet esta desconectada o no soporta `signTransaction`.
- `assertWalletCanSignMessage(wallet)`: lanza si la wallet esta desconectada o no soporta `signMessage`.

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### Transacciones

- `signAndSendTransaction(connection, wallet, transaction, options?)`: firma y envia una transaccion usando una wallet configurada y devuelve la firma RPC. Las wallets Android Mobile Wallet Adapter usan `signTransaction` mas `connection.sendRawTransaction()` cuando esta disponible para que la app controle el envio y pueda devolver de forma fiable la firma RPC despues del traspaso a la wallet.
- `confirmTransactionSignature(connection, signature, options?)`: espera a que una firma enviada alcance un commitment solicitado. Usa por defecto commitment `confirmed` y un timeout de 60 segundos.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction);
await confirmTransactionSignature(connection, signature, { commitment: "confirmed" });
```

### Errores y timeouts

- `SolanaError`: clase de error normalizada con un `code` estable y una `cause` original opcional.
- `createSolanaError(code, message, options?)`: crea un error Solana normalizado.
- `isSolanaError(error)`: estrecha errores desconocidos a `SolanaError`.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: convierte fallos desconocidos en `SolanaError` y mapea rechazos comunes de wallet a `USER_REJECTED`.
- `withTimeout(promise, timeoutMs, createError)`: compite una promise contra un error de timeout proporcionado por el llamador.
- `withSolanaTimeout(promise, timeoutMs, message)`: compite una promise contra un error `TRANSACTION_TIMEOUT`.

## Modelo de error

Vue Solana normaliza fallos comunes de wallet, RPC, direccion, transaccion y storage en `SolanaError`. Las apps deberian ramificar con el valor estable `error.code` en vez de analizar mensajes de adaptadores o RPC.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(connection, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // El usuario rechazo un prompt de wallet.
        break;
      case "TRANSACTION_TIMEOUT":
        // La operacion agoto el tiempo; comprueba el estado de la firma antes de reintentar.
        break;
      case "RPC_FAILURE":
        // RPC o confirmacion fallo.
        console.error(error.cause);
        break;
    }
  }
}
```

Los codigos de error estables son:

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `USER_REJECTED`
- `INVALID_ADDRESS`
- `TRANSACTION_TIMEOUT`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` conserva el error original del adaptador de wallet, RPC, analisis o storage para depuracion. No muestres detalles sin procesar de `cause` a usuarios finales a menos que la app confie explicitamente en esa fuente.

## Problema conocido de TypeScript

Consulta [Troubleshooting](/troubleshooting) para el problema de metadatos TypeScript de `@solana/web3-compat@0.0.21`. Los paquetes actuales de `@vue-solana/core` publican shims temporales de declaraciones para las rutas de import core documentadas.
