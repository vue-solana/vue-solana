---
title: "迁移指南"
description: Vue Solana 版本迁移指南。涵盖 v2 到 v3 的升级以及 v1.x 到 v2 的迁移。
ogSection: Guides
surroundOrder: 13
---

本指南涵盖 Vue Solana 版本间的迁移。有两个主要迁移：v2 到 v3 的升级（最新），以及 v1.x 到 v2 的迁移。

## 迁移：v2 到 v3

v3.0.0 是最新版本。它将模块格式更改为仅 ESM，并使 `kit` 子路径成为 `@solana/kit` 的完整镜像。Kit 迁移本身在 v2 中已经完成，因此 v3 主要关注打包和小的行为变化。

### 变更内容

- **仅 ESM**：所有 `@vue-solana/*` 包现在仅发布 ESM。已移除 `require` 导出条件和顶层 `main` 字段。
- **完整的 Kit 镜像**：`@vue-solana/core/kit`、`@vue-solana/vue/kit` 和 `@vue-solana/nuxt/kit` 现在从 `@solana/kit` 进行 `export *`（而不是精选子集）。
- **读取 composable 行为**：`useBalance()`、`useAccountInfo()`、`useProgramAccounts()`、`useTokenAccounts()` 和 `useTokenBalance()`（及其 Nuxt 等价物 `useSolana*`）共享统一的状态机，具有改进的错误处理。
- **依赖项表面**：使用包的 `kit` 子路径时，不再需要在自己的 `package.json` 中添加 `@solana/kit`。

### 如何迁移

#### 1. 更新依赖

```sh
# Vue 应用
pnpm add @vue-solana/vue@^3.0.0

# Nuxt 应用
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. 处理仅 ESM 包

如果你的应用或脚本仍在使用 CommonJS（`require()`），请转换为 ESM。在 `package.json` 中添加 `"type": "module"`，或将文件重命名为 `.mjs`。

```ts
// 替代 require()
import { createSolanaClient } from "@vue-solana/core/kit";
```

如果无法切换到 ESM，请继续使用仍提供 `.cjs` 构建的 `@vue-solana/*@^2.x`。

#### 3. 更新 Kit 导入

有了完整镜像后，可直接从包的 `kit` 子路径导入所有内容。如果你之前在依赖中添加了 `@solana/kit`，现在可以将其移除。

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt（自动导入的 composable 仍然可用）
import { address, lamports } from "@vue-solana/nuxt/kit";
```

注意：四个名称（`SolanaError`、`SolanaErrorCode`、`isSolanaError`、`TransactionStatus`）在根 barrel 和 `/kit` 子路径之间的解析方式不同。如果你要捕获 Kit 抛出的错误，请从 `kit` 子路径导入 `isSolanaError`。

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. 更新读取 composable 的错误处理

`refresh()` 现在在失败时会 reject（而不是 resolve）。更新 await 它的代码：

```ts
await refresh().catch(() => undefined);
```

模板中的 `@click="refresh"` 不受影响。

读取失败时，数据会重置为空值。请显式检查 `error`：

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="无法加载余额。" />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`useTokenBalance()` 的 `balance` 和 `decimals` 是只读的 computed ref - 请移除任何对它们的赋值。

#### 5. 移除遗留的 web3 导入

移除所有剩余的 `@vue-solana/*/web3` 导入和 `@solana/web3-compat` 依赖（它们在 v3 中不存在）。

## 迁移：v1.x 到 v2.0.0

Vue Solana v2.0.0 将核心 API 从 `@solana/web3-compat` 切换到了 `@solana/kit`。对于 v1.x 应用，这是一个破坏性变更。

### 变更内容

- **仅 Kit API**：所有包中移除了 `@solana/web3-compat`。上下文不再携带 `connection`，`web3` 子路径也被删除。
- **类型变更**：`SolanaWallet.publicKey` 现在是普通的 base58 `Address` 字符串（而不是 `PublicKey` 类）。
- **Composable 变更**：`useConnection()` 替换为 `useSolanaClient()`。`useRpc()` 现在返回集群状态以及注入的 Kit 客户端。
- **数值类型**：RPC 结果（如 lamports、slot、区块高度）现在是 `bigint`。在规范化的 composable 输出中，账户数据是 `Uint8Array` 而不是 `Buffer`。
- **交易表面**：`signAndSendTransaction`、`confirmTransactionSignature` 等辅助函数现在接受 Kit 客户端而不是 `Connection`，输入也使用 Kit 类型。

### 如何迁移

#### 1. 更新依赖

```sh
pnpm add @vue-solana/vue@^2.0.0
# 或
pnpm add @vue-solana/nuxt@^2.0.0
```

如果存在，请移除 `@solana/web3-compat` 依赖。

#### 2. 更新 API 调用

| 遗留 API                                                 | 替代方案                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Connection`、`new Connection(url)`                      | 使用 `createSolanaClient({ endpoint })` / `useSolanaClient()` 中的 `client.rpc` |
| `PublicKey`、`new PublicKey(s)`、`.toBase58()`           | 通过 `address(s)` 获取 `Address`                                                |
| `Keypair`、`keypair.publicKey`                           | 使用 `@vue-solana/*/kit` 的 `generateKeyPairSigner()`；签名者的 `.address`      |
| `SystemProgram.transfer`                                 | 使用 `@solana-program/system` 的 `getTransferSolInstruction`                    |
| `LAMPORTS_PER_SOL` 相关运算                              | 使用 `@vue-solana/*/kit` 的 `lamports()`                                        |
| `sendAndConfirmTransaction`                              | 使用 Kit 交易规划；钱包签名流程使用 `signAndSendTransaction(client, ...)`       |
| `requestAirdrop`（devnet）                               | `client.airdrop()`                                                              |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()`（返回 `bigint`）                            |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                      |
| `useConnection()`                                        | `useSolanaClient()`                                                             |
| `parsePublicKey(value)`                                  | 使用 `@vue-solana/core/address` 的 `parseAddress(value)`                        |

#### 3. 更新代码示例

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. 清理

移除所有来自 `@vue-solana/*/web3` 的导入，从 `package.json` 中移除 `@solana/web3-compat`，并删除为 web3-compat 添加的任何本地 `.d.ts` shim。如果你只为遗留的 web3-compat 交易路径需要 `buffer-polyfill`，也一并移除。

### 注意事项

- Kit 的 `client.rpc` 使用按调用的默认值，而不是配置中的 `commitment`。如有需要，请显式传递 `commitment`：`rpc.getBalance(account, { commitment: "confirmed" }).send()`。
- 对于与框架无关的代码，请使用 `@vue-solana/core/kit` 的 `createSolanaClient()`。
