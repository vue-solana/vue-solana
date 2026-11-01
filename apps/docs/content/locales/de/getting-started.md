---
title: Erste Schritte
description: Installiere die Vue-Solana-Pakete, konfiguriere Vue oder Nuxt und teste RPC-Lesevorgänge auf devnet.
ogSection: Start hier
surroundOrder: 2
---

Diese Anleitung behandelt die Installation der Vue-Solana-Pakete, die Konfiguration von Vue oder Nuxt, das Testen von Solana-RPC-Lesevorgängen, das Verbinden unterstützter Wallets, das Signieren von Nachrichten, das Senden einer echten devnet-Überweisung und die Prüfung des Ergebnisses. Die Beispiele verwenden standardmäßig devnet für sicheres Testen.

## Bevor du beginnst

Verwende `@vue-solana/core` direkt, wenn du Solana-Primitives ohne Vue-/Nuxt-Integration brauchst. Das Paket baut auf `@solana/kit` auf und exportiert `createSolanaClient()` sowie das gesamte `@solana/kit` aus `@vue-solana/core/kit` erneut. Verwende `@vue-solana/vue` oder `@vue-solana/nuxt`, wenn du Framework-Integration willst.

Unterstützte Cluster:

- `mainnet`: der Produktions-Cluster von Solana. Dies ist der offizielle Mainnet-Cluster-Name von Solana.
- `devnet`: die beste Standardwahl für die App-Entwicklung.
- `testnet`: Netzwerk für Validator- und Protokolltests.
- `localnet`: lokaler Validator.

Verwende `devnet`, während du lernst und testest. Verwende `mainnet` nur, wenn du bereit bist, mit echtem SOL zu interagieren.

Aktuelle Wallet-Unterstützung:

- Browser-Erweiterungs-Wallets über die Solana-Wallet-Standard-Pakete.
- Native mobile Android-Wallets über `@solana-mobile/wallet-standard-mobile` in Android Chrome und Chrome-PWAs.
- iOS-Browser-Wallets für Phantom, Solflare und Backpack über wallet-spezifische Universal Links.
- Manuelle/eigene Wallet-Objekte, die `SolanaWallet` implementieren.

Geplant, aber noch nicht unterstützt:

- Native Desktop-App-Wallets über wallet-spezifische Protokoll-Links oder eine künftige native Wallet-Standard-Registrierung.

## Für Vue installieren

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Vue-Apps können `@vue-solana/vue/kit` (`createSolanaClient`, `address`, `lamports` und Typen) und `@vue-solana/vue/buffer-polyfill` nutzen, ohne Solana- oder Buffer-Pakete auf niedriger Ebene direkt zu installieren. Verwende `useSolanaClient()` aus `@vue-solana/vue/useSolanaClient` für den injizierten Client.

## Für Nuxt installieren

```sh
npx nuxt module add @vue-solana/nuxt
```

Das installiert das Paket und fügt `@vue-solana/nuxt` dem `modules`-Array in `nuxt.config.ts` hinzu.

Nuxt-Apps können `@vue-solana/nuxt/kit` und `@vue-solana/nuxt/buffer-polyfill` nutzen, ohne `@vue-solana/core`, `@vue-solana/vue` oder Solana- und Buffer-Pakete auf niedriger Ebene direkt zu installieren. Das automatisch importierte `useSolanaClient()` gibt den injizierten Kit-Client zurück.

## Hinweis zu v3

