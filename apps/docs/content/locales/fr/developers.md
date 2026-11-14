---
title: Portail développeurs
description: Démarrage rapide, endpoints lisibles par les machines et conventions d'intégration pour construire avec Vue Solana.
ogSection: Projet
surroundOrder: 26
---

Ce portail est le point d'entrée pour les développeurs et les agents IA qui intègrent Vue Solana — à la fois les bibliothèques Vue/Nuxt elles-mêmes et la surface lisible par les machines de ce site de documentation.

## Démarrage rapide : construire une application Solana avec Vue

1. Installez le package correspondant à votre stack : `pnpm add @vue-solana/nuxt` pour Nuxt, ou `pnpm add @vue-solana/vue @vue-solana/core` pour du Vue 3 pur.
2. Enregistrez le plugin ou le module (voir [Démarrage](/fr/getting-started)) et pointez-le vers un cluster — devnet par défaut.
3. Lisez des données avec les composables : `useSolanaClient`, `useBalance`, `useTokenAccounts`.
4. Connectez un wallet avec `useWallets` et `useWallet` (extensions de navigateur, Mobile Wallet Adapter et liens de wallet iOS).
5. Signez et envoyez avec `useSignMessage` et `useSignAndSendTransaction`.

Il n'y a pas de clé d'API pour le RPC Solana : les composables dialoguent avec les endpoints publics devnet/mainnet, et vous pouvez brancher votre propre provider RPC. La [démo en direct](/fr/demo) exécute les packages publiés contre devnet dans votre navigateur — sans inscription.

## La surface lisible par les machines de ce site

Ce site de documentation expose une surface machine documentée, sans inscription ni clé :

- `/llms.txt` — petit index anglais groupé par section, avec des liens vers les index par langue.
- `/guides/llms.txt`, `/packages/llms.txt`, `/concepts/llms.txt`, `/examples/llms.txt` — index plus ciblés pour une seule section.
- `/de/llms.txt` … `/zh/llms.txt` — index de la documentation traduite pour chaque langue.
- `/llms-full.txt` — la documentation anglaise en un seul document markdown (facultatif ; les URL `.md` par page sont plus petites).
- `/openapi.json` — spécification OpenAPI 3.1 couvrant tous les endpoints, le modèle d'erreur RFC 9457, la politique de versionnage et les conventions de limite de débit.
- Négociation `Accept: text/markdown` sur chaque page de documentation (ou ajoutez `.md` à l'URL).
- `/sitemap.xml` — liste complète des URLs.

Les réponses markdown portent un en-tête `Link` qui pointe vers l'index `llms.txt` le plus spécifique et vers l'URL `.md` de la page.

Les erreurs suivent la RFC 9457 (`application/problem+json`) avec un objet d'extension `recovery` ; les 404 sur des chemins inconnus renvoient un corps de récupération en markdown lorsqu'ils sont demandés avec `Accept: text/markdown`.

## Sandbox

Le [cluster devnet](/fr/concepts/clusters) est le sandbox partagé : il est gratuit, ne demande aucun identifiant, et les airdrops permettent de tester des transferts sans fonds réels. La page de démo est configurée pour devnet, et les exemples de chaque guide s'exécutent contre lui.

## Clés d'API et authentification

Il n'y en a aucune à gérer. Les packages sont des bibliothèques clientes que vous exécutez dans votre propre application, et les endpoints machine de ce site sont publics. Si une fonctionnalité future nécessite des clés, elle sera d'abord annoncée sur la page [Feuille de route](/fr/roadmap).
