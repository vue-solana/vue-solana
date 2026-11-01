---
title: "Transaktionen"
description: Signiere, sende und bestätige Transaktionen und verwalte ihren Zustand mit Vue Solana.
ogSection: Anleitungen
surroundOrder: 10
---

Vue Solana bietet wallet-bewusste Helfer zum Übermitteln von Transaktionen und Composables für reaktiven Transaktionszustand.

Diese Anleitung deckt die Grenze von Vue Solana ab: Fähigkeitsprüfungen der Wallet, Signierung, Versand, Bestätigung und Fehler. Baue Transaktions-Messages mit den Kit-Helfern, die aus `@vue-solana/vue/kit` (`@vue-solana/nuxt/kit` in einer Nuxt-App) re-exportiert werden, und mit den Instruction-Helfern deines Programm-Clients. Du musst `@solana/kit` nie selbst installieren.

## Core-Sendehelfer

Verwende `signAndSendTransaction()` aus `@vue-solana/core/transaction`, wenn du bereits einen Kit-Client, eine Wallet und rohe Wire-Transaktionsbytes hast.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

Der Helfer gibt den RPC-Signatur-String zurück.

Bei Wallets des Android Mobile Wallet Adapter bevorzugt Vue Solana `signTransaction` plus app-seitigen RPC-Versand über `client.rpc.sendTransaction(...).send()`, wenn verfügbar, damit die App den Versand kontrolliert und die RPC-Signatur nach der Wallet-Übergabe zuverlässig zurückgeben kann.

## Eine Signatur bestätigen

Verwende `confirmTransactionSignature()`, wenn du warten musst, bis eine übermittelte Signatur eine Commitment-Stufe erreicht.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

Die Bestätigung verwendet standardmäßig das `confirmed`-Commitment und ein Timeout von 60 Sekunden. Sie pollt `client.rpc.getSignatureStatuses([signature]).send()`, die Transaktion muss also bereits übermittelt worden sein.

## Vom Client gesendete Transaktionen

`createSolanaClient()` komponiert standardmäßig den offiziellen Transaktions-Stack von `@solana/kit-plugin-rpc`: `solanaRpc()` gefolgt von `rpcAirdrop()`. `solanaRpc()` installiert den Transaktions-Planer sowie die Executors für Plan-Signierung und Plan-Versand selbst. Der alte eigene Fallback-Sender wird nicht verwendet.

Verwende `useSendTransaction()` oder `useSendTransactions()`, wenn der Client ohne Wallet-Popup planen, signieren, übermitteln und bestätigen soll. Der offizielle Executor holt einen frischen Blockhash, behandelt Ressourcenlimits und Preflight-Simulation, signiert mit den Client-Signern, übermittelt über RPC und wartet auf das `confirmed`-Commitment. Das Composable setzt `status` erst auf `sent`, nachdem dieser Sende-und-Bestätigen-Vorgang abgeschlossen ist. Ein einzelnes Ergebnis stellt `data.context.signature` bereit; ein Batch-Ergebnis enthält den Ergebnisbaum des Plans.

Konfiguriere einen direkten Core- oder Vue-Client mit `payer` oder `payerSecretKey`; der clientseitige Sendepfad erfordert einen `payer`. `payerSecretKey` ist ein base64-kodiertes 64-Byte-Ed25519-Schlüsselpaar und nur für vertrauenswürdige Entwicklungs- oder serverseitige Flows geeignet. Platziere niemals ein rohes Secret oder `payerSecretKey` in der öffentlichen Nuxt-Runtime-Config und lege niemals einen mit Guthaben ausgestatteten Signaturschlüssel im Browser eines Endnutzers offen.

Der Wallet-Flow ist davon getrennt: `useSignAndSendTransaction()` kann standardmäßig nach dem RPC-Versand zurückkehren oder mit `confirm: true` auf ein gewähltes Commitment warten. Behalte dieses Verhalten bei, wenn ein verbundener Nutzer eine Transaktion in seiner Wallet bestätigen muss.

## Eine echte Devnet-Überweisung bauen

Dieses Beispiel erstellt eine winzige System-Überweisung auf devnet. Es baut eine Kit-v0-Transaktions-Message und serialisiert sie zu Wire-Bytes, die Vue Solana zum Signieren an die Wallet übergibt.

Browser-Apps, die Transaktionen erstellen oder serialisieren, sollten das Buffer-Polyfill des Vue-Pakets einmal initialisieren, bevor Transaktionscode läuft:

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
} from "@vue-solana/vue/kit";

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

`createTransferTransaction` gibt rohe Wire-Transaktionsbytes (`Uint8Array`) zurück, und genau das akzeptieren `SolanaWallet.signTransaction` und `useSignAndSendTransaction()`.

Verwende beim Testen devnet-SOL. Beginne mit einem winzigen Wert wie `1_000` Lamports (`0.000001` SOL). Verwende niemals eine Wallet mit echten Mitteln, während du einen Tutorial- oder Beispiel-Flow validierst.

## Signieren und Senden in Vue

Verwende `useSignAndSendTransaction()`, wenn eine Vue-Komponente reaktiven Status, Fehler und optionale Bestätigung braucht.

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

`status` unterscheidet Übermittlung von Bestätigung. Eine zurückgegebene `signature` bedeutet, dass die Transaktion an RPC übermittelt wurde. `confirmation` bedeutet, dass die übermittelte Signatur das angeforderte Commitment erreicht hat. Wenn die Bestätigung nach der Übermittlung in ein Timeout läuft, zeige die Signatur weiter an und prüfe ihren Status, bevor du es erneut versuchst.

