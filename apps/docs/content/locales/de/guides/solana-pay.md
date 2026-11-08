---
title: "Solana Pay"
description: Erstelle Solana-Pay-Transfer-Requests, rendere und scanne QR-Codes und bestätige die Abwicklung anhand einer Reference.
ogSection: Anleitungen
surroundOrder: 11
---

Solana Pay ist ein URL-Standard für Zahlungsanforderungen. Ein Transfer-Request kodiert den Empfänger, einen optionalen Betrag, einen optionalen SPL-Token-Mint und optionale Anzeigefelder. Wallets und Zahlungs-Apps lesen diese URL und bereiten eine passende Überweisung vor.

Vue Solana implementiert Solana Pay direkt mit `@solana/kit`. Ein zusätzliches Solana-Pay-Paket ist nicht nötig, und `qrcode` wird nur dann lazy geladen, wenn du einen QR-Code renderst.

| Bedarf                                       | API                                                      |
| -------------------------------------------- | -------------------------------------------------------- |
| Eine Request-URL bauen                       | `encodeURL()`, `encodeTransferRequestURL()`              |
| Einen verzögerten Transaktions-Request bauen | `encodeTransactionRequestURL()`                          |
| Eine gescannte oder eingefügte URL lesen     | `parseURL()`                                             |
| Einen QR-Code rendern                        | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| Eine Reference on-chain verfolgen            | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## Einen Transfer-Request erstellen

`encodeURL()` nimmt Kit-`Address`-Werte. Beträge sind `bigint`-Lamports und werden als dezimaler SOL-String kodiert, `100_000_000n` wird also zu `amount=0.1`.

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

Füge eine `reference` hinzu, wenn du die Zahlung später finden musst. Eine Reference ist ein öffentlicher Schlüssel, der an der Überweisung selbst nicht beteiligt ist; der Zahler hängt sie an die Transaktion, und `getSignaturesForAddress(reference)` liefert dann die Abwicklung.

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })` baut stattdessen einen Transaktions-Request: Die Wallet ruft `link` ab, und dein Server antwortet mit einer zu signierenden Transaktion. Vue Solana parst und kodiert solche URLs, baut oder sendet die verlinkte Transaktion aber nicht — Endpoint und Autorisierung liegen in deiner Verantwortung.

In Vue kapselt `useSolanaPay()` dieselben Primitiven und erzeugt eine Reference für dich:

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

`createTransferRequest` gibt die URL als String zurück und füllt `requestUrl`, `parsedRequest`, `reference` und `status: "pending"`. `parseRequest(value)` parst nicht vertrauenswürdige Eingaben, `createReference()` erzeugt eine eigenständige Reference, und `reset()` leert den Zustand.

## Den QR-Code rendern

`createQR(url)` liefert SVG-Text. `createQRDataURL()` liefert eine prozentkodierte `data:`-URL, die keinen `Buffer`-Polyfill braucht, und `createQRCanvas(canvas, url, options)` schreibt in ein Canvas-Element.

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

In Vue renderst du den String mit `v-html` — das SVG kommt vom `qrcode`-Encoder, nicht aus Nutzereingaben:

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

`generate(url)` erzeugt standardmäßig einen 512-Pixel-Code in Weiß auf Schwarz. Weitere Optionen werden in der Argumentreihenfolge von `createQR` übergeben, `generate(url, { size: 320, background: "#fff", color: "#111" })` entspricht also `createQR(url, 320, "#fff", "#111")`.

## Scannen und validieren

`useSolanaQrScanner()` öffnet die rückseitige Kamera, fragt mit `BarcodeDetector` nach QR-Codes und parst jedes Ergebnis mit `parseURL()`. Der Scanner läuft nur im Browser: Schütze ihn hinter einer Client-Grenze und rufe `start()` niemals während der SSR auf.

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

`start()` wird abgelehnt, wenn `navigator.mediaDevices` fehlt, und ebenso, wenn der Browser keine QR-Codes erkennen kann: iOS und Firefox haben keinen `BarcodeDetector`, und manche Android-Builds liefern einen ohne QR-Unterstützung. Die Kamera öffnet sich dann gar nicht, biete deshalb immer ein Einfügefeld an, das `scanFromText(text)` aufruft. Sobald eine gültige Solana-Pay-URL gelesen wurde, schließt sich die Kamera, und `parsed` enthält das Ergebnis von `parseURL()`. Ein QR-Code, der keine Solana-Pay-URL ist, setzt `error`, und das Scannen läuft weiter; `scanFromText()` setzt `error` genauso, wenn das Parsen fehlschlägt.

Behandle gescannte Daten als feindliche Eingabe. Zeige Empfänger, Betrag, Token-Mint, Label und Memo an und lass die Nutzerin oder den Nutzer bestätigen, bevor irgendein Wallet-Prompt erscheint. In Vue Solana gibt es keinen Auto-Send-Pfad, und du solltest auch keinen hinzufügen.

## Abwicklung verfolgen

Ein Transfer-Request ist nur eine Anfrage. Abwicklung bedeutet eine bestätigte Transaktion, die deine Reference enthält, den erwarteten Empfänger bezahlt und den erwarteten Betrag und Token trägt.

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

`verifySolanaPayPayment()` fragt `getSignaturesForAddress(reference)` bis zum Timeout ab und liefert `{ status, signature, verified, reason }`. Erfülle eine Bestellung nur, wenn `verified` `true` ist. `getSolanaPayPaymentStatus(rpc, reference)` ist der günstigere, nicht verifizierende Lesevorgang: Er meldet `pending`, solange es keine Signatur gibt, `found`, sobald eine existiert, und `error`, wenn der RPC-Aufruf fehlschlägt.

`useSolanaPay()` stellt `confirmTransfer()` bereit, das gegen den geparsten Request verifiziert und das Ergebnis in `status` speichert (`idle`, `pending`, `found`, `confirmed`, `finalized`, `expired`, `error`). `useSolanaPayConfirmation()` fragt denselben Status in einem Intervall ab:

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()` beendet das Polling, wenn die Komponente unmountet; rufe `stopPolling()` auf, um es früher zu beenden.

