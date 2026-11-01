---
title: Solana für Vue-Entwickler
description: Praktische Solana-Konzepte für Vue- und Nuxt-Entwickler.
ogSection: Konzepte
surroundOrder: 5
---

Diese Seite erklärt die Solana-Begriffe, die dir bei der Arbeit mit den Vue-Solana-Paketen begegnen. Sie ist praktisch orientiert und erhebt keinen Anspruch auf Vollständigkeit.

Offizielle Referenzen:

- [Solana-Dokumentation](https://solana.com/docs)
- [Solana-RPC-Methoden](https://solana.com/docs/rpc)
- [Solana-Cluster](https://solana.com/docs/references/clusters)
- [Solana-Transaktionen](https://solana.com/docs/core/transactions)
- [Solana-Kernkonzepte](https://solana.com/docs/core) — zentrale Solana-Konzepte wie Konten, Programme und Transaktionen

## Verbindungen und RPC

Frontend-Apps lesen Solana-Daten über einen RPC-Endpoint. Der Kit-Pfad stellt eine schreibgeschützte `client.rpc` über `useSolanaClient()` bereit (oder `createSolanaClient()` aus `@vue-solana/core/kit`).

Die Vue-Solana-Pakete erzeugen und stellen den Kit-Client für Vue- und Nuxt-Code bereit, damit Composables denselben Cluster, Endpoint, dasselbe Commitment und denselben Wallet-Zustand teilen.

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## Öffentliche Schlüssel und Adressen

Ein öffentlicher Schlüssel ist die Adresse eines Solana-Kontos. Du kannst öffentliche Schlüssel in einer Frontend-App bedenkenlos anzeigen.

Im Kit-Pfad sind Adressen typisierte `Address`-Strings, die mit `address()` aus `@vue-solana/vue/kit` erzeugt werden:

```ts
import { address } from "@vue-solana/vue/kit";

const publicKey = address("PASTE_A_SOLANA_ADDRESS");
```

Adressen sind base58-kodierte `Address`-Strings; die Legacy-Klasse `PublicKey` und die `web3`-Subpfade wurden in v2.0.0 entfernt.

Siehe die Anleitung [Kit-Migration](/de/guides/migration) für die vollständige Gegenüberstellung der beiden.

Stelle niemals private Schlüssel, Seed-Phrasen oder Arrays mit geheimen Schlüsseln in Frontend-Code bereit.

## Lamports und SOL

SOL ist der native Token auf Solana. Lamports sind die kleinste Einheit von SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

RPC-Guthabenmethoden geben Lamports zurück. Rechne Lamports nur für die Anzeige in SOL um.

Kit-RPC-Methoden geben Lamports als `bigint` zurück:

```ts
const { value: lamports } = await rpc.getBalance(address("YOUR_ADDRESS")).send();
const sol = Number(lamports) / 1_000_000_000;
```

Kit-RPC-Aufrufe geben für numerische Felder `bigint` und für Kontodaten `Uint8Array` zurück.

## Wallets

Eine Wallet speichert Schlüssel und signiert Transaktionen. Zu den Browser-Erweiterungs-Wallets gehören Phantom, Solflare und Backpack. Native mobile Wallets unter Android können sich über den Solana Mobile Wallet Adapter in unterstützten Android-Chrome-Runtimes verbinden. Phantom, Solflare und Backpack können sich auch aus iOS-Browsern über wallet-spezifische Universal Links verbinden.

Vue Solana erkennt Browser-Erweiterungs-Wallets nach dem Solana Wallet Standard, Android-Mobile-Wallet-Adapter-Wallets und unterstützte iOS-Browser-Wallet-Links über den einheitlichen `useWallets()`-Flow. RPC-Lesevorgänge und Guthabenabfragen funktionieren ohne Wallet. Verbinden, Signieren und Senden von Transaktionen erfordern eine erkannte Wallet oder ein eigenes Objekt, das das Interface `SolanaWallet` implementiert.

Siehe [Wallets](/de/guides/wallets) für den aktuellen Support und den Status nativer Desktop-Wallets.

## Transaktionen und Signierung

Eine Transaktion ist eine Reihe von Anweisungen, die den Zustand von Solana ändert. Beispiele sind das Überweisen von SOL, das Erstellen eines Kontos oder die Interaktion mit einem Programm.

Die Signierung beweist, dass der Wallet-Inhaber die Transaktion genehmigt. Frontend-Apps sollten die Wallet des Nutzers um die Signierung bitten. Sie sollten keine privaten Schlüssel halten.

Das standardmäßige `createSolanaClient()` setzt außerdem den offiziellen RPC-Planer und den Transaktions-Sende-Executor von Solana Kit zusammen, sodass vertrauenswürdige Client-Kontexte planen und senden können, ohne ein Wallet-Popup zu öffnen. Dieser Pfad erfordert einen `payer`-Signer. Halte mit Guthaben ausgestattete Signer auf einem Server oder Relayer; die öffentliche Runtime-Config von Nuxt darf weder einen rohen `payerSecretKey` noch ein anderes Geheimnis enthalten.

## Commitment-Stufen

Das Commitment steuert, wie final die zurückgegebenen Daten sein sollen.

- `processed`: am schnellsten, am wenigsten final.
- `confirmed`: ein guter Standard für die meisten UI-Lesevorgänge in Apps.
- `finalized`: am langsamsten, am finalsten.

Beispiel:

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

Offizielle Referenz: [Commitment-Status](https://solana.com/docs/rpc#configuring-state-commitment)

## Sicherheitshinweise

- Verwende `devnet`, während du baust und testest.
- Verwende für die Entwicklung keine Wallet mit echtem Guthaben.
- Schreibe private Schlüssel nicht fest in Frontend-Apps.
- Verwende `mainnet` erst, wenn du bereit bist, mit echtem SOL und Produktionsprogrammen zu interagieren.
