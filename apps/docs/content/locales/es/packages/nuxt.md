---
title: "@vue-solana/nuxt"
description: Módulo Nuxt para aplicaciones Solana.
ogSection: Packages
surroundOrder: 16
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) instala el plugin Vue Solana en apps Nuxt y autoimporta composables.

## Instalar

```sh
npx nuxt module add @vue-solana/nuxt
```

Esto instala el paquete y agrega `@vue-solana/nuxt` al array `modules` en `nuxt.config.ts`.

Las apps de navegador que crean o serializan transacciones pueden inicializar el polyfill de Buffer desde `@vue-solana/nuxt/buffer-polyfill`. Usa `@vue-solana/nuxt/kit` para la API Kit (`createSolanaClient`, `address`, `lamports` y tipos) y el composable autoimportado `useSolanaClient()`.

## Configuración del módulo

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

También puedes configurar un endpoint RPC personalizado:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

Los clusters soportados son `mainnet` (alias heredado `mainnet-beta`), `devnet`, `testnet` y `localnet`. Usa `mainnet` para la mainnet de Solana; este es el nombre oficial del mainnet de Solana.

Las opciones del módulo Nuxt se guardan en la configuración runtime pública, así que deben ser serializables a JSON. Los objetos adaptadores `wallet` personalizados se excluyen intencionalmente de la configuración Nuxt; usa el plugin de Vue directamente en código Vue solo de cliente si necesitas inyectar un objeto wallet personalizado.

`ModuleOptions` también omite intencionalmente `payer` y `payerSecretKey`. Ambos siguen soportados por clientes directos de `@vue-solana/core` y `@vue-solana/vue`, pero el módulo Nuxt no reenvía ninguno y los elimina de la configuración runtime pública. Nunca pongas un secreto crudo, una seed phrase o `payerSecretKey` en `nuxt.config.ts` o `runtimeConfig.public`: esos valores son visibles para el navegador. Para un signer propio del cliente, genera un signer efimero en un plugin solo de cliente con `generateKeyPairSigner()` o usa un mensaje con un signer embebido de la wallet conectada.

El plugin runtime de cliente del módulo también instala automáticamente el contexto de cuenta de wallet seleccionada de toda la app, así que `useSolanaSelectedWalletAccount()` funciona en cada componente sin montar un provider. Para personalizar la persistencia (`stateSync`) o el filtrado (`filterWallet`), monta `SelectedWalletAccountProvider` desde `@vue-solana/vue/useSelectedWalletAccount` más abajo en el árbol para anular el contexto por defecto.

Las opciones de wallet móvil son seguras de configurar en `nuxt.config.ts` cuando solo contienen identidad de app y configuración de redirección serializables a JSON:

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

Pasa `mobileWallet: false` o `iosWallet: false` para desactivar cualquiera de las fuentes de wallet móvil. El módulo también preoptimiza dependencias comunes de Solana, Wallet Adapter y wallet móvil para que Vite pueda empaquetar correctamente código de transacciones y wallets de navegador.

## Composables autoimportados

El módulo autoimporta estos composables desde subpaths directos `@vue-solana/vue/*` en vez del barrel raíz del paquete Vue. Esto evita que los bundles SSR de Nuxt incluyan código runtime Solana no relacionado solo porque una página usa un composable.

- `useSolana()`: devuelve el contexto Solana inyectado completo.
- `useSolanaClient()`: devuelve el `{ client, rpc }` de Kit desde el contexto. Recomendado para código nuevo.
- `useSolanaRpc()`: devuelve cluster, endpoint, estado RPC, último blockhash, el `client` de Kit inyectado y `checkConnection()`.
- `useSolanaConnection()`: devuelve el `client` de Kit inyectado (deprecado en favor de `useSolanaClient()`).
- `useSolanaAccountInfo(address, options?)`: lee info de cuenta y puede suscribirse a cambios de cuenta.
- `useSolanaWallet()`: devuelve estado de wallet seleccionada, estado de conexión, capacidades y acciones de wallet.
- `useSolanaWallets()`: devuelve wallets descubiertas y acciones de selección/actualización de wallet.
- `useSolanaBalance(address, commitment?)`: lee el balance en lamports para una clave pública o dirección.
- `useSolanaTokenAccounts(owner, options?)`: carga todas las cuentas de token SPL para un propietario, consultando ambos programas Token y Token-2022 por defecto.
- `useSolanaTokenBalance(mint, owner)`: carga el balance y decimales del token SPL para un par mint/propietario vía la cuenta de token asociada.
- `useSolanaProgramAccounts(programId, options?)`: lee cuentas propiedad de programa con filtros y recorte de datos.
- `useSolanaTransactionConfirmation(options?)`: confirma una firma de transacción existente.
- `useSolanaSignatureStatus(signature, options?)`: lee, sondea o se suscribe a estado de firma.
- `useSolanaSignMessage()`: firma mensajes de autenticación o desafío de propiedad fuera de cadena.
- `useSolanaSignAndSendTransaction()`: firma, envía y opcionalmente confirma transacciones.
- `useSolanaAction(handler)`: máquina de estado de acción async genérica con abort-on-redispatch.
- `useSolanaRequest(source, options?)`: request de una sola vez que se vuelve a disparar cuando cambia su source, con stale-while-revalidate.
- `useSolanaSubscription(source, options?)`: datos en vivo de suscripciones RPC y otras fuentes de stream reactivas.
- `useSolanaTrackedData(source, options?)`: suscripción RPC sembrada por un fetch de una sola vez, deduplicada por slot.
- `useSolanaSignIn()`: dispara la función Sign In With Solana (SIWS) de una wallet.

