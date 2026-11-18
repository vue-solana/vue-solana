---
title: Feuille de route
description: Fonctionnalités et améliorations prévues pour Vue Solana.
ogSection: Feuille de route
surroundOrder: 22
---

Les packages sont stables pour une utilisation en production avec les lectures RPC, la découverte et la connexion des wallets, la lecture des soldes, les transactions, la lecture de comptes, la signature de messages, la gestion normalisée des erreurs, Sign In With Solana, la signature et l'envoi de transactions par lot, la planification de transactions, les adaptateurs de cache SWR et les helpers de token SPL. Cette feuille de route décrit la suite, classée par impact plutôt que rattachée à une version spécifique.

## Audit actuel et prochaines étapes

L'audit du 18 novembre 2026 a montré qu'aucune des fonctionnalités listées ici n'était livrée comme fonctionnalité publique complète, même si certaines disposaient déjà de fondations partielles. La simulation de transactions est depuis livrée. Procédez dans cet ordre, sauf si une demande utilisateur modifie la priorité :

| Priorité  | Élément                                                                                                               | État                                                                                                                                             | Prochaine étape                                                                                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1         | Helpers de simulation de transaction                                                                                  | Livrés via `simulateTransaction()`, `useSimulateTransaction()` et `useSolanaSimulateTransaction()`                                               | Suivre les travaux ultérieurs dans [`plans/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/use-simulate-transaction.md).                |
| 2         | Chargement différé des wallets iOS                                                                                    | Travail de performance, et non une fonctionnalité manquante ; environ 58 % du chunk `createSolanaPlugin` chargé immédiatement peut être supprimé | Planifier le changement ciblé décrit dans [`plans/bundle-performance-followups.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/bundle-performance-followups.md). |
| 3         | Utilitaires RPC côté serveur pour Nuxt                                                                                | Manquants ; le core peut déjà être utilisé manuellement dans du code serveur                                                                     | Définir une exportation Nitro/côté serveur avec des règles strictes excluant tout secret.                                                                                      |
| 4         | Documentation versionnée                                                                                              | Manquante                                                                                                                                        | Créer la documentation archivée sous `/v1/` et les redirections des anciennes URLs.                                                                                            |
| Plus tard | Providers de wallet iOS supplémentaires                                                                               | Phantom, Solflare et Backpack sont implémentés ; Trust Wallet reste à faire                                                                      | Rechercher les liens et callbacks propres à chaque provider, puis les ajouter derrière `useWallets()`.                                                                         |
| Plus tard | Helpers Anchor, fenêtre modale/UI de wallet, wallets natifs de bureau, basculement RPC, indexation avancée de comptes | Manquants ; engagements importants sur l'API ou l'architecture                                                                                   | Conserver ici jusqu'à ce que chacun dispose d'un plan dédié.                                                                                                                   |

Deux anciens éléments sont déjà couverts : les abonnements en temps réel sont implémentés via `useSubscription()`, `useTrackedData()` et les adaptateurs SWR. L'élément coché « wallets natifs de bureau » dans `plans/native-wallet-plan.md` consigne une décision reportée, et non une implémentation.

## Transactions

### Helpers de simulation de transaction

Livrés : `simulateTransaction()` dans core, `useSimulateTransaction()` dans Vue et `useSolanaSimulateTransaction()` dans Nuxt simulent les transactions avant leur soumission afin que les applications puissent prévisualiser les frais, les changements de comptes et les échecs probables sans dépenser de SOL.

## Intégrations à l'écosystème

### Prise en charge des wallets natifs de bureau

Prise en charge des wallets natifs de bureau via des liens de protocole, à travers les flux de wallet unifiés.

### Providers de wallet iOS supplémentaires

Prise en charge de davantage de wallets de navigateur iOS, au-delà des liens universels actuels de Phantom, Solflare et Backpack.

### Provider Anchor et helpers de programme

Un provider Anchor et des helpers pour les comptes et les instructions des programmes Anchor.

### Fenêtre modale de wallet ou package d'UI

Une fenêtre modale de wallet dédiée ou un package d'UI avec des flux de connexion et de signature prêts à l'emploi.

### Utilitaires RPC côté serveur pour Nuxt

Des utilitaires serveur Nuxt pour les lectures Solana RPC côté serveur.

### Documentation versionnée

Documentation versionnée : une build de documentation legacy archivée sous `/v1/` avec un menu déroulant `v1 | latest` et des redirections des anciennes URLs, pour les utilisateurs qui n'ont pas encore migré vers la voie Kit.

## Résilience et patterns avancés

### Basculement de provider RPC

Basculement de provider RPC et gestion des limites de débit.

### Indexation avancée de comptes

Patterns avancés d'indexation et de mise en cache des comptes de programme.
