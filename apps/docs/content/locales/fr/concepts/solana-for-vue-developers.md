---
title: Solana pour les développeurs Vue
description: Concepts Solana pratiques pour les développeurs Vue et Nuxt.
ogSection: Concepts
surroundOrder: 5
---

Cette page explique les termes Solana que vous rencontrerez en utilisant les packages Vue Solana. Elle est pratique plutôt qu'exhaustive.

Références officielles :

- [Documentation Solana](https://solana.com/docs)
- [Méthodes RPC Solana](https://solana.com/docs/rpc)
- [Clusters Solana](https://solana.com/docs/references/clusters)
- [Transactions Solana](https://solana.com/docs/core/transactions)
- [Concepts fondamentaux de Solana](https://solana.com/docs/core) — concepts Solana fondamentaux tels que les comptes, les programmes et les transactions

## Connexions et RPC

Les applications frontend lisent les données Solana via un endpoint RPC. Le chemin Kit expose un `client.rpc` en lecture seule via `useSolanaClient()` (ou `createSolanaClient()` depuis `@vue-solana/core/kit`).

Les packages Vue Solana créent et fournissent le client Kit pour le code Vue et Nuxt afin que les composables partagent le même cluster, endpoint, commitment et état de wallet.

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## Clés publiques et adresses

Une clé publique est l'adresse d'un compte Solana. Vous pouvez afficher sans risque des clés publiques dans une application frontend.

Dans le chemin Kit, les adresses sont des chaînes `Address` typées, créées avec `address()` depuis `@vue-solana/vue/kit` :

```ts
import { address } from "@vue-solana/vue/kit";

const publicKey = address("PASTE_A_SOLANA_ADDRESS");
```

Les adresses sont des chaînes `Address` en base58 ; la classe legacy `PublicKey` et les sous-chemins `web3` ont été supprimés en v2.0.0.

Consultez le guide [Kit Migration](/fr/guides/migration) pour la correspondance complète entre les deux.

Ne divulguez jamais de clés privées, de phrases de récupération (seed phrases) ni de tableaux de clés secrètes dans le code frontend.

## Lamports et SOL

SOL est le token natif de Solana. Les lamports sont la plus petite unité de SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

Les méthodes RPC de solde renvoient des lamports. Convertissez les lamports en SOL uniquement pour l'affichage.

Les méthodes RPC de Kit renvoient les lamports sous forme de `bigint` :

```ts
const { value: lamports } = await rpc.getBalance(address("YOUR_ADDRESS")).send();
const sol = Number(lamports) / 1_000_000_000;
```

Les appels RPC de Kit renvoient des `bigint` pour les champs numériques et des `Uint8Array` pour les données de compte.

## Wallets

Un wallet stocke des clés et signe des transactions. Les wallets d'extension de navigateur incluent Phantom, Solflare et Backpack. Les wallets mobiles natifs Android peuvent se connecter via Solana Mobile Wallet Adapter sur les runtimes Android Chrome pris en charge. Phantom, Solflare et Backpack peuvent également se connecter depuis les navigateurs iOS via des liens universels propres à chaque wallet.

Vue Solana découvre les wallets d'extension de navigateur conformes à Solana Wallet Standard, les wallets Android Mobile Wallet Adapter et les liens de wallets de navigateur iOS pris en charge via le flux unifié `useWallets()`. Les lectures RPC et les lectures de solde fonctionnent sans wallet. Se connecter, signer et envoyer des transactions nécessitent un wallet découvert ou un objet personnalisé qui implémente l'interface `SolanaWallet`.

Consultez [Wallets](/fr/guides/wallets) pour la prise en charge actuelle et l'état des wallets natifs de bureau.

## Transactions et signature

Une transaction est un ensemble d'instructions qui modifie l'état de Solana. Les exemples incluent le transfert de SOL, la création d'un compte ou l'interaction avec un programme.

La signature prouve que le propriétaire du wallet approuve la transaction. Les applications frontend doivent demander au wallet de l'utilisateur de signer. Elles ne doivent pas détenir de clés privées.

Le `createSolanaClient()` par défaut compose également le planificateur RPC officiel de Solana Kit et l'exécuteur d'envoi de transactions, de sorte que des contextes client de confiance peuvent planifier et envoyer sans popup de wallet. Ce chemin nécessite un signer `payer`. Gardez les signers approvisionnés sur un serveur ou un relayer ; la configuration runtime publique de Nuxt ne doit contenir ni `payerSecretKey` brut ni aucun autre secret.

## Niveaux de commitment

Le commitment contrôle le degré de finalité attendu des données renvoyées.

- `processed` : le plus rapide, le moins final.
- `confirmed` : bon choix par défaut pour la plupart des lectures d'UI applicatives.
- `finalized` : le plus lent, le plus final.

Exemple :

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

Référence officielle : [Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## Notes de sécurité

- Utilisez `devnet` pendant le développement et les tests.
- N'utilisez pas de wallet contenant des fonds réels pour le développement.
- Ne codez pas en dur de clés privées dans les applications frontend.
- N'utilisez `mainnet` que lorsque vous êtes prêt à interagir avec du SOL réel et des programmes de production.
