---
title: "@vue-solana/vue"
description: Vue-Plugin und Composables für Solana-Anwendungen.
ogSection: Pakete
surroundOrder: 17
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) bietet ein Vue-Plugin und Composables für Solana-RPC-Zugriff, Guthabenabfragen, Wallet-Zustand und den Zustand von Transaktions-Helfern.

## Installation

```sh
pnpm add @vue-solana/vue
```

Das Paket ist reines ESM. Vite-Apps bündeln bereits ESM und brauchen keine Änderung; ein CommonJS-`require("@vue-solana/vue")` schlägt mit `No "exports" main defined` fehl, stelle das importierende Modul also auf ESM um oder bleib bei `@vue-solana/vue@^2`, das weiterhin einen `.cjs`-Build ausliefert. Siehe [Upgrade von v2 auf v3](/de/guides/migration#upgrading-v2-to-v3).

Browser-Apps, die Transaktionen erstellen oder serialisieren, können den Buffer-Polyfill aus `@vue-solana/vue/buffer-polyfill` initialisieren.

## Plugin-Setup

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

Die Registrierung des Android Mobile Wallet Adapter ist auf unterstützten Android-Chrome-Clients standardmäßig aktiviert. Übergib `mobileWallet`-Optionen, um die MWA-App-Identität anzupassen, oder `mobileWallet: false`, um die Registrierung mobiler Android-Wallets zu deaktivieren.

iOS-Browser-Wallet-Links sind auf iOS-Browsern standardmäßig für Phantom, Solflare und Backpack aktiviert. Übergib `iosWallet`-Optionen, um App-Identität, Redirect-URL, Chains oder Cluster anzupassen, oder `iosWallet: false`, um die iOS-Wallet-Link-Erkennung zu deaktivieren.

Du kannst auch einen eigenen RPC-Endpoint übergeben:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

Unterstützte Cluster sind `mainnet` (Legacy-Alias `mainnet-beta`), `devnet`, `testnet` und `localnet`. Verwende `mainnet` für Solana-Mainnet; das ist Solanas offizieller Mainnet-Clustername.

### Plugin-Optionen

| Option           | Typ                            | Standard              | Beschreibung                                                                                                                                                                    |
| ---------------- | ------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cluster`        | Solana-Cluster                 | `devnet`              | Cluster, das verwendet wird, wenn `endpoint` fehlt. `mainnet-beta` wird als Legacy-Alias für `mainnet` akzeptiert.                                                              |
| `endpoint`       | `string`                       | Cluster-Endpoint      | HTTP-RPC-Endpoint.                                                                                                                                                              |
| `wsEndpoint`     | `string`                       | Abgeleiteter Endpoint | WebSocket-RPC-Endpoint.                                                                                                                                                         |
| `commitment`     | Commitment                     | Kit-Standard          | Standard-Commitment für RPC-Aufrufe.                                                                                                                                            |
| `autoConnect`    | `boolean`                      | `false`               | Nur eine zuvor ausgewählte, erkannte Wallet erneut verbinden.                                                                                                                   |
| `payer`          | `TransactionSigner`            | Keiner                | Gebührenzahler und Signer des Clients für clientseitig gesendete Transaktionen.                                                                                                 |
| `payerSecretKey` | `string`                       | Keiner                | Base64-kodiertes 64-Byte-Ed25519-Schlüsselpaar, geheimer Schlüssel zuerst. Adresse wird beim Erstellen des Clients abgeleitet, Signaturschlüssel bei erster Nutzung importiert. |
| `wallet`         | `SolanaWallet`                 | Deaktiviert           | Eigener Wallet-Adapter.                                                                                                                                                         |
| `mobileWallet`   | `MobileWalletOptions \| false` | Auf Android aktiv     | Optionen für den Android Mobile Wallet Adapter.                                                                                                                                 |
| `iosWallet`      | `iOSWalletOptions \| false`    | Auf iOS aktiv         | Optionen für iOS-Wallet-Universal-Links.                                                                                                                                        |

`payer` und `payerSecretKey` werden von direkten Vue-Plugin- und Core-Clients unterstützt. Eine clientseitig gesendete Transaktion erfordert einen `payer`. `payerSecretKey` leitet seine Adresse beim Erstellen des Clients aus der ungeprüften öffentlichen Hälfte ab, behandle `payer.address` also als unbestätigt, bis die erste Signatur erfolgreich war; ein nicht passendes Schlüsselpaar wird erst bei der ersten Signatur abgelehnt und nicht beim Erstellen. Beim Signieren wird der Schlüssel über WebCrypto importiert, das Browser nur in einem sicheren Kontext bereitstellen (`https` oder `http` auf `localhost`). Lege niemals ein rohes Secret oder `payerSecretKey` in der öffentlichen Nuxt-Runtime-Config ab und liefere niemals einen finanzierten Signaturschlüssel an den Browser einer Endnutzerin oder eines Endnutzers.

Der Standardclient, den `createSolanaPlugin()` erstellt, nutzt die offizielle Komposition aus `solanaRpc()` und `rpcAirdrop()`, wenn kein `commitment` konfiguriert ist; `solanaRpc()` installiert selbst den Planner, den Plan-Signing-Executor und den Plan-Sending-Executor. Ein konfiguriertes `commitment` baut denselben Stack explizit, damit das Commitment die RPC-Schicht erreicht. Der alte, eigene Fallback-Sender wird nicht verwendet. Der offizielle Send-Executor wartet auf `confirmed`-Commitment, bevor `execute()` auflöst, und setzt `status` auf `sent`.

### Client- und Plugin-Lebenszyklus

`createSolanaPlugin()` baut den Kit-Client genau einmal, während `install()`. Erstelle das Plugin auf Modulebene und verwende dieselbe Instanz weiter:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Ein erneuter Aufruf von `createSolanaPlugin()` baut einen neuen Client und Kontext und verwirft die bestehende Wallet-Auswahl und den RPC-Zustand. Ist deine Konfiguration reaktiv — etwa ein Cluster-Umschalter —, memoisiere sie, damit ein neues Plugin (und ein neuer Client) nur gebaut wird, wenn sich der Wert tatsächlich ändert, und nicht bei jedem Render:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Gib das Plugin frei, wenn du deine App abbaust. `createSolanaPlugin()` startet ein Wallet-Standard-Erkennungsabo und einen verzögerten Bootstrap; `dispose()` stoppt beides, damit sie die App nicht überleben:

```ts
export const solana = createSolanaPlugin({ cluster: "devnet" });
const app = createApp(App).use(solana);

app.unmount();
solana.dispose();
```

Der Aufruf ist mehrfach und vor `use()` sicher. Nuxt-Apps brauchen keinen Code: Das Runtime-Plugin des Moduls verdrahtet ihn mit `vueApp.onUnmount()`.

Ein Kit-Client führt seine `createClient().use(...)`-Plugins während der Konstruktion aus. Ist eines dieser Plugins asynchron, wird der Client — und jeder daraus gebaute Kontext — erst aktiv, nachdem dieses Promise aufgelöst ist. Verschiebe echte RPC- und Wallet-Arbeit auf Client-Lifecycle-Hooks oder Nutzeraktionen nach der Hydration, statt sie während des Setups oder der SSR auszuführen.

## Composables

Der Root-Export bleibt unterstützt. Für Composables bevorzugst du in neuem Code direkte Subpfad-Importe, damit Bundler keinen unzusammenhängenden Entry-Code des Pakets auswerten müssen:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Direkte Paket-Subpfade:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/useSendTransaction`
- `@vue-solana/vue/useSendTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
- `@vue-solana/vue/useSolanaPay`
- `@vue-solana/vue/useSolanaPayConfirmation`
- `@vue-solana/vue/useSolanaQrCode`
- `@vue-solana/vue/useSolanaQrScanner`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/kit`

Verwende `@vue-solana/vue/buffer-polyfill` für Browser-Transaktionscode, der den Buffer-Polyfill braucht. Importiere `installSolanaBufferPolyfill()` als benannten Import und rufe ihn auf; ein reiner Seiteneffekt-Import wie `import "@vue-solana/vue/buffer-polyfill"` installiert nichts, weil jedes `@vue-solana/*`-Paket mit `"sideEffects": false` markiert ist und der Subpfad nur die Funktion exportiert. Verwende `@vue-solana/vue/kit` für die Kit-API — es re-exportiert ganz `@solana/kit`, du installierst dieses Paket also nie selbst. Direkte `@vue-solana/core/*`-Importe bleiben für tiefer liegende Core-Nutzung unterstützt.

- `useSolana()`: liefert den vollständigen injizierten Solana-Kontext.
- `useSolanaClient()`: liefert das Kit-`{ client, rpc }` aus dem Kontext. Empfohlen für neuen Code.
- `useRpc()`: liefert Cluster, Endpoint, Verbindungsstatus, den neuesten Blockhash, den injizierten Kit-`client` und `checkConnection()`.
- `useConnection()`: liefert den injizierten Kit-Client (veraltet zugunsten von `useSolanaClient()`).
- `useAccountInfo(address, options?)`: lädt normalisierte Kontodaten (executable, lamports, owner, space, Datenbytes).
- `useProgramAccounts(programId, options?)`: lädt Konten, die einer Programm-ID gehören, mit optionalen Filtern und Daten-Slicing.
- `useWallet()`: liefert Refs der aktiven Wallet, berechneten Verbindungszustand und Wallet-Aktionen.
- `useWallets()`: liefert erkannte Browser-Erweiterungs-Wallets, Android-Mobile-Wallet-Adapter-Wallets, unterstützte iOS-Browser-Wallet-Einträge und Aktionen zur Wallet-Auswahl.
- `useBalance(address, commitment?)`: lädt das Lamport-Guthaben für einen Adress-String.
- `useAirdrop()`: führt auf Testnetzwerken und lokalen Validatoren einen SOL-Airdrop in ein Konto aus.
- `useTokenAccounts(owner, options?)`: lädt alle SPL-Token-Konten eines Eigentümers und fragt standardmäßig sowohl das Token- als auch das Token-2022-Programm ab.
- `useTokenBalance(mint, owner)`: lädt SPL-Token-Guthaben und Dezimalstellen für ein Mint/Eigentümer-Paar über das zugehörige Token-Konto.
- `useTransaction(handler, options?)`: generischer Helfer für den Zustand asynchroner Transaktionen mit optionalen Timeout-Einstellungen.
- `useTransactionConfirmation(options?)`: bestätigt eine übermittelte Signatur mit reaktivem Status sowie Timeout- und Fehlerzustand.
- `useSignatureStatus(signature, options?)`: liest, pollt oder abonniert Updates des Signaturstatus.
- `useSignMessage()`: signiert beliebige Authentifizierungsnachrichten über die konfigurierte Wallet, sofern unterstützt.
- `useSignAndSendTransaction()`: signiert und sendet eine Transaktion über die konfigurierte Wallet, mit optionalem Warten auf Bestätigung.
- `useAction(handler)`: generische Zustandsmaschine für asynchrone Aktionen mit Abbruch bei erneutem Dispatch; die Grundlage für die Daten-Composables.
- `useRequest(source, options?)`: einmalige asynchrone Anfrage, die bei Änderung ihrer Quelle erneut ausgelöst wird, mit Stale-While-Revalidate.
- `useSubscription(source, options?)`: Live-Daten aus RPC-Subscriptions und anderen reaktiven Stream-Quellen.
- `useTrackedData(source, options?)`: RPC-Subscription, initialisiert durch einen einmaligen Abruf, slot-dedupliziert.
- `useSignIn()`: löst die Sign-In-With-Solana-(SIWS-)Funktion einer Wallet aus.
- `useSolanaPay()`: baut und parst Solana-Pay-Transfer-Request-URLs und verfolgt den Bestätigungsstatus anhand einer Reference.
- `useSolanaPayConfirmation()`: pollt den Zahlungsstatus für eine Solana-Pay-Reference.
- `useSolanaQrCode()`: rendert eine Solana-Pay-URL als SVG-QR-Code.
- `useSolanaQrScanner()`: scannt Solana-Pay-QR-Codes über die Kamera und `BarcodeDetector`.
- `useSelectedWalletAccount()`: liest das app-weit ausgewählte Wallet-Konto aus `SelectedWalletAccountProvider` (oder `provideSelectedWalletAccount()`).
- `useSignTransactions()`: signiert mehrere serialisierte Transaktionen in einer einzigen Wallet-Anfrage.
- `useSignAndSendTransactions()`: signiert und sendet mehrere Transaktionen in einer einzigen Wallet-Anfrage.
- `useClientCapability(capability)`: stellt sicher, dass eine Fähigkeit im Kit-Client installiert ist, und schlägt sonst sofort mit einem klaren Fehler fehl.
- `usePayer()` / `useIdentity()`: verfolgen reaktiv den Gebührenzahler- bzw. Identitäts-Signer des Kit-Clients.
- `usePlanTransaction()` / `usePlanTransactions()`: planen Transaktionsnachrichten aus Instruktionseingaben, ohne sie zu senden.
- `useSendTransaction()` / `useSendTransactions()`: nutzen den offiziellen Kit-Planner und den RPC-Plan-Sending-Executor, die `createSolanaClient()` installiert; sie planen, signieren, übermitteln und warten auf `confirmed`-Commitment ohne Wallet-Popup. Konfiguriere `payer`.

## Verwandte Anleitungen

- [RPC und Cluster](/de/guides/rpc-and-clusters): Verbindungszustand lesen und Endpoints konfigurieren.
- [Wallets](/de/guides/wallets): Wallets erkennen, auswählen, verbinden, trennen und ihre Fähigkeiten prüfen.
- [Kontolesevorgänge](/de/guides/account-reads): Guthaben, Konto-Infos, Programm-Konten und Signaturstatus lesen.
- [Transaktionen](/de/guides/transactions): signieren, senden, bestätigen und Transaktionsfortschritt anzeigen.
- [Nachrichtensignierung](/de/guides/message-signing): Off-Chain-Authentifizierungs- oder Besitz-Challenges signieren.
- [Solana Pay](/de/guides/solana-pay): Zahlungsanforderungen mit `useSolanaPay()` bauen und QR-Codes rendern oder scannen.
- [E2E-Tests](/de/guides/e2e-testing): RPC, RPC-Subscriptions und Wallets in Playwright-Tests mocken.
- [Fehler](/de/guides/errors): `error`-Refs von Composables auf sichere UI-Meldungen abbilden.

## RPC-Zustand lesen

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "Unable to reach the configured Solana RPC endpoint."
    : "Unable to check the Solana connection.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Den Kit-Client verwenden

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Check Slot</button>
  </section>
</template>
```

`useSolanaClient()` liefert denselben Kontext wie `useSolana()`, formt ihn aber für Kit-Lesevorgänge: `client` ist der vollständige `@solana/kit`-Client und `rpc` seine Lese-API. RPC-Ergebnisse sind `bigint`, Kontodaten sind `Uint8Array`. Siehe [Kit-Migration](/de/guides/migration).

## Guthaben lesen

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Token-Konten lesen

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load token accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Token accounts: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenAccounts()` leert den Zustand ohne RPC-Aufruf, wenn der Eigentümer null ist. Übergib `programId` in den Optionen, um die Ergebnisse auf ein einzelnes Token-Programm zu beschränken.

## Token-Guthaben lesen

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter valid mint and owner addresses.";
    case "RPC_FAILURE":
      return "Unable to load token balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimals)</p>
    <p v-else>No token account found.</p>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenBalance()` liefert `null` für Guthaben und Dezimalstellen, wenn das zugehörige Token-Konto nicht existiert, ohne das als Fehler zu behandeln. `balance` und `decimals` sind schreibgeschützte Computed-Refs, die aus einem einzigen Lesevorgang abgeleitet werden — lies sie, weise ihnen nichts zu.

## Semantik der Lese-Composables

`useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()` und `useTokenBalance()` teilen sich eine Zustandsmaschine. Zwei ihrer Regeln überraschen Umsteiger von v2:

- **`refresh()` wird bei einem Fehler abgelehnt** statt aufzulösen, und löst mit `null` auf, wenn eine Eingabe leer ist. Ein `await refresh()` ohne `try`/`catch` wirft. Es direkt an `@click` zu hängen ist in Ordnung — Vue schluckt die Ablehnung —, aber handgeschriebene Aufrufer müssen sie behandeln. `useRequest()` ist die Ausnahme und löst weiterhin mit dem Ergebnis des Versuchs auf.
- **Daten fallen auf ihren leeren Wert zurück, wenn ein Lesevorgang fehlschlägt.** Das letzte erfolgreiche Guthaben bleibt nicht neben einem frischen `error` stehen, weil ein veralteter Wert neben einem Fehler wie aktuelle Daten wirkt, obwohl er es nicht ist. Verzweige auf `error`, um zu entscheiden, was gerendert wird.

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="balanceErrorMessage" />
  <p v-else-if="loading">Loading…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

Eine nicht parsbare Adresse meldet `INVALID_ADDRESS` in `error` und erreicht die RPC nie. Siehe [Kontolesevorgänge](/de/guides/account-reads#refresh-and-error-semantics).

## Fehlerbehandlung

`error`-Refs von Composables verwenden `SolanaError | null` aus `@vue-solana/core/errors`. Verzweige für die Nutzeroberfläche auf `error.value.code` und behalte `error.value.cause` zum Debuggen ursprünglicher Wallet-, RPC-, Adressparsing-, Timeout- oder Speicherfehler.

```ts
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

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
```

Das injizierte Kontext-`error`-Ref hinter `useSolana()` und `useRpc()` wird mit Wallet-Boot-Arbeit geteilt: Registrierung mobiler Wallets, Auto-Connect der gespeicherten Wallet und iOS-Callback-Behandlung schreiben dort `WALLET_FAILURE` (oder `USER_REJECTED`, wenn die Wallet eine Ablehnung meldet) hinein. Der nächste `checkConnection()` oder ein erfolgreiches `connect()` leert es. Diese Wallet-Pfade loggen nur in der Entwicklung mit dem Präfix `[Vue Solana]` nach `console.error`.

## Konto-Informationen lesen

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load account data from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()` leert den Zustand ohne RPC-Aufruf, wenn die Adresse null ist. Ungültige Adress-Strings leeren veraltete `accountInfo`, setzen `error` und rufen `getAccountInfo()` nicht auf. Ist `watch: true` aktiviert, wird der WebSocket-Listener beim Unmounten der Komponente automatisch entfernt. Ein Aufruf von `stopWatching()` entfernt den aktuellen Listener und verhindert automatische Neustarts für diese Composable-Instanz.

## Programm-Konten lesen

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana program id.";
    case "RPC_FAILURE":
      return "Unable to load program accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()` leert den Zustand ohne RPC-Aufruf, wenn die Programm-ID null ist. Ungültige Programm-ID-Strings leeren veraltete `accounts`, setzen `error` und rufen `getProgramAccounts()` nicht auf.

> Warnung: `useProgramAccounts()` kann teuer sein. Jeder Refresh kann eine große Menge programm-eigener Konten scannen, erhebliche RPC-Credits verbrauchen, an Rate-Limits des Anbieters stoßen oder in einen Timeout laufen. Starte keine breiten Scans aus stark frequentierten UI-Pfaden. Nutze enge Filter, `dataSlice`, Caching, Indexing, Paginierungsstrategien oder dedizierte RPC-Infrastruktur für Produktionslesevorgänge.

## Wallet-Zustand

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey }}</p>
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser-Erweiterungs-Wallets werden über den Solana Wallet Standard erkannt. Android-Mobile-Wallet-Adapter-Wallets werden über `@solana-mobile/wallet-standard-mobile` registriert und auf unterstützten Android-Chrome-Clients in derselben `useWallets()`-Liste angezeigt. iOS-Einträge für Phantom, Solflare und Backpack werden auf iOS-Browsern über wallet-spezifische Universal Links angeboten. `refreshWallets()` aktualisiert nur die Liste der erkannten Wallets, und `selectWallet()` konfiguriert nur die aktive Wallet. `connected` bleibt false, bis `connect()` erfolgreich ist — selbst wenn die Erweiterung nach einem Seiten-Refresh zuvor autorisierte Konten offenlegt. Ein erfolgreiches `connect()` trennt außerdem jede andere erkannte Wallet über deren `standard:disconnect`-Funktion, sodass nur eine Wallet für die App autorisiert bleibt.

