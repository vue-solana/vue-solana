---
title: "Nachrichtensignierung"
description: Signiere Authentifizierungs- oder Eigentumsnachrichten, ohne On-Chain-Transaktionen zu erstellen.
ogSection: Anleitungen
surroundOrder: 12
---

Die Nachrichtensignierung belegt die Kontrolle über eine Wallet für eine Off-Chain-Nachricht. Sie autorisiert keine On-Chain-Zustandsänderungen und ist keine Transaktionssignatur.

Verwende die Nachrichtensignierung für Authentifizierungs-Challenges, Prüfungen der Kontoinhaberschaft oder Zustimmungstexte, die deine App off chain verifiziert.

## Nachrichtensignierung in Vue

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const canSign = computed(() => connected.value && canSignMessage.value);

async function signIn() {
  const message = new TextEncoder().encode("Sign in to example.com");
  await execute(message);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSign" @click="signIn">Sign message</button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <p v-if="error">Unable to sign message.</p>
  </section>
</template>
```

Wallets, die keine Nachrichtensignierung bereitstellen, melden `canSignMessage` als false. Ein Aufruf von `execute()` ohne Unterstützung lehnt mit `WALLET_FEATURE_UNSUPPORTED` ab.

## Sign In With Solana (SIWS)

Für die Authentifizierung bevorzuge SIWS gegenüber freier Nachrichtensignierung, wenn die Wallet es unterstützt. SIWS zeigt dem Nutzer einen strukturierten Zustimmungsbildschirm (Domain, Statement, Ressourcen, URI) statt beliebiger Bytes, und die Wallet gibt ein typisiertes Ergebnis zurück:

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signIn } = useSignIn();

const { account, signedMessage, signature } = await signIn({
  statement: "Sign in to example.com",
  nonce: nonceFromYourServer,
});
```

Das Ergebnis ist keine authentifizierte Sitzung — es ist eine Behauptung, die verifiziert werden muss. Auf deinem Server:

1. Dekodiere `signedMessage` und prüfe, dass die Domain dein Origin ist, die URI dir gehört und die Nonce zu der passt, die dein Server für diesen Anmeldeversuch ausgegeben hat (einmalige Verwendung, kurze Gültigkeit).
2. Verifiziere die Ed25519-Signatur über `signedMessage` gegen `account.publicKey`, z. B. mit `tweetnacl`: `nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`.
3. Erst dann erstelle die Sitzung, verknüpft mit `account.address`.

Wallets ohne SIWS-Unterstützung lehnen `signIn()` mit `WALLET_FEATURE_UNSUPPORTED` ab; falle für diese Wallets auf `useSignMessage()` mit deinem eigenen Challenge-Text zurück.

## Nachrichtensignierung in Nuxt

Nuxt importiert `useSolanaSignMessage()` und `useSolanaWallet()` automatisch.

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

Rufe die Nachrichtensignierung nur aus Nutzeraktionen auf dem Client auf.

## Challenge-Text

Verwende klaren, app-spezifischen Challenge-Text. Nutzer sollten verstehen, was sie signieren.

Guter Challenge-Text enthält üblicherweise:

- App- oder Domainname.
- Zweck der Signatur.
- Nonce oder einmaligen Challenge-Wert.
- Ausstellungszeitpunkt und Ablaufzeit.

Beispiel:

```txt
Sign in to example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Issued At: 2026-07-02T12:00:00Z
Expires At: 2026-07-02T12:10:00Z
```

## Verifikationsgrenze

Vue Solana verifiziert die zurückgegebene Signatur gegen den öffentlichen Schlüssel des Kontos, bevor `signMessage()` / `signIn()` auflöst, sofern die Umgebung Ed25519 (WebCrypto) unterstützt. Das ist ein Best-Effort-Schutz dagegen, dass eine Wallet eine Signatur über die falschen Bytes oder für ein anderes Konto zurückgibt — er ersetzt keine serverseitige Verifikation und wird übersprungen, wo Ed25519 nicht verfügbar ist. Eine Signatur, die die Prüfung nicht besteht, lehnt mit `INVALID_SIGNATURE` ab.

Deine App ist weiterhin verantwortlich für serverseitige Verifikation, Nonce-Speicherung, Ablaufprüfungen und Sitzungserstellung.

Behandle eine Signatur über generischen Text nicht als Erlaubnis, Tokens zu übertragen oder On-Chain-Zustand zu ändern.

## Fehlerbehandlung

Fehler bei der Nachrichtensignierung verwenden dasselbe normalisierte `SolanaError`-Modell wie Wallet- und Transaktions-Helfer.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "WALLET_NOT_CONNECTED":
      return "Connect your wallet first.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support message signing.";
    case "USER_REJECTED":
      return "The message signature was rejected.";
    case "INVALID_SIGNATURE":
      return "The wallet returned an invalid signature.";
    default:
      return null;
  }
});
```

## Sicherheits-Checkliste

- Verwende einmalige Nonces für Authentifizierungs-Challenges.
- Lass Challenges schnell ablaufen.
- Verifiziere Signaturen auf dem Server, bevor du eine Sitzung erstellst.
- Mache signierten Text für Menschen lesbar.
- Impliziere niemals, dass Nachrichtensignierung eine Transaktion übermittelt.
- Verwende einen Transaktions-Signierungs-Flow niemals für Authentifizierungstext erneut.