## Nuxt-Auto-Imports

Das Nuxt-Modul importiert `useSolanaPay()`, `useSolanaPayConfirmation()`, `useSolanaQrCode()` und `useSolanaQrScanner()` automatisch unter denselben Namen. Umschließe den Scanner und jeden `BarcodeDetector`-Zugriff mit `<ClientOnly>`, damit das Server-Rendering nie Kamera-APIs berührt.

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

Core-Helfer werden nicht automatisch importiert. Importiere sie für Kit-Typen aus `@vue-solana/nuxt/kit` und aus den Subpfaden des Vue-Pakets, oder rufe stattdessen die Composables auf.

Beide Beispiel-Apps verdrahten diese Composables zu lauffähigen Händler- (`SolanaPayPanel`) und Scanner-Panels (`SolanaPayScannerPanel`). Der Nuxt-Scanner bleibt innerhalb von `<ClientOnly>`, und die Scanner-Panels öffnen einen Request nur in einer Wallet; sie senden ihn nie.

## Sicherheitsgrenzen

- Parse jede URL mit `parseURL()`, bevor du sie anzeigst; vertraue niemals einem gescannten String.
- Zeige Empfänger, Betrag, Token und Memo an und verlange eine ausdrückliche Nutzeraktion vor dem Signieren.
- Sende niemals automatisch eine Transaktion aus einem gescannten Code.
- Verifiziere on-chain, bevor du Ware oder Guthaben freigibst.
- Speichere niemals private Schlüssel oder Secrets in Client-Code und lege niemals finanzierte Schlüssel in der öffentlichen Nuxt-Runtime-Config ab.
- Behandle eine `reference` als Suchschlüssel, nicht als eigenständigen Zahlungsnachweis.

## Manueller Devnet-Test

1. Stelle deine Wallet auf Devnet um und fordere kostenloses SOL von `https://faucet.solana.com` an.
2. Erstelle einen Transfer-Request über ein paar Tausend Lamports und rendere den QR-Code.
3. Scanne ihn mit einer Solana-Pay-fähigen Wallet oder füge die URL in deine eigene Scanner-UI ein.
4. Prüfe, dass die Wallet denselben Empfänger, Betrag und dasselbe Memo anzeigt wie deine Seite.
5. Bestätige die Überweisung und rufe dann `verifySolanaPayPayment()` mit derselben Reference auf; prüfe, dass `verified` `true` wird.
6. Wiederhole die Abwicklung mit einem falschen Betrag oder Empfänger und prüfe, dass sie nicht verifiziert.

Verwende beim Testen winzige Beträge. Eine Reference, die nie abgewickelt wird, ist das erwartete Ergebnis, wenn der Zahler eine einfache Überweisung ohne angehängtes Reference-Konto sendet.