Native Desktop-App-Wallet-Adapter sind noch nicht implementiert. Nativer Desktop-Support erfordert wallet-spezifische Protokoll-Links oder eine zukünftige native Wallet-Standard-Registrierung.

Composables liefern inaktiven, SSR-sicheren Zustand, wenn kein Plugin-Kontext verfügbar ist. Echte RPC- und Wallet-Operationen brauchen weiterhin den vom Plugin bereitgestellten Client-Kontext.

## Nachrichtensignierung

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Nachrichtensignierung dient Wallet-Besitz- oder Authentifizierungs-Challenges. Es ist keine Transaktionssignierung und autorisiert keine On-Chain-Zustandsänderungen. Wallets, die keine Nachrichtensignierung anbieten, melden `canSignMessage` als false, und `execute()` wird mit einem Fehler über eine nicht unterstützte Wallet abgelehnt.

## Sign In With Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Sign in to My App",
    // Generate the nonce server-side and verify it on the server.
    nonce: await fetchNonceFromBackend(),
  });

  // Send { account.address, signature, signedMessage } to your backend for
  // verification before creating a session.
}
```

Die Wallet muss die SIWS-Funktion unterstützen (`canSignIn` ist sonst false, und `signIn()` wird mit einem `WALLET_FEATURE_UNSUPPORTED`-Fehler abgelehnt). Die Anmeldung nutzt das aktuell ausgewählte Konto der Wallet; ist keine Wallet verbunden, wird `signIn()` mit einem `WALLET_NOT_CONNECTED`-Fehler abgelehnt — verbinde zuerst, das Composable übernimmt das nicht für dich.

### Die Signatur auf deinem Server verifizieren

Die Wallet liefert eine Signatur über `signedMessage` — die SIWS-Nachricht, der die Nutzerin oder der Nutzer zugestimmt hat. Würdest du das Ergebnis ohne Verifikation vertrauen, könnte ein bösartiger Client eine Identität fälschen; verifiziere deshalb serverseitig, bevor du eine Sitzung ausstellst:

1. **Nachricht prüfen**: Dekodiere `signedMessage` und bestätige, dass die Domain zu deinem Origin passt, die `uri` deine ist, die `nonce` zu der passt, die dein Server für diese Sitzung ausgegeben hat, und Statement und Ressourcen dem Erwarteten entsprechen.
2. **Signatur verifizieren**: Die Signatur ist eine Ed25519-Signatur über die Bytes der SIWS-Nachricht. Verifiziere sie mit `tweetnacl` (`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`) oder einer beliebigen Ed25519-Bibliothek gegen den `publicKey` des Kontos aus dem Anmeldeergebnis.
3. **Sitzung binden**: Erst nachdem die Nachrichtenprüfungen bestanden und die Signatur verifiziert ist, solltest du die Sitzung erstellen — gebunden an `account.address`.

Der Server muss die erwartete Nachricht aus der ausgegebenen Nonce neu ableiten (oder jedes Feld der empfangenen Nachricht validieren), damit abgelaufene oder wiederverwendete Nonces abgelehnt werden.

Bevor `signMessage()` oder `signIn()` auflösen, prüft der Adapter die zurückgegebene Signatur außerdem gegen den `publicKey` des Kontos, sofern Ed25519 (WebCrypto) verfügbar ist, und lehnt bei Abweichung mit `INVALID_SIGNATURE` ab. Das ist ein clientseitiger Best-Effort-Schutz gegen eine fehlerhafte Wallet — wo Ed25519 fehlt, wird er übersprungen, die oben beschriebene serverseitige Prüfung ist also das, was die Nutzerin oder den Nutzer tatsächlich authentifiziert.

## Data-Fetching-Composables

`useRequest`, `useSubscription` und `useTrackedData` bilden die SWR-artige Datenschicht, gebaut auf den reaktiven Store-Primitiven von Kit:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value is a SolanaRpcResponse envelope: data.value.value and
// data.value.context.slot.
```