Para cache keying entre montajes, los adaptadores SWR no se autoimportan. Importalos explícitamente desde el subpath del paquete Vue:

```ts
import { useRequestSwr } from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Consulta [Data Fetching Composables](/packages/vue#data-fetching-composables) para la semántica completa de los composables de request, subscription, tracked-data y SWR-cache.

- `useSolanaSelectedWalletAccount()`: lee el contexto de cuenta de wallet seleccionada de toda la app instalado por el plugin runtime.
- `useSolanaSignTransactions()`: firma múltiples transacciones en una sola solicitud de wallet.
- `useSolanaSignAndSendTransactions()`: firma y envía múltiples transacciones en una sola solicitud de wallet.
- `useSolanaPayer()` / `useSolanaIdentity()`: firmantes reactivos del cliente Kit (requiere un plugin signer).
- `useSolanaPlanTransaction()` / `useSolanaPlanTransactions()`: planifica mensajes de transacción desde inputs de instrucciones.
- `useSolanaSendTransaction()` / `useSolanaSendTransactions()`: usa el planner y el executor oficial instalados por el cliente por defecto; planifica, firma, envia y espera `confirmed` sin popup de wallet. Configura un signer en un plugin Vue solo de cliente o usa un signer embebido; usa `useSolanaSignAndSendTransaction(s)` cuando la wallet conectada deba aprobar cada transaccion.

Estos son aliases Nuxt para los composables de Vue.

El cliente por defecto creado por el módulo compone los plugins oficiales `solanaRpc()`, `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()`. El fallback custom anterior no se usa. `useSolanaSendTransaction()` y `useSolanaSendTransactions()` exponen la capacidad de envio oficial, pero el módulo no configura un payer porque `payer` y `payerSecretKey` se omiten de `ModuleOptions`. Su estado `sent` se alcanza cuando el executor oficial completa la operacion de envio y confirmacion en `confirmed`.

El paquete Vue usa nombres cortos como `useRpc()` porque los llamadores los importan explícitamente desde `@vue-solana/vue/useRpc`.

El módulo Nuxt expone nombres prefijados como `useSolanaRpc()` porque los composables autoimportados comparten el namespace Nuxt de toda la app y deberían evitar colisiones con código de la app u otros módulos.

`useSolana()` es la excepción porque ya tiene namespace y actúa como el accessor canónico de contexto tanto en Vue como en Nuxt.

Usa los nombres `useSolana*` dentro de apps Nuxt para que los autoimports funcionen sin imports explícitos.

Los bytes de transacción en la red (wire) y el helper Buffer de navegador son imports explícitos, no autoimports:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
```

La API Kit está disponible tanto como autoimport como import explícito:

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";

