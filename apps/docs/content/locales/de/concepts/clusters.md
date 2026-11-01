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