- `useRequest` löst erneut aus, wenn eine Ref/Computed-Quelle ihre Identität ändert; `null` zu übergeben deaktiviert es (Status `disabled`).
- `useSubscription` behält den veralteten Wert während des erneuten Verbindens; `reconnect()` öffnet den Stream neu.
- `useTrackedData` dedupliziert Abruf und Subscription per Slot, sodass außer der Reihe eintreffende Daten den Wert nicht zurücksetzen können.

Die Callbacks `rpcValueMapper` und `rpcSubscriptionValueMapper` erhalten den **ausgepackten** Antwortwert (`value.lamports` bei einem Guthaben), während das zurückgegebene `data`-Ref die vollständige `SolanaRpcResponse`-Hülle behält, sodass du `data.value?.context.slot` lesen kannst.

### Einmalige Anfragen mit `useRequest`

`useRequest` ist die allgemeine SWR-Anfrage. Es akzeptiert eine Anfragefunktion, ein Kit-Anfrageobjekt (alles mit `send()`), eine `ref`/`computed` von beidem oder `null` zum Deaktivieren:

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // Optional per-attempt cancellation composed with the internal signal.
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value is the raw response value; status is
// "fetching" | "success" | "error" | "disabled".
```

Während eine Revalidierung läuft, bleiben die vorherigen `data` und `error` gefüllt, sodass die UI weiter rendert. `refresh()` löst manuell erneut aus und löst mit dem Ergebnis des Versuchs auf.

### Streams mit `useSubscription`

`useSubscription` konsumiert jede reaktive Stream-Quelle von Kit (duck-typed über `reactiveStore()`), baut die Verbindung beim Unmounten ab und unterstützt manuelles Wiederverbinden mit Stale-While-Revalidate:

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// Status is "loading" | "loaded" | "error" | "disabled".
// reconnect() re-opens the stream while data keeps the last known value.
```

