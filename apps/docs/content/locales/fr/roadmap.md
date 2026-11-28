---
title: Feuille de route
description: Fonctionnalités et améliorations prévues pour Vue Solana.
ogSection: Feuille de route
surroundOrder: 22
---

Les packages sont stables pour une utilisation en production avec les lectures RPC, la découverte et la connexion des wallets, la lecture des soldes, les transactions, la lecture de comptes, la signature de messages, la gestion normalisée des erreurs, Sign In With Solana, la signature et l'envoi de transactions par lot, la planification de transactions, les adaptateurs de cache SWR et les helpers de token SPL. Cette feuille de route décrit la suite, classée par impact plutôt que rattachée à une version spécifique.

## Audit actuel et prochaines étapes

L'audit du 18 novembre 2026 a montré qu'aucune des fonctionnalités listées ici n'était livrée comme fonctionnalité publique complète, même si certaines disposaient déjà de fondations partielles. La simulation, le RPC côté serveur de Nuxt et l'historique des transactions sont livrés, et la jonction des diagnostics de transaction est implémentée et en attente de publication. Procédez dans cet ordre, sauf si une demande utilisateur modifie la priorité :

| Priorité  | Élément                                                                                                                                                                                  | État                                                                                                             | Prochaine étape                                                                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Politique de frais/budget de calcul                                                                                                                                                      | Prévue                                                                                                           | Mettre en œuvre la phase 1 du [plan de la file de fonctionnalités](https://github.com/vue-solana/vue-solana/blob/main/plans/feature-queue-phases.md) : politique au-dessus des setters de Kit, sans envoi ni oracle de frais dynamique. |
| 2         | Jonction des diagnostics de transaction                                                                                                                                                  | Implémenté ; en attente de publication                                                                           | Phase 2 : sera livré via `@vue-solana/core/diagnostics`, `useTransactionDiagnostics()` et `useSolanaTransactionDiagnostics()` ; voir [Erreurs](/fr/guides/errors).                                                                      |
| 3         | Lectures de token/portefeuille                                                                                                                                                           | Implémenté ; en attente de publication                                                                           | La phase 3 est disponible via `getTokenPortfolio()`, `useTokenPortfolio()` et `useSolanaTokenPortfolio()` ; Token-2022 reste derrière un sous-chemin optionnel. Voir [Lecture des comptes](/fr/guides/account-reads).                   |
| 4         | Réactivité des clients de programme                                                                                                                                                      | Prévue                                                                                                           | Phase 4 : adaptateurs réactifs autour des clients générés par Codama ; pas de génération de code ni de registre.                                                                                                                        |
| 5         | Finition bundle et SSR                                                                                                                                                                   | Voie parallèle                                                                                                   | Phase 5 : chargement différé iOS depuis [suivis bundle](https://github.com/vue-solana/vue-solana/blob/main/plans/deferred/bundle-performance-followups.md), audit SSR et garde-fous de taille.                                          |
| Shipped   | Helpers de simulation de transaction                                                                                                                                                     | Livrés en 4.3.0 via `simulateTransaction()`, `useSimulateTransaction()` et `useSolanaSimulateTransaction()`      | Enregistrement archivé dans [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md).                                                              |
| Shipped   | Utilitaires RPC côté serveur pour Nuxt                                                                                                                                                   | Livré dans la 4.4.0 via `@vue-solana/nuxt/server` (`createServerSolanaClient()`, `useServerSolanaClient()`).     | Voir la section « RPC côté serveur pendant le SSR » dans la documentation du package Nuxt.                                                                                                                                              |
| Shipped   | Historique des transactions                                                                                                                                                              | Livré dans la 4.5.0 via `getTransactionHistory()`, `useTransactionHistory()` et `useSolanaTransactionHistory()`. | Enregistrement archivé dans [`plans/archived/transaction-history.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/transaction-history.md).                                                                        |
| Plus tard | Documentation versionnée, providers de wallet iOS supplémentaires, helpers Anchor, fenêtre modale/UI de wallet, wallets natifs de bureau, basculement RPC, indexation avancée de comptes | Manquants ou reportés ; engagements importants sur l'API ou l'architecture                                       | Conserver ici jusqu'à ce que chacun dispose d'un plan dédié. La décision UI est dans le [rapport sur la bibliothèque UI](https://github.com/vue-solana/vue-solana/blob/main/reports/Vue%20Solana%20UI%20library.md).                    |

Deux anciens éléments sont déjà couverts : les abonnements en temps réel sont implémentés via `useSubscription()`, `useTrackedData()` et les adaptateurs SWR. L'élément coché « wallets natifs de bureau » dans `plans/deferred/native-wallet-plan.md` consigne une décision reportée, et non une implémentation.

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

Livré dans la 4.4.0 : `createServerSolanaClient()` et `useServerSolanaClient()` de `@vue-solana/nuxt/server` lisent les données Solana depuis des routes serveur Nitro sans exposer de secret.

### Documentation versionnée

Documentation versionnée : une build de documentation legacy archivée sous `/v1/` avec un menu déroulant `v1 | latest` et des redirections des anciennes URLs, pour les utilisateurs qui n'ont pas encore migré vers la voie Kit.

## Résilience et patterns avancés

### Basculement de provider RPC

Basculement de provider RPC et gestion des limites de débit.

### Indexation avancée de comptes

Patterns avancés d'indexation et de mise en cache des comptes de programme.
