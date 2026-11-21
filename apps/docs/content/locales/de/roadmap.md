---
title: Roadmap
description: Geplante Funktionen und Verbesserungen für Vue Solana.
ogSection: Roadmap
surroundOrder: 22
---

Die Pakete sind stabil für den Produktiveinsatz mit RPC-Lesevorgängen, Wallet-Erkennung und -Verbindung, Guthabenabfragen, Transaktionen, Kontolesevorgängen, Nachrichtensignierung, normalisierter Fehlerbehandlung, Sign In With Solana, Batch-Signierung und -Versand von Transaktionen, Transaktionsplanung, SWR-Cache-Adaptern und SPL-Token-Helfern. Diese Roadmap beschreibt, was als Nächstes kommt, geordnet nach Wirkung statt an ein bestimmtes Release gebunden.

## Aktueller Audit-Status und nächste Schritte

Der Audit vom 18. November 2026 hat ergeben, dass damals keine der hier aufgeführten Funktionen als vollständige öffentliche Funktion umgesetzt war, auch wenn einige Grundlagen bereits bestanden. Transaktionssimulation ist inzwischen umgesetzt. Arbeite in dieser Reihenfolge, sofern eine Nutzeranfrage die Priorität nicht ändert:

| Priorität | Punkt                                                                                             | Status                                                                                                               | Nächster Schritt                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Helfer für die Transaktionssimulation                                                             | In 4.3.0 umgesetzt durch `simulateTransaction()`, `useSimulateTransaction()` und `useSolanaSimulateTransaction()`    | Eintrag in [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md) archiviert.             |
| 2         | Lazy-Loading für iOS-Wallets                                                                      | Leistungsarbeit, keine fehlende Funktion; etwa 58 % des sofort geladenen `createSolanaPlugin`-Chunks sind entfernbar | Den fokussierten Änderungssatz in [`plans/bundle-performance-followups.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/bundle-performance-followups.md) einplanen. |
| 3         | Nuxt-Server-RPC-Utilities                                                                         | In 4.4.0 umgesetzt durch `@vue-solana/nuxt/server` (`createServerSolanaClient()`, `useServerSolanaClient()`).        | Siehe den Abschnitt „Serverseitiges RPC während der SSR“ in der Nuxt-Paketdokumentation.                                                                                         |
| 4         | Versionierte Docs                                                                                 | Fehlt                                                                                                                | Die archivierten `/v1/`-Docs und Weiterleitungen alter URLs erstellen.                                                                                                           |
| Später    | Weitere iOS-Wallets                                                                               | Phantom, Solflare und Backpack sind umgesetzt; Trust Wallet steht noch aus                                           | Providerspezifische Links und Callbacks recherchieren und dann hinter `useWallets()` ergänzen.                                                                                   |
| Später    | Anchor-Helper, Wallet-Modal/UI, native Desktop-Wallets, RPC-Failover, erweiterte Kontoindizierung | Fehlen; umfangreiche API- oder Architekturarbeit                                                                     | Hier behalten, bis jeweils ein eigener Plan vorliegt.                                                                                                                            |

Zwei ältere Punkte sind bereits abgedeckt: Echtzeit-Subscriptions sind über `useSubscription()`, `useTrackedData()` und die SWR-Adapter implementiert. Der abgehakte Punkt „native Desktop-Wallets“ in `plans/native-wallet-plan.md` hält eine verschobene Entscheidung fest, keine Umsetzung.

## Transaktionen

### Helfer für die Transaktionssimulation

Umgesetzt: `simulateTransaction()` in Core, `useSimulateTransaction()` in Vue und `useSolanaSimulateTransaction()` in Nuxt simulieren Transaktionen vor dem Absenden, damit Apps Gebühren, Kontenänderungen und wahrscheinliche Fehler prüfen können, ohne SOL auszugeben.

## Ökosystem-Integrationen

### Native Desktop-Wallets

Unterstützung nativer Desktop-Wallets über Protokoll-Links durch die einheitlichen Wallet-Flows.

### Weitere iOS-Wallet-Anbieter

Unterstützung weiterer iOS-Browser-Wallets über die aktuellen Universal Links von Phantom, Solflare und Backpack hinaus.

### Anchor-Provider und Programm-Helfer

Ein Anchor-Provider und Helfer für Anchor-Programm-Konten und -Instruktionen.

### Wallet-Modal oder UI-Paket

Ein eigenes Wallet-Modal- oder UI-Paket mit vorgefertigten Verbindungs- und Signier-Flows.

### Nuxt-Server-RPC-Utilities

In 4.4.0 umgesetzt: `createServerSolanaClient()` und `useServerSolanaClient()` aus `@vue-solana/nuxt/server` lesen Solana-Daten aus Nitro-Server-Routen, ohne Geheimnisse offenzulegen.

### Versionierte Docs

Versionierte Docs: ein archivierter Legacy-Docs-Build unter `/v1/` mit einem `v1 | latest`-Dropdown und Weiterleitungen alter URLs für Nutzer, die noch nicht auf den Kit-Pfad migriert sind.

## Resilienz und fortgeschrittene Muster

### RPC-Provider-Failover

Failover zwischen RPC-Providern und Umgang mit Rate-Limits.

### Fortgeschrittene Kontoindizierung

Fortgeschrittene Muster zur Indizierung von Programm-Konten und Caching.
