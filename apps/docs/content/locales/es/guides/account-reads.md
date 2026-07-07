---
title: "Lecturas de cuentas"
description: Lee balances, datos de cuenta, cuentas de programa y estado de firmas de forma segura desde Vue o Nuxt.
ogSection: Guías
surroundOrder: 10
---

Vue Solana incluye composables para rutas comunes de lectura en Solana: balances, información de cuenta, cuentas de programa y estado de firmas.

Usa esta guía cuando tu app necesite leer estado de la cadena sin firmar una transacción.

## Parsear direcciones

El código agnóstico al framework puede normalizar una dirección Solana con `parsePublicKey()`.

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");

if (publicKey) {
  const balance = await connection.getBalance(publicKey);
}
```

`parsePublicKey()` acepta un `PublicKey`, string de dirección, objeto tipo ref, getter, `null` o `undefined`. Las direcciones string inválidas lanzan `INVALID_ADDRESS`.

## Leer balance en Vue

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Leer información de cuenta

Usa `useAccountInfo()` para una sola cuenta. Habilita `watch` cuando necesites actualizaciones en vivo de la cuenta.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});
</script>
```

Cuando `watch: true` está habilitado, Vue Solana elimina automáticamente el listener WebSocket al desmontar el componente. Llama a `stopWatching()` para eliminar antes el listener actual y evitar reinicios automáticos para esa instancia del composable.

## Leer cuentas de programa

Usa `useProgramAccounts()` para cuentas propiedad de un program id.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> Advertencia: los escaneos de cuentas de programa pueden ser costosos. Usa filtros estrechos, `dataSlice`, caché, paginación, indexación o infraestructura RPC dedicada para lecturas de producción.

## Leer estado de firma

Usa `useSignatureStatus()` para rastrear una firma de transacción conocida.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, confirmationStatus, error, refresh } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

Usa polling para UI de progreso de corta duración. Evita polling indefinido desde páginas de alto tráfico.

## Autoimports de Nuxt

Nuxt expone los mismos helpers de lectura como composables autoimportados:

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Los composables de Nuxt pueden llamarse durante SSR y devuelven estado inerte hasta que la hidratación proporciona el contexto real del cliente. Dispara actualizaciones de red desde hooks de ciclo de vida del cliente o acciones de usuario cuando los datos dependen de contexto solo disponible en navegador.

## Inputs nulos e inválidos

Los composables de lectura limpian estado sin llamar a RPC cuando la dirección, program id o firma es `null`.

Las direcciones string inválidas limpian datos obsoletos, establecen `error` y no llaman al método RPC. Ramifica con `error.value.code` para mensajes orientados al usuario.

## Checklist de coste RPC

- Prefiere lecturas directas de una sola cuenta cuando sea posible.
- Usa filtros para escaneos de cuentas de programa.
- Usa `dataSlice` cuando solo necesites parte de los datos de cuenta.
- Evita escaneos amplios desde landing pages o cada navegación de ruta.
- Evita intervalos de polling agresivos en endpoints RPC públicos.
- Cachea o indexa datos que muchos usuarios pedirán repetidamente.