### Eingaben und Rückgaben der Wallet-Anfrage

Wallet-Signierungs-Flows akzeptieren Transaktionseingaben als rohe `Uint8Array`-Wire-Bytes, die dem Solana-Transaktionsschema entsprechen. Baue sie mit den Kit-Helfern aus `@vue-solana/vue/kit` (oder dekodiere sie aus einer base64-/base58-RPC-Antwort); base64-Strings, Transaktionsobjekte und Instruction-Listen werden hier nicht akzeptiert.

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` nimmt die rohen Message-Bytes zum Signieren. Jede Sendeanfrage an die Wallet akzeptiert außerdem die Kit-`SendTransactionOptions`:

| Option                | Beschreibung                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Überspringt die Preflight-Simulation vor dem Senden.                                                                            |
| `maxRetries`          | Anzahl der Wiederholungen des RPC-Knotens (`bigint`).                                                                           |
| `minContextSlot`      | Slot, an dem ein Blockhash oder eine Nonce in der Transaktion bekanntermaßen existiert; ein Senden davor kann abgelehnt werden. |
| `preflightCommitment` | Commitment, das für die Preflight-Simulation verwendet wird.                                                                    |

Rückgabeformen:

- `useSignMessage().execute(bytes)` löst zu `{ signedMessage, signature }` auf, beide `Uint8Array`.
- `useSignTransactions().execute(transactions)` löst zum signierten `Uint8Array[]` auf (auch als `signedTransactions` verfügbar); übergib für eine Transaktion ein Array mit einem Element.
- `useSignAndSendTransaction().execute(transaction)` löst zum übermittelten `signature`-String auf; mit `confirm: true` füllt es zusätzlich `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` löst zu einem `string[]` von Signaturen auf (auch als `signatures` verfügbar).

Eine Wallet kann die Message oder Transaktion vor dem Signieren verändern — zum Beispiel um eine eigene Instruction hinzuzufügen oder den Gebührenzahler zu ändern — und der Wallet Standard erlaubt das ausdrücklich. Lies die zurückgegebene `signedMessage` oder die signierten Transaktionsbytes erneut, statt anzunehmen, dass sie Byte für Byte deiner Eingabe entsprechen.

## Explorer-Links

Explorer-Links sollten zum Cluster passen, das deine App verwendet.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Für devnet sollten Links wie `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet` aussehen. Sowohl `mainnet` als auch der Legacy-Alias `mainnet-beta` lassen den Cluster-Query absichtlich weg.

## Generischer Transaktionszustand

Verwende `useTransaction()`, wenn deine asynchrone transaktionsähnliche Operation nicht zum eingebauten Signier- und Sendehelfer passt.

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` zentralisiert Lade-, Erfolgs-, Fehler- und Timeout-Zustand für eigene Flows.

## Nuxt-Auto-Imports

Nuxt stellt bereit:

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

Rufe Transaktionsmethoden aus Nutzeraktionen auf dem Client auf. Löse die Wallet-Signierung nicht während der SSR aus. Die Nuxt-Moduloptionen lassen `payer` und `payerSecretKey` absichtlich weg; konfiguriere stattdessen einen `payer` in einem client-only Vue-Plugin mit `clientPlugin: false`, anstatt ein Secret in der öffentlichen Runtime-Config abzulegen.

Verwende `useSolanaTransactionConfirmation({ commitment: "confirmed" })` und rufe `confirm(signature)` auf, wenn du eine Signatur bestätigen musst, die aus einem anderen Flow zurückkommt. Verwende `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })`, wenn du den Status nach einem Timeout oder Redirect weiter prüfen willst.

## Fehlerbehandlung

Transaktions-Helfer normalisieren Fehler zu `SolanaError`.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
      case "WALLET_NOT_CONNECTED":
        // Ask the user to connect a wallet.
        break;
      case "WALLET_FEATURE_UNSUPPORTED":
        // Hide or disable unsupported transaction actions.
        break;
      case "USER_REJECTED":
        // The user declined the wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // Check signature status before retrying.
        break;
      case "RPC_FAILURE":
        // RPC send or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

## Sicherheits-Checkliste

- Halte clientseitige Signaturschlüssel auf einem vertrauenswürdigen Server oder in einem ausdrücklich ephemeren Demo-Signer; lege niemals Secrets mit Guthaben über die öffentliche Nuxt-Runtime-Config offen.
- Zeige Nutzern, was sie gleich signieren, bevor du einen Wallet-Prompt öffnest.
- Signiere oder sende niemals Transaktionen ohne ausdrückliche Nutzeraktion.
- Fordere niemals private Schlüssel an und verarbeite sie nicht.
- Prüfe die Wallet-Fähigkeiten, bevor du Signierungsaktionen anzeigst.
- Behandle RPC- und Wallet-Fehler als nicht vertrauenswürdige Daten; mappe sie auf sichere UI-Meldungen.
- Prüfe nach einem Timeout den Signaturstatus, bevor du es erneut versuchst, um doppelte Übermittlungen zu vermeiden.
- Behalte die übermittelte Signatur in der UI, auch wenn die Bestätigung fehlschlägt oder in ein Timeout läuft.
- Verlinke das korrekte Solana-Explorer-Cluster, damit Nutzer devnet- und mainnet-Transaktionen nicht verwechseln.
