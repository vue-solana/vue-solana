---
title: "Kit 迁移"
description: 从旧版 web3-compat 连接 API 逐步迁移到 @solana/kit。
ogSection: 指南
surroundOrder: 7
---

Vue Solana 正在从 `@solana/web3-compat` 迁移到 `@solana/kit`。本指南说明原因、每个版本的变化，以及如何迁移你的 Vue 或 Nuxt 应用。它是为使用当前 v1.1.0 API 的应用编写的，因此你可以在双支持版本上今天就跟随本指南，并在 v2.0.0 发布前完成迁移。

## 为什么迁移

`@solana/web3-compat` 已被取代。Solana 官方指引是新应用直接基于 `@solana/kit` 及其插件（`@solana/kit-plugin-rpc`、`@solana/kit-plugin-signer`、`@solana/kit-plugin-wallet`）构建。`web3-compat` 仅作为遗留互操作路径存在。两个具体问题促成了这次迁移：

- `@solana/web3-compat@0.0.21` 发布了损坏的 TypeScript 包元数据，不得不使用仓库本地和包自带的 `.d.ts` 填充（shim）以及构建后声明脚本。
- `Connection` / `PublicKey` / `Transaction` 类 API 是旧形态。Solana 生态已转向 `Address`、编解码器、插件客户端和交易规划器。停留在 `web3-compat` 会让 `@vue-solana/*` 显得过时，并把第二次迁移强加给每个用户。

Kit 还带来模块化的好处：只导入你使用的部分。在 v1.x 中这指的是 `useSolanaClient()` 和 `@vue-solana/*/kit` 子路径；v2 之后，旧的 `web3` 子路径和旧的 `Connection` 将完全消失。

## 时间线

| 版本             | 变化                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x（当前）** | 双支持。`connection`、`web3` 子路径和所有旧版辅助函数保持原样工作。同时新增 Kit 接口：`createSolanaClient()`、`@vue-solana/*/kit` 子路径和 `useSolanaClient()`。旧版辅助函数在类型定义中标记为 `@deprecated`。 |
| **v2.0.0**       | 仅 Kit。`@solana/web3-compat` 从所有包中移除。上下文不再携带 `connection`，`web3` 子路径被删除。`useRpc()` 成为 Kit 的 RPC 组合式函数，钱包暴露 `publicKey: Address`。                                         |

请在 v1.x 窗口期内迁移：两种 API 都能用，因此你可以逐步迁移并持续发布。

## 迁移对照表

下表将每个旧版符号映射到其 Kit 替代品。

| 旧版                                                                         | Kit 替代品                                                                                                                                                                   |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                                 | `client.rpc` / `useSolanaClient()`                                                                                                                                           |
| `new Connection(url)`                                                        | `createSolanaClient({ endpoint: url })` 的 `client.rpc`                                                                                                                      |
| `PublicKey`                                                                  | `Address`（`address("...")`）                                                                                                                                                |
| `new PublicKey(s)` / `.toBase58()`                                           | `address(s)` — base58 字符串已经是 `Address` 形态                                                                                                                            |
| `Keypair` / `Keypair.generate()`                                             | `@solana/kit` 的 `generateKeyPairSigner()`，或 `@solana/kit-plugin-signer` 变体（`signer`、`payer`、`identity`、`generated*`、`generated*WithSol`、`*FromFile`、`airdrop*`） |
| `keypair.publicKey`                                                          | signer 的 `.address`                                                                                                                                                         |
| `SystemProgram.transfer`                                                     | `@solana-program/system` 的 `getTransferSolInstruction`                                                                                                                      |
| `LAMPORTS_PER_SOL` 运算                                                      | `@solana/kit` 的 `lamports()`                                                                                                                                                |
| `sendAndConfirmTransaction`                                                  | 返回 `{ context: { signature } }` 的 `client.sendTransaction([...])`；批量使用 `client.sendTransactions`                                                                     |
| 通过 `requestAirdrop` 领取 devnet 空投                                       | `client.airdrop`（由 `solanaDevnetRpc()` / `airdropSigner` 启用）                                                                                                            |
| `Transaction` / `VersionedTransaction`                                       | Kit 指令和消息构建器                                                                                                                                                         |
| `connection.getBalance`                                                      | `client.rpc.getBalance(...).send()` — 以 `bigint` 返回 lamports                                                                                                              |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` 辅助函数 | 通过 `client.rpc` 的 `@solana-program/token` 插件读取                                                                                                                        |
| `connection.confirmTransaction` / `getSignatureStatuses`                     | Kit 交易确认辅助函数 / `client.rpc.getSignatureStatuses(...).send()`                                                                                                         |
| wallet-standard 流程                                                         | Kit signer 桥接（将已连接钱包适配为 `Signer`）                                                                                                                               |

当前辅助函数现在对应的内容：

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient().rpc`
- `useRpc()` → `useSolanaClient().rpc`（`useRpc()` 的含义在 v2 中改变）
- `parsePublicKey(value)` → `address(value)`
- `signAndSendTransaction(...)` / `confirmTransactionSignature(...)` → `client.sendTransaction([...])` 和 `client.rpc.getSignatureStatuses(...).send()`
- `getTokenAccountsByOwner(...)` 等 → `@solana-program/token` 读取

