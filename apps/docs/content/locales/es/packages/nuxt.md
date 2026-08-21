---
title: "@vue-solana/nuxt"
description: Modulo Nuxt para aplicaciones Solana.
ogSection: Paquetes
surroundOrder: 16
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) instala el plugin Vue Solana en apps Nuxt y autoimporta composables.

## Instalar

```sh
npx nuxt module add @vue-solana/nuxt
```

Esto instala el paquete y agrega `@vue-solana/nuxt` al array `modules` en `nuxt.config.ts`.

Las apps de navegador que crean o serializan transacciones pueden inicializar el polyfill de Buffer desde `@vue-solana/nuxt/buffer-polyfill` e importar primitivas Solana soportadas desde `@vue-solana/nuxt/web3`.

## Configuracion del modulo

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Tambien puedes configurar un endpoint RPC personalizado:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

Los clusters soportados son `mainnet-beta`, `devnet`, `testnet` y `localnet`. Usa `mainnet-beta` para la mainnet de Solana; este es el nombre oficial del cluster de Solana.

Las opciones del modulo Nuxt se guardan en la configuracion runtime publica, asi que deben ser serializables a JSON. Los objetos adaptadores `wallet` personalizados se excluyen intencionalmente de la configuracion Nuxt; usa el plugin de Vue directamente en codigo Vue solo de cliente si necesitas inyectar un objeto wallet personalizado.

Las opciones de wallet movil son seguras de configurar en `nuxt.config.ts` cuando solo contienen identidad de app y configuracion de redireccion serializables a JSON:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "Mi app Nuxt Solana",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "Mi app Nuxt Solana",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

Pasa `mobileWallet: false` o `iosWallet: false` para desactivar cualquiera de las fuentes de wallet movil. El modulo tambien preoptimiza dependencias comunes de Solana, Wallet Adapter y wallet movil para que Vite pueda empaquetar correctamente codigo de transacciones y wallets de navegador.

## Composables autoimportados

El modulo autoimporta estos composables desde subrutas directas `@vue-solana/vue/*` en vez del barrel raiz del paquete Vue. Esto evita que los bundles SSR de Nuxt incluyan codigo runtime Solana no relacionado solo porque una pagina usa un composable.

- `useSolana()`: devuelve el contexto Solana inyectado completo.
- `useSolanaRpc()`: devuelve cluster, endpoint, estado RPC, ultimo blockhash y `checkConnection()`.
- `useSolanaConnection()`: devuelve la instancia `Connection` de Solana.
- `useSolanaAccountInfo(address, options?)`: lee info de cuenta y puede suscribirse a cambios de cuenta.
- `useSolanaWallet()`: devuelve estado de wallet seleccionada, estado de conexion, capacidades y acciones de wallet.
- `useSolanaWallets()`: devuelve wallets descubiertas y acciones de seleccion/actualizacion de wallet.
- `useSolanaBalance(address, commitment?)`: lee el balance en lamports para una clave publica o direccion.
- `useSolanaTokenAccounts(owner, options?)`: carga todas las cuentas de token SPL para un propietario, consultando ambos programas Token y Token-2022 por defecto.
- `useSolanaTokenBalance(mint, owner)`: carga el balance y decimales del token SPL para un par mint/propietario via la cuenta de token asociada.
- `useSolanaProgramAccounts(programId, options?)`: lee cuentas propiedad de programa con filtros y recorte de datos.
- `useSolanaTransactionConfirmation(options?)`: confirma una firma de transaccion existente.
- `useSolanaSignatureStatus(signature, options?)`: lee, sondea o se suscribe a estado de firma.
- `useSolanaSignMessage()`: firma mensajes de autenticacion o desafio de propiedad fuera de cadena.
- `useSolanaSignAndSendTransaction()`: firma, envia y opcionalmente confirma transacciones.

Estos son aliases Nuxt para los composables de Vue.

El paquete Vue usa nombres cortos como `useRpc()` porque los llamadores los importan explicitamente desde `@vue-solana/vue/useRpc`.

El modulo Nuxt expone nombres prefijados como `useSolanaRpc()` porque los composables autoimportados comparten el namespace Nuxt de toda la app y deberian evitar colisiones con codigo de la app u otros modulos.

`useSolana()` es la excepcion porque ya tiene namespace y actua como el accessor canonico de contexto tanto en Vue como en Nuxt.

Usa los nombres `useSolana*` dentro de apps Nuxt para que los autoimports funcionen sin imports explicitos.

