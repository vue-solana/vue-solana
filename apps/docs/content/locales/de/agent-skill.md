---
title: Agent-Skill
description: Installiere den Vue-Solana-Agent Skill für KI-Coding-Agenten.
ogSection: Tooling
surroundOrder: 3
---

Vue Solana liefert einen installierbaren Agent Skill für KI-Coding-Agenten, die das Agent-Skills-Format unterstützen. Der Skill gibt Agenten Einrichtungsmuster für Vue Solana, Regeln zur Paketauswahl, Hinweise zu Wallet-Flows, Nuxt-SSR-Fallstricke, Transaktions-Gotchas und Verifikationsbefehle.

Nutze ihn, wenn du einen Agenten bittest, Apps zu bauen, zu debuggen, zu prüfen oder zu dokumentieren, die Folgendes verwenden:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- `@vue-solana/*/kit`-Primitives in Vue- oder Nuxt-Apps

## Installation

Installiere den Skill aus dem GitHub-Repository mit der Skills CLI:

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

Die CLI installiert Skills in das Skill-Verzeichnis des Agenten, den du während der Installation auswählst. Bei Claude ist das `.claude/skills/` im aktuellen Projekt oder `~/.claude/skills/`, wenn `--global` verwendet wird.

## Was der Skill abdeckt

- Wann `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/vue/kit`, `@vue-solana/nuxt` und `@vue-solana/nuxt/kit` verwendet werden.
- Einrichtung des Vue-Plugins und bevorzugte direkte Composable-Importe.
- Einrichtung des Nuxt-Moduls und automatisch importierte Composables.
- Einheitliche Wallet-Erkennung und -Verbindung über `useWallets()` und `useWallet()`.
- Browser-Erweiterungs-Wallets, Unterstützung für den Android Mobile Wallet Adapter, Unterstützung für iOS-Browser-Wallets und aktuelle Grenzen nativer Desktop-Wallets.
- Nutzung der Helfer für RPC, Guthaben, Transaktionen und Token-Konten.
- Hinweise zum Browser-Polyfill `installSolanaBufferPolyfill()` für Transaktionscode.
- Verifikationsbefehle des Repositories für Änderungen an Vue Solana selbst.

## Quelle

Die Quelle des Skills ist [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md).