## 升级 Vue 应用

### 步骤 1：更新到 v1.x

```sh
pnpm add @vue-solana/vue@^1.2.0
```

由于插件仍会构建旧版上下文，且所有现有组合式函数继续工作，你的应用无需更改即可编译和运行。

### 步骤 2：切换到 Kit API

只读 RPC 调用从注入的 `connection` 迁移到 Kit 客户端：

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

Kit 辅助函数和类型已重新导出，因此你无需第二个依赖：

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

已连接钱包的地址在 v1.x 中以 Kit `Address` 形式提供：

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.address 为 `Address | undefined`
```

对于框架无关的代码，直接使用 core 包：

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

无需网络配置或 shim：端点与旧版连接一样，从相同的集群配置解析。

### 步骤 3：在 v2 之后收尾

在 v2.0.0 之后移除：

- 所有 `@vue-solana/vue/web3` 和 `@vue-solana/core/web3` 导入，
- 对 `useConnection()` 的使用（改为 `useSolanaClient().rpc`），
- `package.json` 中的 `@solana/web3-compat`，
- 你为损坏的 `web3-compat` 元数据添加的本地 `.d.ts` shim，
- 如果你只为 web3-compat 交易路径导入才使用的 `buffer-polyfill`。

`web3` 子路径不再存在，因此编译器会指出所有剩余引用。

## 升级 Nuxt 应用

### 步骤 1：更新到 v1.x

```sh
pnpm add @vue-solana/nuxt@^1.2.0
```

### 步骤 2：切换到 Kit API

`useSolanaClient` 自动导入：

```ts
const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send();
```

可以从 `@vue-solana/nuxt/kit` 获取 Kit 辅助函数：

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";
```

### 步骤 3：在 v2 之后收尾

移除 `@vue-solana/nuxt/web3` 导入、web3-compat 依赖和本地 shim。Nuxt 模块会在 v2 中删除 web3-compat 的 `optimizeDeps` 条目。

## RPC 数字和字节说明

Kit REST RPC 方法返回原生 JavaScript 类型：

- Lamports、slot 和区块高度是 `bigint`。对 `bigint` 执行 `JSON.stringify` 会抛出异常；请用 `Number(...)` 或 `toString()` 转换。
- 账户数据是 `Uint8Array`，不是 `Buffer`。你可能在用的 `@solana/buffer/` shim 只对旧版交易路径需要。
- Kit 的 `client.rpc` 不会应用 `SolanaConfig` 中的 `commitment`，而是使用 Kit 每次调用的默认值。如果你的应用依赖自定义 commitment，请在每次调用时传入（例如 `rpc.getBalance(account, { commitment: "confirmed" }).send()`），或在 v1.x 期间继续使用会尊重它的旧版 `connection`。

## 桥接说明（可选）

如果你在迁移期间仍想要经典的类 API，`@solana/web3.js@rc`（v3）是升级路径：`PublicKey` 是 `Address` 的已弃用别名，v3 `Keypair` 在结构上满足 Kit 的 `KeyPairSigner`。参见官方 [web3.js v1 → v3 迁移指南](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md)。

## 相关

- [`RPC 和 Clusters`](/zh/guides/rpc-and-clusters) — 集群和端点配置
- [`入门`](/zh/getting-started) — 安装和首次 devnet 读取
- [`@vue-solana/core`](/zh/packages/core)、[`@vue-solana/vue`](/zh/packages/vue)、[`@vue-solana/nuxt`](/zh/packages/nuxt) — 包参考
