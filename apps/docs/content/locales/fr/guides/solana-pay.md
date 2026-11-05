---
title: "Solana Pay"
description: Créez des demandes de paiement Solana Pay, affichez et scannez des QR codes, et confirmez le règlement par référence.
ogSection: Guides
surroundOrder: 11
---

Solana Pay est un standard d'URL pour les demandes de paiement. Une demande de transfert encode le destinataire, un montant facultatif, un mint de token SPL facultatif et des champs d'affichage facultatifs. Les wallets et les applications de paiement lisent cette URL et préparent un transfert correspondant.

Vue Solana implémente Solana Pay directement avec `@solana/kit`. Aucun package Solana Pay supplémentaire n'est nécessaire, et `qrcode` n'est chargé à la demande que lorsque vous affichez un QR code.

| Besoin                                         | API                                                      |
| ---------------------------------------------- | -------------------------------------------------------- |
| Construire une URL de demande                  | `encodeURL()`, `encodeTransferRequestURL()`              |
| Construire une demande de transaction différée | `encodeTransactionRequestURL()`                          |
| Lire une URL scannée ou collée                 | `parseURL()`                                             |
| Afficher un QR code                            | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| Suivre une référence on-chain                  | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## Créer une demande de transfert

`encodeURL()` accepte des valeurs `Address` de Kit. Les montants sont des lamports `bigint` et sont encodés sous forme de chaîne SOL décimale, donc `100_000_000n` devient `amount=0.1`.

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

Ajoutez une `reference` lorsque vous devez retrouver le paiement plus tard. Une référence est une clé publique qui n'est pas impliquée dans le transfert lui-même ; le payeur l'attache à la transaction, et `getSignaturesForAddress(reference)` renvoie ensuite le règlement.

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })` construit plutôt une demande de transaction : le wallet récupère `link`, et votre serveur répond avec une transaction à signer. Vue Solana analyse et encode ces URLs mais ne construit ni n'envoie la transaction liée, donc l'endpoint et son autorisation relèvent de votre responsabilité.

En Vue, `useSolanaPay()` encapsule les mêmes primitives et génère une référence pour vous :

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

`createTransferRequest` renvoie l'URL sous forme de chaîne et remplit `requestUrl`, `parsedRequest`, `reference` et `status: "pending"`. `parseRequest(value)` analyse une entrée non fiable, `createReference()` génère une référence autonome, et `reset()` réinitialise l'état.

## Afficher le QR code

`createQR(url)` renvoie du texte SVG. `createQRDataURL()` renvoie une URL `data:` encodée en pourcentage qui n'a pas besoin du polyfill `Buffer`, et `createQRCanvas(canvas, url, options)` écrit dans un élément canvas.

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

En Vue, affichez la chaîne avec `v-html` — le SVG provient de l'encodeur `qrcode`, pas d'une entrée utilisateur :

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

`generate(url)` produit par défaut un code de 512 px blanc sur noir. Les options supplémentaires sont passées dans l'ordre des arguments de `createQR`, donc `generate(url, { size: 320, background: "#fff", color: "#111" })` correspond à `createQR(url, 320, "#fff", "#111")`.

## Scanner et valider

`useSolanaQrScanner()` ouvre la caméra arrière, interroge les QR codes avec `BarcodeDetector` et analyse chaque résultat avec `parseURL()`. Il fonctionne uniquement dans le navigateur : protégez-le derrière une frontière client et n'appelez jamais `start()` pendant le SSR.

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

`start()` rejette lorsque `navigator.mediaDevices` est absent. Quand le navigateur ne dispose pas de `BarcodeDetector`, la caméra s'ouvre quand même mais rien n'est détecté ; proposez donc un champ de collage qui appelle `scanFromText(text)`. `start()` comme `scanFromText()` définissent `parsed` avec le résultat de `parseURL()` et laissent `error` défini en cas d'échec d'analyse ; la boucle de scan ignore les erreurs d'analyse et continue de scanner.

Traitez les données scannées comme une entrée hostile. Affichez le destinataire, le montant, le mint du token, le label et le memo, et laissez l'utilisateur confirmer avant toute invite du wallet. Il n'existe aucune voie d'envoi automatique dans Vue Solana, et vous ne devriez pas en ajouter.

## Suivre le règlement

Une demande de transfert n'est qu'une demande. Le règlement désigne une transaction confirmée qui contient votre référence, paie le destinataire attendu et porte le montant et le token attendus.

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

`verifySolanaPayPayment()` interroge `getSignaturesForAddress(reference)` jusqu'au timeout et renvoie `{ status, signature, verified, reason }`. Ne validez une commande que lorsque `verified` vaut `true`. `getSolanaPayPaymentStatus(rpc, reference)` est la lecture moins coûteuse et sans vérification : elle indique `pending` tant qu'aucune signature n'existe, `found` lorsqu'il en existe une, et `error` lorsque l'appel RPC échoue.

`useSolanaPay()` expose `confirmTransfer()`, qui vérifie par rapport à la demande analysée et stocke le résultat dans `status` (`idle`, `pending`, `found`, `confirmed`, `finalized`, `expired`, `error`). `useSolanaPayConfirmation()` interroge le même statut à intervalle régulier :

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()` arrête l'interrogation lorsque le composant est démonté ; appelez `stopPolling()` pour y mettre fin plus tôt.

