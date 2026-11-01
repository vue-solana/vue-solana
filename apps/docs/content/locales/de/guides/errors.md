---
title: "Fehler"
description: Behandle normalisierte Solana-Fehler aus Core-Helfern und Vue-/Nuxt-Composables.
ogSection: Anleitungen
surroundOrder: 13
---

Vue Solana normalisiert häufige Fehler bei Wallet, RPC, Adresse, Transaktion, Timeout und Speicherung zu `SolanaError`.

Verwende stabile `error.code`-Werte für UI-Entscheidungen. Behalte `error.cause` für Debugging und Logs.

## Fehlerstruktur

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` enthält:

- `code`: stabiler, maschinenlesbarer Fehlercode.
- `message`: für Entwickler lesbare Meldung.
- `cause`: optionaler ursprünglicher Fehler aus einer Wallet, einem RPC-Aufruf, einem Parser, einem Timeout oder einer Speicheroperation.
- `feature`: optionaler Wallet-Feature-Name für Fehler zu nicht unterstützten Fähigkeiten.

## Stabile Fehlercodes

- `NO_WALLET_SELECTED`: es ist keine aktive Wallet ausgewählt.
- `WALLET_NOT_CONNECTED`: die aktive Wallet ist nicht verbunden oder hat keinen öffentlichen Schlüssel.
- `WALLET_FEATURE_UNSUPPORTED`: die aktive Wallet unterstützt das angeforderte Feature nicht.
- `WALLET_FAILURE`: eine wallet-seitige Operation ist ohne spezifischeren Code fehlgeschlagen — Verbinden/Trennen, Auto-Connect einer persistierten Wallet, Registrierung der mobilen Wallet oder Verarbeitung des iOS-Callbacks.
- `USER_REJECTED`: der Nutzer hat eine Wallet-Anfrage abgelehnt.
- `INVALID_SIGNATURE`: eine Wallet hat eine Nachrichten- oder Sign-in-Signatur zurückgegeben, die nicht zu ihrem Kontoschlüssel passt.
- `INVALID_ADDRESS`: ein Adress-String konnte nicht als Solana-Adresse geparst werden.
- `INVALID_INPUT`: ein Helfer hat einen fehlerhaften Endpoint-, Timeout- oder Optionswert erhalten.
- `TRANSACTION_TIMEOUT`: eine transaktionsbezogene Operation ist in ein Timeout gelaufen.
- `TRANSACTION_NOT_FOUND`: eine Signatur ist vor der Bestätigungsfrist nie in den RPC-Statusergebnissen aufgetaucht.
- `TRANSACTION_FAILED`: eine übermittelte Transaktion ist fehlgeschlagen, bevor sie das angeforderte Commitment erreicht hat.
- `REDIRECT_TIMEOUT`: eine iOS-Wallet ist nicht rechtzeitig zur App zurückgeleitet.
- `DECRYPTION_FAILED`: ein iOS-Wallet-Callback konnte nicht entschlüsselt oder dekodiert werden.
- `RPC_FAILURE`: ein RPC-Versand, -Lesevorgang oder eine Bestätigung ist fehlgeschlagen.
- `STORAGE_FAILURE`: Browser-Speicher konnte nicht gelesen oder geschrieben werden.

## Fehlerbehandlung im Core

Verwende `isSolanaError()`, wenn du unbekannte Fehler abfängst.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    console.log(error.code);
    console.debug(error.cause);
  }
}
```

Verwende `normalizeSolanaError()`, wenn du deinen eigenen framework-agnostischen Helfer schreibst, der dem Fehlermodell von Vue Solana folgen soll.

```ts
import { normalizeSolanaError } from "@vue-solana/core/errors";

async function loadData() {
  try {
    return await client.rpc.getLatestBlockhash().send();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE", "Unable to load blockhash");
  }
}
```

`normalizeSolanaError()` mappt gängige Wallet-Ablehnungsformen auf `USER_REJECTED`.

## Fehler-Refs in Vue

Vue-Composables stellen `error`-Refs bereit.

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load data from RPC.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
</script>
```

## Fehler-Refs in Nuxt

Automatisch importierte Nuxt-Composables stellen dasselbe Fehlermodell bereit.

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## Nutzerseitige Meldungen

Zeige Endnutzern keine rohen `cause`-Details, außer deine App vertraut dieser Quelle ausdrücklich. Wallet- und RPC-Fehlermeldungen können anbieterspezifischen Text enthalten, der für UI verwirrend oder unsicher ist.

Mappe stattdessen stabile Fehlercodes auf kurze, app-spezifische Meldungen.

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "Request canceled.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support that action.";
    case "RPC_FAILURE":
      return "Network request failed. Try again.";
    default:
      return "Something went wrong.";
  }
}
```

## Hinweise zum erneuten Versuch

- Wiederhole `RPC_FAILURE` nur, wenn die Operation gefahrlos wiederholt werden kann.
- Prüfe nach `TRANSACTION_TIMEOUT` den Signaturstatus, bevor du es erneut versuchst.
- Wiederhole `USER_REJECTED` nicht automatisch.
- Wiederhole `INVALID_ADDRESS` nicht; bitte den Nutzer, die Eingabe zu korrigieren.
- Blende Aktionen aus, die `WALLET_FEATURE_UNSUPPORTED` erzeugen, oder deaktiviere sie.
