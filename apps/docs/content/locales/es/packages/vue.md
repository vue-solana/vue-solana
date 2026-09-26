---
title: "@vue-solana/vue"
description: Plugin de Vue y composables para aplicaciones Solana.
ogSection: Packages
surroundOrder: 15
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) proporciona un plugin de Vue y composables para acceso RPC de Solana, lecturas de balance, estado de wallet y estado de helpers de transacción.

## Instalar

```sh
pnpm add @vue-solana/vue
```

Las apps de navegador que crean o serializan transacciones pueden inicializar el polyfill de Buffer desde `@vue-solana/vue/buffer-polyfill`.

## Configuración del plugin

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "Mi app Vue Solana",
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

El registro de Android Mobile Wallet Adapter está activado por defecto en clientes Android Chrome soportados. Pasa opciones `mobileWallet` para personalizar la identidad de app MWA, o pasa `mobileWallet: false` para desactivar el registro de wallet móvil Android.

Los enlaces de wallet de navegador iOS están activados por defecto en navegadores iOS para Phantom, Solflare y Backpack. Pasa opciones `iosWallet` para personalizar identidad de app, URL de redirección, cadenas o cluster, o pasa `iosWallet: false` para desactivar el descubrimiento de enlaces de wallet iOS.

También puedes pasar un endpoint RPC personalizado:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

Los clusters soportados son `mainnet` (alias heredado `mainnet-beta`), `devnet`, `testnet` y `localnet`. Usa `mainnet` para la mainnet de Solana; este es el nombre oficial del mainnet de Solana.

### Opciones del plugin

| Opcion           | Tipo                           | Default               | Descripcion                                                                                          |
| ---------------- | ------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `cluster`        | Solana cluster                 | `devnet`              | Cluster usado cuando se omite `endpoint`. `mainnet-beta` se acepta como alias heredado de `mainnet`. |
| `endpoint`       | `string`                       | Endpoint del cluster  | Endpoint RPC HTTP.                                                                                   |
| `wsEndpoint`     | `string`                       | Endpoint derivado     | Endpoint RPC WebSocket.                                                                              |
| `commitment`     | Commitment                     | Default de Kit        | Commitment por defecto para llamadas RPC.                                                            |
| `autoConnect`    | `boolean`                      | `false`               | Reconecta solo una wallet descubierta seleccionada previamente.                                      |
| `payer`          | `TransactionSigner`            | None                  | Payer de comisiones y signer del cliente para transacciones enviadas por el cliente.                 |
| `payerSecretKey` | `string`                       | None                  | Keypair Ed25519 de 64 bytes en base64, secret key primero, resuelto al crear el cliente.             |
| `wallet`         | `SolanaWallet`                 | Deshabilitado         | Adaptador de wallet personalizado.                                                                   |
| `mobileWallet`   | `MobileWalletOptions \| false` | Habilitado en Android | Opciones de Android Mobile Wallet Adapter.                                                           |
| `iosWallet`      | `iOSWalletOptions \| false`    | Habilitado en iOS     | Opciones de universal links de wallets iOS.                                                          |

`payer` y `payerSecretKey` son compatibles con clientes Vue/core directos. Un envio del cliente necesita un `payer` o un mensaje con signer embebido. Nunca pongas un secreto crudo o `payerSecretKey` en la configuracion runtime publica de Nuxt, y nunca envíes una clave de firma con fondos al navegador de un usuario final.

El cliente por defecto de `createSolanaPlugin()` usa la composicion oficial `solanaRpc()`, `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()`. El fallback custom anterior no se usa. El executor oficial espera el commitment `confirmed` antes de que `execute()` resuelva y `status` sea `sent`.

### Ciclo de vida del cliente y del plugin