v3.0.0 wird ausschließlich als ESM veröffentlicht — die Export-Bedingung `require` und das Feld `main` auf oberster Ebene sind aus jedem `@vue-solana/*`-Paket verschwunden. Nuxt- und Vite-Apps bündeln bereits ESM und brauchen keine Änderung; ein einfaches Node-Skript, das ein Vue-Solana-Paket per `require()` lädt, muss zu ESM werden. Die `kit`-Subpfade sind außerdem zu einem vollständigen Spiegel von `@solana/kit` geworden, du kannst `@solana/kit` also aus deiner eigenen `package.json` entfernen, wenn du es unter v2 hinzugefügt hast. Siehe [Upgrade von v2 auf v3](/de/guides/migration#upgrading-v2-to-v3) für die Details.

## Hinweis zu v2

v2.0.0 hat die Legacy-Oberfläche `@solana/web3-compat` entfernt. Der Kontext enthält keine `connection` mehr, und die Subpfade `@vue-solana/*/web3` wurden gelöscht. Alle Composables sind Kit-first, und `SolanaWallet.publicKey` ist ein einfacher base58-`Address`-String. Das `@solana/buffer/`-Shim, das frühere v1-Dokumente beschrieben haben, ist verschwunden; die verbliebenen paketeigenen Shims decken nur den Browser-Subpfad `buffer/` ab, den das Buffer-Polyfill verwendet. Siehe die [Kit-Migrationsanleitung](/de/guides/migration) für die vollständige Vorher/Nachher-Zuordnung.

## Vue einrichten

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
        },
      },
      iosWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet` und `iosWallet` sind optional. Die Registrierung des Android Mobile Wallet Adapter und die iOS-Links für Phantom, Solflare und Backpack sind standardmäßig aktiviert, wenn die Browser-Runtime sie unterstützt. Übergib `mobileWallet: false` oder `iosWallet: false`, um die jeweilige Quelle zu deaktivieren.

Für Vue-Composables solltest du in neuem Code direkte Subpfad-Importe bevorzugen:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
```

`useRpc()` gibt den aufgelösten Cluster-Zustand und den injizierten Kit-`client` zurück; `useBalance()` liest über `client.rpc`. `useSolanaClient()` gibt denselben `client` und dessen schreibgeschützte `rpc` direkt zurück, dazu `address()`/`lamports()` aus `@vue-solana/vue/kit`. Siehe die [Kit-Migrationsanleitung](/de/guides/migration) für die vollständige Vorher/Nachher-Zuordnung.

### Lebenszyklus von Client und Plugin

`createSolanaPlugin()` baut den Kit-Client einmal, und zwar während `install()`. Erstelle das Plugin auf Modulebene und verwende die Instanz wieder:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Ein erneuter Aufruf von `createSolanaPlugin()` baut einen neuen Client und Kontext und verwirft die bestehende Wallet-Auswahl und den RPC-Zustand. Wenn deine Konfiguration reaktiv ist — etwa ein Cluster-Umschalter —, memoisiere sie, damit ein neues Plugin (und ein neuer Client) nur gebaut wird, wenn sich der Wert tatsächlich ändert, und nicht bei jedem Render:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Ein Kit-Client führt seine `createClient().use(...)`-Plugins während der Konstruktion aus. Wenn eines dieser Plugins asynchron ist, wird der Client — und jeder daraus gebaute Kontext — erst aktiv, nachdem dieses Promise aufgelöst wurde. Verschiebe echte RPC- und Wallet-Arbeit in Lifecycle-Hooks oder Nutzeraktionen nach der Hydration, statt sie während des Setups oder der SSR auszuführen.

## Nuxt einrichten

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

Das Nuxt-Modul installiert das Runtime-Plugin nur auf dem Client und importiert Composables automatisch aus direkten `@vue-solana/vue/*`-Subpfaden. Composables können bedenkenlos während der SSR aufgerufen werden, aber echte RPC- und Wallet-Operationen sollten nach der Hydration laufen, etwa aus `onMounted()` oder aus Nutzeraktionen. Die Nuxt-Optionen unter `solana` liegen in der öffentlichen Runtime-Config, halte sie also JSON-serialisierbar.

Direkte Vue- und Core-Clients akzeptieren `payer` und `payerSecretKey` für clientseitig gesendete Transaktionen. `payerSecretKey` ist ein base64-kodiertes 64-Byte-Ed25519-Schlüsselpaar; lege es also niemals in die öffentliche Nuxt-Runtime-Config und liefere niemals einen Schlüssel mit Guthaben an einen Browser aus. Die `ModuleOptions` von Nuxt lassen beide Felder absichtlich weg, installiere einen client-eigenen `payer` daher in einem client-only Plugin mit `clientPlugin: false`, damit das Modul kein zweites Plugin installiert.

## RPC ohne Wallet testen

RPC-Lesevorgänge funktionieren ohne Browser-Wallet.

Verwende in Vue `useRpc()`:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, client } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const { value } = await client.rpc.getLatestBlockhash().send();
  latestBlockhash.value = value.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

