---
title: Nuxt-Beispiel
description: Lauffähige Nuxt-Beispiel-App für @vue-solana/nuxt.
ogSection: Beispiele
surroundOrder: 20
---

Das Nuxt-Beispiel ist eine lauffähige Nuxt-App für `@vue-solana/nuxt`.

Quelle: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

Live-Demo: [vue-solana-docs.vercel.app/demo](/de/demo)

## Was es zeigt

- Installieren des Nuxt-Moduls mit `modules: ['@vue-solana/nuxt']`.
- Konfigurieren des Moduls mit `solana: { cluster: 'devnet' }`.
- Lesen des RPC-Status mit dem automatisch importierten `useSolanaRpc()`.
- Verwenden des injizierten Kit-Clients mit dem automatisch importierten `useSolanaClient()`.
- Lesen von Lamport-Guthaben mit `useSolanaBalance()`.
- Erkennen von Browser-Erweiterungs-Wallets, Android-Mobile-Wallet-Adapter-Wallets und unterstützten iOS-Browser-Wallet-Einträgen mit `useSolanaWallets()`.
- Verwalten des Zustands der aktiven Wallet mit `useSolanaWallet()`.
- Persistieren der Metadaten zur Wallet-Auswahl und Wiederherstellen der zuvor ausgewählten Wallet-Identität beim Neuladen.
- Optionales `autoConnect`-Verhalten, das nur die zuvor ausgewählte Wallet erneut verbindet, wenn sie wieder erkannt wird.
- Darstellen von Zuständen für nicht unterstützte Fähigkeiten bei Wallets, die keine Nachrichten oder Transaktionen signieren können.
- Signieren einer Authentifizierungsnachricht mit dem automatisch importierten `useSolanaSignMessage()`, wenn die verbundene Wallet das unterstützt.
- Senden einer echten Überweisung mit `useSolanaSignAndSendTransaction()` und Anzeigen des Status „eingereicht“ gegenüber „bestätigt“. Das Beispiel verwendet standardmäßig devnet für sicheres Testen.
- Erzeugen cluster-bewusster Solana-Explorer-Links für eingereichte Signaturen.
- Verwenden von `useTransaction()` aus `@vue-solana/vue/useTransaction` für generischen asynchronen Transaktionszustand.
- Ausprobieren der Kit-reaktiven Datenschicht in den Live-Daten-Panels mit automatisch importierten Composables: `useSolanaRequest()` für einmalige Anfragen, `useSolanaSubscription()` für Live-Slot-Benachrichtigungen, `useSolanaTrackedData()` für per Fetch vorgeladene Kontodaten, `useSolanaSignIn()` für Sign In With Solana, `useSolanaAirdrop()` für Faucet-Anfragen auf devnet, `useSolanaPayer()` zum Inspizieren des Gebührenzahler-Signers des Clients, `useSolanaSendTransaction()` und `useSolanaSendTransactions()` für clientseitig gesendete SPL-Memo-Transaktionen ohne Wallet-Popup sowie den Cache-Adapter aus `@vue-solana/vue/swr` über Remounts hinweg.
- Erstellen und Rendern von Solana-Pay-Überweisungsanfragen mit den automatisch importierten `useSolanaPay()` und `useSolanaQrCode()`, Verifizieren der Abwicklung per Referenz mit `useSolanaPayConfirmation()` und Vorschau gescannter oder eingefügter Zahlungs-URLs mit `useSolanaQrScanner()` innerhalb von `<ClientOnly>`, damit Kamera-APIs nie während der SSR laufen.
- Erzeugen eines kurzlebigen Demo-Gebührenzahlers mit `generateKeyPairSigner()` im nur clientseitig laufenden Plugin `app/plugins/demo-payer.client.ts`. Der Payer startet ohne Guthaben; das Panel `useSolanaPayer` führt einen Airdrop von 1 devnet SOL darauf aus. Das Nuxt-Modul lässt `payer` und `payerSecretKey` bewusst weg, und rohe Geheimnisse dürfen niemals in einer öffentlichen Runtime-Config landen.

Die App verwendet standardmäßig `devnet`. Devnet-SOL hat keinen echten Wert.

## Aus dem Repository-Stamm ausführen

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

Öffne die im Terminal ausgegebene Nuxt-URL, üblicherweise `http://localhost:3000`.

## Was du ausprobieren kannst

- Prüfe den anfänglichen Modul- und RPC-Status sowie den neuesten Blockhash.
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
- Führe in den Live-Daten-Panels mit dem Panel `useSolanaPayer` einen Airdrop von 1 SOL auf den Demo-Payer aus, sende dann ein clientseitig signiertes SPL-Memo mit `useSolanaSendTransaction()` (kein Wallet-Popup) oder einen Stapel von zwei mit `useSolanaSendTransactions()` und beobachte, wie der Status von `sending` auf `sent` wechselt, nachdem der offizielle Executor das Commitment `confirmed` erreicht hat.
- Erstelle in den Solana-Pay-Panels eine Überweisungsanfrage mit einer Referenz und rendere ihren QR-Code, füge dann dieselbe URL in das Scanner-Panel ein, um den geparsten Empfänger, Betrag, Token und Memo zu prüfen. `Verify settlement` meldet `expired`, bis eine Zahlung unter dieser Referenz eingeht; der Scanner öffnet die Anfrage nur in einer Wallet und sendet sie nie.

Der Demo-Payer wird in einem nur clientseitig laufenden Plugin erzeugt und ist weder in `nuxt.config.ts` noch in einer öffentlichen Runtime-Config konfiguriert. Das Beispiel setzt `solana.clientPlugin: false`, damit das Modul sein eigenes Plugin überspringt; beide zu installieren würde zwei Solana-Kontexte erzeugen. Der Standard-Client des Moduls nutzt weiterhin den offiziellen `solanaRpc()`-Stack, der den Transaktions-Planer sowie die Executors für Plan-Signierung und Plan-Versand selbst installiert; der alte benutzerdefinierte Fallback-Sender wird nicht verwendet. Lege niemals ein mit Guthaben ausgestattetes Geheimnis in einen öffentlichen Nuxt-Runtime-Wert.

Das Überweisungsbeispiel initialisiert das `Buffer`-Polyfill im Browser mit `installSolanaBufferPolyfill()` aus `@vue-solana/nuxt/buffer-polyfill`. Starte den Nuxt-Dev-Server neu, wenn Vite zuvor einen externalisierten Buffer-Import zwischengespeichert hat.

Wenn die Bestätigung nach dem Erscheinen einer Signatur ausläuft, reiche nicht sofort eine doppelte Überweisung ein. Prüfe mit dem Signaturstatus oder dem Explorer-Link des Beispiels, ob die Transaktion später bestätigt wurde.

## Devnet-SOL

Fordere kostenloses Devnet-SOL vom offiziellen Faucet an:

```txt
https://faucet.solana.com
```

## Hinweis zu Wallets

Das Beispiel verwendet eine einheitliche Wallet-Erkennung. Installiere Phantom, Solflare, Backpack oder eine andere Standard-Wallet, bevor du Flows mit Browser-Erweiterungs-Wallets testest. In unterstützten Android-Chrome-Runtimes kann `@solana-mobile/wallet-standard-mobile` installierte native mobile Wallets über `Mobile Wallet Adapter` in derselben Wallet-Liste anzeigen. In iOS-Browsern können Phantom, Solflare und Backpack über wallet-spezifische Universal Links erscheinen.

Die Unterstützung von Protokoll-Links nativer Desktop-Wallets ist bewusst nicht Teil des v1-Beispiel-Flows.