const { client, rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
const owner = address("PASTE_A_SOLANA_ADDRESS");
```

Usa imports directos `@vue-solana/core/*` solo para uso core de menor nivel.

Subpaths directos del paquete:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/kit`

El plugin runtime es solo de cliente. Los composables autoimportados se pueden llamar durante SSR y devuelven estado inerte hasta que la hidratación proporciona el contexto real de cliente. Dispara trabajo RPC y de wallet desde hooks de ciclo de vida de cliente o acciones de usuario.

El registro de Android Mobile Wallet Adapter también se ejecuta solo en el cliente. En Android Chrome y PWA de Chrome, `Mobile Wallet Adapter` puede aparecer en la misma lista `useSolanaWallets()` que las wallets de extensión de navegador. En navegadores iOS, Phantom, Solflare y Backpack pueden aparecer en la misma lista mediante enlaces universales específicos de wallet. Los adaptadores de wallet de app nativa de escritorio están planeados pero aún no implementados.

## Guías relacionadas

- [RPC and Clusters](/guides/rpc-and-clusters): configura el módulo Nuxt y lee estado RPC.
- [Wallets](/guides/wallets): usa `useSolanaWallets()` y `useSolanaWallet()` de forma segura en flujos de cliente.
- [Account Reads](/guides/account-reads): lee balances, datos de cuenta, cuentas de programa y estado de firma.
- [Transactions](/guides/transactions): firma, envía, confirma y maneja estado de transacción desde Nuxt.
- [Message Signing](/guides/message-signing): solicita firmas de wallet para mensajes fuera de cadena.
- [E2E Testing](/guides/e2e-testing): mockea RPC, suscripciones RPC y wallets en tests de Playwright.
- [Errors](/guides/errors): mapea errores de composables autoimportados a mensajes de UI seguros.

## Leer estado RPC

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

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

## Leer balance

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

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
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useSolanaTokenAccounts(owner);

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

`useSolanaTokenBalance()` devuelve balance y decimales null cuando la cuenta de token asociada no existe, sin tratarlo como un error.

## Manejo de errores

Los composables autoimportados de Nuxt exponen las mismas refs normalizadas `SolanaError | null` que `@vue-solana/vue`. Usa valores estables `error.value.code` para ramas de UI y conserva `error.value.cause` para registrar fallos originales de wallet, RPC, análisis, timeout o storage.

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
      return "La transacción está tardando más de lo esperado.";
    case "RPC_FAILURE":
      return "La solicitud RPC de Solana falló.";
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

Usa `useSolanaProgramAccounts()` con cuidado en nodos RPC públicos. Prefiere filtros estrechos, usa `dataSlice` para lecturas parciales y evita sondear escaneos amplios.

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
    <p>Dirección: {{ publicKey }}</p>
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">
      Conectar
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Desconectar</button>
  </section>
</template>
```

Las wallets de extensión de navegador se descubren mediante Solana Wallet Standard. Las wallets Android Mobile Wallet Adapter se registran mediante `@solana-mobile/wallet-standard-mobile` en clientes Android Chrome soportados y se exponen mediante la misma lista de wallets. Las entradas iOS Phantom, Solflare y Backpack se exponen mediante enlaces universales específicos de wallet en navegadores iOS. `refreshWallets()` solo actualiza la lista de wallets descubiertas, y `selectWallet()` solo configura la wallet activa. `connected` permanece false hasta que `connect()` tiene éxito, incluso si la extensión expone cuentas autorizadas previamente después de refrescar la página.

## Firma de mensajes

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Iniciar sesión en example.com"));
}
</script>
```

La firma de mensajes es para desafíos de propiedad de wallet o autenticación. No es firma de transacciones y no autoriza cambios de estado on-chain. Las wallets que no exponen firma de mensajes reportan `canSignMessage` como false y `execute()` rechaza con un error de wallet no soportada.

## Firmar, enviar y confirmar una transacción

Usa `useSolanaSignAndSendTransaction()` desde una acción de usuario del lado del cliente cuando la wallet conectada debe firmar y enviar una transacción. Pasa `confirm: true` cuando la UI debe esperar confirmación en vez de detenerse después del envío de la firma.

```vue
<script setup lang="ts">
import type { SolanaTransaction } from "@vue-solana/nuxt/kit";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction(transaction: SolanaTransaction) {
  // Construye el mensaje de la transacción con @solana/kit y serialízalo a bytes de la red (wire) primero.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Enviar transacción
    </button>
    <p>Estado: {{ status }}</p>
    <p v-if="signature">Enviada: {{ signature }}</p>
    <p v-if="confirmation">Confirmada en {{ confirmation.commitment }}</p>
    <p v-if="error">No se puede completar la transacción.</p>
  </section>
</template>
```

El estado pasa de `sending` a `sent` después del envío RPC. Cuando la confirmación está activada, luego pasa por `confirming` y termina en el commitment alcanzado, como `confirmed` o `finalized`. Si la confirmación agota el tiempo después del envío, `signature` sigue disponible para que la app pueda mostrar un enlace de explorador o sondear el estado de firma antes de reintentar.

Las transacciones enviadas por el cliente son diferentes: `useSolanaSendTransaction()` y `useSolanaSendTransactions()` usan el executor oficial de planes RPC. El executor espera `confirmed` antes de que `execute()` resuelva, asi que su estado `sent` significa que la operacion de envio y confirmacion del cliente termino. No muestran popup de wallet; usa un mensaje con signer embebido de la wallet conectada o instala un signer en un plugin Vue solo de cliente. No intentes configurar un `payerSecretKey` crudo en la configuracion runtime publica de Nuxt.

Los prompts de wallet deben activarse mediante interacción del usuario después de la hidratación. No llames a `execute()` durante SSR, en rutas de servidor ni automáticamente al cargar la página.

## Confirmar una firma existente

Usa `useSolanaTransactionConfirmation()` cuando ya tienes una firma y quieres estado de confirmación reactivo.

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
    <p v-if="confirmation">Alcanzó {{ confirmation.commitment }}</p>
    <p v-if="error">No se puede confirmar la firma.</p>
  </section>
</template>
```

## Seguir estado de firma

Usa `useSolanaSignatureStatus()` cuando necesitas comprobaciones continuas de estado para una firma enviada. Esto es útil después de un timeout porque una transacción podría aterrizar aún después de que la UI dejó de esperar.

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

Para enlaces de explorador, usa el cluster configurado. Los enlaces de devnet deberían incluir `?cluster=devnet`; tanto `mainnet` como el alias heredado `mainnet-beta` no deberían incluir query de cluster.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## App de ejemplo

Para un flujo Nuxt completo y ejecutable, consulta el [Nuxt example](/examples/nuxt).
