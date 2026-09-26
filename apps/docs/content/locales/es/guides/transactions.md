---
title: "Transacciones"
description: Firma, envía, confirma y maneja estado de transacciones con Vue Solana.
ogSection: Guides
surroundOrder: 11
---

Vue Solana proporciona helpers conscientes de wallets para enviar transacciones y composables para estado reactivo de transacciones.

Esta guía cubre el límite de Vue Solana: comprobaciones de capacidades de wallet, firma, envío, confirmación y errores. Construye mensajes de transacción con `@solana/kit` y los helpers de instrucciones de tu cliente de programa.

## Helper Core De Envío

Usa `signAndSendTransaction()` desde `@vue-solana/core/transaction` cuando ya tienes un cliente Kit, wallet y bytes de transacción en la red (wire).

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

El helper devuelve la firma RPC como string.

Para wallets Android Mobile Wallet Adapter, Vue Solana prefiere `signTransaction` más envío del lado de la app a través de `client.rpc.sendTransaction(...).send()` cuando está disponible, para que la app sea dueña del envío y pueda devolver de forma fiable la firma RPC después del traspaso a la wallet.

## Confirmar Una Firma

Usa `confirmTransactionSignature()` cuando necesites esperar hasta que una firma enviada alcance un nivel de commitment.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

La confirmación usa `confirmed` y un timeout de 60 segundos por defecto. Hace polling de `client.rpc.getSignatureStatuses([signature]).send()`, por lo que la transacción ya debe haber sido enviada.

## Transacciones Enviadas Por El Cliente

`createSolanaClient()` compone por defecto el stack oficial de transacciones de `@solana/kit-plugin-rpc`: `solanaRpc()`, `rpcTransactionPlanner()` y `rpcTransactionPlanSendingExecutor()`. El fallback custom anterior no se usa.

Usa `useSendTransaction()` o `useSendTransactions()` cuando el cliente debe planificar, firmar, enviar y confirmar sin popup de wallet. El executor oficial obtiene un blockhash nuevo, maneja limites de recursos y preflight, firma con los signers del cliente, envia por RPC y espera `confirmed`. El composable establece `status` en `sent` solo cuando termina la operacion de envio y confirmacion. El resultado simple expone `data.context.signature`; el resultado batch contiene el arbol del plan.

Configura un cliente core/Vue directo con `payer` o `payerSecretKey`; el envio del cliente requiere un `payer`. `payerSecretKey` es un keypair Ed25519 de 64 bytes codificado en base64 y solo es apropiado para desarrollo confiable o flows del servidor. Nunca pongas un secreto crudo o `payerSecretKey` en la configuracion runtime publica de Nuxt, y nunca expongas una keypair con fondos al navegador de un usuario final.

El flujo de wallet es separado: `useSignAndSendTransaction()` puede devolver despues del envio RPC por defecto, o esperar un commitment seleccionado con `confirm: true`. Mantén ese comportamiento cuando un usuario conectado debe aprobar una transaccion en su wallet.

## Construir Una Transferencia Real En Devnet

Este ejemplo crea una pequeña transferencia de sistema en devnet. Construye un mensaje de transacción Kit v0 y lo serializa a bytes de la red que Vue Solana pasa a la wallet para firma.

Las apps de navegador que crean o serializan transacciones deben inicializar una vez el polyfill de Buffer del paquete Vue antes de ejecutar código de transacciones:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

```ts
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
} from "@solana/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

function createTransferInstruction(from: Address, to: Address, lamports: number) {
  const data = new DataView(new ArrayBuffer(12));
  data.setUint32(0, 2, true); // System program transfer instruction index
  data.setBigUint64(4, BigInt(lamports), true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(data.buffer),
  };
}

async function createTransferTransaction(params: {
  rpc: { getLatestBlockhash(): { send(): Promise<{ value: { blockhash: string } }> } };
  from: Address;
  to: string;
  lamports: number;
}) {
  const recipient = address(params.to);
  const { value: latestBlockhash } = await params.rpc.getLatestBlockhash().send();

  const message = setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash,
    setTransactionMessageFeePayer(
      params.from,
      appendTransactionMessageInstruction(
        createTransferInstruction(params.from, recipient, params.lamports),
        createTransactionMessage({ version: 0 }),
      ),
    ),
  );

  return getTransactionEncoder().encode(compileTransaction(message));
}
```

`createTransferTransaction` devuelve bytes de transacción en la red (wire) (`Uint8Array`), que es lo que `SolanaWallet.signTransaction` y `useSignAndSendTransaction()` aceptan.

Usa SOL de devnet mientras pruebas. Empieza con un valor pequeño como `1_000` lamports (`0.000001` SOL). Nunca uses una wallet con fondos reales al validar un tutorial o flujo de ejemplo.

## Flujo De Firma Y Envío En Vue

