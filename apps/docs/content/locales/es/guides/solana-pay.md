---
title: "Solana Pay"
description: Crea solicitudes de transferencia de Solana Pay, renderiza y escanea códigos QR y confirma la liquidación por referencia.
ogSection: Guides
surroundOrder: 11
---

Solana Pay es un estándar de URL para solicitudes de pago. Una solicitud de transferencia codifica el destinatario, un importe opcional, un mint de token SPL opcional y campos de presentación opcionales. Las wallets y las apps de pago leen esa URL y preparan una transferencia que coincide.

Vue Solana implementa Solana Pay directamente con `@solana/kit`. No se necesita ningún paquete adicional de Solana Pay, y `qrcode` se carga de forma diferida solo cuando renderizas un código QR.

| Necesidad                                   | API                                                      |
| ------------------------------------------- | -------------------------------------------------------- |
| Crear una URL de solicitud                  | `encodeURL()`, `encodeTransferRequestURL()`              |
| Crear una solicitud de transacción diferida | `encodeTransactionRequestURL()`                          |
| Leer una URL escaneada o pegada             | `parseURL()`                                             |
| Renderizar un código QR                     | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| Seguir una referencia on chain              | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## Crear una solicitud de transferencia

`encodeURL()` recibe valores `Address` de Kit. Los importes son `bigint` en lamports y se codifican como una cadena decimal de SOL, así que `100_000_000n` se convierte en `amount=0.1`.

```ts
import { address } from "@vue-solana/vue/kit";
import { encodeURL, parseURL } from "@vue-solana/core/solana-pay";

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  label: "Example store",
  message: "Order 1042",
  memo: "order-1042",
});

// solana:PASTE_A_SOLANA_ADDRESS?amount=0.1&label=Example+store&message=Order+1042&memo=order-1042
console.log(url.toString());

const parsed = parseURL(url.toString());
// parsed.amount vuelve a ser un bigint: 100000000n
```

Añade un `reference` cuando necesites encontrar el pago más adelante. Una referencia es una clave pública que no participa en la transferencia en sí; el pagador la adjunta a la transacción y entonces `getSignaturesForAddress(reference)` devuelve la liquidación.

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })` crea en cambio una solicitud de transacción: la wallet obtiene `link` y tu servidor responde con una transacción para firmar. Vue Solana parsea y codifica esas URLs, pero no construye ni envía la transacción enlazada, así que el endpoint y su autorización son responsabilidad tuya.

En Vue, `useSolanaPay()` envuelve las mismas primitivas y genera una referencia por ti:

```vue
<script setup lang="ts">
import { address } from "@vue-solana/vue/kit";
import { useSolanaPay } from "@vue-solana/vue/useSolanaPay";

const { createTransferRequest, requestUrl, reference, parsedRequest, status, loading, error } =
  useSolanaPay();

async function createRequest() {
  await createTransferRequest({
    recipient: address("PASTE_A_SOLANA_ADDRESS"),
    amount: 100_000_000n,
    label: "Example store",
    message: "Order 1042",
  });
}
</script>
```

`createTransferRequest` devuelve la URL como cadena y rellena `requestUrl`, `parsedRequest`, `reference` y `status: "pending"`. `parseRequest(value)` parsea entrada no confiable, `createReference()` genera una referencia independiente y `reset()` limpia el estado.

## Renderizar el código QR

`createQR(url)` devuelve texto SVG. `createQRDataURL()` devuelve una URL `data:` con codificación porcentual que no necesita el polyfill de `Buffer`, y `createQRCanvas(canvas, url, options)` escribe en un elemento canvas.

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

En Vue, renderiza la cadena con `v-html`: el SVG viene del codificador `qrcode`, no de entrada del usuario:

```vue
<script setup lang="ts">
import { useSolanaQrCode } from "@vue-solana/vue/useSolanaQrCode";

const { svg, generate, loading, error } = useSolanaQrCode();

async function showQr(requestUrl: string) {
  await generate(requestUrl);
}
</script>

<template>
  <div v-if="svg" v-html="svg" />
</template>
```

`generate(url)` usa por defecto un código de 512 px en blanco sobre negro. Las opciones adicionales se pasan en el orden de argumentos de `createQR`, así que `generate(url, { size: 320, background: "#fff", color: "#111" })` se traduce en `createQR(url, 320, "#fff", "#111")`.

## Escanear y validar

`useSolanaQrScanner()` abre la cámara trasera, consulta códigos QR con `BarcodeDetector` y parsea cada resultado con `parseURL()`. Solo funciona en el navegador: úsalo detrás de un límite de cliente y nunca llames a `start()` durante el SSR.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSolanaQrScanner } from "@vue-solana/vue/useSolanaQrScanner";

const video = ref<HTMLVideoElement | null>(null);
const { scanning, parsed, error, start, stop, reset } = useSolanaQrScanner();

async function beginScan() {
  await start({ video: video.value ?? undefined, scanIntervalMs: 500 });
}
</script>

<template>
  <video ref="video" playsinline muted />
  <button type="button" @click="beginScan">Start scanner</button>
  <button type="button" @click="stop">Stop</button>
  <p v-if="scanning">Scanning…</p>
  <p v-if="error">Camera unavailable — paste the payment URL instead.</p>
</template>
```

