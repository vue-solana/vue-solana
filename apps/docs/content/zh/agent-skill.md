---
title: Agent Skill
description: 为 AI 编码代理安装 Vue Solana Agent Skill。
ogSection: 工具
surroundOrder: 3
---

Vue Solana 提供一个可安装的 Agent Skill，适用于支持 Agent Skills 格式的 AI 编码代理。该 skill 为代理提供 Vue Solana 设置模式、包选择规则、钱包流程指导、Nuxt SSR 注意事项、交易常见问题和验证命令。

当你要求代理构建、调试、审查或记录使用以下包的应用时，可以使用它：

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- Vue 或 Nuxt 应用中的 `@vue-solana/vue/web3` 和 `@vue-solana/nuxt/web3` primitives

## 安装

使用 Skills CLI 从 GitHub 仓库安装：

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

CLI 会把 skills 安装到你在安装期间选择的代理 skill 目录。对 Claude 来说，当前项目中是 `.claude/skills/`，使用 `--global` 时是 `~/.claude/skills/`。

## Skill 覆盖内容

- 什么时候使用 `@vue-solana/core`、`@vue-solana/vue`、`@vue-solana/vue/web3`、`@vue-solana/nuxt` 和 `@vue-solana/nuxt/web3`。
- Vue 插件设置和推荐的直接 composable 导入方式。
- Nuxt 模块设置和自动导入的 composables。
- 通过 `useWallets()` 和 `useWallet()` 统一发现和连接钱包。
- 浏览器扩展钱包、Android Mobile Wallet Adapter 支持、iOS 浏览器钱包支持，以及当前桌面原生钱包限制。
- RPC、余额和交易工具用法。
- 交易代码中 `installSolanaBufferPolyfill()` 浏览器 polyfill 指导。
- 当前 `@solana/web3-compat@0.0.21` TypeScript 元数据临时方案。
- 修改 Vue Solana 自身时的仓库验证命令。

## 源码

Skill 源码位于 [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md)。
