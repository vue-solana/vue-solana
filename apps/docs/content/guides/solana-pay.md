---
title: "Solana Pay"
description: Create Solana Pay transfer requests, render and scan QR codes, and confirm settlement by reference.
ogSection: Guides
surroundOrder: 11
---

Solana Pay is a URL standard for payment requests. A transfer request encodes the recipient, an optional amount, an optional SPL token mint, and optional display fields. Wallets and payment apps read that URL and prepare a matching transfer.

Vue Solana implements Solana Pay with `@solana/kit` directly. No extra Solana Pay package is required, and `qrcode` is loaded lazily only when you render a QR code.

| Need                                 | API                                                      |
| ------------------------------------ | -------------------------------------------------------- |
| Build a request URL                  | `encodeURL()`, `encodeTransferRequestURL()`              |
| Build a deferred transaction request | `encodeTransactionRequestURL()`                          |
| Read a scanned or pasted URL         | `parseURL()`                                             |
| Render a QR code                     | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| Track a reference on chain           | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## Create A Transfer Request

`encodeURL()` takes Kit `Address` values. Amounts are `bigint` lamports and are encoded as a decimal SOL string, so `100_000_000n` becomes `amount=0.1`.

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
// parsed.amount is a bigint again: 100000000n
```

Add a `reference` when you need to find the payment later. A reference is a public key that is not involved in the transfer itself; the payer attaches it to the transaction, and `getSignaturesForAddress(reference)` then returns the settlement.

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })` builds a transaction request instead: the wallet fetches `link`, and your server responds with a transaction to sign. Vue Solana parses and encodes those URLs but does not build or send the linked transaction, so the endpoint and its authorization are your responsibility.

In Vue, `useSolanaPay()` wraps the same primitives and generates a reference for you:

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

`createTransferRequest` returns the URL as a string and fills `requestUrl`, `parsedRequest`, `reference`, and `status: "pending"`. `parseRequest(value)` parses untrusted input, `createReference()` mints a standalone reference, and `reset()` clears the state.

## Render The QR Code

`createQR(url)` returns SVG text. `createQRDataURL()` returns a percent-encoded `data:` URL that needs no `Buffer` polyfill, and `createQRCanvas(canvas, url, options)` writes to a canvas element.

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

In Vue, render the string with `v-html` — the SVG comes from the `qrcode` encoder, not from user input:

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

`generate(url)` defaults to a 512 px white-on-black code. Additional options are passed in `createQR` argument order, so `generate(url, { size: 320, background: "#fff", color: "#111" })` maps to `createQR(url, 320, "#fff", "#111")`.

## Scan And Validate

`useSolanaQrScanner()` opens the rear camera, polls for QR codes with `BarcodeDetector`, and parses each result with `parseURL()`. It is browser-only: guard it behind a client boundary and never call `start()` during SSR.

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

`start()` rejects when `navigator.mediaDevices` is missing. When the browser has no `BarcodeDetector`, the camera still opens but nothing is detected, so offer a paste field that calls `scanFromText(text)`. Both `start()` and `scanFromText()` set `parsed` to the `parseURL()` result and leave `error` set when parsing fails; the scan loop ignores parse errors and keeps scanning.

Treat scanned data as hostile input. Show the recipient, amount, token mint, label, and memo, and let the user confirm before any wallet prompt. There is no auto-send path in Vue Solana, and you should not add one.

## Track Settlement

A transfer request is only a request. Settlement means a confirmed transaction that includes your reference, pays the expected recipient, and carries the expected amount and token.

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

`verifySolanaPayPayment()` polls `getSignaturesForAddress(reference)` until the timeout and returns `{ status, signature, verified, reason }`. Fulfil an order only when `verified` is `true`. `getSolanaPayPaymentStatus(rpc, reference)` is the cheaper, non-verifying read: it reports `pending` when no signature exists yet, `found` when one does, and `error` when the RPC call fails.

`useSolanaPay()` exposes `confirmTransfer()`, which verifies against the parsed request and stores the outcome in `status` (`idle`, `pending`, `found`, `confirmed`, `finalized`, `expired`, `error`). `useSolanaPayConfirmation()` polls the same status on an interval:

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()` stops polling when the component unmounts; call `stopPolling()` to end it earlier.

## Nuxt Auto-Imports

The Nuxt module auto-imports `useSolanaPay()`, `useSolanaPayConfirmation()`, `useSolanaQrCode()`, and `useSolanaQrScanner()` under the same names. Wrap the scanner and any `BarcodeDetector` access in `<ClientOnly>` so server rendering never touches camera APIs.

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

Core helpers are not auto-imported. Import them from `@vue-solana/nuxt/kit` for Kit types and from the Vue package subpaths, or call the composables instead.

Both example apps wire these composables into runnable merchant (`SolanaPayPanel`) and scanner (`SolanaPayScannerPanel`) panels. The Nuxt scanner stays inside `<ClientOnly>`, and the scanner panels only open a request in a wallet; they never send it.

## Security Boundaries

- Parse every URL with `parseURL()` before showing it; never trust a scanned string.
- Show recipient, amount, token, and memo, and require an explicit user action before signing.
- Never auto-send a transaction from a scanned code.
- Verify on chain before releasing goods or credit.
- Never store private keys or secrets in client code, and never put funded keys in Nuxt public runtime config.
- Treat a `reference` as a lookup key, not as proof of payment on its own.

## Manual Devnet Test

1. Switch your wallet to devnet and request free SOL from `https://faucet.solana.com`.
2. Create a transfer request for a few thousand lamports and render the QR code.
3. Scan it with a Solana Pay capable wallet, or paste the URL into your own scanner UI.
4. Confirm the wallet shows the same recipient, amount, and memo that your page shows.
5. Approve the transfer, then call `verifySolanaPayPayment()` with the same reference and check that `verified` becomes `true`.
6. Re-run settlement with a wrong amount or recipient and confirm it does not verify.

Use tiny amounts while testing. A reference that never settles is the expected result when the payer sends a plain transfer without the reference account attached.
