---
title: Feuille de route
description: Fonctionnalités et améliorations prévues pour Vue Solana.
ogSection: Feuille de route
surroundOrder: 22
---

Les packages sont stables pour une utilisation en production avec les lectures RPC, la découverte et la connexion des wallets, la lecture des soldes, les transactions, la lecture de comptes, la signature de messages, la gestion normalisée des erreurs, Sign In With Solana, la signature et l'envoi de transactions par lot, la planification de transactions, les adaptateurs de cache SWR et les helpers de token SPL. Cette feuille de route décrit la suite, classée par impact plutôt que rattachée à une version spécifique.

## Transactions

### Helpers de simulation de transaction

Simulez les transactions avant leur soumission afin que les applications puissent prévisualiser les frais, les changements de comptes et les échecs probables sans dépenser de SOL.

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
