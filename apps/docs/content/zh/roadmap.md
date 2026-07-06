---
title: v1 路线图
description: 第一个稳定 Vue Solana 包发布前计划完成的功能工作。
ogSection: 路线图
surroundOrder: 19
---

Vue Solana 目前仍处于 pre-v1 阶段。这些包已经可用于 RPC 设置、钱包发现、钱包连接、余额读取和 devnet 交易流程，但稳定的 v1 版本还需要一些更面向生产的 API。

详细实现跟踪位于 [`docs/plans/v1-roadmap.md`](https://github.com/vue-solana/vue-solana/blob/main/docs/plans/v1-roadmap.md)。本页面为应用开发者总结已完成和剩余的路线图工作。

## v1 发布目标

- 稳定的公共包导出和 composable 名称。
- 每个文档化公共配置选项都有真实行为。
- 可预测的钱包选择、重连、断开连接和不支持功能处理。
- 除签名提交外的交易确认 helper。
- 响应式账户和签名状态 composable。
- 用于钱包认证流程的消息签名支持。
- 规范化的钱包、交易、RPC、超时和无效输入错误。
- 明确的桌面原生钱包支持状态。
- 更新后的示例、包文档、测试和 E2E 覆盖。

## 路线图阶段

### 1. 公共 API 稳定化

状态：完成。每个公共选项都在 v1 前实现或移除。`autoConnect` 作为对先前选择的钱包身份进行可选重连的行为包含在 v1 中。

### 2. 钱包 UX 基础

状态：完成。钱包选择会在重新加载后保留，但不会连接任意已安装的钱包。v1 只恢复用户之前选择的钱包，并且只在明确启用时自动连接。

### 3. 交易生命周期

状态：完成。v1 包含确认 helper 和响应式交易状态，因此应用可以从签名到确认或超时展示进度。

### 4. 响应式账户数据

状态：完成。v1 包含账户和签名状态 composable，例如 `useAccountInfo()` 和 `useSignatureStatus()`，并安全清理订阅。

### 5. 消息签名和能力

状态：完成。v1 包含使用 `signMessage`、`useSignMessage()` 和 Nuxt `useSolanaSignMessage()` 自动导入的钱包消息签名。活跃钱包和已发现钱包的能力 helper 让应用可以为连接、断开连接、消息签名和交易签名支持渲染正确 UI。

### 6. 错误模型

状态：完成。v1 会把常见失败（例如未选择钱包、不支持功能、用户拒绝、无效地址、超时、存储失败和 RPC 失败）规范化为稳定的 `SolanaError` code，便于面向用户的 UI 使用。

### 7. 桌面原生钱包决策

状态：完成。桌面原生钱包支持明确推迟到 v1 之后，并保留为 post-v1 候选项。v1 通过 `useWallets()` 和 `useWallet()` 保持统一的钱包选择，不新增桌面原生专用公共流程。

### 8. 文档、示例和测试

状态：完成。文档应用是 v1 用法的主要事实来源。先阅读[开始使用](/zh/getting-started)，再使用 [`@vue-solana/core`](/zh/packages/core)、[`@vue-solana/vue`](/zh/packages/vue) 和 [`@vue-solana/nuxt`](/zh/packages/nuxt) 的包参考查看公共 API。[钱包](/zh/guides/wallets)、[交易](/zh/guides/transactions)、[账户读取](/zh/guides/account-reads)、[消息签名](/zh/guides/message-signing) 和[错误](/zh/guides/errors)指南覆盖稳定 v1 工作流，不需要查看源代码。

[Vue Vite 示例](/zh/examples/vue-vite)和 [Nuxt 示例](/zh/examples/nuxt)演示 devnet 优先用法、持久化钱包选择、钱包能力检查、消息签名、交易提交、确认状态、explorer 链接和不支持能力的 UI 路径。单元测试和 Wallet Standard E2E 覆盖位于仓库测试套件中；标记 v1 前请运行下面的验证命令。

## Post-v1 候选项

这些功能有价值，但不应阻塞第一个稳定版本：

- SPL token helper。
- Anchor provider 和 program helper。
- 钱包 modal 或 UI 包。
- Nuxt 服务端 RPC 工具。
- 桌面原生钱包支持。
- 额外的 iOS 钱包 provider。
- 高级 program account 索引模式。
- RPC provider failover 和限流处理。

## v1 前验证

标记稳定版本前，请运行完整本地验证套件：

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
pnpm test:e2e
```

需要时也可以手动运行真实网络 E2E：

```sh
pnpm test:e2e:integration
```
