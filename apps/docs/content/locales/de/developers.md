---
title: Entwicklerportal
description: Quickstart, maschinenlesbare Endpoints und Integrationskonventionen für die Arbeit mit Vue Solana.
ogSection: Projekt
surroundOrder: 25
---

Dieses Portal ist der Einstiegspunkt für Entwickler und KI-Agenten, die mit Vue Solana arbeiten — sowohl mit den Vue-/Nuxt-Bibliotheken selbst als auch mit der maschinenlesbaren Oberfläche dieser Dokumentationsseite.

## Quickstart: Eine Solana-App mit Vue bauen

1. Installiere das Paket für deinen Stack: `pnpm add @vue-solana/nuxt` für Nuxt oder `pnpm add @vue-solana/vue @vue-solana/core` für reines Vue 3.
2. Registriere das Plugin oder Modul (siehe [Erste Schritte](/de/getting-started)) und richte es auf einen Cluster — standardmäßig devnet.
3. Lies Daten mit Composables: `useSolanaClient`, `useBalance`, `useTokenAccounts`.
4. Verbinde eine Wallet mit `useWallets` und `useWallet` (Browser-Erweiterungen, Mobile Wallet Adapter und iOS-Wallet-Links).
5. Signiere und sende mit `useSignMessage` und `useSignAndSendTransaction`.

Für die Solana-RPC gibt es keine API-Schlüssel: Die Composables sprechen mit öffentlichen devnet-/mainnet-Endpoints, und du kannst deinen eigenen RPC-Provider einbinden. Die [Live-Demo](/de/demo) führt die veröffentlichten Pakete gegen devnet in deinem Browser aus — ohne Registrierung.

## Maschinenlesbare Oberfläche dieser Seite

Diese Dokumentationsseite stellt eine dokumentierte maschinelle Oberfläche bereit, ohne Registrierung oder Schlüssel:

- `/llms.txt` — Index aller Dokumentationsseiten für Agenten.
- `/llms-full.txt` — der vollständige Dokumentationsbestand als ein Markdown-Dokument.
- `/openapi.json` — OpenAPI-3.1-Spezifikation mit allen Endpoints, dem RFC-9457-Fehlermodell, der Versionierungsrichtlinie und den Rate-Limit-Konventionen.
- `Accept: text/markdown`-Aushandlung auf jeder Dokumentationsseite (oder `.md` an die URL anhängen).
- `/sitemap.xml` — vollständige URL-Liste.

Fehler folgen RFC 9457 (`application/problem+json`) mit einem `recovery`-Erweiterungsobjekt; 404-Antworten für unbekannte Pfade liefern einen Markdown-Recovery-Body, wenn sie mit `Accept: text/markdown` angefordert werden.

## Sandbox

Der Solana-[devnet-Cluster](/de/concepts/clusters) ist die gemeinsame Sandbox: Er ist kostenlos, benötigt keine Zugangsdaten, und mit Airdrops kannst du Überweisungen ohne echtes Guthaben testen. Die Demo-Seite ist für devnet konfiguriert, und die Beispiele jeder Anleitung laufen dagegen.

## API-Schlüssel und Authentifizierung

Es gibt keine zu verwalten. Die Pakete sind Client-Bibliotheken, die du in deiner eigenen App ausführst, und die maschinellen Endpoints dieser Seite sind öffentlich. Falls eine zukünftige Funktion Schlüssel benötigt, wird sie zuerst auf der Seite [Roadmap](/de/roadmap) angekündigt.
