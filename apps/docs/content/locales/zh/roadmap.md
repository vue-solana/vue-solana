---
title: 路线图
description: Vue Solana 规划中的功能与改进。
ogSection: 路线图
surroundOrder: 22
---

这些包在生产环境中已经稳定支持 RPC 读取、钱包发现与连接、余额查询、交易、账户读取、消息签名、标准化错误处理、Sign In With Solana、批量交易签名与发送、交易规划、SWR 缓存适配器和 SPL token 辅助函数。本路线图描述接下来的计划，按影响力排序，而不与特定版本绑定。

## 当前审查结果与下一步

2026 年 11 月 18 日的审查发现，当时这里列出的功能都尚未作为完整的公开功能发布，不过其中一些已有部分基础。此后交易模拟、Nuxt 服务端 RPC 和交易历史均已发布；除非用户请求改变优先级，否则请按以下顺序推进剩余事项：

| 优先级  | 项目                                                                                                        | 状态                                                                                                         | 下一步                                                                                                                                                                              |
| ------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1       | 手续费／计算预算策略                                                                                        | 计划中                                                                                                       | 实施[功能队列计划](https://github.com/vue-solana/vue-solana/blob/main/plans/feature-queue-phases.md)的第 1 阶段：在 Kit setter 之上提供策略，不发送交易，也不使用动态手续费预言机。 |
| 2       | 交易诊断合并                                                                                                | 计划中                                                                                                       | 第 2 阶段：在不引入程序目录的情况下合并历史、模拟和标准化错误。                                                                                                                     |
| 3       | Token／投资组合读取                                                                                         | 计划中                                                                                                       | 第 3 阶段：先支持经典 SPL 读取，Token-2022 放在可选的 subpath 后。                                                                                                                  |
| 4       | 程序客户端响应式支持                                                                                        | 计划中                                                                                                       | 第 4 阶段：围绕 Codama 生成的客户端提供响应式适配器；不做代码生成，也不维护注册表。                                                                                                 |
| 5       | 包体积与 SSR 打磨                                                                                           | 并行轨道                                                                                                     | 第 5 阶段：依据[包体积后续事项](https://github.com/vue-solana/vue-solana/blob/main/plans/deferred/bundle-performance-followups.md)进行 iOS 懒加载、SSR 审计和体积守卫。             |
| Shipped | 交易模拟辅助函数                                                                                            | 已于 4.3.0 通过 `simulateTransaction()`、`useSimulateTransaction()` 和 `useSolanaSimulateTransaction()` 发布 | 记录已归档至 [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md)。                        |
| Shipped | Nuxt 服务端 RPC 工具                                                                                        | 4.4.0 起通过 `@vue-solana/nuxt/server`（`createServerSolanaClient()`、`useServerSolanaClient()`）提供。      | 参见 Nuxt 包文档中的「SSR 期间的服务器端 RPC」一节。                                                                                                                                |
| Shipped | 交易历史                                                                                                    | 已于 4.5.0 通过 `getTransactionHistory()`、`useTransactionHistory()` 和 `useSolanaTransactionHistory()` 发布 | 记录已归档至 [`plans/archived/transaction-history.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/transaction-history.md)。                                  |
| 之后    | 版本化文档、更多 iOS 钱包提供方、Anchor 辅助函数、钱包弹窗／UI 包、桌面原生钱包、RPC 故障转移、高级账户索引 | 缺失或已延期；涉及较大的 API 或架构投入                                                                      | 在各自有专项计划前保留在此处。UI 决策见 [UI 库报告](https://github.com/vue-solana/vue-solana/blob/main/reports/Vue%20Solana%20UI%20library.md)。                                    |

较早的两项已覆盖：实时订阅已通过 `useSubscription()`、`useTrackedData()` 和 SWR 适配器实现。`plans/deferred/native-wallet-plan.md` 中已勾选的“桌面原生钱包”记录的是延期决定，而不是实现。

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

4.4.0 已提供：`@vue-solana/nuxt/server` 的 `createServerSolanaClient()` 和 `useServerSolanaClient()` 可在 Nitro 服务器路由中读取 Solana 数据，且不会暴露密钥。

### 版本化文档

在 `/v1/` 下归档的旧版文档构建，带 `v1 | latest` 下拉与旧 URL 重定向，服务尚未迁移到 Kit 路径的用户。

## 韧性与高级模式

### RPC 提供方故障转移

RPC 提供方故障转移与速率限制处理。

### 高级账户索引

高级程序账户索引模式与缓存。
