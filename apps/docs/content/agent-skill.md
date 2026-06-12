---
title: Agent Skill
description: Install the Vue Solana Agent Skill for AI coding agents.
---

Vue Solana ships an installable Agent Skill for AI coding agents that support the Agent Skills format. The skill gives agents Vue Solana setup patterns, package selection rules, wallet flow guidance, Nuxt SSR caveats, transaction gotchas, and verification commands.

Use it when asking an agent to build, debug, review, or document apps that use:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- `@solana/web3-compat` in Vue or Nuxt apps

## Install

Install from the GitHub repository with the Skills CLI:

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

The CLI installs skills into `.claude/skills/` for the current project, or `~/.claude/skills/` when `--global` is used.

## What The Skill Covers

- When to use `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt`, and `@solana/web3-compat`.
- Vue plugin setup and preferred direct composable imports.
- Nuxt module setup and auto-imported composables.
- Unified wallet discovery and connection through `useWallets()` and `useWallet()`.
- Browser extension wallets, Android Mobile Wallet Adapter support, and current iOS/desktop native wallet limits.
- RPC, balance, and transaction helper usage.
- `buffer/` browser polyfill guidance for transaction code.
- The current `@solana/web3-compat@0.0.21` TypeScript metadata workaround.
- Repository verification commands for changes to Vue Solana itself.

## Source

The skill source is [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md).