`createSolanaPlugin()` construye el cliente Kit una vez, durante `install()`. Crea el plugin a nivel de módulo y reutiliza la instancia:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Llamar a `createSolanaPlugin()` otra vez construye un cliente y contexto nuevos, descartando la selección de wallet y el estado RPC existentes. Si tu configuración es reactiva — un cambio de cluster, por ejemplo — memoiza sobre la configuración para que se construya un nuevo plugin (y cliente) solo cuando el valor cambia de verdad, no en cada render:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Un cliente Kit ejecuta sus plugins `createClient().use(...)` durante la construcción. Cuando uno de esos plugins es asíncrono, el cliente — y cualquier contexto construido a partir de él — solo se activa después de que esa promesa se resuelva. Difiere el trabajo real de RPC y wallet a hooks del ciclo de vida del cliente o acciones del usuario después de la hidratación en lugar de ejecutarlo durante el setup o el SSR.

## Composables

La exportación raíz sigue estando soportada. Para composables, prefiere imports directos por subpath en código nuevo para que los bundlers puedan evitar evaluar código de entrada no relacionado del paquete:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Subpaths directos del paquete:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/kit`

Usa `@vue-solana/vue/buffer-polyfill` para código de transacciones en navegador que necesita el polyfill de Buffer. Usa `@vue-solana/vue/kit` para la API Kit (`createSolanaClient`, `address`, `lamports` y tipos). Los imports directos `@vue-solana/core/*` siguen soportados para uso core de menor nivel.

- `useSolana()`: devuelve el contexto Solana inyectado completo.
- `useSolanaClient()`: devuelve el `{ client, rpc }` de Kit desde el contexto. Recomendado para código nuevo.
- `useRpc()`: devuelve cluster, endpoint, estado de conexión, último blockhash, el `client` de Kit inyectado y `checkConnection()`.
- `useConnection()`: devuelve el cliente Kit inyectado (deprecado en favor de `useSolanaClient()`).
- `useAccountInfo(address, options?)`: carga datos normalizados de cuenta (executable, lamports, owner, space, bytes de datos).
- `useProgramAccounts(programId, options?)`: carga cuentas propiedad de un program id con filtros opcionales y recorte de datos.
- `useWallet()`: devuelve refs de wallet activa, estado de conexión computado y acciones de wallet.
- `useWallets()`: devuelve wallets de extensión de navegador descubiertas, wallets Android Mobile Wallet Adapter, entradas soportadas de wallet de navegador iOS y acciones de selección de wallet.
- `useBalance(address, commitment?)`: carga el balance en lamports para un string de dirección.
- `useAirdrop()`: airdrops SOL en una cuenta en redes de prueba y validadores locales.
- `useTokenAccounts(owner, options?)`: carga todas las cuentas de token SPL para un propietario, consultando ambos programas Token y Token-2022 por defecto.
- `useTokenBalance(mint, owner)`: carga el balance y decimales del token SPL para un par mint/propietario vía la cuenta de token asociada.
- `useTransaction(handler, options?)`: helper genérico de estado de transacción async con configuración opcional de timeout.
- `useTransactionConfirmation(options?)`: confirma una firma enviada con estado reactivo y estado de timeout/error.
- `useSignatureStatus(signature, options?)`: lee, sondea o se suscribe a actualizaciones de estado de firma.
- `useSignMessage()`: firma mensajes de autenticación arbitrarios mediante la wallet configurada cuando está soportado.
- `useSignAndSendTransaction()`: firma y envía una transacción mediante la wallet configurada, con espera de confirmación opcional.
- `useAction(handler)`: máquina de estados de acción async genérica con cancelación al redespachar.
- `useRequest(source, options?)`: petición de un solo uso que se re-ejecuta cuando cambia su fuente, con stale-while-revalidate.
- `useSubscription(source, options?)`: datos en vivo de suscripciones RPC y otras fuentes de stream reactivas.
- `useTrackedData(source, options?)`: suscripción RPC sembrada por una petición de un solo uso, con deduplicación por slot.
- `useSignIn()`: dispara la funcionalidad Sign In With Solana (SIWS) de la wallet.
- `useSelectedWalletAccount()`: lee el contexto de cuenta de wallet seleccionada a nivel de app con persistencia y filtrado.
- `useSignTransactions()` / `useSignAndSendTransactions()`: firma, o firma y envía, múltiples transacciones en una sola petición de wallet.
- `usePayer()` / `useIdentity()`: signers reactivos del cliente Kit. El cliente Vue por defecto expone el `payer` configurado; un cliente custom puede instalar un signer.
- `usePlanTransaction()` / `usePlanTransactions()`: planifica mensajes de transacción a partir de instrucciones.
- `useSendTransaction()` / `useSendTransactions()`: usa el planner y el executor oficial instalados por `createSolanaClient()`; planifica, firma, envia y espera `confirmed` sin popup de wallet. Configura `payer` o usa un signer embebido.
- `useClientCapability(nombre)`: afirma que una capacidad está instalada en el cliente y lanza un error descriptivo si falta.

## Guías relacionadas

- [RPC and Clusters](/guides/rpc-and-clusters): lee estado de conexión y configura endpoints.
- [Wallets](/guides/wallets): descubre, selecciona, conecta, desconecta y comprueba capacidades de wallet.
- [Account Reads](/guides/account-reads): lee balances, info de cuenta, cuentas de programa y estado de firma.
- [Transactions](/guides/transactions): firma, envía, confirma y muestra progreso de transacción.
- [Message Signing](/guides/message-signing): firma desafíos de autenticación o propiedad fuera de cadena.
- [E2E Testing](/guides/e2e-testing): simula RPC, suscripciones RPC y wallets en pruebas de Playwright.
- [Errors](/guides/errors): mapea refs `error` de composables a mensajes de UI seguros.

## Leer estado RPC

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "No se puede alcanzar el endpoint RPC de Solana configurado."
    : "No se puede comprobar la conexión de Solana.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Estado: {{ status }}</p>
    <p>Último blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Comprobar RPC</button>
  </section>
</template>
```

## Usar el cliente Kit

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Comprobar slot</button>
  </section>
</template>
```

`useSolanaClient()` devuelve el mismo contexto que `useSolana()` pero lo configura para lecturas Kit: `client` es el cliente completo de `@solana/kit` y `rpc` es su API de lectura. Los resultados de RPC son `bigint` y los datos de cuenta son `Uint8Array`. Consulta [Kit Migration](/guides/kit-migration).

## Leer balance

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Introduce una dirección Solana válida.";
    case "RPC_FAILURE":
      return "No se puede cargar el balance desde RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Cargando...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Actualizar</button>
  </section>
</template>
```

## Leer cuentas de token

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Introduce una dirección Solana válida.";
    case "RPC_FAILURE":
      return "No se pueden cargar las cuentas de token desde RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Cuentas de token: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Cargando...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Actualizar</button>
  </section>
</template>
```

`useTokenAccounts()` limpia el estado sin llamar a RPC cuando el propietario es null. Pasa `programId` en las opciones para limitar los resultados a un solo programa de token.

## Leer balance de token

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Introduce direcciones de mint y propietario válidas.";
    case "RPC_FAILURE":
      return "No se puede cargar el balance del token desde RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimales)</p>
    <p v-else>No se encontró cuenta de token.</p>
    <p v-if="loading">Cargando...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Actualizar</button>
  </section>
</template>
```

`useTokenBalance()` devuelve balance y decimales null cuando la cuenta de token asociada no existe, sin tratarlo como un error.

## Manejo de errores

Las refs `error` de composables usan `SolanaError | null` de `@vue-solana/core/errors`. Ramifica con `error.value.code` para UI de usuario y conserva `error.value.cause` para depurar fallos originales de wallet, RPC, análisis de dirección, timeout o storage.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Elige una wallet primero.";
    case "USER_REJECTED":
      return "La solicitud de wallet fue rechazada.";
    case "TRANSACTION_TIMEOUT":
      return "La transacción está tardando más de lo esperado.";
    case "RPC_FAILURE":
      return "La solicitud RPC de Solana falló.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Error Solana original", error.value.cause);
  }
});
```

## Leer info de cuenta

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Introduce una dirección Solana válida.";
    case "RPC_FAILURE":
      return "No se pueden cargar datos de cuenta desde RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Desconocido" }}</p>
    <p v-if="loading">Cargando...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Actualizar</button>
    <button type="button" @click="stopWatching">Dejar de observar</button>
  </section>
</template>
```

`useAccountInfo()` limpia el estado sin llamar a RPC cuando la dirección es null. Los strings de dirección inválidos limpian `accountInfo` obsoleta, establecen `error` y no llaman a `getAccountInfo()`. Cuando `watch: true` está activado, el listener websocket se elimina automáticamente al desmontar el componente. Llamar a `stopWatching()` elimina el listener actual y evita reinicios automáticos para esa instancia del composable.

## Leer cuentas de programa

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Introduce un program id de Solana válido.";
    case "RPC_FAILURE":
      return "No se pueden cargar cuentas de programa desde RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Cuentas: {{ accounts.length }}</p>
    <p v-if="loading">Cargando...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Actualizar</button>
  </section>
</template>
```

`useProgramAccounts()` limpia el estado sin llamar a RPC cuando el program id es null. Los strings de program id inválidos limpian `accounts` obsoletas, establecen `error` y no llaman a `getProgramAccounts()`.

> Advertencia: `useProgramAccounts()` puede ser costoso. Cada actualización puede escanear un conjunto grande de cuentas propiedad del programa, consumir créditos RPC significativos, alcanzar límites de tasa del proveedor o agotar el tiempo. No ejecutes escaneos amplios desde rutas de UI de alto tráfico. Usa filtros estrechos, `dataSlice`, caché, indexación, estrategias de paginación o infraestructura RPC dedicada para lecturas de producción.

## Estado de wallet

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Actualizar wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Seleccionada: {{ selectedWallet?.name ?? "Ninguna" }}</p>
    <p>Conectada: {{ connected }}</p>
    <p>Dirección: {{ publicKey }}</p>
    <p v-if="connecting">Conectando...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Conectar
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Desconectar</button>
  </section>
</template>
```

Las wallets de extensión de navegador se descubren mediante Solana Wallet Standard. Las wallets Android Mobile Wallet Adapter se registran mediante `@solana-mobile/wallet-standard-mobile` y se exponen mediante la misma lista `useWallets()` en clientes Android Chrome soportados. Las entradas iOS Phantom, Solflare y Backpack se exponen mediante enlaces universales específicos de wallet en navegadores iOS. `refreshWallets()` solo actualiza la lista de wallets descubiertas, y `selectWallet()` solo configura la wallet activa. `connected` permanece false hasta que `connect()` tiene éxito, incluso si la extensión expone cuentas autorizadas previamente después de refrescar la página.

Los adaptadores de wallet de app nativa de escritorio aún no están implementados. El soporte nativo de escritorio requiere enlaces de protocolo específicos de wallet o registro nativo futuro de Wallet Standard.

Los composables devuelven estado inerte seguro para SSR cuando no hay contexto de plugin disponible. Las operaciones RPC y de wallet reales aún requieren el contexto de cliente proporcionado por el plugin.

## Firma de mensajes

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Iniciar sesión en example.com"));
}
```

La firma de mensajes es para desafíos de propiedad de wallet o autenticación. No es firma de transacciones y no autoriza cambios de estado on-chain. Las wallets que no exponen firma de mensajes reportan `canSignMessage` como false y `execute()` rechaza con un error de wallet no soportada.

## Iniciar Sesión Con Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Iniciar sesión en Mi App",
    // Genera el nonce en el servidor y verifícalo en el servidor.
    nonce: await fetchNonceFromBackend(),
  });

  // Envía { account.address, signature, signedMessage } a tu backend para
  // verificarlo antes de crear una sesión.
}
```

La wallet debe soportar la función SIWS (`canSignIn` es false en caso contrario, y `signIn()` rechaza con un error `WALLET_FEATURE_UNSUPPORTED`). Las wallets sin cuenta seleccionada se conectan primero.

### Verificación de la firma en tu servidor

La wallet devuelve una firma sobre `signedMessage` — el mensaje SIWS que el usuario consintió. Confiar en el resultado sin verificarlo permitiría que un cliente malicioso falsifique una identidad, así que verifica en el servidor antes de emitir una sesión:

1. **Comprueba el mensaje**: decodifica `signedMessage` y confirma que el dominio coincide con tu origen, que la `uri` es tuya, que el `nonce` coincide con el que tu servidor emitió para esta sesión y que statement y resources coinciden con lo que esperas.
2. **Verifica la firma**: la firma es una firma Ed25519 de los bytes del mensaje SIWS. Verifícala con `tweetnacl` (`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`) o cualquier librería Ed25519, contra la `publicKey` de la cuenta del resultado de inicio de sesión.
3. **Vincula la sesión**: solo después de que el mensaje pase las comprobaciones y la firma se verifique debes crear la sesión — asociada a `account.address`.

El servidor debe re-derivar el mensaje esperado a partir del nonce que emitió (o validar todos los campos del mensaje recibido) para rechazar nonces expirados o reutilizados.

## Composables de obtención de datos

`useRequest`, `useSubscription` y `useTrackedData` son la capa de datos estilo SWR, construida sobre las primitivas de stores reactivos de Kit:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value es un sobre SolanaRpcResponse: data.value.value y
// data.value.context.slot.
```

- `useRequest` se re-ejecuta cuando una fuente ref/computed cambia de identidad; pasar `null` la desactiva (estado `disabled`).
- `useSubscription` conserva el valor obsoleto mientras se reconecta; `reconnect()` reabre el stream.
- `useTrackedData` deduplica por slot la petición y la suscripción para que llegadas fuera de orden no puedan regresar el valor.

Los callbacks `rpcValueMapper` y `rpcSubscriptionValueMapper` reciben el valor de respuesta **desenvuelto** (`value.lamports` para un balance), mientras que el ref `data` devuelto conserva el sobre `SolanaRpcResponse` completo para que puedas leer `data.value?.context.slot`.

### Peticiones de un solo uso con `useRequest`

`useRequest` es la petición SWR de propósito general. Acepta una función de petición, un objeto de petición de Kit (cualquier cosa con `send()`), o un `ref`/`computed` de cualquiera de ellos, o `null` para desactivar:

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // Cancelación opcional por intento compuesta con la señal interna.
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value es el valor de respuesta crudo; status es
// "fetching" | "success" | "error" | "disabled".
```

Mientras se ejecuta una revalidación, los `data` y `error` anteriores permanecen poblados, así que la UI sigue renderizando. `refresh()` se re-ejecuta manualmente y resuelve con el resultado del intento.

### Streams con `useSubscription`

`useSubscription` consume cualquier fuente de stream reactiva de Kit (con tipado de pato sobre `reactiveStore()`), desmonta la conexión al desinstalar el componente y soporta reconexión manual con stale-while-revalidate:

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// El estado es "loading" | "loaded" | "error" | "disabled".
// reconnect() reabre el stream mientras data conserva el último valor conocido.
```

Los errores conservan el último `data` conocido; una fuente `null` desactiva la suscripción y limpia el estado.

### Clave de caché entre montajes

Para clave de caché entre montajes, usa los adaptadores SWR de `@vue-solana/vue/swr`:

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Los componentes montados con la misma clave se siembran del último valor conocido mientras su propia petición se revalida. No hay adaptador de `useAction`: las acciones son mutaciones, no lecturas cacheables; usa la API de mutación de tu capa de datos (o el propio `useAction`).

Detalles del comportamiento de caché:

- Las claves tienen namespace por adaptador (`request:`, `subscription:`, `tracked:`), así que la misma clave es segura entre adaptadores.
- Una fuente `null`/`undefined` desactiva el composable y **limpia** la entrada en caché de esa clave, incluso cuando un componente se monta con la fuente ya desactivada.
- `useTrackedDataSwr` guarda en caché el sobre `SolanaRpcResponse` completo, así que los componentes remontados restauran tanto el valor como su contexto de slot.
- La caché es un `Map` a nivel de módulo. En el servidor, dale namespace a las claves por petición o llama a `clearSwrCache()` entre peticiones para evitar fugas entre peticiones.

Para una demostración ejecutable de los cinco composables (incluido el comportamiento SWR en remontajes) contra devnet, consulta los Live Data Panels del [Vue Vite example](/examples/vue-vite).

## Estado de transacción

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

La wallet actual debe estar conectada y soportar `signAndSendTransaction` o `signTransaction`. Las wallets Android Mobile Wallet Adapter prefieren `signTransaction` más envío RPC del lado de la app cuando está disponible. Esto evita un caso límite de traspaso móvil donde la wallet envía correctamente pero la página del navegador no recibe la firma devuelta por el adaptador de wallet.

Sin `confirm: true`, `execute()` devuelve después del envío y establece `status` en `sent`. Con la confirmación activada, el estado pasa por `sending`, `confirming` y luego `processed`, `confirmed` o `finalized` para coincidir con el commitment solicitado. Si la confirmación agota el tiempo o falla, la `signature` enviada sigue disponible para que la app pueda enlazar a un explorador.

`useSignAndSendTransaction()` también limpia `loading` si un adaptador de wallet nunca devuelve un resultado. En ese caso obsoleto, se establece `error` y el estado de cadena puede ser desconocido, así que comprueba la wallet conectada o un explorador antes de reintentar.

### Entradas y resultados de las peticiones de wallet

Los flujos de firma de wallet aceptan la transacción de entrada como bytes de wire `Uint8Array` en bruto que cumplen el esquema de transacción de Solana. Constróyelos con `@solana/kit` (o decodifícalos desde una respuesta RPC en base64/base58); las cadenas base64, los objetos de transacción y las listas de instrucciones no se aceptan aquí.

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` toma los bytes del mensaje en bruto a firmar. Toda petición de envío de wallet acepta también las `SendTransactionOptions` de Kit:

| Opción                | Descripción                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `skipPreflight`       | Omite la simulación de preflight antes de enviar.                                                                  |
| `maxRetries`          | Número de reintentos del nodo RPC (`bigint`).                                                                      |
| `minContextSlot`      | Slot en el que se sabe que existe cualquier blockhash o nonce de la transacción; enviar antes puede ser rechazado. |
| `preflightCommitment` | Commitment usado para la simulación de preflight.                                                                  |

Formas de retorno:

- `useSignMessage().execute(bytes)` resuelve a `{ signedMessage, signature }`, ambos `Uint8Array`.
- `useSignTransactions().execute(transactions)` resuelve al `Uint8Array[]` firmado (también expuesto como `signedTransactions`); pasa un array de un solo elemento para una transacción.
- `useSignAndSendTransaction().execute(transaction)` resuelve a la `signature` enviada como string; con `confirm: true` también rellena `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` resuelve a un `string[]` de firmas (también expuesto como `signatures`).

Una wallet puede modificar el mensaje o la transacción antes de firmar — por ejemplo para añadir su propia instrucción o cambiar el pagador de comisiones — y el Wallet Standard lo permite explícitamente. Vuelve a leer el `signedMessage` devuelto o los bytes de la transacción firmada en lugar de asumir que coinciden byte a byte con tu entrada.

### Transacciones enviadas por el cliente

`useSendTransaction()` y `useSendTransactions()` usan la capacidad de envio del cliente en vez de la wallet conectada. `createSolanaClient()` y `createSolanaPlugin()` instalan por defecto el stack oficial `solanaRpc()`, `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()`, asi que estos composables no necesitan un fallback custom ni instalar plugins manualmente otra vez.

El executor obtiene un blockhash nuevo, estima o respeta los limites de recursos, ejecuta preflight salvo que se configure lo contrario, firma con los signers del cliente, envia por RPC y espera el commitment `confirmed`. `status` cambia de `sending` a `sent` solo cuando termina la operacion de envio y confirmacion. El resultado simple expone `data.context.signature`; el resultado batch contiene el arbol del plan. No hay popup de wallet, asi que usa este flujo solo cuando el cliente tenga un signer apropiado.

Configura un signer directamente en un cliente Vue/core con `payer` o `payerSecretKey`. Si el cliente no tiene payer, pasa un mensaje con un signer embebido. Las claves de produccion con fondos deben permanecer en un servidor o relayer. No pongas un secreto crudo o `payerSecretKey` en la configuracion runtime publica de Nuxt, y no envíes una keypair con fondos al navegador de un usuario final.

Los composables de wallet son separados: `useSignAndSendTransaction()` puede devolver despues del envio RPC, o esperar el commitment seleccionado cuando se pasa `confirm: true`. Los envios del cliente siempre usan el comportamiento send-and-confirm del executor oficial en `confirmed`.

## Transacciones en lote

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// Una petición de wallet para N transacciones.
const signed = await signMany([transactionA, transactionB]);

// Una petición de wallet para N firmas.
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

Ambas prefieren la capacidad de lote de la wallet. `useSignTransactions` recurre al lote legacy `signAllTransactions`; `useSignAndSendTransactions` recurre a enviar la petición singular en secuencia. La firma en lote es todo-o-nada (un rechazo no firma nada), pero el fallback de firmar-y-enviar puede dejar transacciones anteriores enviadas. Cuando eso ocurre, rechaza con `PartialSignAndSendError` cuyo `signatures` lista las transacciones ya enviadas, para que un reintento pueda omitirlas:

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures: las que ya aterrizaron — reenvía solo el resto.
  }
}
```

## Cuenta de wallet seleccionada

Para un estado de cuenta seleccionada en toda la app, con persistencia y filtrado, monta el provider una vez cerca de la raíz y léelo donde quieras:

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

La selección persiste como `${walletName}:${accountAddress}` en `localStorage` por defecto (pasa `stateSync` para personalizarla o `null` para desactivarla) y se restaura en la siguiente visita cuando la wallet y la cuenta están disponibles. `filterWallet` restringe qué cuentas de wallet se ofrecen. En Nuxt, el plugin runtime del módulo instala este contexto automáticamente.

## Capacidades del cliente y planificación

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// Signers reactivos desde el cliente Kit (requiere un plugin de signer).
const payer = usePayer();
const identity = useIdentity();

// Planifica mensajes de transacción a partir de instrucciones sin enviar.
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")` comprueba que una capacidad está instalada en el cliente y lanza un error descriptivo (indicando el hook y cómo instalarla) durante el setup cuando falta. El cliente Vue por defecto ya instala el planner y el executor de envio oficiales; los clientes custom deben instalar `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()`.

## Confirmar una firma existente

Usa `useTransactionConfirmation()` cuando tu app ya tiene una firma enviada y quiere esperar un commitment específico por separado de firmar y enviar:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

El composable conserva la `signature` enviada cuando la confirmación agota el tiempo o la llamada RPC falla, para que las apps aún puedan mostrar un enlace de explorador mientras muestran `error` al usuario.

## Seguir estado de firma

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling, stopSubscription } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
    subscribe: true,
    commitment: "confirmed",
  },
);
```

El sondeo usa `getSignatureStatuses()` en cada intervalo, así que detenlo cuando la UI ya no necesite actualizaciones. Llamar a `stopPolling()` limpia el intervalo actual y evita reinicios automáticos del sondeo para esa instancia del composable. Las firmas inválidas limpian `status` obsoleto, establecen `error` y no llaman a RPC ni inician sondeo. Los valores inválidos de `pollIntervalMs` menores o iguales a `0` establecen un `RangeError` y no inician sondeo. `subscribe: true` usa `onSignature()` y elimina el listener al desmontar el componente. Llamar a `stopSubscription()` elimina el listener de firma actual y evita reinicios automáticos para esa instancia del composable.

## App de ejemplo

Para un flujo Vue y Vite completo y ejecutable, consulta el [Vue Vite example](/examples/vue-vite).