Fehler bewahren das zuletzt bekannte `data`; eine `null`-Quelle deaktiviert die Subscription und leert den Zustand.

### Cache-Keying über Mounts hinweg

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Komponenten, die mit demselben Key gemountet werden, starten mit dem zuletzt bekannten Wert, während ihre eigene Anfrage revalidiert. Es gibt keinen `useAction`-Adapter — Aktionen sind Mutationen, keine cachebaren Lesevorgänge; nutze die Mutations-API deiner Datenschicht (oder `useAction` selbst).

Details zum Cache-Verhalten:

- Keys sind pro Adapter namensräumlich getrennt (`request:`, `subscription:`, `tracked:`), derselbe Key ist also über Adapter hinweg sicher.
- Eine `null`/`undefined`-Quelle deaktiviert das Composable und **leert** den Cache-Eintrag für diesen Key — auch wenn eine Komponente mit bereits deaktivierter Quelle mountet.
- `useTrackedDataSwr` cached die vollständige `SolanaRpcResponse`-Hülle, erneut gemountete Komponenten stellen also sowohl den Wert als auch seinen Slot-Kontext wieder her.
- Der Cache ist eine `Map` auf Modulebene. Namespace die Keys auf dem Server pro Anfrage oder rufe `clearSwrCache()` zwischen Anfragen auf, um ein Durchsickern zwischen Anfragen zu vermeiden.

