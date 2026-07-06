---
title: Vue Solana 文档
description: 帮助开发者在 Vue 和 Nuxt 中使用 Solana 的库文档。
ogSection: 概览
surroundOrder: 1
---

Vue Solana 是一组用于构建 Solana 应用的小型 Vue 和 Nuxt 包。

Vue Solana 通过 Vue 和 Nuxt composables 提供 RPC 设置、响应式账户读取、余额读取、浏览器扩展钱包发现、Android Mobile Wallet Adapter 发现、iOS 浏览器钱包链接、钱包连接/断开，以及交易转账流程。示例默认使用 devnet，便于安全测试。

## 包

- [`@vue-solana/core`](/zh/packages/core): 与框架无关的 Solana 配置、端点工具、钱包类型和交易工具。
- [`@vue-solana/vue`](/zh/packages/vue): Vue 插件和 composables。
- [`@vue-solana/nuxt`](/zh/packages/nuxt): 安装 Vue 插件并自动导入 composables 的 Nuxt 模块。

`@vue-solana/core` 基于 `@solana/web3-compat`，并从 `@vue-solana/core/web3` 重新导出受支持的 Solana primitives。Vue 应用可以使用 `@vue-solana/vue/web3`，Nuxt 应用可以使用 `@vue-solana/nuxt/web3`，无需直接安装 core。

## 从这里开始

- [开始使用](/zh/getting-started)
- [钱包指南](/zh/guides/wallets)
- [交易指南](/zh/guides/transactions)
- [面向 Vue 开发者的 Solana](/zh/concepts/solana-for-vue-developers)
- [集群](/zh/concepts/clusters)
- [v1 路线图](/zh/roadmap)
- [Agent Skill](/zh/agent-skill)
- [故障排查](/zh/troubleshooting)

## API 参考

- [`@vue-solana/core`](/zh/packages/core): 配置、端点、钱包接口、Wallet Standard 工具、移动/iOS 工具、交易工具和标准化错误。
- [`@vue-solana/vue`](/zh/packages/vue): 用于 RPC、账户读取、钱包、消息、签名和交易的 Vue 插件与 composables。
- [`@vue-solana/nuxt`](/zh/packages/nuxt): Nuxt 模块选项、运行时行为和自动导入的 composables。

## 示例

- [实时演示](/zh/demo)
- [Vue Vite 示例](/zh/examples/vue-vite)
- [Nuxt 示例](/zh/examples/nuxt)

## 面向包用户

先阅读[开始使用](/zh/getting-started)，在你自己的应用中安装 Vue 或 Nuxt 包。使用[实时演示](/zh/demo)先体验 devnet RPC 读取、钱包连接、消息签名和转账流程，再把 composables 接入项目。

官方 Solana 参考：

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Faucet](https://faucet.solana.com)
