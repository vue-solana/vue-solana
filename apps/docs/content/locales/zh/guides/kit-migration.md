---
title: "Kit 迁移"
description: 如何将 Vue 或 Nuxt 应用从旧版 web3-compat API 迁移到 @solana/kit。v2.0.0 移除了 web3-compat，v3.0.0 仅发布 ESM。
ogSection: 指南
surroundOrder: 7
---

Vue Solana 在 v2.0.0 中已从 `@solana/web3-compat` 迁移到 `@solana/kit`，v3.0.0 又把 `kit` 子路径变成了 `@solana/kit` 的完整镜像。本指南说明这次变更的原因、每个旧版符号对应的 Kit 替代品，以及如何迁移仍在使用 v1.x API 的 Vue 或 Nuxt 应用。如果你已经在用 v2，请直接跳到[从 v2 升级到 v3](#从-v2-升级到-v3)。

## 为什么迁移

`@solana/web3-compat` 已被取代。Solana 官方指引是新应用直接基于 `@solana/kit` 及其插件（`@solana/kit-plugin-rpc`、`@solana/kit-plugin-signer`、`@solana/kit-plugin-wallet`）构建。`web3-compat` 仅作为遗留互操作路径存在。两个具体问题促成了这次迁移：

- `@solana/web3-compat@0.0.21` 发布了损坏的 TypeScript 包元数据，不得不使用仓库本地和包自带的 `.d.ts` 填充（shim）以及构建后声明脚本。
- `Connection` / `PublicKey` / `Transaction` 类 API 是旧形态。Solana 生态已转向 `Address`、编解码器、插件客户端和交易规划器。停留在 `web3-compat` 会让 `@vue-solana/*` 显得过时，并把第二次迁移强加给每个用户。

Kit 还带来模块化的好处：只导入你使用的部分。在 v2 中，旧的 `web3` 子路径和旧的 `Connection` 已完全消失；这些包以 Kit 为第一优先，上下文只暴露 `client`。

## 时间线

| 版本                   | 变化                                                                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v1.x（此前版本）**   | 双支持。`connection`、`web3` 子路径和所有旧版辅助函数保持原样工作。同时新增 Kit 接口：`createSolanaClient()`、`@vue-solana/*/kit` 子路径和 `useSolanaClient()`。旧版辅助函数在类型定义中标记为 `@deprecated`。 |
| **v2.0.0**             | 仅 Kit。`@solana/web3-compat` 从所有包中移除。上下文不再携带 `connection`，`web3` 子路径被删除。`useRpc()` 成为 Kit 的 RPC 组合式函数，钱包暴露 `publicKey: Address`。                                         |
| **v3.0.0（当前版本）** | 仅 ESM，并提供完整的 Kit 镜像。三个包都移除了 `require` 导出条件和顶层 `main` 字段，`@vue-solana/{core,vue,nuxt}/kit` 不再只重新导出精选列表，而是重新导出全部 `@solana/kit`。                                 |

v1 → v2 的工作保持不变：更新到 `^2.0.0`，解决编译器报错，然后移除编译器标记的所有旧版导入。完整的迁移对照表如下。如果你已经在用 v2，请参阅[从 v2 升级到 v3](#从-v2-升级到-v3)。

## 迁移对照表

下表将每个旧版符号映射到其 Kit 替代品。

| 旧版                                                                         | Kit 替代品                                                                                                                                          |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Connection`                                                                 | `client.rpc` / `useSolanaClient()`                                                                                                                  |
| `new Connection(url)`                                                        | `createSolanaClient({ endpoint: url })` 的 `client.rpc`                                                                                             |
| `PublicKey`                                                                  | `Address`（`address("...")`）                                                                                                                       |
| `new PublicKey(s)` / `.toBase58()`                                           | `address(s)` — base58 字符串已经是 `Address` 形态                                                                                                   |
| `Keypair` / `Keypair.generate()`                                             | `@vue-solana/core/kit` 的 `generateKeyPairSigner()`，或 `@solana/kit-plugin-signer` 变体（`signer`、`payer`、`identity`、`generated*`、`airdrop*`） |
| `keypair.publicKey`                                                          | signer 的 `.address`                                                                                                                                |
| `SystemProgram.transfer`                                                     | `@solana-program/system` 的 `getTransferSolInstruction`                                                                                             |
| `LAMPORTS_PER_SOL` 运算                                                      | `@vue-solana/core/kit` 的 `lamports()`                                                                                                              |
| `sendAndConfirmTransaction`                                                  | Kit 交易规划（上游 `@solana/kit-plugin-rpc` 执行器）；钱包签名流程使用 `signAndSendTransaction(client, ...)`                                        |
| 通过 `requestAirdrop` 领取 devnet 空投                                       | `client.airdrop`（上游，由 `solanaDevnetRpc()` / `airdropSigner` 启用）                                                                             |
| `Transaction` / `VersionedTransaction`                                       | Kit 指令和消息构建器；`SolanaTransaction` 现在是原始序列化字节                                                                                      |
| `connection.getBalance`                                                      | `client.rpc.getBalance(...).send()` — 以 `bigint` 返回 lamports                                                                                     |
| `getTokenAccountsByOwner` / `getTokenBalance` / `@solana/spl-token` 辅助函数 | `@vue-solana/core/token-accounts` 的 `getTokenAccountsByOwner(client, ...)` / `getTokenBalance(client, ...)`（Kit RPC `jsonParsed` 读取）           |
| `connection.confirmTransaction` / `getSignatureStatuses`                     | `confirmTransactionSignature(client, ...)`（轮询 `client.rpc.getSignatureStatuses(...).send()`）                                                    |
| wallet-standard 流程                                                         | 不变 —— wallet-standard 发现和适配仍然驱动 `useWallets()` / `useWallet()`                                                                           |

> 部分行引用了上游 `@solana/kit` 插件（signer、planner、system program）。`createSolanaClient()` 创建的默认客户端已安装 `@solana/kit-plugin-rpc` 的官方 planner 和 RPC 计划发送执行器；其余插件（signer、system program）需要时请直接从 `@solana/kit` 生态安装。

v2 之后辅助函数的对应关系：

- `VueSolanaContext.connection` → `VueSolanaContext.client.rpc`
- `useConnection()` → `useSolanaClient()`（v2 中保留为返回 Kit 客户端的 `@deprecated` 别名）
- `useRpc()` → `solana.client`（v2 的 `useRpc()` 返回集群状态以及注入的 `client`）
- `parsePublicKey(value)` → `@vue-solana/core/address` 的 `parseAddress(value)`
- `signAndSendTransaction(connection, ...)` / `confirmTransactionSignature(connection, ...)` → `signAndSendTransaction(client, ...)` / `confirmTransactionSignature(client, ...)`；`SolanaTransaction` 参数现在是序列化后的线上字节
- `getTokenAccountsByOwner(connection, ...)` 等 → `getTokenAccountsByOwner(client, ...)` 以及基于它的读取，返回 `TokenAccountInfo`

## 从 v2 升级到 v3

v3 有两个破坏性变更——模块格式和地址读取组合式函数——以及一个很大的便利性变更。Kit 迁移本身已经完成，没有需要对应的新符号。

```sh
pnpm add @vue-solana/vue@^3.0.0
```

```sh
pnpm add @vue-solana/nuxt@^3.0.0
```

### 仅 ESM

所有 `@vue-solana/*` 包现在仅发布 ESM。`require` 导出条件和顶层 `main` 字段都已移除，因此在 CommonJS 中 `require("@vue-solana/core")` 会以 `No "exports" main defined` 失败，require 子路径会以 `Package subpath './kit' is not defined by "exports"` 失败。

Nuxt 和 Vite 应用本身已经打包为 ESM，不需要任何改动。如果项目里的脚本、配置文件或 Node 工具仍在用 `require()`，请把它们改为 ESM：在 `package.json` 中添加 `"type": "module"`，或把文件重命名为 `.mjs`。如果确实无法脱离 CommonJS，请继续使用 `@vue-solana/*@^2`，该版本仍然提供 `.cjs` 构建。参见 [Troubleshooting](/zh/troubleshooting) 中的 `ERR_PACKAGE_PATH_NOT_EXPORTED` 条目。

### Kit 子路径现在是完整镜像

`@vue-solana/core/kit`、`@vue-solana/vue/kit` 和 `@vue-solana/nuxt/kit` 现在会 `export *` 全部 `@solana/kit`，而不是重新导出一份精选列表。Kit 的每个值和类型都能从你已经安装的那个子路径中获取。

- 如果你在 v2 时添加过 `@solana/kit`，请把它从自己的 `package.json` 中移除。你不再需要它，保留它反而有在依赖树中出现两份 Kit 的风险。
- 把消息构建器、codec、planner 辅助函数和 signer 工厂都移到同一个 `@vue-solana/*/kit` import 上，让应用只有一个 Solana 入口。

有四个名字同时存在于 Kit 和本库中。从包根导入时解析为**本库的**版本，从 `/kit` 子路径导入时解析为 **Kit 的**版本：

| 名称                | 包根（`@vue-solana/core`）        | `kit` 子路径（`@vue-solana/core/kit`） |
| ------------------- | --------------------------------- | -------------------------------------- |
| `SolanaError`       | `@vue-solana/core` 自带的错误类   | Kit 的 `SolanaError`                   |
| `SolanaErrorCode`   | `@vue-solana/core` 自带的错误码   | Kit 的 `SolanaErrorCode`               |
| `isSolanaError`     | `@vue-solana/core` 自带的判断函数 | Kit 的 `isSolanaError`                 |
| `TransactionStatus` | `@vue-solana/core` 的确认状态结构 | Kit 的 `TransactionStatus`             |

如果你要捕获 Kit 抛出的错误，这一点很重要。包根的 `isSolanaError()` 识别的是本库的 `SolanaError`，不是 Kit 的，所以在检查 Kit 自身抛出的错误时，请从 `@vue-solana/*/kit` 导入：

```ts
import { isSolanaError } from "@vue-solana/core/kit"; // Kit 的判断函数，匹配 Kit 的错误

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

其余都是内部改动。composable 状态机被合并进共享辅助函数，`@solana/kit` 升到了 `^8.4.0`，bundle 也变小了，但其他任何 composable 的签名或返回结构都没有变化。

### 读取组合式函数的行为变更

`useBalance()`、`useAccountInfo()`、`useProgramAccounts()`、`useTokenAccounts()`、`useTokenBalance()`（以及 Nuxt 中对应的 `useSolana*`）现在共用一套状态机。其中三项行为发生了变化，都是修复，但前两项会以未处理的 rejection 或空值的形式出现在你的代码里。

**失败时 `refresh()` 会 reject，而不是 resolve。** 成功时以新值 resolve，输入为空时以 `null` resolve，其余情况则以规范化后的 `SolanaError` reject。如果某处写了 `await refresh()`，请包一层：

```ts
// v2：可以。v3：会抛出。
await refresh();

// v3
await refresh().catch(() => undefined);
```

模板里的 `@click="refresh"` 不受影响——Vue 会吞掉这个 rejection。

**读取失败时，数据会回退为空值。** 如果你曾在出错后保留上一次已知的余额，它现在会消失。请根据 `error` 而不是 falsy 值来分支：

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="无法加载余额。" />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

**`useTokenBalance()` 的 `balance` 和 `decimals` 是只读的 computed ref。** 如果你之前给它们赋过值，请去掉赋值，改为从 `refresh()` resolve 出的值派生。

无法解析的地址现在会在 `error` 中报告 `INVALID_ADDRESS`，而不是 resolve 为 `null`。完整行为见[读取账户](/guides/account-reads#refresh-与错误语义)。

## 升级 Vue 应用

### 步骤 1：更新到 v3

```sh
pnpm add @vue-solana/vue@^3.0.0
```

由于 `web3` 子路径已不存在，编译器现在会指出所有剩余的旧版引用。

### 步骤 2：切换到 Kit API

只读 RPC 调用从注入的 `connection` 迁移到 Kit 客户端：

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();

const slot = await client.rpc.getSlot().send(); // bigint
const lamports = await client.rpc.getBalance(address("BonK...")).send(); // bigint
```

流经 Vue Solana 自身 API 的辅助函数和类型（`address`、`lamports`、`Address`、`Commitment` 等）会被重新导出：

```ts
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

const addr: Address = address("BonK9Y...");
const amount = lamports(1_000_000_000n);
```

消息构建器来自同一个 subpath。`@vue-solana/vue/kit` 重新导出全部的 `@solana/kit`，因此这里无需在你的 `package.json` 中添加 `@solana/kit`。程序指令来自各自的插件，例如 `@solana-program/system` 提供 `getTransferSolInstruction`。

已连接钱包的地址是一个普通的 base58 `Address` 字符串：

```ts
import { useWallet } from "@vue-solana/vue/useWallet";

const wallet = useWallet(); // wallet.publicKey 为 `Address | null`
```

对于框架无关的代码，直接使用 core 包：

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });
```

无需网络设置或 shim：端点从集群配置解析，`createSolanaContext()` 现在返回的是同一个 `client`。

### 步骤 3：移除旧接口

- 所有 `@vue-solana/vue/web3` 和 `@vue-solana/core/web3` 导入，
- 对 `useConnection()` 的使用（改为 `useSolanaClient()`），
- `package.json` 中的 `@solana/web3-compat`，
- 你为损坏的 `web3-compat` 元数据添加的本地 `.d.ts` shim，
- 如果你只为旧版 web3-compat 交易路径导入才使用的 `buffer-polyfill`。

## 升级 Nuxt 应用

### 步骤 1：更新到 v3

```sh
pnpm add @vue-solana/nuxt@^3.0.0
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

`@vue-solana/nuxt/kit` 重新导出全部的 `@solana/kit`，消息构建器也从那里获取 —— 永远不要在自己的 `package.json` 中添加 `@solana/kit`。

### 步骤 3：移除旧接口

移除 `@vue-solana/nuxt/web3` 导入、web3-compat 依赖和本地 shim。Nuxt 模块已在 v2 中删除 web3-compat 的 `optimizeDeps` 条目。

## RPC 数字和字节说明

Kit REST RPC 方法返回原生 JavaScript 类型：

- Lamports、slot 和区块高度是 `bigint`。对 `bigint` 执行 `JSON.stringify` 会抛出异常；请用 `Number(...)` 或 `toString()` 转换。
- 通过 `client.rpc` 获取的账户数据是 base64 编码；Vue Solana 读取组合式函数会将其规范化为 `Uint8Array`。`buffer/` shim 仅在浏览器交易序列化路径使用的 Buffer polyfill 需要。
- Kit 的 `client.rpc` 不会应用 `SolanaConfig` 中的 `commitment`，而是使用 Kit 每次调用的默认值。如果你的应用依赖自定义 commitment，请在每次调用时传入（例如 `rpc.getBalance(account, { commitment: "confirmed" }).send()`）。

## 桥接说明（可选）

如果你仍想要经典的类 API，`@solana/web3.js@rc`（v3）是升级路径：`PublicKey` 是 `Address` 的已弃用别名，v3 `Keypair` 在结构上满足 Kit 的 `KeyPairSigner`。参见官方 [web3.js v1 → v3 迁移指南](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md)。

## 相关

- [`RPC 和 Clusters`](/zh/guides/rpc-and-clusters) — 集群和端点配置
- [`入门`](/zh/getting-started) — 安装和首次 devnet 读取
- [Solana Kit 文档](https://www.solanakit.com/) — 官方 Kit 指南、recipes 和 API reference
- [`@vue-solana/core`](/zh/packages/core)、[`@vue-solana/vue`](/zh/packages/vue)、[`@vue-solana/nuxt`](/zh/packages/nuxt) — 包参考
