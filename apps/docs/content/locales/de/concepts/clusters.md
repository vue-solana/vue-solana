---
title: Cluster
description: Solana-Cluster-Namen, RPC-Endpoints und Faucet-Anweisungen.
ogSection: Konzepte
surroundOrder: 6
---

Ein Solana-Cluster ist ein Netzwerk aus Validatoren. Apps entscheiden, mit welchem Cluster sie sich verbinden.

## Unterstützte Cluster

Vue Solana unterstützt diese Cluster-Namen:

- `mainnet`: der Produktions-Cluster von Solana. Dies ist der offizielle Mainnet-Cluster-Name von Solana. Verwende ihn für Produktions-Apps und echtes SOL.
- `mainnet-beta`: die Legacy-Schreibweise von `mainnet`. Wird weiterhin akzeptiert und leitet auf denselben Endpoint `https://api.mainnet.solana.com` weiter.
- `devnet`: das Entwicklernetzwerk. Verwende es, während du Apps baust. Devnet-SOL hat keinen echten Wert.
- `testnet`: Netzwerk für Validator- und Protokolltests. Für die App-Entwicklung ist es weniger verbreitet als devnet.
- `localnet`: ein lokaler Validator auf deiner Maschine, üblicherweise unter `http://127.0.0.1:8899`.

Verwende `mainnet` im Code von Vue Solana. Die Solana-Dokumentation bezeichnet den Produktions-Cluster als Mainnet, und `mainnet` ist der Cluster-Name, den die Solana-Tools erwarten. Die Legacy-Schreibweise `mainnet-beta` wird weiterhin akzeptiert: Beide Namen lösen zum offiziellen Endpoint `https://api.mainnet.solana.com` auf.