Neuer Code kann stattdessen den Kit-Client verwenden. `useSolanaClient()` braucht keine Wallet und gibt dieselben Informationen typisiert für die Kit-RPC-API zurück (Leseaufrufe geben `bigint` zurück):

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>

<template>
  <main>
    <p>Slot: {{ slot }}</p>
  </main>
</template>
```

Verwende in Nuxt das automatisch importierte `useSolanaRpc()`:

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </main>
</template>
```

In Nuxt kommen dieselben Kit-Lesevorgänge aus dem automatisch importierten `useSolanaClient()`:

```vue
<script setup lang="ts">
const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>
```

## Devnet- oder Testnet-SOL erhalten

Devnet- und Testnet-SOL sind Test-Token ohne echten Wert.

Verwende den offiziellen Faucet:

```txt
https://faucet.solana.com
```

Wähle `Devnet`, während du dieser Anleitung folgst. Wähle `Testnet` nur, wenn du gegen den testnet-Cluster testest.

Wenn du die Solana CLI installiert hast, kannst du auch Folgendes ausführen:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Verwende während des Testens niemals eine Wallet mit echtem Guthaben.

## Die Beispiele ausführen

Um die Beispiel-Apps lokal auszuführen, klone zuerst das Vue-Solana-Repository:

```sh
git clone https://github.com/vue-solana/vue-solana.git
cd vue-solana
pnpm install
pnpm build:packages
```

Starte das Vue-Vite-Beispiel:

`pnpm dev:vue`

Starte das Nuxt-Beispiel:

`pnpm dev:nuxt`

Die Beispiele zeigen die Einrichtung von Plugin und Modul, RPC-Zustand, direkte Client-Aufrufe, Guthabenabfragen, einheitliche Wallet-Erkennung, persistierte Wallet-Auswahl, Wallet-Zustand, Nachrichtensignierung, generischen Transaktionszustand, Überweisungsflüsse, clientseitig gesendete Transaktionen über den offiziellen Kit-Planer und den RPC-Executor für den Plan-Versand, Bestätigungsstatus, Explorer-Links und UI für nicht unterstützte Fähigkeiten. Sie verwenden standardmäßig devnet für sicheres Testen.

## Eine Wallet verbinden

Installiere Phantom, Solflare, Backpack oder eine andere Solana-Wallet-Standard-Browser-Wallet. Stelle die Wallet vor dem Testen auf devnet um.

Installiere in Android Chrome oder einer Android-Chrome-PWA eine kompatible mobile Solana-Wallet wie Phantom, Solflare oder Seed Vault Wallet. `Mobile Wallet Adapter` kann nach `refreshWallets()` in derselben Wallet-Liste erscheinen.

In Vue:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

In Nuxt:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

Wähle eine Wallet aus `wallets` und rufe dann `connect()` auf. Die Auswahl einer Wallet konfiguriert nur die aktive Wallet; sie verbindet sie nicht. Einige Erweiterungen geben nach einem Neuladen der Seite zuvor autorisierte Konten preis, aber Vue Solana hält `connected` trotzdem auf false, bis `connect()` erfolgreich war.

Wenn `autoConnect` aktiviert ist, stellt Vue Solana nur die Wallet-Identität wieder her, die der Nutzer zuvor ausgewählt hat, und zwar erst, nachdem diese Wallet auf dem Client erneut erkannt wurde. Gespeichert werden die Metadaten `name`, `platform` und `source` in `localStorage`, keine privaten Schlüssel, Sessions oder Transaktionen.

Die iOS-Browser-Wallet-Unterstützung nutzt wallet-spezifische Universal Links, weil die Web-Unterstützung des Mobile Wallet Adapter nur auf Android existiert. Phantom, Solflare und Backpack erscheinen in iOS-Browsern in derselben `useWallets()`-Liste.

## Manuelles Wallet-Testen

Nutze diese Checkliste, wenn du eine Browser-Erweiterung, eine Android-MWA-Wallet oder eine iOS-Browser-Wallet von Hand prüfst.