## Auto-imports Nuxt

Le module Nuxt auto-importe `useSolanaPay()`, `useSolanaPayConfirmation()`, `useSolanaQrCode()` et `useSolanaQrScanner()` sous les mêmes noms. Enveloppez le scanner et tout accès à `BarcodeDetector` dans `<ClientOnly>` afin que le rendu serveur ne touche jamais aux API de la caméra.

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

Les helpers de Core ne sont pas auto-importés. Importez-les depuis `@vue-solana/nuxt/kit` pour les types de Kit et depuis les sous-chemins du package Vue, ou appelez plutôt les composables.

Les deux applications d'exemple intègrent ces composables dans des panneaux exécutables de marchand (`SolanaPayPanel`) et de scanner (`SolanaPayScannerPanel`). Le scanner Nuxt reste à l'intérieur de `<ClientOnly>`, et les panneaux de scanner ne font qu'ouvrir une demande dans un wallet ; ils ne l'envoient jamais.

## Frontières de sécurité

- Analysez chaque URL avec `parseURL()` avant de l'afficher ; ne faites jamais confiance à une chaîne scannée.
- Affichez le destinataire, le montant, le token et le memo, et exigez une action explicite de l'utilisateur avant toute signature.
- N'envoyez jamais automatiquement une transaction à partir d'un code scanné.
- Vérifiez on-chain avant de remettre des biens ou d'accorder un crédit.
- Ne stockez jamais de clés privées ou de secrets dans le code client, et ne placez jamais de clés approvisionnées dans la runtime config publique de Nuxt.
- Considérez une `reference` comme une clé de recherche, et non comme une preuve de paiement à elle seule.

## Test manuel sur devnet

1. Basculez votre wallet sur devnet et demandez des SOL gratuits depuis `https://faucet.solana.com`.
2. Créez une demande de transfert de quelques milliers de lamports et affichez le QR code.
3. Scannez-le avec un wallet compatible Solana Pay, ou collez l'URL dans votre propre interface de scanner.
4. Vérifiez que le wallet affiche le même destinataire, le même montant et le même memo que votre page.
5. Approuvez le transfert, puis appelez `verifySolanaPayPayment()` avec la même référence et vérifiez que `verified` passe à `true`.
6. Relancez la vérification du règlement avec un montant ou un destinataire erroné et confirmez qu'elle ne valide pas.

Utilisez de très petits montants pendant vos tests. Une référence qui ne se règle jamais est le résultat attendu lorsque le payeur envoie un simple transfert sans attacher le compte de référence.