Offizielle Referenz: [Solana-Cluster](https://solana.com/docs/references/clusters)

## RPC-Endpoints

Ein RPC-Endpoint ist die HTTP-URL, die deine App verwendet, um von Solana zu lesen oder nach Solana zu schreiben.

Beispiele:

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

RPC-Anfragen laufen über `client.rpc` aus `useSolanaClient()` oder `useSolanaRpc()` bzw. aus `createSolanaClient()` / `createSolanaContext()` in `@vue-solana/core`. Die Legacy-Klasse `Connection` und die `web3`-Subpfade wurden in v2.0.0 entfernt. Öffentliche Endpoints sind für den Einstieg nützlich, aber Produktions-Apps nutzen üblicherweise einen dedizierten RPC-Anbieter für Zuverlässigkeit und Rate-Limits.

Offizielle Referenz: [Solana-RPC](https://solana.com/docs/rpc)

## Gehostete RPC-Anbieter

Die öffentlichen Solana-Endpoints werden von allen geteilt. Sie sind der schnellste Weg für den ersten Aufruf von `getLatestBlockhash()` oder `getBalance()`, aber keine gute Grundlage für eine App, die andere Menschen nutzen. Bei hoher Last können Anfragen gedrosselt werden, die Latenz ist weniger vorhersehbar, und es gibt kein Nutzungs-Dashboard oder Support-Abkommen. Ein gehosteter RPC-Anbieter gibt dir einen HTTP- und WebSocket-Endpoint mit eigenem Schlüssel, veröffentlichte Quoten, Metriken und einen klaren Weg für mehr Traffic.

Vue Solana hängt nicht an einem bestimmten Anbieter. Jeder RPC-Aufruf läuft über den Kit-Client, der aus deinem `endpoint` (und optional `wsEndpoint`) gebaut wird. Ein Anbieterwechsel ist daher eine Konfigurationsänderung, kein Umschreiben deiner Composables. Den Code findest du unter [Eigene RPC-Endpoints](/de/guides/rpc-and-clusters#eigene-rpc-endpoints).

### Warum einen Anbieter verwenden

- **Vorhersehbare Limits.** Ein öffentlicher Endpoint teilt ein Budget unter allen Nutzer:innen. Bei einem Anbieter hat dein Schlüssel ein eigenes Kontingent und dokumentiertes Verhalten bei Überschreitung.
- **Subscriptions.** `useSubscription()` und `useTrackedData()` brauchen eine WebSocket-Verbindung. Anbieter stellen eine passende `wss://`-URL bereit und erlauben meist mehr parallele Subscriptions.
- **Beobachtbarkeit.** Dashboards zeigen Anfragevolumen, Fehler und Latenz, damit du erkennen kannst, ob ein Fehler aus deiner App oder aus der RPC-Schicht kommt.
- **Ein Weg in die Produktion.** Wenn aus einem Tutorial eine echte App wird, kannst du die Limits erhöhen, ohne Komponenten-Code zu ändern.

### Worauf du vor der Wahl achten solltest

- **Welche Methoden der Tarif unterstützt.** Die Verfügbarkeit unterscheidet sich je nach Cluster und Anbieter. Chainstack listet einige aufwendige Solana-Scan-Methoden auf mainnet als kostenpflichtig und bietet für devnet keine Archive-Nodes.
- **Wie Nutzung gezählt wird.** Chainstack rechnet in Request Units (1 RU pro Full-Node-Anfrage), Alchemy in Compute Units, die je nach Methode variieren. Der reine Vergleich von „Requests pro Sekunde“ kann irreführend sein.
- **Ob WebSockets, Webhooks oder gRPC im kostenlosen Tarif enthalten sind.** Deine App braucht davon vielleicht eines, auch wenn einfache HTTP-Reads funktionieren.
- **Wo der API-Schlüssel liegt.** Eine Endpoint-URL im Browser-Bundle ist für Nutzer:innen sichtbar. Beschränke den Schlüssel im Anbieter-Dashboard oder betreibe ihn hinter einer Server-Route.

### Kostenlose Optionen für den Einstieg

| Anbieter                                      | Kostenloser Tarif                                                                  | Gut für                                                                                                                                       | Details                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chainstack](https://chainstack.com/pricing/) | Developer: 0 $/Monat, 3.000.000 RU/Monat, 25 RPS insgesamt, 1 Projekt, WebSockets. | Vorhersehbare Abrechnung in Request Units und explizite Limits pro Netzwerk. Ein guter Schritt weg von einem geteilten öffentlichen Endpoint. | Die [Durchsatz-Richtlinien](https://docs.chainstack.com/docs/limits) nennen für Developer 25 RPS auf Solana devnet, aber nur 5 RPS auf Solana mainnet. `getProgramAccounts`, `getSupply` und `getTokenAccountsByOwner` sind auf mainnet kostenpflichtig; für devnet gibt es keine Archive-Nodes. Über das Kontingent hinaus kosten weitere 1 Mio. RU 20 $. |
| [Alchemy](https://www.alchemy.com/pricing)    | Free: 30 Mio. CU/Monat, 15 RPS, 5 Apps, 5 Webhooks, alle Mainnets und Testnets.    | Eine direkt einfügbare devnet-HTTP/WSS-URL, ein Nutzungs-Dashboard und Webhooks zum Lernen und für Demos.                                     | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) listet den Endpoint und die APIs, die auf devnet nicht verfügbar sind (Token, NFT, Prices, Debug, Trace und andere). Abrechnung erfolgt in Compute Units, nicht in reinen Anfragen; gRPC ist kostenpflichtig.                                                                               |

Quoten und Preise ändern sich. Die verlinkten Anbieterseiten sind maßgeblich; die Zahlen oben sind ein Einstiegspunkt, kein Versprechen von Vue Solana.

Ein Anbieter gibt dir RPC-Zugriff, kein Test-SOL. Zum Senden von Transaktionen brauchst du weiterhin devnet-SOL aus dem Faucet weiter unten.

## WebSocket-Endpoints

WebSocket-Endpoints werden für Subscriptions und Echtzeit-Updates verwendet. Vue Solana leitet einen WebSocket-Endpoint aus deinem RPC-Endpoint ab, sofern du nicht `wsEndpoint` explizit übergibst.

Beispiele:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
- `ws://127.0.0.1:8900`

## Einen Cluster konfigurieren

Für Vue:

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Für Nuxt:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Du kannst auch einen benutzerdefinierten Endpoint übergeben:

```ts
createSolanaPlugin({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## Devnet- oder Testnet-SOL erhalten

Verwende den offiziellen Faucet:

```txt
https://faucet.solana.com
```

Wähle `Devnet` oder `Testnet`, füge deine Wallet-Adresse ein und fordere SOL an.

Wenn du die Solana CLI installiert hast, kannst du auch einen Airdrop anfordern:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet- und Testnet-SOL haben keinen echten Wert. Verwende während des Testens niemals eine Wallet mit echtem Guthaben.
