---
title: Roadmap
description: Geplante Funktionen und Verbesserungen für Vue Solana.
ogSection: Roadmap
surroundOrder: 21
---

Die Pakete sind stabil für den Produktiveinsatz mit RPC-Lesevorgängen, Wallet-Erkennung und -Verbindung, Guthabenabfragen, Transaktionen, Kontolesevorgängen, Nachrichtensignierung, normalisierter Fehlerbehandlung, Sign In With Solana, Batch-Signierung und -Versand von Transaktionen, Transaktionsplanung, SWR-Cache-Adaptern und SPL-Token-Helfern. Diese Roadmap beschreibt, was als Nächstes kommt, geordnet nach Wirkung statt an ein bestimmtes Release gebunden.

## Transaktionen

### Helfer für die Transaktionssimulation

Simuliere Transaktionen vor dem Absenden, damit Apps Gebühren, Kontenänderungen und wahrscheinliche Fehler prüfen können, ohne SOL auszugeben.

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

Nuxt-Server-Utilities für serverseitige Solana-RPC-Lesevorgänge.

### Versionierte Docs

Versionierte Docs: ein archivierter Legacy-Docs-Build unter `/v1/` mit einem `v1 | latest`-Dropdown und Weiterleitungen alter URLs für Nutzer, die noch nicht auf den Kit-Pfad migriert sind.

## Resilienz und fortgeschrittene Muster

### RPC-Provider-Failover

Failover zwischen RPC-Providern und Umgang mit Rate-Limits.

### Fortgeschrittene Kontoindizierung

Fortgeschrittene Muster zur Indizierung von Programm-Konten und Caching.
