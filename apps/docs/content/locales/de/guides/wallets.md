---
title: "Wallets"
description: Entdecke Wallets, wähle eine aktive Wallet aus, verbinde und trenne sie und prüfe Fähigkeiten.
ogSection: Anleitungen
surroundOrder: 8
---

Vue Solana stellt Browser-Erweiterungs-Wallets, Android-Mobile-Wallet-Adapter-Wallets und unterstützte iOS-Browser-Wallet-Links über einen einzigen Wallet-Flow bereit.

Verwende `useWallets()`, um eine Wallet zu erkennen und auszuwählen. Verwende `useWallet()`, um zu verbinden, zu trennen, den aktiven öffentlichen Schlüssel zu lesen und die Fähigkeiten der Wallet zu prüfen.

Die aktuelle Wallet-Unterstützung basiert auf diesen Bibliotheken:

- Browser-Erweiterungs-Wallets: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features` und `@solana/wallet-standard-features`.
- Native mobile Android-Wallets: `@solana-mobile/wallet-standard-mobile`, das Solana Mobile Wallet Adapter als Wallet-Standard-Wallet in unterstützten Android-Chrome-Mobile-Web- und PWA-Runtimes registriert.
- iOS-Browser-Wallets: wallet-spezifische Universal Links für Phantom, Solflare und Backpack.
- Solana-Primitives und Transaktions-Helfer: `@solana/kit`-Typen und Message-Builder, vollständig re-exportiert über `@vue-solana/vue/kit`, `@vue-solana/nuxt/kit` und `@vue-solana/core/kit`.

## Wallet-Quellen

Die aktuellen Wallet-Quellen sind:

- Browser-Erweiterungs-Wallets über Solana Wallet Standard.
- Android Mobile Wallet Adapter über die Wallet-Standard-Registrierung in unterstützten Android-Chrome-Clients.
- iOS-Browser-Wallet-Links für unterstützte Wallets wie Phantom, Solflare und Backpack.

Alle Quellen erscheinen in derselben Liste erkannter Wallets. Apps sollten keine separaten öffentlichen Flows für Browser-, Android- und iOS-Wallets bauen, außer sie brauchen plattformspezifische UI-Texte.

## Support-Matrix

| Wallet-Pfad                    | Status                                        | Wie es erscheint                                        | Hinweise                                                                    |
| ------------------------------ | --------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| Browser-Erweiterungs-Wallets   | Unterstützt                                   | `platform: "browser"`, `source: "wallet-standard"`      | Verwendet die Solana-Wallet-Standard-Registrierung.                         |
| Native mobile Android-Wallets  | Unterstützt in Android Chrome und Chrome-PWAs | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | Registriert über `@solana-mobile/wallet-standard-mobile`.                   |
| iOS-Browser-Wallets            | Unterstützt für konfigurierte Wallet-Links    | `platform: "mobile"`, `source: "deep-link"`             | Phantom, Solflare und Backpack werden über Universal Links bereitgestellt.  |
| Manuelle/eigene Wallet-Objekte | Unterstützt                                   | Von der App bereitgestellte Wallet                      | Muss das Interface `SolanaWallet` implementieren.                           |
| Native Desktop-App-Wallets     | Noch nicht unterstützt                        | Standardmäßig nicht bereitgestellt                      | Reservierte `protocol-link`-Metadaten stehen für zukünftige Adapter bereit. |

Was heute funktioniert:

- Wallets aus allen unterstützten Quellen in einer einzigen `wallets`-Liste erkennen.
- Eine aktive Wallet auswählen, ohne sie sofort zu verbinden.
- Identitäts-Metadaten der ausgewählten Wallet für optionale Reconnect-Flows persistieren.
- Verbinden, Trennen, Nachrichten signieren, Transaktionen signieren und Transaktionen signieren/senden, wenn die ausgewählte Wallet diese Fähigkeiten unterstützt.
- Beim Verbinden jeder anderen erkannten Wallet trennen, sodass nur eine Wallet autorisiert bleibt.
- UI für nicht unterstützte Fähigkeiten aus `canSignMessage`, `canSignTransaction`, `canSignAllTransactions` und `canSignAndSendTransaction` rendern.

Was noch nicht enthalten ist:

- Ein eingebautes Wallet-Modal oder UI-Paket.
- Adapter für native Desktop-Protocol-Links.
- Serverseitige Wallet-Prompts.
- Umgang mit privaten Schlüsseln oder Seed-Phrasen.

## Wallet-Flow in Vue

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Eine Wallet auszuwählen verbindet sie nicht. Die Wallet bleibt getrennt, bis `connect()` erfolgreich auflöst.

Das Verbinden einer Wallet trennt außerdem jede andere erkannte Wallet. Es bleibt immer nur eine Wallet für die App autorisiert, was wichtig ist, weil eine früher vom Nutzer autorisierte Erweiterung weiterhin Signierungsanfragen beantworten kann — die übliche Ursache dafür, dass die falsche Wallet eine `signMessage`-Bestätigung anfragt.

## Wallet-Flow in Nuxt

Nuxt importiert denselben Wallet-Flow automatisch mit `useSolanaWallets()` und `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

