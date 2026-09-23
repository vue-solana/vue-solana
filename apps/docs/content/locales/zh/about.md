---
title: 关于
description: Vue Solana 是什么、由谁维护，以及项目的运作方式。
ogSection: 项目
surroundOrder: 20
---

Vue Solana 是一个开源项目，发布用于构建 Solana 应用的 Vue 和 Nuxt 库。它将官方 Solana JavaScript SDK（Solana Kit）封装为带类型的响应式 composables，让 Vue 3 和 Nuxt 开发者无需手写 RPC 基础设施即可读取余额、发现钱包、签名消息和发送交易。

本项目由 Vue Solana 团队维护，并在 GitHub 上接受社区贡献。所有源代码位于 `https://github.com/vue-solana/vue-solana`，采用 MIT 许可证；每个包都以 `@vue-solana` scope 发布到 npm。

## 各包的功能

- `@vue-solana/core`：与框架无关的 Solana 配置、端点辅助函数、钱包类型和交易辅助函数。
- `@vue-solana/vue`：用于 RPC 读取、钱包、余额、消息、签名和交易的 Vue 插件与 composables。
- `@vue-solana/nuxt`：安装 Vue 插件并自动导入 composables 的 Nuxt 模块。

## 项目如何运作

开发在 GitHub 上公开进行：issue 跟踪缺陷和功能请求，pull request 经过审查，版本发布到 npm。你正在阅读的文档由该仓库中的 Markdown 构建，并部署在 Vercel 上。

## 路线图与治理

计划中的功能在[路线图](/zh/roadmap)页面公开跟踪。包的破坏性变更遵循 semver，本站的机器可读表面（llms.txt、openapi.json）在 [OpenAPI 规范](/zh/openapi.json)中以明确的版本策略进行了文档化。

## 联系方式

如有问题、缺陷报告或安全问题，请参阅[联系](/zh/contact)页面。