`start()` se rechaza cuando falta `navigator.mediaDevices`. Cuando el navegador no tiene `BarcodeDetector`, la cámara se abre igualmente pero no se detecta nada, así que ofrece un campo para pegar la URL que llame a `scanFromText(text)`. Tanto `start()` como `scanFromText()` dejan `parsed` con el resultado de `parseURL()` y mantienen `error` cuando el parseo falla; el bucle de escaneo ignora los errores de parseo y sigue escaneando.

Trata los datos escaneados como entrada hostil. Muestra el destinatario, el importe, el mint del token, la etiqueta y el memo, y deja que el usuario confirme antes de cualquier petición a la wallet. Vue Solana no tiene ninguna ruta de envío automático, y no deberías añadir una.

## Seguir la liquidación

Una solicitud de transferencia solo es una solicitud. La liquidación significa una transacción confirmada que incluye tu referencia, paga al destinatario esperado y lleva el importe y el token esperados.

```ts
import { verifySolanaPayPayment } from "@vue-solana/core/solana-pay-confirmation";

const result = await verifySolanaPayPayment(rpc, {
  reference,
  expectedRecipient: "PASTE_A_SOLANA_ADDRESS",
  expectedAmount: 100_000_000n,
  // expectedTokenMint: mint, // required for SPL token payments
  commitment: "confirmed",
  timeoutMs: 30_000,
});
```

`verifySolanaPayPayment()` consulta `getSignaturesForAddress(reference)` hasta el timeout y devuelve `{ status, signature, verified, reason }`. Entrega un pedido solo cuando `verified` sea `true`. `getSolanaPayPaymentStatus(rpc, reference)` es la lectura más barata, sin verificación: informa `pending` cuando todavía no existe ninguna firma, `found` cuando existe alguna y `error` cuando falla la llamada RPC.

`useSolanaPay()` expone `confirmTransfer()`, que verifica contra la solicitud parseada y guarda el resultado en `status` (`idle`, `pending`, `found`, `confirmed`, `finalized`, `expired`, `error`). `useSolanaPayConfirmation()` consulta ese mismo estado en un intervalo:

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()` detiene el polling cuando el componente se desmonta; llama a `stopPolling()` para terminarlo antes.

## Auto-imports de Nuxt

El módulo de Nuxt auto-importa `useSolanaPay()`, `useSolanaPayConfirmation()`, `useSolanaQrCode()` y `useSolanaQrScanner()` con los mismos nombres. Envuelve el escáner y cualquier acceso a `BarcodeDetector` en `<ClientOnly>` para que el renderizado en servidor nunca toque APIs de cámara.

```vue
<template>
  <ClientOnly>
    <QrScannerPanel />
    <template #fallback>
      <p>Scanner loads in the browser.</p>
    </template>
  </ClientOnly>
</template>
```

Los helpers de core no se auto-importan. Impórtalos desde `@vue-solana/nuxt/kit` para los tipos de Kit y desde los subpaths del paquete Vue, o llama a los composables.

Ambas apps de ejemplo integran estos composables en paneles ejecutables de comercio (`SolanaPayPanel`) y de escáner (`SolanaPayScannerPanel`). El escáner de Nuxt permanece dentro de `<ClientOnly>`, y los paneles del escáner solo abren la solicitud en una wallet; nunca la envían.

## Límites de seguridad

- Parsea cada URL con `parseURL()` antes de mostrarla; nunca confíes en una cadena escaneada.
- Muestra destinatario, importe, token y memo, y exige una acción explícita del usuario antes de firmar.
- Nunca envíes una transacción automáticamente desde un código escaneado.
- Verifica on chain antes de liberar productos o crédito.
- Nunca guardes claves privadas ni secretos en el código de cliente, y nunca pongas claves con fondos en la runtime config pública de Nuxt.
- Trata un `reference` como clave de búsqueda, no como prueba de pago por sí solo.

## Prueba manual en devnet

1. Cambia tu wallet a devnet y solicita SOL gratis en `https://faucet.solana.com`.
2. Crea una solicitud de transferencia de unos pocos miles de lamports y renderiza el código QR.
3. Escanéalo con una wallet compatible con Solana Pay, o pega la URL en tu propia interfaz de escaneo.
4. Confirma que la wallet muestra el mismo destinatario, importe y memo que muestra tu página.
5. Aprueba la transferencia y luego llama a `verifySolanaPayPayment()` con la misma referencia y comprueba que `verified` pasa a `true`.
6. Repite la liquidación con un importe o un destinatario incorrectos y confirma que no verifica.

Usa importes pequeños mientras pruebas. Una referencia que nunca liquida es el resultado esperado cuando el pagador envía una transferencia simple sin adjuntar la cuenta de referencia.
