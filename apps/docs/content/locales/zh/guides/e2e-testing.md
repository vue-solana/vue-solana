---
title: "E2E 测试"
description: 运行 Playwright e2e 测试套件，并在 UI 测试中模拟 Solana RPC、RPC 订阅和钱包。
ogSection: Guides
surroundOrder: 14
---

本仓库的示例应用由 `e2e/` 中的 Playwright 测试套件覆盖。默认情况下，该套件针对确定性 RPC 模拟运行构建后的 Vue Vite 和 Nuxt 示例应用；在单独的集成运行中则针对真实 devnet 运行。

当你为示例应用添加功能、更改示例中可见的 composable 行为，或想在自己的 Playwright 测试中模拟 Solana RPC 时，请使用本指南。

## 运行测试套件

```sh
# 构建包和两个示例应用，然后运行 Playwright。
pnpm test:e2e

# 针对真实 devnet 的集成运行（无 RPC 模拟）。
pnpm test:e2e:integration

# 安装一次 Chromium 浏览器二进制文件。
pnpm test:e2e:install
```

Playwright 配置会自动启动两个示例预览服务器（CI 之外启用了 `reuseExistingServer`，因此手动启动的服务器会被复用）。

## 模拟模式

| 模式 | 命令                        | RPC                     | RPC 订阅              | 钱包                               |
| ---- | --------------------------- | ----------------------- | --------------------- | ---------------------------------- |
| 默认 | `pnpm test:e2e`             | 模拟 (`e2e/helpers.ts`) | 通过假 websocket 模拟 | 模拟 Wallet Standard 钱包          |
| 集成 | `pnpm test:e2e:integration` | 真实 devnet             | 真实 devnet           | 真实安装的钱包（钱包相关用例跳过） |

针对模拟数据进行断言的用例会通过 `test.skip(isRealRpcRun(), ...)` 在 `E2E_REAL_RPC=true` 下自动跳过，因此同一批用例文件在两种模式下都能运行。

## 模拟 HTTP RPC

`mockSolanaRpc(page)` 拦截 `https://api.devnet.solana.com/**` 并对已知方法给出确定性响应：

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

已处理的方法：`getLatestBlockhash`、`getBalance`、`getVersion`、`getAccountInfo` 和 `getHealth`。未知方法返回 `{ jsonrpc: "2.0", id, result: null }`。CORS 预检（`OPTIONS`）以 `204` 应答。

当你在示例应用中新增 RPC 调用时，请把该方法添加到 `e2e/helpers.ts` 的 `createRpcResponse()` 中。数值应保持为 JSON 安全值（真实 `u64::MAX` 超出 JavaScript 的安全整数范围，因此 `rentEpoch` 以字符串形式传递）。

## 通过 websocket 模拟 RPC 订阅

`mockSolanaSubscriptions(page)` 在 HTTP 模拟的基础上扩展了一个实现 `@solana/kit` 所用 JSON-RPC 订阅协议的假 `wss://api.devnet.solana.com/**` 端点：

1. 客户端发送 `{ jsonrpc, id, method: "<method>Subscribe", params }`。
2. 服务器以 `{ jsonrpc, id, result: <subscriptionId> }` 应答。
3. 更新以 `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }` 的形式到达。Kit 按 `params.subscription` 多路分解并转换 `params.result`。
4. Kit 发送不带 `id` 的 `{ method: "ping" }` 保活帧；模拟端忽略它们。

该函数会 resolve 出一个用于在测试中驱动通知的 harness：

```ts
import { mockSolanaSubscriptions } from "./helpers";

test("live data", async ({ page }) => {
  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // 断言种子数据，然后推送一条更新。
  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  subscriptions.pushSlotNotification(24_042, 24_040);

  // 当前至少持有一个订阅的 socket 数量。
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);
});
```

- `pushAccountNotification(lamports, slot)` 向所有打开的账户订阅发送带有 `{ context: { slot }, value: { lamports, data, ... } }` 载荷（`accountNotifications` 的形状）的 `accountNotification`。
- `pushSlotNotification(slot, root)` 向所有打开的 slot 订阅发送带有 `{ slot, root, parent }` 的 `slotNotification`。
- `slotSubscribe` 请求还会收到一条即时通知，使 `useSubscription` 在测试驱动推送之前就有数据。

线上协议格式是关键所在：如果 `@solana/kit` 更改其多路分解方式，订阅相关的用例（slot 和账户通知更新）就会失败——这正是预期的预警信号。

## 模拟 Wallet Standard 钱包

`registerMockWallets(page)` 通过 `page.addInitScript` 在应用启动前注入两个 Wallet Standard 钱包：

- **Mock Signer Wallet** — 支持 `standard:connect`、`standard:disconnect`、`standard:events`、`solana:signMessage` 和 `solana:signIn`（SIWS）。`signMessage` 返回签名 `[1..8]`；`signIn` 返回固定的账户、消息和签名。
- **Mock Readonly Wallet** — 仅支持 connect/disconnect/events，用于断言不支持能力时的 UI。

这些钱包以 Wallet Standard 期望的两种方式自注册：监听 `wallet-standard:app-ready`（向应用注册）并派发 `wallet-standard:register-wallet`（针对先初始化的应用）。

## 可复用的断言模式

- 用 `e2e/helpers.ts` 中的 `expectNoPageErrors(page, run)` 包裹流程，以便流程中出现任何 `pageerror` 或 `console.error` 时测试失败。
- 对于示例应用的稳定界面，优先使用 `data-testid` 句柄（`getByTestId`）而非文本或角色选择器。
- 对于 SWR 语义，断言两个阶段：重挂载后立即出现缓存的（过期）值，随后 revalidate 的值将其替换。
