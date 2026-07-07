---
title: "Transacciones"
description: Firma, envia, confirma y maneja estado de transacciones con Vue Solana.
ogSection: Guias
surroundOrder: 11
---

Vue Solana proporciona helpers conscientes de wallets para enviar transacciones y composables para estado reactivo de transacciones.

Esta guia cubre el limite de Vue Solana: comprobaciones de capacidades de wallet, firma, envio, confirmacion y errores. Construye instrucciones de transaccion con `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3` o tu cliente de programa.

## Helper Core De Envio

Usa `signAndSendTransaction()` desde `@vue-solana/core/transaction` cuando ya tienes una `Connection`, wallet y transaccion.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction, {
  skipPreflight: false,
});
```

El helper devuelve la firma RPC como string.

Para wallets Android Mobile Wallet Adapter, Vue Solana prefiere `signTransaction` mas `connection.sendRawTransaction()` cuando esta disponible, para que la app sea duena del envio y pueda devolver de forma fiable la firma RPC despues del traspaso a la wallet.

## Confirmar Una Firma

Usa `confirmTransactionSignature()` cuando necesites esperar hasta que una firma enviada alcance un nivel de commitment.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(connection, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

La confirmacion usa `confirmed` y un timeout de 60 segundos por defecto.

## Construir Una Transferencia Real En Devnet

Este ejemplo crea una pequena transferencia de sistema en devnet. Usa el subpath web3 del paquete Vue para primitivas de Solana y Vue Solana para estado de wallet y envio.

Las apps de navegador que crean o serializan transacciones deben inicializar una vez el polyfill de Buffer del paquete Vue antes de ejecutar codigo de transacciones:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

```ts
import { PublicKey, SystemProgram, Transaction } from "@vue-solana/vue/web3";

async function createTransferTransaction(params: {
  connection: Connection;
  from: PublicKey;
  to: string;
  lamports: number;
}) {
  const recipient = new PublicKey(params.to);
  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: params.from,
    blockhash,
    lastValidBlockHeight,
  });

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: params.from,
      toPubkey: recipient,
      lamports: params.lamports,
    }),
  );

  return transaction;
}
```

Usa SOL de devnet mientras pruebas. Empieza con un valor pequeno como `1_000` lamports (`0.000001` SOL). Nunca uses una wallet con fondos reales al validar un tutorial o flujo de ejemplo.

## Flujo De Firma Y Envio En Vue

Usa `useSignAndSendTransaction()` cuando un componente Vue necesite estado reactivo, errores y confirmacion opcional.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PEGA_DIRECCION_DESTINO_DEVNET");
const lamports = ref(1_000);
const connection = useConnection();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  if (!publicKey.value) return;

  const transaction = await createTransferTransaction({
    connection,
    from: publicKey.value,
    to: recipient.value,
    lamports: lamports.value,
  });

  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed" },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Enviar transaccion
    </button>
    <p>Estado: {{ status }}</p>
    <p v-if="signature">Firma: {{ signature }}</p>
    <p v-if="confirmation">Confirmada en {{ confirmation.commitment }}</p>
    <p v-if="error">No se pudo enviar la transaccion.</p>
  </section>
</template>
```

`status` distingue el envio de la confirmacion. Una `signature` devuelta significa que la transaccion fue enviada al RPC. `confirmation` significa que la firma enviada alcanzo el commitment solicitado. Si la confirmacion expira despues del envio, sigue mostrando la firma y comprueba su estado antes de reintentar.

## Enlaces De Explorer

Los enlaces de Explorer deben coincidir con el cluster que usa tu app.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Para devnet, los enlaces deben verse como `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`. Los enlaces de mainnet omiten intencionalmente el query de cluster.

## Estado Generico De Transaccion

Usa `useTransaction()` cuando tu operacion asincrona similar a una transaccion no encaje en el helper integrado de firma/envio.

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` centraliza estados de carga, exito, error y timeout para flujos personalizados.

## Autoimportaciones De Nuxt

Nuxt expone:

- `useSolanaSignAndSendTransaction()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const { signature, status, error, execute } = useSolanaSignAndSendTransaction();

async function submit(transaction: Transaction) {
  await execute(transaction, { confirm: true });
}
</script>
```

Llama metodos de transaccion desde acciones del usuario en el cliente. No dispares firma de wallet durante SSR.

Usa `useSolanaTransactionConfirmation({ commitment: "confirmed" })` y llama `confirm(signature)` cuando necesites confirmar una firma devuelta por otro flujo. Usa `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })` cuando quieras seguir comprobando el estado despues de un timeout o redireccion.

## Manejo De Errores

Los helpers de transaccion normalizan fallos como `SolanaError`.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(connection, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
      case "WALLET_NOT_CONNECTED":
        // Pide al usuario que conecte una wallet.
        break;
      case "WALLET_FEATURE_UNSUPPORTED":
        // Oculta o deshabilita acciones de transaccion no admitidas.
        break;
      case "USER_REJECTED":
        // El usuario rechazo el prompt de la wallet.
        break;
      case "TRANSACTION_TIMEOUT":
        // Comprueba el estado de la firma antes de reintentar.
        break;
      case "RPC_FAILURE":
        // Fallo el envio RPC o la confirmacion.
        console.error(error.cause);
        break;
    }
  }
}
```

## Lista De Seguridad

- Muestra a los usuarios lo que estan a punto de firmar antes de abrir un prompt de wallet.
- Nunca firmes ni envies transacciones sin una accion explicita del usuario.
- Nunca solicites ni manejes claves privadas.
- Comprueba las capacidades de la wallet antes de mostrar acciones de firma.
- Trata los errores RPC y de wallet como datos no confiables; mapealos a mensajes seguros de UI.
- Despues de un timeout, comprueba el estado de la firma antes de reintentar para evitar envios duplicados.
- Conserva la firma enviada en la UI aunque la confirmacion falle o expire.
- Enlaza al cluster correcto de Solana Explorer para que los usuarios no confundan transacciones de devnet y mainnet.
