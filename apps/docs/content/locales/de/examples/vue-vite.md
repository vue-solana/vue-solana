---
title: Vue-Vite-Beispiel
description: Lauffähige Beispiel-App mit Vue 3 und Vite für @vue-solana/vue.
ogSection: Beispiele
surroundOrder: 19
---

Das Vue-Vite-Beispiel ist eine lauffähige Vue-3-App für `@vue-solana/vue`.

Quelle: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

Live-Demo: [vue-solana-docs.vercel.app/demo](/de/demo)

## Was es zeigt

- Installieren des Vue-Solana-Plugins mit `createSolanaPlugin()`.
- Lesen des RPC-Status mit `useRpc()`.
- Verwenden des injizierten Kit-Clients mit `useSolanaClient()`.
- Lesen von Lamport-Guthaben mit `useBalance()`.
- Erkennen von Browser-Erweiterungs-Wallets, Android-Mobile-Wallet-Adapter-Wallets und unterstützten iOS-Browser-Wallet-Einträgen mit `useWallets()`.
- Verwalten des Zustands der aktiven Wallet mit `useWallet()`.
- Persistieren der Metadaten zur Wallet-Auswahl und Wiederherstellen der zuvor ausgewählten Wallet-Identität beim Neuladen.
- Optionales `autoConnect`-Verhalten, das nur die zuvor ausgewählte Wallet erneut verbindet, wenn sie wieder erkannt wird.
- Darstellen von Zuständen für nicht unterstützte Fähigkeiten bei Wallets, die keine Nachrichten oder Transaktionen signieren können.
- Verfolgen des asynchronen Transaktionszustands mit `useTransaction()`.
- Signieren einer Authentifizierungsnachricht mit `useSignMessage()`, wenn die verbundene Wallet das unterstützt.
- Senden einer echten Überweisung mit `useSignAndSendTransaction()` und Anzeigen des Status „eingereicht“ gegenüber „bestätigt“. Das Beispiel verwendet standardmäßig devnet für sicheres Testen.
- Erzeugen cluster-bewusster Solana-Explorer-Links für eingereichte Signaturen.
- Ausprobieren der Kit-reaktiven Datenschicht in den Live-Daten-Panels: `useRequest()` für einmalige Anfragen, `useSubscription()` für Live-Slot-Benachrichtigungen über WebSocket, `useTrackedData()` für per Fetch vorgeladene Kontodaten, die durch Konto-Benachrichtigungen aktualisiert werden, `useSignIn()` für Sign In With Solana, `useAirdrop()` für Faucet-Anfragen auf devnet, `usePayer()` zum Inspizieren des Gebührenzahler-Signers des Clients, `useSendTransaction()` und `useSendTransactions()` für clientseitig gesendete SPL-Memo-Transaktionen ohne Wallet-Popup sowie `useRequestSwr()` aus `@vue-solana/vue/swr` für cache-key-basiertes Stale-While-Revalidate über Remounts hinweg.
- Erstellen und Rendern von Solana-Pay-Überweisungsanfragen mit `useSolanaPay()` und `useSolanaQrCode()`, Verifizieren der Abwicklung per Referenz mit `useSolanaPayConfirmation()` und Vorschau gescannter oder eingefügter Zahlungs-URLs mit `useSolanaQrScanner()`, ohne sie jemals automatisch zu senden.
- Konfigurieren eines Demo-`payer`-Signers (`generateKeyPairSigner()` aus `@vue-solana/vue/kit`) in `main.ts`, damit clientseitig gesendete Transaktionen Gebühren zahlen können. Der Payer startet ohne Guthaben; das Panel `usePayer` führt einen Airdrop von 1 devnet SOL darauf aus.
- Verwenden der standardmäßigen offiziellen Client-Zusammensetzung `solanaRpc()`, die den Transaktions-Planer sowie die Executors für Plan-Signierung und Plan-Versand selbst installiert. Die Client-Sende-Demo wartet auf das Commitment `confirmed`, bevor sie `sent` anzeigt; sie verwendet keinen benutzerdefinierten Fallback-Sender.

Die App verwendet standardmäßig `devnet`. Devnet-SOL hat keinen echten Wert.

## Aus dem Repository-Stamm ausführen

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

Öffne die im Terminal ausgegebene Vite-URL, üblicherweise `http://localhost:5173`.

## Was du ausprobieren kannst