Eine lauffähige Demonstration aller fünf Composables (inklusive SWR-Remount-Verhalten) gegen Devnet findest du in den Live-Data-Panels im [Vue-Vite-Beispiel](/de/examples/vue-vite).

## Transaktionszustand

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

Die aktuelle Wallet muss verbunden sein und entweder `signAndSendTransaction` oder `signTransaction` unterstützen. Android-Mobile-Wallet-Adapter-Wallets bevorzugen `signTransaction` plus app-seitige RPC-Übermittlung, sofern verfügbar. Das vermeidet einen Sonderfall beim mobilen Handoff, bei dem die Wallet erfolgreich sendet, die Browserseite aber die zurückgegebene Signatur des Wallet-Adapters nicht erhält.

Ohne `confirm: true` kehrt `execute()` nach der Übermittlung zurück und setzt `status` auf `sent`. Ist die Bestätigung aktiviert, wandert der Status durch `sending`, `confirming` und dann `processed`, `confirmed` oder `finalized`, passend zum angeforderten Commitment. Läuft die Bestätigung in einen Timeout oder schlägt sie fehl, bleibt die übermittelte `signature` verfügbar, damit die App auf einen Explorer verlinken kann.

`useSignAndSendTransaction()` leert außerdem `loading`, wenn ein Wallet-Adapter nie ein Ergebnis zurückgibt. In diesem veralteten Fall wird `error` gesetzt und der Chain-Status kann unbekannt sein — prüfe also die verbundene Wallet oder einen Explorer, bevor du es erneut versuchst.

