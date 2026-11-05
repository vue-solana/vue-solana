---
title: Agent Skill
description: Installez l'Agent Skill Vue Solana pour les agents de codage IA.
ogSection: Outillage
surroundOrder: 3
---

Vue Solana fournit un Agent Skill installable pour les agents de codage IA qui prennent en charge le format Agent Skills. Le skill fournit aux agents les patterns de configuration de Vue Solana, les règles de choix de package, les conseils sur les flux de wallet, les mises en garde sur le SSR Nuxt, les pièges des transactions et les commandes de vérification.

Utilisez-le lorsque vous demandez à un agent de construire, déboguer, relire ou documenter des applications qui utilisent :

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- les primitives `@vue-solana/*/kit` dans des applications Vue ou Nuxt

## Installation

Installez depuis le dépôt GitHub avec le CLI Skills :

```sh
# Install all skills
npx skills add vue-solana/vue-solana

# Install the Vue Solana skill
npx skills add vue-solana/vue-solana --skill vue-solana

# List available skills
npx skills add vue-solana/vue-solana --list

# Install globally
npx skills add vue-solana/vue-solana --global
```

Le CLI installe les skills dans le répertoire de skills de l'agent que vous choisissez pendant l'installation. Pour Claude, il s'agit de `.claude/skills/` dans le projet courant, ou de `~/.claude/skills/` lorsque `--global` est utilisé.

## Ce que couvre le skill

- Quand utiliser `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/vue/kit`, `@vue-solana/nuxt` et `@vue-solana/nuxt/kit`.
- La configuration du plugin Vue et les imports directs de composables recommandés.
- La configuration du module Nuxt et les composables auto-importés.
- La découverte et la connexion unifiées des wallets via `useWallets()` et `useWallet()`.
- Les wallets d'extension de navigateur, la prise en charge d'Android Mobile Wallet Adapter, la prise en charge des wallets de navigateur iOS et les limites actuelles des wallets natifs de bureau.
- L'utilisation des helpers RPC, de solde, de transaction et de compte de token.
- Les conseils sur le polyfill de navigateur `installSolanaBufferPolyfill()` pour le code de transaction.
- Les commandes de vérification du dépôt pour les modifications apportées à Vue Solana lui-même.

## Source

La source du skill est [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md).