1. Konfiguriere die App für `devnet` und prüfe, dass die UI den devnet-Endpoint anzeigt.
2. Installiere eine unterstützte Wallet und stelle die Wallet selbst auf devnet um.
3. Lade die Wallet mit devnet-SOL von `https://faucet.solana.com` auf.
4. Öffne die Beispiel-App und klicke auf die Aktion zum Aktualisieren der Wallets.
5. Prüfe, dass die Wallet mit der erwarteten Quelle in der einheitlichen Wallet-Liste erscheint.
6. Wähle die Wallet aus und prüfe, dass die Auswahl allein sie nicht verbindet.
7. Klicke auf Verbinden und bestätige die Abfrage der Wallet.
8. Prüfe, dass sich öffentlicher Schlüssel und `connected`-Zustand aktualisieren, nachdem `connect()` aufgelöst wurde.
9. Lade die Seite neu und prüfe, dass die zuvor ausgewählte Wallet-Identität wiederhergestellt wird, ohne dass eine beliebige Wallet ausgewählt wird.
10. Trenne die Wallet und prüfe, dass öffentlicher Schlüssel und Verbindungszustand geleert werden.

Erwartete Wallet-Quellen:

| Plattform                      | Erwartete Quelle         | Hinweise                                                                                              |
| ------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------------------- |
| Desktop-Browser-Erweiterung    | `wallet-standard`        | Phantom, Solflare, Backpack und andere Standard-Wallets können erscheinen, wenn sie installiert sind. |
| Android Chrome oder Chrome-PWA | `mobile-wallet-adapter`  | Erfordert eine kompatible native Wallet und Android-MWA-Browser-Unterstützung.                        |
| iOS-Browser                    | `deep-link`              | Phantom-, Solflare- und Backpack-Einträge verwenden wallet-spezifische Universal Links.               |
| Native Desktop-App             | Noch nicht implementiert | Protokoll-Links für native Desktop-Apps werden noch nicht unterstützt.                                |

## Eine Nachricht signieren

Verwende die Nachrichtensignierung für Wallet-Besitzprüfungen oder Authentifizierungs-Challenges. Sie übermittelt keine Transaktion und autorisiert keine On-Chain-Zustandsänderungen.

In Vue:

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

In Nuxt:

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Rendere eine deaktivierte Anmeldeschaltfläche, wenn `canSignMessage` false ist. Manche Wallets können sich verbinden und Transaktionen signieren, ohne beliebige Nachrichtensignierung zu unterstützen.

Verwende für manuelles Testen einen eindeutigen Challenge-String, der deine Domain, eine Nonce und eine Ablaufzeit enthält. Fordere Nutzer niemals auf, leere oder mehrdeutige Nachrichten zu signieren.

