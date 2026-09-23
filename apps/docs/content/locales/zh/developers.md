---
title: 开发者门户
description: 构建 Vue Solana 集成的快速上手、机器可读端点与集成约定。
ogSection: 项目
surroundOrder: 23
---

本门户是开发者和 AI 代理与 Vue Solana 集成的入口——既包括 Vue/Nuxt 库本身，也包括本文档网站的机器可读表面。

## 快速上手：用 Vue 构建 Solana 应用

1. 安装适合你技术栈的包：Nuxt 使用 `pnpm add @vue-solana/nuxt`，纯 Vue 3 使用 `pnpm add @vue-solana/vue @vue-solana/core`。
2. 注册插件或模块（参见[快速开始](/zh/getting-started)）并指向一个集群——默认为 devnet。
3. 使用 composables 读取数据：`useSolanaClient`、`useBalance`、`useTokenAccounts`。
4. 使用 `useWallets` 和 `useWallet` 连接钱包（浏览器扩展、Mobile Wallet Adapter 和 iOS 钱包链接）。
5. 使用 `useSignMessage` 和 `useSignAndSendTransaction` 签名并发送。

Solana RPC 没有 API 密钥：composables 直接与公开的 devnet/mainnet 端点通信，你也可以换成自己的 RPC 提供商。[在线演示](/zh/demo)在浏览器中针对 devnet 运行已发布的包——无需注册。

## 本站的机器可读表面

本文档网站公开一个已文档化的机器表面，无需注册或密钥：

- `/llms.txt` — 面向代理的全部文档页面索引。
- `/llms-full.txt` — 作为单一 Markdown 文档的完整文档语料库。
- `/openapi.json` — 覆盖所有端点、RFC 9457 错误模型、版本策略和速率限制约定的 OpenAPI 3.1 规范。
- 每个文档页面均支持 `Accept: text/markdown` 内容协商（或在 URL 后附加 `.md`）。
- `/sitemap.xml` — 完整 URL 列表。

错误遵循 RFC 9457（`application/problem+json`），并带有 `recovery` 扩展对象；未知路径的 404 在以 `Accept: text/markdown` 请求时返回 Markdown 恢复正文。

## 沙箱

Solana [devnet 集群](/zh/concepts/clusters)是共享沙箱：免费、无需凭据，通过空投即可在不使用真实资金的情况下测试转账。演示页配置为 devnet，所有指南的示例均针对它运行。

## API 密钥与身份验证

无需管理任何密钥。这些包是在你自己的应用中运行的客户端库，本站的机器端点均为公开。如果未来的功能需要密钥，会先在[路线图](/zh/roadmap)页面公告。