### Eingaben und Rückgaben der Wallet-Anfragen

Wallet-Signaturflüsse akzeptieren Transaktionseingaben als rohe `Uint8Array`-Wire-Bytes, die dem Solana-Transaktionsschema entsprechen. Baue sie mit den Kit-Helfern aus `@vue-solana/vue/kit` (oder dekodiere sie aus einer base64-/base58-RPC-Antwort); base64-Strings, Transaktionsobjekte und Instruktionslisten werden hier nicht akzeptiert.

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` nimmt die rohen Nachrichtenbytes zum Signieren. Jede Sendeanfrage an die Wallet akzeptiert außerdem die Kit-`SendTransactionOptions`:

| Option                | Beschreibung                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Preflight-Simulation vor dem Senden überspringen.                                                                 |
| `maxRetries`          | Anzahl der Wiederholungen des RPC-Knotens (`bigint`).                                                             |
| `minContextSlot`      | Slot, ab dem jeder Blockhash oder jede Nonce der Transaktion bekannt ist; ein Senden davor kann abgelehnt werden. |
| `preflightCommitment` | Commitment für die Preflight-Simulation.                                                                          |

Rückgabeformen:

- `useSignMessage().execute(bytes)` löst zu `{ signedMessage, signature }` auf, beide `Uint8Array`.
- `useSignTransactions().execute(transactions)` löst zu den signierten `Uint8Array[]` auf (auch als `signedTransactions` verfügbar); übergib für eine einzelne Transaktion ein Array mit einem Element.
- `useSignAndSendTransaction().execute(transaction)` löst zum übermittelten `signature`-String auf; mit `confirm: true` füllt es zusätzlich `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` löst zu einem `string[]` von Signaturen auf (auch als `signatures` verfügbar).

Eine Wallet darf die Nachricht oder Transaktion vor dem Signieren ändern — etwa um eine eigene Instruktion hinzuzufügen oder den Gebührenzahler zu ändern —, und der Wallet Standard erlaubt das ausdrücklich. Lies die zurückgegebene `signedMessage` oder die signierten Transaktionsbytes erneut, statt anzunehmen, dass sie byte-genau deiner Eingabe entsprechen.

### Clientseitig gesendete Transaktionen

`useSendTransaction()` und `useSendTransactions()` nutzen die Sendefähigkeit des Clients statt der verbundenen Wallet. `createSolanaClient()` und `createSolanaPlugin()` installieren standardmäßig den offiziellen `solanaRpc()`-Stack, und `solanaRpc()` installiert den Planner sowie die Plan-Signing- und Plan-Sending-Executors selbst, diese Composables brauchen also weder einen eigenen Fallback noch eine zweite manuelle Plugin-Installation.

Der Executor liest einen frischen Blockhash, schätzt Ressourcenlimits oder respektiert sie, führt — sofern nicht anders konfiguriert — eine Preflight-Simulation aus, signiert mit den Client-Signern, übermittelt per RPC und wartet auf `confirmed`-Commitment. `status` wechselt erst nach Abschluss dieses Sende-und-Bestätige-Vorgangs von `sending` zu `sent`. Ein einzelnes Ergebnis zeigt `data.context.signature`; ein Batch-Ergebnis enthält den Plan-Ergebnisbaum. Es gibt kein Wallet-Popup, nutze diesen Pfad also nur, wenn der Client einen passenden Signer besitzt.

Konfiguriere einen `payer` direkt in einem Vue-/Core-Client über `payer` oder `payerSecretKey`; ein Client ohne Payer kann weder planen noch senden. Ein Server oder Relayer sollte finanzierte Produktionsschlüssel besitzen. Lege niemals ein rohes Secret oder `payerSecretKey` in der öffentlichen Nuxt-Runtime-Config ab und liefere niemals ein finanziertes Schlüsselpaar an den Browser einer Endnutzerin oder eines Endnutzers.

Die Wallet-Composables bleiben getrennt: `useSignAndSendTransaction()` kann nach der RPC-Übermittlung zurückkehren oder auf ein gewähltes Commitment warten, wenn `confirm: true` übergeben wird. Clientseitig gesendete Transaktionen nutzen immer das `confirmed`-Sende-und-Bestätige-Verhalten des offiziellen Executors.

## Batch-Transaktionen

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// One wallet request for N transactions.
const signed = await signMany([transactionA, transactionB]);

// One wallet request for N signatures.
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

Beide bevorzugen die Batch-Fähigkeit der Wallet. `useSignTransactions` fällt auf die Legacy-Batch-Funktion `signAllTransactions` zurück; `useSignAndSendTransactions` fällt darauf zurück, die singuläre Anfrage nacheinander zu senden. Batch-Signieren ist alles oder nichts (eine Ablehnung signiert nichts), aber der Sign-and-Send-Fallback kann frühere Transaktionen bereits übermittelt haben. In diesem Fall wird mit einem `PartialSignAndSendError` abgelehnt, dessen `signatures` die bereits gesendeten Transaktionen auflisten, damit ein erneuter Versuch sie überspringen kann:

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures: the ones that already landed — resend only the rest.
  }
}
```

