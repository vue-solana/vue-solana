---
title: "Firma De Mensajes"
description: Firma mensajes de autenticacion o propiedad sin crear transacciones on-chain.
ogSection: Guias
surroundOrder: 12
---

La firma de mensajes demuestra el control de una wallet sobre un mensaje off-chain. No autoriza cambios de estado on-chain y no es una firma de transaccion.

Usa la firma de mensajes para desafios de autenticacion, comprobaciones de propiedad de cuenta o textos de consentimiento que tu aplicacion verifica fuera de la cadena.

## Firma De Mensajes En Vue

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const canSign = computed(() => connected.value && canSignMessage.value);

async function signIn() {
  const message = new TextEncoder().encode("Iniciar sesion en example.com");
  await execute(message);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSign" @click="signIn">Firmar mensaje</button>
    <p>Estado: {{ status }}</p>
    <p v-if="signature">Bytes de la firma: {{ signature.length }}</p>
    <p v-if="error">No se pudo firmar el mensaje.</p>
  </section>
</template>
```

Las wallets que no exponen firma de mensajes reportan `canSignMessage` como false. Llamar a `execute()` sin soporte rechaza con `WALLET_FEATURE_UNSUPPORTED`.

## Firma De Mensajes En Nuxt

Nuxt autoimporta `useSolanaSignMessage()` y `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Iniciar sesion en mi app Nuxt"));
}
</script>
```

Solo llama a la firma de mensajes desde acciones del usuario en el cliente.

## Texto Del Desafio

Usa un texto de desafio claro y especifico de la aplicacion. Los usuarios deben entender lo que estan firmando.

Un buen texto de desafio normalmente incluye:

- Nombre de la app o dominio.
- Proposito de la firma.
- Nonce o valor de desafio de un solo uso.
- Hora de emision y hora de expiracion.

Ejemplo:

```txt
Iniciar sesion en example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Emitido En: 2026-07-02T12:00:00Z
Expira En: 2026-07-02T12:10:00Z
```

## Limite De Verificacion

Vue Solana ayuda a solicitar la firma a la wallet. Tu aplicacion es responsable de la verificacion del lado del servidor, el almacenamiento de nonces, las comprobaciones de expiracion y la creacion de sesiones.

No trates una firma sobre texto generico como permiso para transferir tokens o cambiar estado on-chain.

## Manejo De Errores

Los errores de firma de mensajes usan el mismo modelo normalizado `SolanaError` que los helpers de wallets y transacciones.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Elige una wallet primero.";
    case "WALLET_NOT_CONNECTED":
      return "Conecta tu wallet primero.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "Esta wallet no admite firma de mensajes.";
    case "USER_REJECTED":
      return "La firma del mensaje fue rechazada.";
    default:
      return null;
  }
});
```

## Lista De Seguridad

- Usa nonces de un solo uso para desafios de autenticacion.
- Haz que los desafios expiren rapidamente.
- Verifica las firmas en el servidor antes de crear una sesion.
- Haz que el texto firmado sea legible para humanos.
- Nunca sugieras que la firma de mensajes envia una transaccion.
- Nunca reutilices un flujo de firma de transacciones para texto de autenticacion.
