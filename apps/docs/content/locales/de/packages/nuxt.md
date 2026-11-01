---
title: "@vue-solana/nuxt"
description: Nuxt-Modul für Solana-Anwendungen.
ogSection: Pakete
surroundOrder: 18
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) installiert das Vue-Solana-Plugin in Nuxt-Apps und importiert Composables automatisch.

## Installation

```sh
npx nuxt module add @vue-solana/nuxt
```

Damit wird das Paket installiert und `@vue-solana/nuxt` dem `modules`-Array in `nuxt.config.ts` hinzugefügt.

Das Paket ist reines ESM. Nuxt bündelt bereits ESM und braucht keine Änderung; ein CommonJS-`require("@vue-solana/nuxt")` schlägt mit `No "exports" main defined` fehl, stelle das importierende Modul also auf ESM um oder bleib bei `@vue-solana/nuxt@^2`, das weiterhin einen `.cjs`-Build ausliefert. Siehe [Upgrade von v2 auf v3](/de/guides/migration#upgrading-v2-to-v3).

Browser-Apps, die Transaktionen erstellen oder serialisieren, können den Buffer-Polyfill aus `@vue-solana/nuxt/buffer-polyfill` initialisieren. Nutze `@vue-solana/nuxt/kit` für die Kit-API — es re-exportiert ganz `@solana/kit` — oder das automatisch importierte `useSolanaClient()`.

## Modul-Setup

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Du kannst auch einen eigenen RPC-Endpoint konfigurieren:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

Unterstützte Cluster sind `mainnet` (Legacy-Alias `mainnet-beta`), `devnet`, `testnet` und `localnet`. Verwende `mainnet` für Solana-Mainnet; das ist Solanas offizieller Mainnet-Clustername.

Die Optionen des Nuxt-Moduls liegen in der öffentlichen Runtime-Config, sie müssen also JSON-serialisierbar sein. Eigene `wallet`-Adapterobjekte sind bewusst aus der Nuxt-Konfiguration ausgeschlossen; verwende das Vue-Plugin direkt in clientseitigem Vue-Code, wenn du ein eigenes Wallet-Objekt injizieren willst.

`ModuleOptions` lässt außerdem `payer` und `payerSecretKey` bewusst weg. Direkte Clients von `@vue-solana/core` und `@vue-solana/vue` unterstützen sie weiterhin, aber das Nuxt-Modul reicht keines der beiden Felder weiter und entfernt sie aus der öffentlichen Runtime-Config. Lege niemals ein rohes Secret, eine Seed-Phrase oder einen `payerSecretKey` in `nuxt.config.ts` oder `runtimeConfig.public` ab: Diese Werte sind für den Browser sichtbar. Für einen clientseitigen Demo- oder Relayer-Signer erstelle ihn in einem clientseitigen Plugin mit `generateKeyPairSigner()` und installiere das Vue-Plugin dort, mit `clientPlugin: false`, damit das Modul sein eigenes Plugin überspringt. Beides zu installieren würde zwei Solana-Kontexte, zwei Wallet-Subscriptions und zwei Verbindungsprüfungen erzeugen, und nur das letzte `provide` würde gewinnen.

Das clientseitige Runtime-Plugin des Moduls installiert außerdem automatisch den app-weiten Kontext für das ausgewählte Wallet-Konto, `useSolanaSelectedWalletAccount()` funktioniert also in jeder Komponente, ohne dass ein Provider eingebunden werden muss. Um Persistenz (`stateSync`) oder Filterung (`filterWallet`) anzupassen, binde `SelectedWalletAccountProvider` aus `@vue-solana/vue/useSelectedWalletAccount` tiefer im Baum ein, um den Standardkontext zu überschreiben.

Optionen für mobile Wallets kannst du in `nuxt.config.ts` bedenkenlos konfigurieren, wenn sie nur JSON-serialisierbare App-Identität und Redirect-Einstellungen enthalten:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

Übergib `mobileWallet: false` oder `iosWallet: false`, um die jeweilige mobile Wallet-Quelle zu deaktivieren. Das Modul optimiert außerdem gängige Abhängigkeiten für Solana, Wallet Adapter und mobile Wallets vor, damit Vite Browser-Transaktions- und Wallet-Code korrekt bündeln kann.

## Automatisch importierte Composables

Das Modul importiert diese Composables aus direkten `@vue-solana/vue/*`-Subpfaden statt aus dem Root-Barrel des Vue-Pakets. So ziehen Nuxt-SSR-Bundles keinen unzusammenhängenden Solana-Runtime-Code nur deshalb ein, weil eine Seite ein einzelnes Composable nutzt.

- `useSolana()`: liefert den vollständigen injizierten Solana-Kontext.
- `useSolanaClient()`: liefert das Kit-`{ client, rpc }` aus dem Kontext. Empfohlen für neuen Code.
- `useSolanaRpc()`: liefert Cluster, Endpoint, RPC-Status, den neuesten Blockhash, den injizierten Kit-`client` und `checkConnection()`.
- `useSolanaConnection()`: liefert den injizierten Kit-`client` (veraltet zugunsten von `useSolanaClient()`).
- `useSolanaAccountInfo(address, options?)`: liest Konto-Informationen und kann Kontoänderungen abonnieren.
- `useSolanaAirdrop()`: führt auf Testnetzwerken und lokalen Validatoren einen SOL-Airdrop in ein Konto aus.
- `useSolanaWallet()`: liefert Zustand der ausgewählten Wallet, Verbindungszustand, Fähigkeiten und Wallet-Aktionen.
- `useSolanaWallets()`: liefert erkannte Wallets sowie Aktionen zum Auswählen und Aktualisieren.
- `useSolanaBalance(address, commitment?)`: liest das Lamport-Guthaben für einen öffentlichen Schlüssel oder eine Adresse.
- `useSolanaTokenAccounts(owner, options?)`: liest alle SPL-Token-Konten eines Eigentümers und fragt standardmäßig sowohl das Token- als auch das Token-2022-Programm ab.
- `useSolanaTokenBalance(mint, owner)`: liest SPL-Token-Guthaben und Dezimalstellen für ein Mint/Eigentümer-Paar über das zugehörige Token-Konto.
- `useSolanaProgramAccounts(programId, options?)`: liest programm-eigene Konten mit Filtern und Daten-Slicing.
- `useSolanaTransactionConfirmation(options?)`: bestätigt eine bestehende Transaktionssignatur.
- `useSolanaSignatureStatus(signature, options?)`: liest, pollt oder abonniert den Signaturstatus.
- `useSolanaSignMessage()`: signiert Off-Chain-Authentifizierungs- oder Besitz-Challenge-Nachrichten.
- `useSolanaSignAndSendTransaction()`: signiert, sendet und bestätigt Transaktionen optional.
- `useSolanaAction(handler)`: generische Zustandsmaschine für asynchrone Aktionen mit Abbruch bei erneutem Dispatch.
- `useSolanaRequest(source, options?)`: einmalige Anfrage, die bei Änderung ihrer Quelle erneut ausgelöst wird, mit Stale-While-Revalidate.
- `useSolanaSubscription(source, options?)`: Live-Daten aus RPC-Subscriptions und anderen reaktiven Stream-Quellen.
- `useSolanaTrackedData(source, options?)`: RPC-Subscription, initialisiert durch einen einmaligen Abruf, slot-dedupliziert.
- `useSolanaSignIn()`: löst die Sign-In-With-Solana-(SIWS-)Funktion einer Wallet aus.
- `useSolanaPay()`: baut und parst Solana-Pay-Transfer-Request-URLs und verfolgt den Bestätigungsstatus anhand einer Reference.
- `useSolanaPayConfirmation()`: pollt den Zahlungsstatus für eine Solana-Pay-Reference.
- `useSolanaQrCode()`: rendert eine Solana-Pay-URL als SVG-QR-Code.
- `useSolanaQrScanner()`: scannt Solana-Pay-QR-Codes über die Kamera und `BarcodeDetector`.

Für Cache-Keying über mehrere Mounts hinweg werden die SWR-Adapter nicht automatisch importiert. Importiere sie ausdrücklich aus dem Subpfad des Vue-Pakets:

```ts
import { useRequestSwr } from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Die vollständige Semantik der Composables für Anfragen, Subscriptions, verfolgte Daten und SWR-Cache findest du unter [Data-Fetching-Composables](/de/packages/vue#data-fetching-composables).

- `useSolanaSelectedWalletAccount()`: liest den app-weiten Kontext für das ausgewählte Wallet-Konto, den das Runtime-Plugin installiert.
- `useSolanaSignTransactions()`: signiert mehrere Transaktionen in einer einzigen Wallet-Anfrage.
- `useSolanaSignAndSendTransactions()`: signiert und sendet mehrere Transaktionen in einer einzigen Wallet-Anfrage.
- `useSolanaPayer()` / `useSolanaIdentity()`: reaktive Signer des Kit-Clients (erfordert ein Signer-Plugin).
- `useSolanaPlanTransaction()` / `useSolanaPlanTransactions()`: planen Transaktionsnachrichten aus Instruktionseingaben.
- `useSolanaSendTransaction()` / `useSolanaSendTransactions()`: nutzen den offiziellen Kit-Planner und den RPC-Plan-Sending-Executor, die der Standardclient installiert; sie planen, signieren, übermitteln und warten auf `confirmed`-Commitment ohne Wallet-Popup. Konfiguriere einen `payer` in einem clientseitigen Vue-Plugin; nutze `useSolanaSignAndSendTransaction(s)`, wenn eine verbundene Wallet jede Transaktion genehmigen muss.

Das sind Nuxt-Aliase für die Vue-Composables.

- `useSolanaClientCapability()`: schlägt sofort fehl, wenn dem installierten Kit-Client eine erforderliche Fähigkeit fehlt.
- `tryUseSolana()`: sicherer, nicht werfender Zugriff auf den injizierten Solana-Kontext.
- `clearSwrCache()`: leert den SWR-Cache auf Modulebene (siehe [Data-Fetching-Composables](/de/packages/vue#data-fetching-composables)).

Der Standardclient, den das Nuxt-Modul erstellt, setzt die offiziellen Plugins `solanaRpc()` und `rpcAirdrop()` zusammen, wenn kein `commitment` konfiguriert ist (ein konfiguriertes `commitment` baut denselben Stack explizit, damit es die RPC-Schicht erreicht); `solanaRpc()` installiert den Transaktions-Planner sowie die Plan-Signing- und Plan-Sending-Executors selbst. Der alte, eigene Fallback-Sender wird nicht verwendet. `useSolanaSendTransaction()` und `useSolanaSendTransactions()` stellen damit die offizielle clientseitige Sendefähigkeit bereit, das Modul konfiguriert aber keinen Payer, weil `payer` und `payerSecretKey` bewusst aus `ModuleOptions` ausgelassen werden — eine clientseitig gesendete Transaktion braucht also einen in einem clientseitigen Plugin installierten `payer` mit `clientPlugin: false`, wie unter [Modul-Setup](#modul-setup) beschrieben. Ihr Status `sent` wird erreicht, nachdem der offizielle Executor seinen Sende-und-Bestätige-Vorgang bei `confirmed`-Commitment abgeschlossen hat.

Das Vue-Paket verwendet kurze Namen wie `useRpc()`, weil Aufrufer sie ausdrücklich aus `@vue-solana/vue/useRpc` importieren.

Das Nuxt-Modul stellt Namen mit Präfix wie `useSolanaRpc()` bereit, weil automatisch importierte Composables den app-weiten Nuxt-Namensraum teilen und Kollisionen mit App-Code oder anderen Modulen vermeiden sollen.

`useSolana()` ist die Ausnahme, weil es bereits namensräumlich getrennt ist und in Vue wie in Nuxt als kanonischer Kontextzugriff dient.

Verwende in Nuxt-Apps die `useSolana*`-Namen, damit Auto-Imports ohne ausdrückliche Importe funktionieren.

Rohe Transaktionsbytes und der Browser-Buffer-Helfer sind ausdrückliche Importe, keine Auto-Imports:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
```

Die Kit-API ist sowohl als Auto-Import als auch als ausdrücklicher Import verfügbar:

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";

const { client, rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
const owner = address("PASTE_A_SOLANA_ADDRESS");
```

Verwende direkte `@vue-solana/core/*`-Importe nur für tiefer liegende Core-Nutzung.

Direkte Paket-Subpfade:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/kit`

Das Runtime-Plugin läuft nur auf dem Client. Automatisch importierte Composables können während der SSR aufgerufen werden und liefern inaktiven Zustand, bis die Hydration den echten Client-Kontext bereitstellt. Löse RPC- und Wallet-Arbeit aus Client-Lifecycle-Hooks oder Nutzeraktionen aus.

Auch die Registrierung des Android Mobile Wallet Adapter läuft nur auf dem Client. Auf Android Chrome und in Chrome-PWAs kann `Mobile Wallet Adapter` in derselben `useSolanaWallets()`-Liste erscheinen wie Browser-Erweiterungs-Wallets. Auf iOS-Browsern können Phantom, Solflare und Backpack über wallet-spezifische Universal Links in derselben Liste erscheinen. Native Desktop-App-Wallet-Adapter sind geplant, aber noch nicht implementiert.

## Verwandte Anleitungen

- [RPC und Cluster](/de/guides/rpc-and-clusters): das Nuxt-Modul konfigurieren und RPC-Zustand lesen.
- [Wallets](/de/guides/wallets): `useSolanaWallets()` und `useSolanaWallet()` sicher in Client-Flows verwenden.
- [Kontolesevorgänge](/de/guides/account-reads): Guthaben, Kontodaten, Programm-Konten und Signaturstatus lesen.
- [Transaktionen](/de/guides/transactions): aus Nuxt heraus signieren, senden, bestätigen und den Transaktionsstatus behandeln.
- [Nachrichtensignierung](/de/guides/message-signing): Wallet-Signaturen für Off-Chain-Nachrichten anfordern.
- [Solana Pay](/de/guides/solana-pay): die automatisch importierten Solana-Pay-Composables für Zahlungen und QR-Codes nutzen.
- [E2E-Tests](/de/guides/e2e-testing): RPC, RPC-Subscriptions und Wallets in Playwright-Tests mocken.
- [Fehler](/de/guides/errors): Fehler automatisch importierter Composables auf sichere UI-Meldungen abbilden.

## RPC-Zustand lesen

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

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

## Guthaben lesen

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

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
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useSolanaTokenAccounts(owner);

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

`useSolanaTokenAccounts()` leert den Zustand ohne RPC-Aufruf, wenn der Eigentümer null ist. Übergib `programId` in den Optionen, um die Ergebnisse auf ein einzelnes Token-Programm zu beschränken.

## Token-Guthaben lesen

```vue
<script setup lang="ts">
const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useSolanaTokenBalance(mint, owner);

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

`useSolanaTokenBalance()` liefert `null` für Guthaben und Dezimalstellen, wenn das zugehörige Token-Konto nicht existiert, ohne das als Fehler zu behandeln. `balance` und `decimals` sind schreibgeschützte Computed-Refs, die aus einem einzigen Lesevorgang abgeleitet werden — lies sie, weise ihnen nichts zu.

## Semantik der Lese-Composables

`useSolanaBalance()`, `useSolanaAccountInfo()`, `useSolanaProgramAccounts()`, `useSolanaTokenAccounts()` und `useSolanaTokenBalance()` teilen sich eine Zustandsmaschine, identisch zu den Vue-Composables:

- **`refresh()` wird bei einem Fehler abgelehnt** statt aufzulösen, und löst mit `null` auf, wenn eine Eingabe leer ist. Ein `await refresh()` ohne `try`/`catch` wirft. Es direkt an `@click` zu hängen ist in Ordnung — Vue schluckt die Ablehnung —, aber handgeschriebene Aufrufer müssen sie behandeln. `useSolanaRequest()` ist die Ausnahme und löst weiterhin mit dem Ergebnis des Versuchs auf.
- **Daten fallen auf ihren leeren Wert zurück, wenn ein Lesevorgang fehlschlägt.** Das letzte erfolgreiche Guthaben bleibt nicht neben einem frischen `error` stehen. Verzweige auf `error`, um zu entscheiden, was gerendert wird.

Eine nicht parsbare Adresse meldet `INVALID_ADDRESS` in `error` und erreicht die RPC nie. Siehe [Kontolesevorgänge](/de/guides/account-reads#refresh-and-error-semantics).

## Fehlerbehandlung

Automatisch importierte Nuxt-Composables stellen dieselben normalisierten `SolanaError | null`-Refs bereit wie `@vue-solana/vue`. Nutze die stabilen Werte `error.value.code` für UI-Verzweigungen und behalte `error.value.cause` für das Logging ursprünglicher Wallet-, RPC-, Parsing-, Timeout- oder Speicherfehler.

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

## Kontodaten lesen

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

Verwende `useSolanaProgramAccounts()` auf öffentlichen RPC-Knoten mit Bedacht. Bevorzuge enge Filter, nutze `dataSlice` für Teil-Lesevorgänge und vermeide das Polling breiter Scans.

## Wallet-Zustand

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
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
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser-Erweiterungs-Wallets werden über den Solana Wallet Standard erkannt. Android-Mobile-Wallet-Adapter-Wallets werden auf unterstützten Android-Chrome-Clients über `@solana-mobile/wallet-standard-mobile` registriert und in derselben Wallet-Liste angezeigt. iOS-Einträge für Phantom, Solflare und Backpack werden auf iOS-Browsern über wallet-spezifische Universal Links angeboten. `refreshWallets()` aktualisiert nur die Liste der erkannten Wallets, und `selectWallet()` konfiguriert nur die aktive Wallet. `connected` bleibt false, bis `connect()` erfolgreich ist — selbst wenn die Erweiterung nach einem Seiten-Refresh zuvor autorisierte Konten offenlegt.

## Nachrichtensignierung

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
</script>
```

Nachrichtensignierung dient Wallet-Besitz- oder Authentifizierungs-Challenges. Es ist keine Transaktionssignierung und autorisiert keine On-Chain-Zustandsänderungen. Wallets, die keine Nachrichtensignierung anbieten, melden `canSignMessage` als false, und `execute()` wird mit einem Fehler über eine nicht unterstützte Wallet abgelehnt.

## Eine Transaktion signieren, senden und bestätigen

Verwende `useSolanaSignAndSendTransaction()` aus einer clientseitigen Nutzeraktion, wenn die verbundene Wallet eine Transaktion signieren und übermitteln soll. Übergib `confirm: true`, wenn die UI auf die Bestätigung warten soll, statt nach dem Übermitteln der Signatur zu stoppen.

```vue
<script setup lang="ts">
import type { SolanaTransaction } from "@vue-solana/nuxt/kit";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction(transaction: SolanaTransaction) {
  // Build the transaction message with @vue-solana/nuxt/kit and serialize it to wire bytes first.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Submitted: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to complete the transaction.</p>
  </section>
</template>
```

Der Status wechselt nach der RPC-Übermittlung von `sending` zu `sent`. Ist die Bestätigung aktiviert, geht er danach durch `confirming` und endet beim erreichten Commitment, etwa `confirmed` oder `finalized`. Läuft die Bestätigung nach der Übermittlung in einen Timeout, bleibt `signature` verfügbar, damit die App einen Explorer-Link anzeigen oder den Signaturstatus abfragen kann, bevor sie es erneut versucht.

Clientseitig gesendete Transaktionen sind etwas anderes: `useSolanaSendTransaction()` und `useSolanaSendTransactions()` nutzen den offiziellen RPC-Plan-Sending-Executor. Der Executor wartet auf `confirmed`-Commitment, bevor `execute()` auflöst, ihr Status `sent` bedeutet also, dass der clientseitige Sende-und-Bestätige-Vorgang abgeschlossen ist. Sie zeigen kein Wallet-Popup; installiere einen `payer` in einem clientseitigen Vue-Plugin. Versuche nicht, einen rohen `payerSecretKey` in der öffentlichen Nuxt-Runtime-Config zu konfigurieren.

Wallet-Prompts müssen durch Nutzerinteraktion nach der Hydration ausgelöst werden. Rufe `execute()` nicht während der SSR, in Server-Routen oder automatisch beim Laden der Seite auf.

## Eine bestehende Signatur bestätigen

Verwende `useSolanaTransactionConfirmation()`, wenn du bereits eine Signatur hast und einen reaktiven Bestätigungszustand willst.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirm signature</button>
    <p>Status: {{ status }}</p>
    <p v-if="confirmation">Reached {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to confirm the signature.</p>
  </section>
</template>
```

## Signaturstatus verfolgen

Verwende `useSolanaSignatureStatus()`, wenn du laufende Statusprüfungen für eine übermittelte Signatur brauchst. Das ist nach einem Timeout nützlich, weil eine Transaktion auch dann noch landen kann, wenn die UI aufgehört hat zu warten.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling } = useSolanaSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>
```

Verwende für Explorer-Links den konfigurierten Cluster. Devnet-Links sollten `?cluster=devnet` enthalten; sowohl `mainnet` als auch der Legacy-Alias `mainnet-beta` sollten die Cluster-Query weglassen.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## Beispiel-App

Einen vollständigen lauffähigen Nuxt-Flow findest du im [Nuxt-Beispiel](/de/examples/nuxt).
