---
title: Clusters
description: Noms de clusters Solana, endpoints RPC et instructions pour le faucet.
ogSection: Concepts
surroundOrder: 6
---

Un cluster Solana est un réseau de validateurs. Les applications choisissent le cluster auquel se connecter.

## Clusters pris en charge

Vue Solana prend en charge ces noms de cluster :

- `mainnet` : le cluster de production de Solana. C'est le nom officiel du cluster mainnet de Solana. Utilisez-le pour les applications de production et le SOL réel.
- `mainnet-beta` : ancienne graphie de `mainnet`. Toujours acceptée et redirige vers le même endpoint `https://api.mainnet.solana.com`.
- `devnet` : réseau pour les développeurs. Utilisez-le pendant le développement d'applications. Le SOL de devnet n'a aucune valeur réelle.
- `testnet` : réseau de test des validateurs et du protocole. Il est moins courant que devnet pour le développement d'applications.
- `localnet` : un validateur local exécuté sur votre machine, généralement sur `http://127.0.0.1:8899`.

Utilisez `mainnet` dans le code Vue Solana. La documentation de Solana désigne le cluster de production sous le nom Mainnet, et `mainnet` est le nom de cluster attendu par les outils Solana. L'ancienne graphie `mainnet-beta` reste acceptée : les deux noms résolvent vers l'endpoint officiel `https://api.mainnet.solana.com`.

Référence officielle : [Solana Clusters](https://solana.com/docs/references/clusters)

## Endpoints RPC

Un endpoint RPC est l'URL HTTP que votre application utilise pour lire ou écrire sur Solana.

Exemples :

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

Les requêtes RPC passent par `client.rpc` depuis `useSolanaClient()` ou `useSolanaRpc()`, ou depuis `createSolanaClient()` / `createSolanaContext()` dans `@vue-solana/core`. La classe legacy `Connection` et les sous-chemins `web3` ont été supprimés en v2.0.0. Les endpoints publics sont utiles pour démarrer, mais les applications de production utilisent généralement un provider RPC dédié pour la fiabilité et les limites de débit.

Référence officielle : [Solana RPC](https://solana.com/docs/rpc)

## Endpoints WebSocket

Les endpoints WebSocket servent aux subscriptions et aux mises à jour en temps réel. Vue Solana dérive un endpoint WebSocket depuis votre endpoint RPC, sauf si vous passez `wsEndpoint` explicitement.

Exemples :

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
- `ws://127.0.0.1:8900`

## Configurer un cluster

Pour Vue :

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Pour Nuxt :

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Vous pouvez également passer un endpoint personnalisé :

```ts
createSolanaPlugin({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## Obtenir du SOL de devnet ou testnet

Utilisez le faucet officiel :

```txt
https://faucet.solana.com
```

Choisissez `Devnet` ou `Testnet`, collez l'adresse de votre wallet et demandez du SOL.

Si vous avez la CLI Solana installée, vous pouvez aussi demander un airdrop :

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Le SOL de devnet et testnet n'a aucune valeur réelle. N'utilisez jamais un wallet contenant des fonds réels pendant vos tests.