## Ausgewähltes Wallet-Konto

Für app-weiten Zustand zum ausgewählten Konto mit Persistenz und Filterung binde den Provider einmal nahe der Wurzel ein und lies ihn überall:

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

Die Auswahl wird standardmäßig als `${walletName}:${accountAddress}` in `localStorage` gespeichert (übergib `stateSync`, um das anzupassen, oder `null`, um es zu deaktivieren) und beim nächsten Besuch wiederhergestellt, wenn Wallet und Konto verfügbar sind. `filterWallet` schränkt ein, welche Wallet-Konten angeboten werden. In Nuxt installiert das Runtime-Plugin des Moduls diesen Kontext automatisch.

## Client-Fähigkeiten und Planung

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// Reactive signers from the Kit client (requires a signer plugin).
const payer = usePayer();
const identity = useIdentity();

// Plan transaction messages from instructions without sending.
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")` stellt sicher, dass eine Fähigkeit im Client installiert ist, und wirft beim Setup einen aussagekräftigen Fehler (mit Hook-Namen und Installationshinweis), wenn sie fehlt. Der Standard-Vue-Client erhält Planner sowie Plan-Signing- und Plan-Sending-Executor bereits von `solanaRpc()`; eigene Clients müssen `rpcTransactionPlanner()` und `rpcTransactionPlanSendingExecutor()` selbst installieren.

