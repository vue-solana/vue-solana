---
title: 路线图
description: Vue Solana 规划中的功能与改进。
ogSection: 路线图
surroundOrder: 19
---

这些包在生产环境中已经稳定支持 RPC 读取、钱包发现与连接、余额查询、交易、账户读取、消息签名和标准化错误处理。本路线图描述接下来的计划，按影响力排序，而不与特定版本绑定。

## 核心 Composables

- 通用的 `useAction` composable，可包装任意异步函数，支持中止（abort）和基于 ref 的新鲜闭包，跟踪 `status`、`data`、`error` 和 `dispatch`。
- 一次性 `useRequest` composable，当其数据源响应式变化时重新触发，支持 stale-while-revalidate 和单次尝试取消。
- 用于实时 RPC 订阅流（账户通知、slot 通知、日志）的 `useSubscription` composable，支持重连、错误恢复和 stale-while-revalidate。
- `useTrackedData` composable，将初始 RPC 请求与订阅配对，并对结果按 slot 去重，兼顾快速首屏渲染与实时更新。
- `useClientCapability` composable，在挂载时断言某项能力已安装在松散类型的客户端上，否则给出清晰的错误信息。

## 钱包功能

- 用于钱包认证的 Sign In With Solana（`useSignIn`）。
- 将已选钱包账户持久化到存储并支持过滤可用钱包的钱包选择 context。
- 响应式跟踪客户端手续费支付者和操作身份的 `usePayer` 与 `useIdentity` composables。
- 面向多交易钱包请求的批量交易签名与发送（`useSignTransactions`、`useSignAndSendTransactions`）。

## 交易

- 交易规划 composables（`usePlanTransaction`），在签名前根据指令输入规划交易消息。
- 交易模拟辅助函数。
- 面向实时链上数据的事件订阅抽象。

## 生态集成

- 为 Vue 数据获取库（基于 Pinia 的 Query 或 SWR 等价物）提供缓存适配器，对标 `@solana/react` 的 query 适配器。
- 基于 Kit 客户端的 SPL token 账户辅助函数与 token 余额 composables。
- 通过统一钱包流程的协议链接支持的桌面原生钱包。
- 更多 iOS 钱包提供方。
- Anchor provider 与程序辅助函数。
- 专属钱包弹窗或 UI 包。
- 用于服务端读取的 Nuxt 服务器 RPC 工具。
- 版本化文档：在 `/v1/` 下归档的旧版文档构建，带 `v1 | latest` 下拉与旧 URL 重定向，服务尚未迁移到 Kit 路径的用户。

## 韧性与高级模式

- RPC 提供方故障转移与速率限制处理。
- 高级程序账户索引模式与缓存。