Löse Wallet-Arbeit auf dem Client aus Nutzeraktionen aus. Wallet-Prompts sollten nicht während der SSR laufen.

## Fähigkeitsprüfungen

Wallets können unterschiedliche Features unterstützen. Prüfe die Fähigkeiten, bevor du Aktionen renderst.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

Für framework-agnostischen Code verwende die Wallet-Assertions aus `@vue-solana/core/wallet`.

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey);

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Auto-Connect

`autoConnect` verbindet nur eine Wallet-Identität erneut, die der Nutzer zuvor ausgewählt hat und die auf dem Client wieder erkannt wird.

Eine Wallet, die der Nutzer verbunden gelassen hat, wird nach einem Neuladen der Seite auch ohne `autoConnect` wiederhergestellt. Die Wiederherstellung ist ein stiller Connect (`connect({ silent: true })`): Eine Wallet, die das Wallet-Standard-Flag `silent` beachtet, meldet nur eine bereits erteilte Autorisierung, ohne Abfrage und ohne eine Wallet-App zu starten. `silent` ist ein Hinweis, keine Garantie: Eine Wallet, die es ignoriert, kann beim Laden der Seite ihre Verbindungsabfrage anzeigen. Autorisiert die Wallet die Seite nicht mehr, bleibt sie getrennt. Ein explizites `disconnect()` vergisst die Sitzung.

Vue Solana speichert unter `localStorage["vue-solana:selected-wallet"]` nur Identitäts-Metadaten der Wallet: `name`, `platform`/`source`, wenn verfügbar, sowie `connected: true`, solange die Wallet verbunden ist. Private Schlüssel, Sitzungsdaten oder Transaktionsdaten werden nie gespeichert.

Rufe `selectWallet(null)` auf, wenn Nutzer die Wallet-Auswahl ausdrücklich zurücksetzen. Rufe `setWallet(customWallet)` aus `useWallet()` nur auf, wenn deine App ein eigenes Wallet-Objekt besitzt; normale App-UI sollte aus `useWallets()` auswählen.

Wenn lokaler Speicher nicht verfügbar ist, funktioniert die Wallet-Auswahl weiterhin für die aktuelle Seitensitzung, aber das Wiederherstellen aus dem Speicher kann mit einem normalisierten `STORAGE_FAILURE`-Fehler fehlschlagen.

## Nachrichtensignierung für die Authentifizierung

Die Nachrichtensignierung belegt die Kontrolle über die Wallet für Off-Chain-Authentifizierung. Sie autorisiert keine On-Chain-Transaktion. Verwende klaren Challenge-Text und verifiziere ihn in deinem Backend.

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

Halte Nonces einmalig verwendbar und kurzlebig. Verwende keine rohen Wallet- oder RPC-Fehlermeldungen als nutzerseitige Authentifizierungsfehler.

## Mobile Wallets

Die Registrierung des Android Mobile Wallet Adapter ist im Vue-Plugin und im Nuxt-Modul auf unterstützten Android-Chrome-Clients standardmäßig aktiviert.

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

Übergib `mobileWallet: false`, um die Registrierung des Android Mobile Wallet Adapter zu deaktivieren.

iOS-Wallet-Links sind in iOS-Browsern standardmäßig aktiviert. Übergib `iosWallet`-Optionen, um App-Identität, Redirect-URL, Chains oder Cluster anzupassen. Übergib `iosWallet: false`, um die Erkennung von iOS-Wallet-Links zu deaktivieren.

Hinweise zu Android:

- Die Android-MWA-Registrierung läuft nur auf dem Client und ist während der SSR wirkungslos.
- Es wird erwartet, dass sie nur in Android-Browsern funktioniert, die über einen sicheren Kontext ausgeliefert werden und die Mobile-Wallet-Adapter-Bridge unterstützen.
- Die Übergabe an die Wallet kann den Browser verlassen und zur App zurückkehren; erhalte den UI-Zustand, damit Nutzer die übermittelte Signatur nach dem Redirect sehen.
- Vue Solana adaptiert MWA-Wallets in dasselbe `SolanaWallet`-Interface wie Erweiterungs-Wallets.
- Das Mobile-Wallet-Paket übernimmt die Fallback-UI für nicht installierte Wallets über seinen Standard-Handler für nicht gefundene Wallets.
- Browser können vor der MWA-Verbindung zu einer installierten Wallet-App einen einmaligen Prompt für lokalen Netzwerkzugriff anzeigen.
- Die Standard-App-Identität für MWA wird aus `<meta name="application-name">`, dann `og:site_name`, dann dem Host benannt, nie aus dem Seitentitel: Wallets binden die Autorisierung an die Identität, daher muss sie auf jeder Seite und in jeder Sprache gleich bleiben. Setze `mobileWallet.appIdentity`, um sie explizit festzulegen.
- Phantom unter Android Chrome lehnt die gespeicherte MWA-Autorisierung bei jeder Signaturanfrage ab, selbst direkt nach dem Verbinden. Vue Solana fordert dann im selben Wallet-Besuch eine neue Autorisierung an, sodass Phantom vor jeder Nachrichten- oder Transaktionsanfrage einen Bildschirm „App genehmigen“ zeigt. Das ist erwartetes Verhalten; Wallets, die die gespeicherte Autorisierung akzeptieren, gehen direkt zur Anfrage.
- Bei Android-MWA-Transaktionsversänden bittet Vue Solana die mobile Wallet zu signieren und übermittelt die signierte Transaktion dann über die RPC-Verbindung der App, wenn die Wallet `signTransaction` unterstützt. So bleibt die zurückgegebene Signatur unter Kontrolle der App, und ein Edge Case der mobilen Übergabe wird vermieden, bei dem die Wallet erfolgreich sendet, die Browserseite aber keine Antwort des Wallet-Adapters erhält.

Hinweise zu iOS:

| Fähigkeit                  | Aktuelles Verhalten                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Erkennung                  | Phantom-, Solflare- und Backpack-Einträge können in iOS-Browsern erscheinen.                                        |
| Verbindung                 | Verwendet wallet-spezifische Universal Links und Redirect-Callbacks.                                                |
| Sitzungsverwaltung         | Apps sollten den Callback-Zustand verarbeiten, bevor sie nach einem Redirect von einer verbundenen Wallet ausgehen. |
| Transaktionen              | Die Fähigkeit hängt vom Wallet-Link und den zurückgegebenen Sitzungsdaten ab.                                       |
| Native Desktop-Safari-Apps | Nicht implementiert.                                                                                                |

Wenn du die iOS-Core-Helfer direkt verwendest, rufe `handleSolanaIosWalletCallback()` früh beim Client-Start auf, damit Redirect-Daten validiert und entschlüsselt sind, bevor die App den Wallet-Zustand liest.

## Manuelles Wallet-Interface

Eigene Wallet-Integrationen können ein `SolanaWallet`-Objekt direkt über das Vue-Plugin oder `setWallet()` bereitstellen.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

Manuelle Wallet-Objekte sollten Vue Solana niemals private Schlüssel offenlegen. Behalte die Schlüsselverwahrung innerhalb des Wallet-Anbieters.

## Direkte Core-Helfer

Verwende die direkten Core-Helfer nur, wenn du deine eigene Wallet-Integrationsschicht baust.

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

Wenn du die iOS-Core-Helfer direkt verwendest, rufe `handleSolanaIosWalletCallback()` auf, bevor du dich nach einem Redirect auf eine zurückgegebene iOS-Wallet-Verbindung verlässt.

## Sicherheitshinweise

- Fordere niemals private Schlüssel von Nutzern an.
- Speichere niemals Wallet-Sitzungen oder Transaktionsdaten im lokalen Speicher.
- Behandle Wallet-Namen, Icons und Metadaten als nicht vertrauenswürdige Anzeigedaten.
- Verlange eine ausdrückliche Nutzeraktion, bevor Nachrichten oder Transaktionen signiert werden.
- Zeige deaktivierte oder erklärende UI für nicht unterstützte Fähigkeiten, statt Wallet-Aufrufe blind zu versuchen.
- Halte devnet als Standard für Beispiele und Tutorials; verwende `mainnet` nur, wenn echte Mittel beabsichtigt sind.

Offizielle Referenzen:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana-Dokumentation](https://solana.com/docs)