## Eine bestehende Signatur bestätigen

Verwende `useTransactionConfirmation()`, wenn deine App bereits eine übermittelte Signatur hat und getrennt vom Signieren und Senden auf ein bestimmtes Commitment warten will:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

Das Composable behält die übermittelte `signature`, wenn die Bestätigung in einen Timeout läuft oder der RPC-Aufruf fehlschlägt, sodass Apps weiterhin einen Explorer-Link anzeigen können, während sie `error` an die Nutzerin oder den Nutzer ausgeben. Die Optionen werden an `confirmTransactionSignature()` durchgereicht: `commitment`, `timeoutMs`, `pollIntervalMs`, `abortSignal` und `searchTransactionHistory`. Eine fehlgeschlagene Transaktion meldet `TRANSACTION_FAILED`, eine Signatur, die nie erscheint, `TRANSACTION_NOT_FOUND`, und ein ausgeschöpftes Warten `TRANSACTION_TIMEOUT`. Weil das `error`-Ref dieses Composables immer ein `SolanaError` ist, normalisiert das Abbrechen einer Bestätigung den Abbruchgrund zu `RPC_FAILURE` mit dem ursprünglichen Grund in `error.cause`; rufe `confirmTransactionSignature()` direkt auf, wenn du den rohen Abbruchgrund brauchst.

## Signaturstatus verfolgen

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
  },
);
```

Es gibt keine `commitment`-Option pro Aufruf: `getSignatureStatuses()` akzeptiert keine, Lesevorgänge verwenden also das Commitment, das im Endpoint hinterlegt ist. Setze es am Endpoint oder in `createSolanaPlugin()`. Für ein Commitment pro Aufruf nutze `useTransactionConfirmation()`.

Das Polling nutzt `getSignatureStatuses()` in einem verketteten `setTimeout`, eine langsame RPC verzögert also den nächsten Tick, überlappt sich aber nie. Ein Aufruf von `stopPolling()` löscht den aktuellen Timer und verhindert weitere automatische Ticks — bis sich die beobachtete Signatur ändert, was das Polling für die neue Signatur neu startet. Ungültige Signaturen leeren veraltete `status`, setzen `error` und rufen weder RPC auf noch starten sie das Polling. Ungültige `pollIntervalMs`-Werte kleiner oder gleich `0` setzen einen `RPC_FAILURE`-`SolanaError` und starten kein Polling.

## Beispiel-App

Einen vollständigen lauffähigen Vue- und Vite-Flow findest du im [Vue-Vite-Beispiel](/de/examples/vue-vite).
