# Vue Solana Agent Skills

Installable Agent Skills for developers working with the Vue Solana ecosystem.

## Available Skills

| Skill                                 | Description                                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [`vue-solana`](./vue-solana/SKILL.md) | Build, debug, review, and document apps using `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt`. |

## Installation

Use the Skills CLI to install from this repository:

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
