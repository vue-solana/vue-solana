---
title: Vue-Solana-Dokumentation
description: Dokumentation für Vue- und Nuxt-Bibliotheken, die Entwicklern helfen, Solana zu nutzen.
ogSection: Übersicht
surroundOrder: 1
---

Vue Solana ist ein kleines Ökosystem aus Vue- und Nuxt-Paketen zum Bauen von Solana-Anwendungen.

Vue Solana bietet RPC-Einrichtung, reaktive Kontolesevorgänge, Guthabenabfragen, die Erkennung von Browser-Erweiterungs-Wallets, die Erkennung des Android Mobile Wallet Adapter, iOS-Browser-Wallet-Links, Wallet-Verbinden und -Trennen sowie Überweisungsflüsse über Vue- und Nuxt-Composables. Die Beispiele verwenden standardmäßig devnet für sicheres Testen.

## Pakete

- [`@vue-solana/core`](/de/packages/core): framework-agnostische Solana-Konfiguration, Endpoint-Helfer, Wallet-Typen und Transaktions-Helfer.
- [`@vue-solana/vue`](/de/packages/vue): Vue-Plugin und Composables.
- [`@vue-solana/nuxt`](/de/packages/nuxt): Nuxt-Modul, das das Vue-Plugin installiert und Composables automatisch importiert.

`@vue-solana/core` baut auf [Solana Kit](https://solana.com/docs/kit) auf. Es re-exportiert ganz `@solana/kit` plus eine `createSolanaClient()`-Factory aus `@vue-solana/core/kit`, sodass du `@solana/kit` nie selbst installierst, und die Framework-Pakete stellen Kit-first-Composables wie `useSolanaClient()` bereit. Die Legacy-Oberfläche `@solana/web3-compat` und die `web3`-Subpfade wurden in v2.0.0 entfernt — siehe die [Kit-Migrationsanleitung](/de/guides/migration) für die Gegenüberstellung vorher/nachher.

## Hier starten

- [Erste Schritte](/de/getting-started)
- [Kit-Migration](/de/guides/migration)
- [Wallet-Anleitung](/de/guides/wallets)
- [Transaktions-Anleitung](/de/guides/transactions)
- [Solana für Vue-Entwickler](/de/concepts/solana-for-vue-developers)
- [Cluster](/de/concepts/clusters)
- [Roadmap](/de/roadmap)
- [Agent-Skill](/de/agent-skill)
- [Fehlerbehebung](/de/troubleshooting)

## API-Referenz

- [`@vue-solana/core`](/de/packages/core): Konfiguration, Endpoints, Wallet-Interfaces, Wallet-Standard-Helfer, Helfer für Mobile und iOS, Transaktions-Helfer und normalisierte Fehler.
- [`@vue-solana/vue`](/de/packages/vue): Vue-Plugin und Composables für RPC, Kontolesevorgänge, Wallets, Nachrichten, Signaturen und Transaktionen.
- [`@vue-solana/nuxt`](/de/packages/nuxt): Optionen des Nuxt-Moduls, Runtime-Verhalten und automatisch importierte Composables.

## Beispiele

- [Live-Demo](/de/demo)
- [Vue-Vite-Beispiel](/de/examples/vue-vite)
- [Nuxt-Beispiel](/de/examples/nuxt)
- [Showcase](/de/showcase)

## Für Nutzer der Pakete

Beginne mit [Erste Schritte](/de/getting-started), um das Vue- oder Nuxt-Paket in deiner eigenen App zu installieren. Nutze die [Live-Demo](/de/demo), um RPC-Lesevorgänge auf devnet, Wallet-Verbindung, Nachrichtensignierung und Überweisungsflüsse auszuprobieren, bevor du die Composables in dein Projekt einbindest.

Offizielle Solana-Referenzen:

- [Solana-Dokumentation](https://solana.com/docs)
- [Solana-RPC-Methoden](https://solana.com/docs/rpc)
- [Solana-Cluster](https://solana.com/docs/references/clusters)
- [Solana-Faucet](https://faucet.solana.com)
