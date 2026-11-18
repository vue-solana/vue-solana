---
title: 路线图
description: Vue Solana 规划中的功能与改进。
ogSection: 路线图
surroundOrder: 22
---

这些包在生产环境中已经稳定支持 RPC 读取、钱包发现与连接、余额查询、交易、账户读取、消息签名、标准化错误处理、Sign In With Solana、批量交易签名与发送、交易规划、SWR 缓存适配器和 SPL token 辅助函数。本路线图描述接下来的计划，按影响力排序，而不与特定版本绑定。

## 当前审查结果与下一步

2026 年 11 月 18 日的审查发现，当时这里列出的功能都尚未作为完整的公开功能发布，不过其中一些已有部分基础。此后交易模拟已经发布；除非用户请求改变优先级，否则请按以下顺序推进剩余事项：

| 优先级 | 项目                                                                       | 状态                                                                                                | 下一步                                                                                                                                                |
| ------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1      | 交易模拟辅助函数                                                           | 已通过 `simulateTransaction()`、`useSimulateTransaction()` 和 `useSolanaSimulateTransaction()` 发布 | 在 [`plans/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/use-simulate-transaction.md) 中跟踪后续事项。       |
| 2      | iOS 钱包懒加载                                                             | 这是性能工作，并非缺失功能；可移除即时加载的 `createSolanaPlugin` chunk 中约 58% 的内容             | 按 [`plans/bundle-performance-followups.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/bundle-performance-followups.md) 安排专项变更。 |
| 3      | Nuxt 服务端 RPC 工具                                                       | 缺失；core 已可在服务端代码中手动使用                                                               | 定义严格的无密钥规则的 Nitro／服务端导出。                                                                                                            |
| 4      | 版本化文档                                                                 | 缺失                                                                                                | 构建归档的 `/v1/` 文档和旧 URL 重定向。                                                                                                               |
| 之后   | 更多 iOS 钱包提供方                                                        | Phantom、Solflare 和 Backpack 已实现；Trust Wallet 仍待完成                                         | 调研各提供方专属的链接与回调，再通过 `useWallets()` 添加。                                                                                            |
| 之后   | Anchor 辅助函数、钱包弹窗／UI 包、桌面原生钱包、RPC 故障转移、高级账户索引 | 缺失；涉及较大的 API 或架构投入                                                                     | 在各自有专项计划前保留在此处。                                                                                                                        |

较早的两项已覆盖：实时订阅已通过 `useSubscription()`、`useTrackedData()` 和 SWR 适配器实现。`plans/native-wallet-plan.md` 中已勾选的“桌面原生钱包”记录的是延期决定，而不是实现。

## 交易

### 交易模拟辅助函数

已发布：core 中的 `simulateTransaction()`、Vue 中的 `useSimulateTransaction()` 和 Nuxt 中的 `useSolanaSimulateTransaction()` 可在提交前模拟交易，让应用无需花费 SOL 就能预览手续费、账户变化和可能的失败。

## 生态集成

### 桌面原生钱包支持

通过统一钱包流程的协议链接支持的桌面原生钱包。

### 更多 iOS 钱包提供方

在现有 Phantom、Solflare 和 Backpack 通用链接之外，支持更多 iOS 浏览器钱包。

### Anchor provider 与程序辅助函数

面向 Anchor 程序账户与指令的 provider 及辅助函数。

### 专属钱包弹窗或 UI 包

带预置连接与签名流程的专属钱包弹窗或 UI 包。

### Nuxt 服务器 RPC 工具

用于服务端 Solana RPC 读取的 Nuxt 服务器工具。

### 版本化文档

在 `/v1/` 下归档的旧版文档构建，带 `v1 | latest` 下拉与旧 URL 重定向，服务尚未迁移到 Kit 路径的用户。

## 韧性与高级模式

### RPC 提供方故障转移

RPC 提供方故障转移与速率限制处理。

### 高级账户索引

高级程序账户索引模式与缓存。
