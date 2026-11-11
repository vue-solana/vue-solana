---
title: Über
description: Was Vue Solana ist, wer es pflegt und wie das Projekt organisiert ist.
ogSection: Projekt
surroundOrder: 23
---

Vue Solana ist ein Open-Source-Projekt, das Vue- und Nuxt-Bibliotheken zum Bauen von Solana-Anwendungen veröffentlicht. Es verpackt das offizielle Solana JavaScript SDK (Solana Kit) in typisierte, reaktive Composables, damit Vue-3- und Nuxt-Entwickler Guthaben lesen, Wallets erkennen, Nachrichten signieren und Transaktionen senden können, ohne die RPC-Infrastruktur selbst zu bauen.

Das Projekt wird vom Vue-Solana-Team gepflegt und nimmt Beiträge aus der Community auf GitHub an. Der gesamte Quellcode liegt unter `https://github.com/vue-solana/vue-solana` unter der MIT-Lizenz, und jedes Paket wird auf npm unter dem Scope `@vue-solana` veröffentlicht.

## Was die Pakete tun

- `@vue-solana/core`: framework-agnostische Solana-Konfiguration, Endpoint-Helfer, Wallet-Typen und Transaktions-Helfer.
- `@vue-solana/vue`: das Vue-Plugin und Composables für RPC-Lesevorgänge, Wallets, Guthaben, Nachrichten, Signaturen und Transaktionen.
- `@vue-solana/nuxt`: ein Nuxt-Modul, das das Vue-Plugin installiert und die Composables automatisch importiert.

## Wie das Projekt organisiert ist

Die Entwicklung findet offen auf GitHub statt: Issues verfolgen Fehler und Feature-Wünsche, Pull Requests durchlaufen ein Review, und Releases werden auf npm veröffentlicht. Die Dokumentation, die du gerade liest, wird aus dem Markdown in diesem Repository gebaut und auf Vercel bereitgestellt.

## Roadmap und Governance

Geplante Funktionen werden öffentlich auf der Seite [Roadmap](/de/roadmap) verfolgt. Breaking Changes an den Paketen folgen semver, und die maschinenlesbaren Oberflächen dieser Seite (llms.txt, openapi.json) sind in der [OpenAPI-Spezifikation](/openapi.json) mit einer expliziten Versionierungsrichtlinie dokumentiert.

## Kontakt

Bei Fragen, Fehlerberichten oder Sicherheitsproblemen siehe die Seite [Kontakt](/de/contact).