- Prüfe den anfänglichen RPC-Status und den neuesten Blockhash.
- Klicke auf `Load Blockhash`, um `client.rpc.getLatestBlockhash().send()` direkt aufzurufen.
- Füge eine devnet-Wallet-Adresse ein und aktualisiere das Guthaben.
- Installiere eine Solana-Browser-Wallet und stelle sie auf devnet um.
- Installiere unter Android Chrome eine kompatible mobile Solana-Wallet und suche nach `Mobile Wallet Adapter`.
- Installiere in iOS-Browsern Phantom, Solflare oder Backpack und suche den Wallet-Eintrag in derselben Liste.
- Wähle eine erkannte Wallet aus und verbinde sie.
- Lade die Seite neu und prüfe, dass dieselbe ausgewählte Wallet-Identität wiederhergestellt wird, ohne dass eine beliebige installierte Wallet ausgewählt wird.
- Signiere die Beispiel-Authentifizierungsnachricht, wenn die Wallet Unterstützung für Nachrichtensignierung meldet.
- Stelle sicher, dass die Schaltfläche für Nachrichtensignierung deaktiviert oder erklärt wird, wenn die ausgewählte Wallet `signMessage` nicht unterstützt.
- Führe die generische Mock-Transaktion aus.
- Gib eine Empfängeradresse und einen Betrag ein und sende dann eine echte Überweisung. Belasse das Beispiel beim Testen auf devnet.
- Beobachte, wie die Transaktion von der eingereichten Signatur zum Bestätigungsstatus übergeht.
- Öffne den Explorer-Link und prüfe, dass er `?cluster=devnet` enthält.
- Ändere in den Live-Daten-Panels die verfolgte Adresse und beobachte, wie die Panels für Anfrage, Subscription und verfolgte Daten erneut auslösen.
- Führe in den Live-Daten-Panels mit dem Panel `usePayer` einen Airdrop von 1 SOL auf den Demo-Payer aus, sende dann ein clientseitig signiertes SPL-Memo mit `useSendTransaction()` (kein Wallet-Popup) oder einen Stapel von zwei mit `useSendTransactions()` und beobachte, wie der Status von `sending` auf `sent` wechselt, nachdem der offizielle Executor das Commitment `confirmed` erreicht hat.
- Blende die SWR-Karte aus und wieder ein und beobachte, wie der zwischengespeicherte Wert sofort erscheint (stale), bevor die neu validierte Anfrage ihn ersetzt.
- Erstelle in den Solana-Pay-Panels eine Überweisungsanfrage mit einer Referenz und rendere ihren QR-Code, füge dann dieselbe URL in das Scanner-Panel ein, um den geparsten Empfänger, Betrag, Token und Memo zu prüfen. `Verify settlement` meldet `expired`, bis eine Zahlung unter dieser Referenz eingeht; der Scanner öffnet die Anfrage nur in einer Wallet und sendet sie nie.

Der generierte Demo-Payer existiert nur in der Browser-Sitzung und ist weder in `nuxt.config.ts` noch in einer öffentlichen Runtime-Config konfiguriert. Verwende für Produktions-Relayer einen serverseitig gehaltenen Signer und liefere niemals ein mit Guthaben ausgestattetes Schlüsselpaar an den Browser eines Endnutzers aus.

Das Überweisungsbeispiel initialisiert das `Buffer`-Polyfill im Browser mit `installSolanaBufferPolyfill()` aus `@vue-solana/vue/buffer-polyfill`. Starte den Vite-Dev-Server neu, wenn Vite zuvor einen externalisierten Buffer-Import zwischengespeichert hat.

Wenn die Bestätigung nach dem Erscheinen einer Signatur ausläuft, reiche nicht sofort eine doppelte Überweisung ein. Prüfe mit dem Signaturstatus oder dem Explorer-Link des Beispiels, ob die Transaktion später bestätigt wurde.

## Devnet-SOL

Fordere kostenloses Devnet-SOL vom offiziellen Faucet an:

```txt
https://faucet.solana.com
```

## Hinweis zu Wallets

Das Beispiel verwendet eine einheitliche Wallet-Erkennung. Installiere Phantom, Solflare, Backpack oder eine andere Standard-Wallet, bevor du Flows mit Browser-Erweiterungs-Wallets testest. In unterstützten Android-Chrome-Runtimes kann `@solana-mobile/wallet-standard-mobile` installierte native mobile Wallets über `Mobile Wallet Adapter` in derselben Wallet-Liste anzeigen. In iOS-Browsern können Phantom, Solflare und Backpack über wallet-spezifische Universal Links erscheinen.

Die Unterstützung von Protokoll-Links nativer Desktop-Wallets ist bewusst nicht Teil des v1-Beispiel-Flows.