Usa `useSignAndSendTransaction()` cuando un componente Vue necesite estado reactivo, errores y confirmación opcional.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PASTE_DEVNET_RECIPIENT_ADDRESS");
const lamports = ref(1_000);
const { client } = useSolanaClient();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  const from = publicKey.value;
  if (!from) return;

  const transaction = await createTransferTransaction({
    rpc: client.rpc,
    from,
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
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to send transaction.</p>
  </section>
</template>
```

`status` distingue el envío de la confirmación. Una `signature` devuelta significa que la transacción fue enviada al RPC. `confirmation` significa que la firma enviada alcanzó el commitment solicitado. Si la confirmación expira después del envío, sigue mostrando la firma y comprueba su estado antes de reintentar.

### Entradas y resultados de las peticiones de wallet

Los flujos de firma de wallet aceptan la transaccion de entrada como bytes de cable `Uint8Array` sin procesar que cumplen el esquema de transaccion de Solana. Construyelos con `@solana/kit` (o decodificalos desde una respuesta RPC en base64/base58); las cadenas base64, los objetos de transaccion y las listas de instrucciones no se aceptan aqui.

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` toma los bytes del mensaje sin procesar que se van a firmar. Toda peticion de envio de wallet tambien acepta las `SendTransactionOptions` de Kit:

| Opcion                | Descripcion                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Omite la simulacion de preflight antes de enviar.                                                                           |
| `maxRetries`          | Numero de reintentos del nodo RPC (`bigint`).                                                                               |
| `minContextSlot`      | Slot en el que se sabe que existe cualquier blockhash o nonce de la transaccion; enviar antes de ese slot puede rechazarse. |
| `preflightCommitment` | Commitment usado para la simulacion de preflight.                                                                           |

Formas de retorno:

- `useSignMessage().execute(bytes)` resuelve a `{ signedMessage, signature }`, ambos `Uint8Array`.
- `useSignTransactions().execute(transactions)` resuelve al `Uint8Array[]` firmado (tambien expuesto como `signedTransactions`); pasa un array de un solo elemento para una transaccion.
- `useSignAndSendTransaction().execute(transaction)` resuelve a la cadena `signature` enviada; con `confirm: true` tambien rellena `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` resuelve a un `string[]` de firmas (tambien expuesto como `signatures`).

Una wallet puede modificar el mensaje o la transaccion antes de firmar (por ejemplo, para anadir su propia instruccion o cambiar el pagador de la comision) y el Wallet Standard lo permite explicitamente. Vuelve a leer el `signedMessage` o los bytes de la transaccion firmada devueltos en lugar de asumir que coinciden byte a byte con tu entrada.

## Enlaces De Explorer

Los enlaces de Explorer deben coincidir con el cluster que usa tu app.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Para devnet, los enlaces deben verse como `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`. Tanto `mainnet` como el alias heredado `mainnet-beta` omiten intencionalmente el query de cluster.

## Estado Genérico De Transacción

Usa `useTransaction()` cuando tu operación asíncrona similar a una transacción no encaje en el helper integrado de firma/envío.

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` centraliza estados de carga, éxito, error y timeout para flujos personalizados.

## Autoimportaciones De Nuxt

Nuxt expone:

- `useSolanaSignAndSendTransaction()`
- `useSolanaSendTransaction()`
- `useSolanaSendTransactions()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const { signature, status, error, execute } = useSolanaSignAndSendTransaction();

async function submit(transaction: Uint8Array) {
  await execute(transaction, { confirm: true });
}
</script>
```

Llama métodos de transacción desde acciones del usuario en el cliente. No dispares firma de wallet durante SSR. Las opciones del modulo Nuxt omiten `payer` y `payerSecretKey`; configura un `payer` en un plugin Vue solo de cliente en vez de poner un secreto en la configuracion runtime publica.

Usa `useSolanaTransactionConfirmation({ commitment: "confirmed" })` y llama `confirm(signature)` cuando necesites confirmar una firma devuelta por otro flujo. Usa `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })` cuando quieras seguir comprobando el estado después de un timeout o redirección.

## Manejo De Errores

Los helpers de transacción normalizan fallos como `SolanaError`.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
      case "WALLET_NOT_CONNECTED":
        // Pide al usuario que conecte una wallet.
        break;
      case "WALLET_FEATURE_UNSUPPORTED":
        // Oculta o deshabilita acciones de transacción no admitidas.
        break;
      case "USER_REJECTED":
        // El usuario rechazó el prompt de la wallet.
        break;
      case "TRANSACTION_TIMEOUT":
        // Comprueba el estado de la firma antes de reintentar.
        break;
      case "RPC_FAILURE":
        // Falló el envío RPC o la confirmación.
        console.error(error.cause);
        break;
    }
  }
}
```

## Lista De Seguridad

- Mantén las claves de firma de transacciones del cliente en un servidor confiable o en un signer efimero de demo explicito; nunca expongas secretos con fondos mediante la configuracion runtime publica de Nuxt.
- Muestra a los usuarios lo que están a punto de firmar antes de abrir un prompt de wallet.
- Nunca firmes ni envíes transacciones sin una acción explícita del usuario.
- Nunca solicites ni manejes claves privadas.
- Comprueba las capacidades de la wallet antes de mostrar acciones de firma.
- Trata los errores RPC y de wallet como datos no confiables; mapea los a mensajes seguros de UI.
- Después de un timeout, comprueba el estado de la firma antes de reintentar para evitar envíos duplicados.
- Conserva la firma enviada en la UI aunque la confirmación falle o expire.
- Enlaza al cluster correcto de Solana Explorer para que los usuarios no confundan transacciones de devnet y mainnet.
