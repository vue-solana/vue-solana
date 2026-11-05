---
title: Documentation Vue Solana
description: Documentation des bibliothèques Vue et Nuxt qui aident les développeurs à utiliser Solana.
ogSection: Vue d'ensemble
surroundOrder: 1
---

Vue Solana est un petit écosystème de packages Vue et Nuxt pour construire des applications Solana.

Vue Solana fournit la configuration RPC, des lectures réactives de comptes, la lecture des soldes, la découverte des wallets d'extension de navigateur, la découverte de l'Android Mobile Wallet Adapter, les liens vers les wallets de navigateur iOS, la connexion et la déconnexion des wallets, ainsi que les flux de transfert de transaction via des composables Vue et Nuxt. Les exemples utilisent devnet par défaut pour des tests sans risque.

## Packages

- [`@vue-solana/core`](/fr/packages/core) : configuration Solana agnostique du framework, helpers d'endpoint, types de wallet et helpers de transaction.
- [`@vue-solana/vue`](/fr/packages/vue) : plugin Vue et composables.
- [`@vue-solana/nuxt`](/fr/packages/nuxt) : module Nuxt qui installe le plugin Vue et importe automatiquement les composables.

`@vue-solana/core` s'appuie sur [Solana Kit](https://solana.com/docs/kit). Il réexporte tout `@solana/kit` ainsi qu'une factory `createSolanaClient()` depuis `@vue-solana/core/kit`, vous n'installez donc jamais `@solana/kit` vous-même, et les packages de framework exposent des composables Kit-first tels que `useSolanaClient()`. La surface legacy `@solana/web3-compat` et les sous-chemins `web3` ont été supprimés dans la v2.0.0 — consultez le [guide de migration Kit](/fr/guides/migration) pour la correspondance avant/après.

## Commencer ici

- [Démarrage](/fr/getting-started)
- [Migration Kit](/fr/guides/migration)
- [Guide des wallets](/fr/guides/wallets)
- [Guide des transactions](/fr/guides/transactions)
- [Solana pour les développeurs Vue](/fr/concepts/solana-for-vue-developers)
- [Clusters](/fr/concepts/clusters)
- [Feuille de route](/fr/roadmap)
- [Agent Skill](/fr/agent-skill)
- [Dépannage](/fr/troubleshooting)

## Référence API

- [`@vue-solana/core`](/fr/packages/core) : configuration, endpoints, interfaces de wallet, helpers Wallet Standard, helpers mobile/iOS, helpers de transaction et erreurs normalisées.
- [`@vue-solana/vue`](/fr/packages/vue) : plugin Vue et composables pour le RPC, la lecture de comptes, les wallets, les messages, les signatures et les transactions.
- [`@vue-solana/nuxt`](/fr/packages/nuxt) : options du module Nuxt, comportement à l'exécution et composables auto-importés.

## Exemples

- [Démo en direct](/fr/demo)
- [Exemple Vue Vite](/fr/examples/vue-vite)
- [Exemple Nuxt](/fr/examples/nuxt)

## Pour les utilisateurs des packages

Commencez par [Démarrage](/fr/getting-started) pour installer le package Vue ou Nuxt dans votre propre application. Utilisez la [démo en direct](/fr/demo) pour essayer les lectures RPC devnet, la connexion de wallet, la signature de messages et les flux de transfert avant de brancher les composables dans votre projet.

Références officielles Solana :

- [Documentation Solana](https://solana.com/docs)
- [Méthodes RPC Solana](https://solana.com/docs/rpc)
- [Clusters Solana](https://solana.com/docs/references/clusters)
- [Faucet Solana](https://faucet.solana.com)