```ts
const challenge = new TextEncoder().encode(
  "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

Prüfe nach dem Signieren, dass die UI die zurückgegebenen Signatur-Bytes anzeigt und die Nachrichtensignatur nicht als On-Chain-Transaktion behandelt.

## Eine Überweisung senden

Die Vue- und Nuxt-Beispiele enthalten Felder für Empfängeradresse und Betrag für eine echte Überweisung. Sie verwenden standardmäßig devnet, damit du mit SOL ohne echten Wert testen kannst. Für mainnet konfigurierst du `mainnet` oder einen mainnet-RPC-Endpoint und verwendest eine Wallet mit echtem SOL für Gebühren.

Beginne beim Testen mit einem winzigen Betrag wie `0.000001` SOL.

Browser-Apps, die Transaktionen erstellen oder serialisieren, sollten das Buffer-Polyfill des Framework-Pakets vor dem Transaktionscode initialisieren:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

Die Wallet fordert dich auf, die Transaktion zu bestätigen. Nach der Bestätigung zeigt das Beispiel die Transaktionssignatur, den Bestätigungsstatus und den Explorer-Link. Bei Android Mobile Wallet Adapter bevorzugt Vue Solana, sofern unterstützt, die Signierung durch die Wallet plus die RPC-Übermittlung aus der App; dadurch ist die zurückgegebene Signatur zuverlässiger, nachdem die Wallet zurück in den Browser umgeleitet hat.

Für manuelles Überweisungstesten:

1. Halte App und Wallet beide auf devnet.
2. Verwende eine Empfängeradresse, die du kontrollierst, oder eine neu erzeugte devnet-Wallet.
3. Beginne mit `0.000001` SOL.
4. Prüfe die Abfrage der Wallet, bevor du bestätigst.
5. Warte nach der Übermittlung, bis das Beispiel den Bestätigungsstatus anzeigt.
6. Öffne den Explorer-Link und prüfe, dass er die Cluster-Abfrage für devnet verwendet.
7. Aktualisiere die Guthaben von Sender und Empfänger.

Explorer-URLs sollten cluster-bewusst sein:

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Wenn die Bestätigung ausläuft, nachdem eine Signatur zurückgegeben wurde, reiche nicht sofort erneut ein. Prüfe zuerst den Signaturstatus oder den Explorer; die Transaktion wird möglicherweise trotzdem bestätigt.

Die Client-Sende-Demo verwendet den offiziellen `rpcTransactionPlanSendingExecutor()`, den der Standard-Client installiert. Verbinde eine Wallet, die `signTransaction` unterstützt, lade den Demo-Payer auf, wo das Beispiel es verlangt, und verwende `useSolanaSendTransaction()` oder `useSolanaSendTransactions()`. Der Executor übermittelt die Transaktion und wartet auf das Commitment `confirmed`, bevor das Composable `sent` meldet; es gibt kein separates Sende-Popup der Wallet. Erstelle einen Demo-Payer in Nuxt in einem client-only Plugin statt in `nuxt.config.ts` und setze `clientPlugin: false`, damit das Modul sein eigenes Plugin überspringt.

## Zahlungen mit Solana Pay akzeptieren

Vue Solana bietet erstklassige Unterstützung für [Solana Pay](https://docs.solanapay.com/). Du kannst Überweisungsanforderungs-URLs erstellen, QR-Codes für Wallets zum Scannen rendern und die Abwicklung über Referenzen verifizieren.

```ts
import { address } from "@vue-solana/vue/kit";
import { encodeURL } from "@vue-solana/core/solana-pay";
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();
const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
  label: "Mein Shop",
});
```

In Vue verwendest du `useSolanaPay()`, `useSolanaQrCode()` und `useSolanaQrScanner()`, um Anfragen zu erstellen, QR-Codes zu rendern, Zahlungsanforderungen zu scannen und Zahlungen zu bestätigen. Siehe die [Solana Pay-Anleitung](/de/guides/solana-pay) für weitere Details.

## Abschließende Prüfung

Bevor du dich auf einen App-Flow verlässt, prüfe diese Verhaltensweisen auf devnet:

- RPC-Lesevorgänge funktionieren ohne Wallet.
- Die Wallet-Erkennung zeigt nur unterstützte Wallet-Quellen für die aktuelle Plattform.
- Wallet-Auswahl und Verbindung sind getrennte Nutzeraktionen.
- Das optionale `autoConnect` stellt nur die zuvor ausgewählte Wallet-Identität wieder her.
- Nicht unterstützte Fähigkeiten für Nachrichten- oder Transaktionssignierung sind in der UI deaktiviert.
- Nachrichtensignierung gibt eine Signatur zurück, ohne eine On-Chain-Transaktion zu übermitteln.
- Das Einreichen einer Überweisung gibt eine Signatur und einen Bestätigungsstatus zurück.
- Clientseitig gesendete Transaktionen verwenden den offiziellen Planer und den RPC-Executor für den Plan-Versand, erfordern einen konfigurierten `payer`-Signer und erreichen `sent` erst nach dem Commitment `confirmed`.
- Explorer-Links zeigen auf denselben Cluster wie die App.
- `mainnet` wird nur verwendet, wenn du mainnet absichtlich konfigurierst und verstehst, dass echtes SOL auf dem Spiel steht.

## Weiterlesen

- [Solana für Vue-Entwickler](/de/concepts/solana-for-vue-developers)
- [Cluster](/de/concepts/clusters)
- [Wallets](/de/guides/wallets)
- [Transaktionsanleitung](/de/guides/transactions)
- [Kit-Migration](/de/guides/migration)
- [Fehlerbehebung](/de/troubleshooting)
- [Solana-Kit-Dokumentation](https://www.solanakit.com/) — offizielle Kit-Anleitungen, Rezepte und API-Referenz
- [Solana-Dokumentation](https://solana.com/docs)
