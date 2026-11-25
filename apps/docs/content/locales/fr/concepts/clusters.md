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

## Fournisseurs RPC hébergés

Les endpoints publics de Solana sont partagés par tout le monde. Ils sont le moyen le plus rapide d'effectuer votre premier appel à `getLatestBlockhash()` ou `getBalance()`, mais ils ne constituent pas une bonne base pour une application que d'autres personnes utiliseront. Lorsque l'endpoint est saturé, les requêtes peuvent être limitées, la latence devient moins prévisible et il n'existe ni tableau de bord d'utilisation ni contrat de support. Un fournisseur RPC hébergé vous donne un endpoint HTTP et WebSocket avec une clé dédiée, des quotas publiés, des métriques et une évolution claire lorsque le trafic augmente.

Vue Solana ne dépend d'aucun fournisseur particulier. Chaque appel RPC passe par le client Kit construit à partir de votre `endpoint` (et de votre `wsEndpoint` facultatif) : changer de fournisseur est donc une modification de configuration, pas une réécriture de vos composables. Voir [Endpoints RPC personnalisés](/fr/guides/rpc-and-clusters#endpoints-rpc-personnalisés) pour le code.

### Pourquoi en utiliser un

- **Des limites prévisibles.** Un endpoint public partage un même budget entre tous ses utilisateurs. Avec un fournisseur, votre clé dispose de son propre quota et d'un comportement documenté en cas de dépassement.
- **Les souscriptions.** `useSubscription()` et `useTrackedData()` nécessitent une connexion WebSocket. Les fournisseurs exposent une URL `wss://` correspondante et autorisent généralement davantage de souscriptions simultanées.
- **L'observabilité.** Les tableaux de bord affichent le volume de requêtes, les erreurs et la latence : vous pouvez ainsi déterminer si une panne vient de votre application ou de la couche RPC.
- **Une voie vers la production.** Lorsqu'un tutoriel devient une vraie application, vous pouvez augmenter les limites sans modifier le code de vos composants.

### Que vérifier avant de choisir

- **Quelles méthodes le forfait prend en charge.** La disponibilité varie selon le cluster et le fournisseur. Chainstack classe certaines méthodes d'analyse coûteuses de Solana comme payantes sur mainnet et ne propose pas de nœuds archive pour devnet.
- **Comment l'utilisation est comptée.** Chainstack compte les Request Units (1 RU par requête sur un nœud complet) ; Alchemy compte les Compute Units, qui varient selon la méthode. Comparer seulement les « requêtes par seconde » peut être trompeur.
- **Si WebSockets, les webhooks ou gRPC sont inclus dans le forfait gratuit.** Votre application peut en avoir besoin même si de simples lectures HTTP fonctionnent.
- **Où vivra la clé d'API.** Une URL d'endpoint dans le bundle navigateur est visible par les utilisateurs. Restreignez la clé dans le tableau de bord du fournisseur ou placez-la derrière une route serveur.

### Options gratuites pour commencer

| Fournisseur                                   | Forfait gratuit                                                                           | Idéal pour                                                                                                                                      | Détails                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Chainstack](https://chainstack.com/pricing/) | Developer : 0 $/mois, 3 000 000 RU/mois, 25 RPS au total, 1 projet, WebSockets.           | Une facturation prévisible en Request Units et des limites explicites par réseau. Un bon pas en avant par rapport à un endpoint public partagé. | Les [directives de débit](https://docs.chainstack.com/docs/limits) indiquent 25 RPS sur Solana devnet, mais seulement 5 RPS sur Solana mainnet pour Developer. `getProgramAccounts`, `getSupply` et `getTokenAccountsByOwner` sont payants sur mainnet ; devnet n'a pas de nœuds archive. Le dépassement coûte 20 $ par million de RU supplémentaires. |
| [Alchemy](https://www.alchemy.com/pricing)    | Free : 30 M CU/mois, 15 RPS, 5 applications et 5 webhooks, tous les mainnets et testnets. | Une URL HTTP/WSS de devnet prête à coller, un tableau de bord d'utilisation et des webhooks pour apprendre et réaliser des démos.               | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) liste l'endpoint et les API non disponibles sur devnet (Token, NFT, Prices, Debug, Trace et autres). La facturation utilise des Compute Units, pas des requêtes brutes ; gRPC est payant.                                                                                               |

Les quotas et les prix évoluent. Considérez les pages des fournisseurs liées comme la source de vérité ; les chiffres ci-dessus sont un point de départ, pas une promesse de Vue Solana.

Un fournisseur vous donne un accès RPC, pas du SOL de test. Vous avez toujours besoin de SOL de devnet depuis le faucet ci-dessous pour envoyer des transactions.

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
