---
title: "@vue-solana/vue"
description: Plugin de Vue y composables para aplicaciones Solana.
ogSection: Paquetes
surroundOrder: 15
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) proporciona un plugin de Vue y composables para acceso RPC de Solana, lecturas de balance, estado de wallet y estado de helpers de transaccion.

## Instalar

```sh
pnpm add @vue-solana/vue
```

Las apps de navegador que crean o serializan transacciones pueden inicializar el polyfill de Buffer desde `@vue-solana/vue/buffer-polyfill`.

## Configuracion del plugin

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

El registro de Android Mobile Wallet Adapter esta activado por defecto en clientes Android Chrome soportados. Pasa opciones `mobileWallet` para personalizar la identidad de app MWA, o pasa `mobileWallet: false` para desactivar el registro de wallet movil Android.

Los enlaces de wallet de navegador iOS estan activados por defecto en navegadores iOS para Phantom, Solflare y Backpack. Pasa opciones `iosWallet` para personalizar identidad de app, URL de redireccion, cadenas o cluster, o pasa `iosWallet: false` para desactivar el descubrimiento de enlaces de wallet iOS.

Tambien puedes pasar un endpoint RPC personalizado:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

## Composables

La exportacion raiz sigue estando soportada. Para composables, prefiere imports directos por subruta en codigo nuevo para que los bundlers puedan evitar evaluar codigo de entrada no relacionado del paquete:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Subrutas directas del paquete:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useSolana`
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
- `@vue-solana/vue/web3`

Usa `@vue-solana/vue/web3` para primitivas Solana sin procesar soportadas como `PublicKey`, `Transaction` y `TransactionInstruction`. Usa `@vue-solana/vue/buffer-polyfill` para codigo de transacciones en navegador que necesita el polyfill de Buffer. Los imports directos `@vue-solana/core/*` siguen soportados para uso core de menor nivel.

- `useSolana()`: devuelve el contexto Solana inyectado completo.
- `useRpc()`: devuelve cluster, endpoint, estado de conexion, ultimo blockhash y `checkConnection()`.
- `useConnection()`: devuelve la `Connection` de Solana.
- `useAccountInfo(address, options?)`: carga datos de cuenta y puede suscribirse a cambios de cuenta.
- `useProgramAccounts(programId, options?)`: carga cuentas propiedad de un program id con filtros opcionales y recorte de datos.
- `useWallet()`: devuelve refs de wallet activa, estado de conexion computado y acciones de wallet.
- `useWallets()`: devuelve wallets de extension de navegador descubiertas, wallets Android Mobile Wallet Adapter, entradas soportadas de wallet de navegador iOS y acciones de seleccion de wallet.
- `useBalance(address, commitment?)`: carga el balance en lamports para un `PublicKey` o string de direccion.
- `useTokenAccounts(owner, options?)`: carga todas las cuentas de token SPL para un propietario, consultando ambos programas Token y Token-2022 por defecto.
- `useTokenBalance(mint, owner)`: carga el balance y decimales del token SPL para un par mint/propietario via la cuenta de token asociada.
- `useTransaction(handler, options?)`: helper generico de estado de transaccion async con configuracion opcional de timeout.
- `useTransactionConfirmation(options?)`: confirma una firma enviada con estado reactivo y estado de timeout/error.
- `useSignatureStatus(signature, options?)`: lee, sondea o se suscribe a actualizaciones de estado de firma.
- `useSignMessage()`: firma mensajes de autenticacion arbitrarios mediante la wallet configurada cuando esta soportado.
- `useSignAndSendTransaction()`: firma y envia una transaccion mediante la wallet configurada, con espera de confirmacion opcional.

## Guias relacionadas

- [RPC and Clusters](/guides/rpc-and-clusters): lee estado de conexion y configura endpoints.
- [Wallets](/guides/wallets): descubre, selecciona, conecta, desconecta y comprueba capacidades de wallet.
- [Account Reads](/guides/account-reads): lee balances, info de cuenta, cuentas de programa y estado de firma.
- [Transactions](/guides/transactions): firma, envia, confirma y muestra progreso de transaccion.
- [Message Signing](/guides/message-signing): firma desafios de autenticacion o propiedad fuera de cadena.
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
    : "No se puede comprobar la conexion de Solana.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Estado: {{ status }}</p>
    <p>Ultimo blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Comprobar RPC</button>
  </section>
</template>
```

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
      return "Introduce una direccion Solana valida.";
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
      return "Introduce una direccion Solana valida.";
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
      return "Introduce direcciones de mint y propietario validas.";
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
    <p v-else>No se encontro cuenta de token.</p>
    <p v-if="loading">Cargando...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Actualizar</button>
  </section>
</template>
```

`useTokenBalance()` devuelve balance y decimales null cuando la cuenta de token asociada no existe, sin tratarlo como un error.

## Manejo de errores

Las refs `error` de composables usan `SolanaError | null` de `@vue-solana/core/errors`. Ramifica con `error.value.code` para UI de usuario y conserva `error.value.cause` para depurar fallos originales de wallet, RPC, analisis de direccion, timeout o storage.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Elige una wallet primero.";
    case "USER_REJECTED":
      return "La solicitud de wallet fue rechazada.";
    case "TRANSACTION_TIMEOUT":
      return "La transaccion esta tardando mas de lo esperado.";
    case "RPC_FAILURE":
      return "La solicitud RPC de Solana fallo.";
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
      return "Introduce una direccion Solana valida.";
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

`useAccountInfo()` limpia el estado sin llamar a RPC cuando la direccion es null. Los strings de direccion invalidos limpian `accountInfo` obsoleta, establecen `error` y no llaman a `getAccountInfo()`. Cuando `watch: true` esta activado, el listener websocket se elimina automaticamente al desmontar el componente. Llamar a `stopWatching()` elimina el listener actual y evita reinicios automaticos para esa instancia del composable.

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
      return "Introduce un program id de Solana valido.";
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

`useProgramAccounts()` limpia el estado sin llamar a RPC cuando el program id es null. Los strings de program id invalidos limpian `accounts` obsoletas, establecen `error` y no llaman a `getProgramAccounts()`.

> Advertencia: `useProgramAccounts()` puede ser costoso. Cada actualizacion puede escanear un conjunto grande de cuentas propiedad del programa, consumir creditos RPC significativos, alcanzar limites de tasa del proveedor o agotar el tiempo. No ejecutes escaneos amplios desde rutas de UI de alto trafico. Usa filtros estrechos, `dataSlice`, cache, indexacion, estrategias de paginacion o infraestructura RPC dedicada para lecturas de produccion.

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
    <p>Clave publica: {{ publicKey?.toBase58() }}</p>
    <p v-if="connecting">Conectando...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Conectar
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Desconectar</button>
  </section>
</template>
```

Las wallets de extension de navegador se descubren mediante Solana Wallet Standard. Las wallets Android Mobile Wallet Adapter se registran mediante `@solana-mobile/wallet-standard-mobile` y se exponen mediante la misma lista `useWallets()` en clientes Android Chrome soportados. Las entradas iOS Phantom, Solflare y Backpack se exponen mediante enlaces universales especificos de wallet en navegadores iOS. `refreshWallets()` solo actualiza la lista de wallets descubiertas, y `selectWallet()` solo configura la wallet activa. `connected` permanece false hasta que `connect()` tiene exito, incluso si la extension expone cuentas autorizadas previamente despues de refrescar la pagina.

Los adaptadores de wallet de app nativa de escritorio aun no estan implementados. El soporte nativo de escritorio requiere enlaces de protocolo especificos de wallet o registro nativo futuro de Wallet Standard.

Los composables devuelven estado inerte seguro para SSR cuando no hay contexto de plugin disponible. Las operaciones RPC y de wallet reales aun requieren el contexto de cliente proporcionado por el plugin.

## Firma de mensajes

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Iniciar sesion en example.com"));
}
```

La firma de mensajes es para desafios de propiedad de wallet o autenticacion. No es firma de transacciones y no autoriza cambios de estado on-chain. Las wallets que no exponen firma de mensajes reportan `canSignMessage` como false y `execute()` rechaza con un error de wallet no soportada.

## Estado de transaccion

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

La wallet actual debe estar conectada y soportar `signAndSendTransaction` o `signTransaction`. Las wallets Android Mobile Wallet Adapter prefieren `signTransaction` mas envio RPC del lado de la app cuando esta disponible. Esto evita un caso limite de traspaso movil donde la wallet envia correctamente pero la pagina del navegador no recibe la firma devuelta por el adaptador de wallet.

Sin `confirm: true`, `execute()` devuelve despues del envio y establece `status` en `sent`. Con la confirmacion activada, el estado pasa por `sending`, `confirming` y luego `processed`, `confirmed` o `finalized` para coincidir con el commitment solicitado. Si la confirmacion agota el tiempo o falla, la `signature` enviada sigue disponible para que la app pueda enlazar a un explorador.

`useSignAndSendTransaction()` tambien limpia `loading` si un adaptador de wallet nunca devuelve un resultado. En ese caso obsoleto, se establece `error` y el estado de cadena puede ser desconocido, asi que comprueba la wallet conectada o un explorador antes de reintentar.

## Confirmar una firma existente

Usa `useTransactionConfirmation()` cuando tu app ya tiene una firma enviada y quiere esperar un commitment especifico por separado de firmar y enviar:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

El composable conserva la `signature` enviada cuando la confirmacion agota el tiempo o la llamada RPC falla, para que las apps aun puedan mostrar un enlace de explorador mientras muestran `error` al usuario.

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

El sondeo usa `getSignatureStatuses()` en cada intervalo, asi que detenlo cuando la UI ya no necesite actualizaciones. Llamar a `stopPolling()` limpia el intervalo actual y evita reinicios automaticos del sondeo para esa instancia del composable. Las firmas invalidas limpian `status` obsoleto, establecen `error` y no llaman a RPC ni inician sondeo. Los valores invalidos de `pollIntervalMs` menores o iguales a `0` establecen un `RangeError` y no inician sondeo. `subscribe: true` usa `onSignature()` y elimina el listener al desmontar el componente. Llamar a `stopSubscription()` elimina el listener de firma actual y evita reinicios automaticos para esa instancia del composable.

## App de ejemplo

Para un flujo Vue y Vite completo y ejecutable, consulta el [Vue Vite example](/examples/vue-vite).