Las primitivas Solana sin procesar y el helper Buffer de navegador son imports explicitos, no autoimports:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
import { PublicKey, Transaction } from "@vue-solana/nuxt/web3";
```

Usa imports directos `@vue-solana/core/*` solo para uso core de menor nivel.

Subrutas directas del paquete:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/web3`

El plugin runtime es solo de cliente. Los composables autoimportados se pueden llamar durante SSR y devuelven estado inerte hasta que la hidratacion proporciona el contexto real de cliente. Dispara trabajo RPC y de wallet desde hooks de ciclo de vida de cliente o acciones de usuario.

El registro de Android Mobile Wallet Adapter tambien se ejecuta solo en el cliente. En Android Chrome y PWA de Chrome, `Mobile Wallet Adapter` puede aparecer en la misma lista `useSolanaWallets()` que las wallets de extension de navegador. En navegadores iOS, Phantom, Solflare y Backpack pueden aparecer en la misma lista mediante enlaces universales especificos de wallet. Los adaptadores de wallet de app nativa de escritorio estan planeados pero aun no implementados.

## Guias relacionadas

- [RPC and Clusters](/guides/rpc-and-clusters): configura el modulo Nuxt y lee estado RPC.
- [Wallets](/guides/wallets): usa `useSolanaWallets()` y `useSolanaWallet()` de forma segura en flujos de cliente.
- [Account Reads](/guides/account-reads): lee balances, datos de cuenta, cuentas de programa y estado de firma.
- [Transactions](/guides/transactions): firma, envia, confirma y maneja estado de transaccion desde Nuxt.
- [Message Signing](/guides/message-signing): solicita firmas de wallet para mensajes fuera de cadena.
- [Errors](/guides/errors): mapea errores de composables autoimportados a mensajes de UI seguros.

## Leer estado RPC

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

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
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

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
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useSolanaTokenAccounts(owner);

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

`useSolanaTokenAccounts()` limpia el estado sin llamar a RPC cuando el propietario es null. Pasa `programId` en las opciones para limitar los resultados a un solo programa de token.

## Leer balance de token

```vue
<script setup lang="ts">
const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useSolanaTokenBalance(mint, owner);

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

`useSolanaTokenBalance()` devuelve balance y decimales null cuando la cuenta de token asociada no existe, sin tratarlo como un error.

## Manejo de errores

Los composables autoimportados de Nuxt exponen las mismas refs normalizadas `SolanaError | null` que `@vue-solana/vue`. Usa valores estables `error.value.code` para ramas de UI y conserva `error.value.cause` para registrar fallos originales de wallet, RPC, analisis, timeout o storage.

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

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
</script>
```

## Leer datos de cuenta

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

Usa `useSolanaProgramAccounts()` con cuidado en nodos RPC publicos. Prefiere filtros estrechos, usa `dataSlice` para lecturas parciales y evita sondear escaneos amplios.

## Estado de wallet

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
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
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">
      Conectar
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Desconectar</button>
  </section>
</template>
```

Las wallets de extension de navegador se descubren mediante Solana Wallet Standard. Las wallets Android Mobile Wallet Adapter se registran mediante `@solana-mobile/wallet-standard-mobile` en clientes Android Chrome soportados y se exponen mediante la misma lista de wallets. Las entradas iOS Phantom, Solflare y Backpack se exponen mediante enlaces universales especificos de wallet en navegadores iOS. `refreshWallets()` solo actualiza la lista de wallets descubiertas, y `selectWallet()` solo configura la wallet activa. `connected` permanece false hasta que `connect()` tiene exito, incluso si la extension expone cuentas autorizadas previamente despues de refrescar la pagina.

## Firma de mensajes

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Iniciar sesion en example.com"));
}
</script>
```

La firma de mensajes es para desafios de propiedad de wallet o autenticacion. No es firma de transacciones y no autoriza cambios de estado on-chain. Las wallets que no exponen firma de mensajes reportan `canSignMessage` como false y `execute()` rechaza con un error de wallet no soportada.

## Firmar, enviar y confirmar una transaccion

Usa `useSolanaSignAndSendTransaction()` desde una accion de usuario del lado del cliente cuando la wallet conectada debe firmar y enviar una transaccion. Pasa `confirm: true` cuando la UI debe esperar confirmacion en vez de detenerse despues del envio de la firma.

```vue
<script setup lang="ts">
import { Transaction } from "@vue-solana/nuxt/web3";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction() {
  const transaction = new Transaction();
  // Agrega instrucciones, recent blockhash y fee payer antes de solicitar una firma de wallet.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Enviar transaccion
    </button>
    <p>Estado: {{ status }}</p>
    <p v-if="signature">Enviada: {{ signature }}</p>
    <p v-if="confirmation">Confirmada en {{ confirmation.commitment }}</p>
    <p v-if="error">No se puede completar la transaccion.</p>
  </section>
</template>
```

El estado pasa de `sending` a `sent` despues del envio RPC. Cuando la confirmacion esta activada, luego pasa por `confirming` y termina en el commitment alcanzado, como `confirmed` o `finalized`. Si la confirmacion agota el tiempo despues del envio, `signature` sigue disponible para que la app pueda mostrar un enlace de explorador o sondear el estado de firma antes de reintentar.

Los prompts de wallet deben activarse mediante interaccion del usuario despues de la hidratacion. No llames a `execute()` durante SSR, en rutas de servidor ni automaticamente al cargar la pagina.

## Confirmar una firma existente

Usa `useSolanaTransactionConfirmation()` cuando ya tienes una firma y quieres estado de confirmacion reactivo.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirmar firma</button>
    <p>Estado: {{ status }}</p>
    <p v-if="confirmation">Alcanzo {{ confirmation.commitment }}</p>
    <p v-if="error">No se puede confirmar la firma.</p>
  </section>
</template>
```

## Seguir estado de firma

Usa `useSolanaSignatureStatus()` cuando necesitas comprobaciones continuas de estado para una firma enviada. Esto es util despues de un timeout porque una transaccion podria aterrizar aun despues de que la UI dejo de esperar.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling, stopSubscription } = useSolanaSignatureStatus(
  signature,
  {
    pollIntervalMs: 2_000,
  },
);

onBeforeUnmount(() => {
  stopPolling();
  void stopSubscription();
});
</script>
```

Para enlaces de explorador, usa el cluster configurado. Los enlaces de devnet deberian incluir `?cluster=devnet`; los enlaces de mainnet no deberian incluir query de cluster.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## App de ejemplo

Para un flujo Nuxt completo y ejecutable, consulta el [Nuxt example](/examples/nuxt).
