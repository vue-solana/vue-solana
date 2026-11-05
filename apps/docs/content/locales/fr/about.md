---
title: À propos
description: Ce qu'est Vue Solana, qui le maintient et comment le projet est géré.
ogSection: Projet
surroundOrder: 22
---

Vue Solana est un projet open source qui publie des bibliothèques Vue et Nuxt pour construire des applications Solana. Il encapsule le SDK JavaScript officiel de Solana (Solana Kit) dans des composables typés et réactifs, afin que les développeurs Vue 3 et Nuxt puissent lire des soldes, découvrir des wallets, signer des messages et envoyer des transactions sans écrire eux-mêmes la plomberie RPC.

Le projet est maintenu par l'équipe Vue Solana et accepte les contributions de la communauté sur GitHub. Tout le code source se trouve à l'adresse `https://github.com/vue-solana/vue-solana` sous licence MIT, et chaque package est publié sur npm sous le scope `@vue-solana`.

## Ce que font les packages

- `@vue-solana/core` : configuration Solana agnostique du framework, helpers d'endpoint, types de wallet et helpers de transaction.
- `@vue-solana/vue` : le plugin Vue et les composables pour les lectures RPC, les wallets, les soldes, les messages, les signatures et les transactions.
- `@vue-solana/nuxt` : un module Nuxt qui installe le plugin Vue et importe automatiquement les composables.

## Comment le projet est géré

Le développement se fait ouvertement sur GitHub : les issues suivent les bugs et les demandes de fonctionnalités, les pull requests passent par une relecture, et les versions sont publiées sur npm. La documentation que vous lisez est générée à partir du Markdown de ce dépôt et déployée sur Vercel.

## Feuille de route et gouvernance

Les fonctionnalités prévues sont suivies publiquement sur la page [Feuille de route](/fr/roadmap). Les changements incompatibles des packages suivent semver, et les surfaces lisibles par les machines de ce site (llms.txt, openapi.json) sont documentées dans la [spécification OpenAPI](/fr/openapi.json) avec une politique de versionnage explicite.

## Contact

Pour des questions, des rapports de bugs ou des problèmes de sécurité, consultez la page [Contact](/fr/contact).
