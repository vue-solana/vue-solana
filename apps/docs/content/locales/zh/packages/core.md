---
title: "@vue-solana/core"
description: 框架无关的 Solana 配置、RPC、钱包类型和交易 helper。
ogSection: 包
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) 包含 Vue Solana 包使用的框架无关 Solana primitive。

当你想要 Kit 客户端、endpoint helper、共享钱包类型、Android Mobile Wallet Adapter 注册 helper、iOS 浏览器钱包 helper、token 账户读取和交易 helper，但不想安装 Vue 插件时，可以直接使用此包。

`@vue-solana/core` 基于现代的 [`@solana/kit`](https://www.npmjs.com/package/@solana/kit)。`createSolanaClient()` 和 `@vue-solana/core/kit` subpath 重新导出 Kit primitive。遗留的 `@solana/web3-compat` API 和 `web3` subpath 已在 v2.0.0 中移除——完整的 before/after 映射请参阅 [Kit 迁移](/zh/guides/kit-migration)。

## 安装

```sh
pnpm add @vue-solana/core
```

## 快速开始

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

你也可以直接创建 Kit 客户端：

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()` 返回 `{ cluster, endpoint, wsEndpoint, client }`；`client` 带有 `client.rpc` 和 `client.rpcSubscriptions`。

根导出仍然受支持。也可以使用直接 subpath 导出进行更窄的导入：

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

直接 subpath：

- `@vue-solana/core/address`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/token-accounts`

## 相关指南

- [RPC 和 Clusters](/zh/guides/rpc-and-clusters)：配置 cluster 名称、自定义 RPC endpoint、WebSocket endpoint 和客户端 helper。
- [钱包](/zh/guides/wallets)：发现 Wallet Standard 钱包、注册移动钱包来源并检查钱包能力。
- [交易](/zh/guides/transactions)：安全地签名、发送、确认并处理交易超时。
- [错误](/zh/guides/errors)：基于稳定 `SolanaError` code 分支，并避免把原始 cause 暴露给用户 UI。

## 配置

```ts
type SolanaCluster = "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
}
```

支持的 cluster 是 `mainnet-beta`、`testnet`、`devnet` 和 `localnet`。钱包 helper 使用 Wallet Standard chain identifier，例如 `solana:devnet`，这些 identifier 由 `getSolanaChain()` 从 cluster 派生。如果省略 `endpoint`，包会使用所选 cluster 的公共 Solana RPC endpoint。如果省略 `wsEndpoint`，它会从 RPC endpoint 派生。

`autoConnect` 默认为 `false`。通过 Vue 插件或 Nuxt 模块启用后，Vue Solana 只会重新连接用户之前选择、并且在客户端再次发现的钱包身份。它只在 `localStorage["vue-solana:selected-wallet"]` 下存储钱包身份元数据：`name`，以及可用时的 `platform`/`source`。它永远不会存储私钥、session 数据或交易数据，也不会连接任意已安装钱包。

Solana mainnet 请使用 `mainnet-beta`。这是 Solana 的官方 cluster 名称；该包有意不把 `mainnet` 作为 alias。

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` 是由 `createSolanaClient()` 构建的 [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) 客户端，暴露 `client.rpc` 和 `client.rpcSubscriptions`。

## 钱包接口

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: Signature }>;
}
```

通过 Solana Wallet Standard 发现的浏览器钱包和受支持的 iOS 浏览器钱包链接会适配到此接口。你也可以提供一个实现 `SolanaWallet` 的自定义对象。即使浏览器扩展暴露了之前授权的账户，已发现钱包在 `connect()` 成功解析前仍保持断开状态。

`publicKey` 是已连接账户的 base58 编码 Kit `Address`（字符串）。`SolanaTransaction` 是 `Uint8Array`——钱包原样签名的原始 wire 交易字节；首字节用于区分 legacy 与 versioned 交易。

Android Mobile Wallet Adapter 通过 `@solana-mobile/wallet-standard-mobile` 注册，然后通过相同的 Wallet Standard adapter 适配。

## 钱包元数据

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly SolanaWalletAccountInfo[];
  wallet: unknown;
}
```

当前元数据值：

- 浏览器扩展钱包使用 `platform: "browser"` 和 `source: "wallet-standard"`。
- Android Mobile Wallet Adapter 使用 `platform: "mobile"` 和 `source: "mobile-wallet-adapter"`。
- iOS 浏览器钱包使用 `platform: "mobile"` 和 `source: "deep-link"`。
- `protocol-link` 为可能的未来桌面原生钱包 adapter 保留。

## Wallet Standard Helper

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` 是钱包发现、移动钱包注册、iOS 钱包链接和钱包 adapter 签名选项使用的 Wallet Standard chain identifier。需要从配置的 Solana cluster 派生时，请使用 `getSolanaChain(cluster)`。

- `getSolanaChain(cluster)`：把 `mainnet-beta`、`devnet`、`testnet` 或 `localnet` 映射为 Solana Wallet Standard chain ID。
- `isSolanaStandardWallet(wallet)`：检查 Wallet Standard 钱包是否支持 Solana。
- `getRegisteredSolanaWallets()`：在浏览器环境返回已发现的 Solana Wallet Standard 钱包，包括在支持客户端注册后的 Android Mobile Wallet Adapter。
- `subscribeSolanaWallets(listener)`：订阅 Wallet Standard register/unregister 事件。
- `adaptSolanaStandardWallet(walletInfo, options?)`：把已发现的 Wallet Standard 钱包适配为 `SolanaWallet`。

## 移动钱包 Helper

- `registerSolanaMobileWallet(options?)`：在支持的 Android Chrome 客户端上通过 Wallet Standard 注册 Android Mobile Wallet Adapter。
- `isSolanaMobileWalletSupported()`：返回当前运行时是否支持 Android MWA Web 注册。
- `getDefaultMobileWalletAppIdentity()`：从当前 document 派生默认 Mobile Wallet Adapter 应用身份。
- `getSolanaIosWallets(options?)`：在 iOS 浏览器上返回 Phantom、Solflare 和 Backpack iOS 浏览器钱包条目。
- `adaptSolanaIosWallet(walletInfo, options?)`：把 iOS deep-link 钱包条目适配为 `SolanaWallet`。
- `handleSolanaIosWalletCallback(options?)`：验证并解密 iOS 钱包重定向回调。
- `isSolanaIosBrowserWalletSupported()`：返回当前运行时是否应暴露 iOS 浏览器钱包链接。

这些 helper 都是 SSR 安全的。当 `window` 不可用，或浏览器不是 Android Chrome 移动 Web/PWA 运行时时，Android 注册会直接返回且不注册。浏览器不是 iOS 浏览器运行时时，iOS 钱包发现返回空列表。

## Helper

根 `@vue-solana/core` 导出会重新导出下面的公共 helper。需要更窄导入或更清晰模块边界时，请使用直接 subpath。

| Import path                        | 包含内容                                                                                                             | 何时使用                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/address`         | `parseAddress()` 和地址输入类型。                                                                                    | 你以字符串、类似 ref 的对象或 getter 形式接受 Solana 地址，并需要一个经过验证和规范化的 `Address`。 |
| `@vue-solana/core/clusters`        | 默认 cluster 和 endpoint helper。                                                                                    | 你需要包内置的 `mainnet-beta`、`testnet`、`devnet` 或 `localnet` RPC/WebSocket endpoint。           |
| `@vue-solana/core/errors`          | `SolanaError`、错误工厂和错误 guard。                                                                                | 你需要稳定错误 code 来处理面向用户的钱包、RPC、地址、交易、超时或存储失败。                         |
| `@vue-solana/core/ios-wallet`      | iOS 浏览器钱包发现、deep-link adapter 和回调处理。                                                                   | 你在不使用 Vue 插件统一钱包流程的情况下接入 iOS 钱包链接。                                          |
| `@vue-solana/core/kit`             | `createSolanaClient()` 和 `@solana/kit` 重导出（`Address`、`address`、`lamports`、`SolanaRpcApi`、`SolanaClient`）。 | 你想要现代 Kit API，但不涉及完整的 `@solana/kit` 依赖图。                                           |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter 注册 helper。                                                                          | 你需要在读取 Wallet Standard 钱包前注册 Android MWA。                                               |
| `@vue-solana/core/rpc`             | `createSolanaContext()`。                                                                                            | 你想在不安装 Vue 插件的情况下获得已配置的 Kit 客户端和解析后的 cluster endpoint。                   |
| `@vue-solana/core/timeout`         | 生成 Solana 超时错误的 Promise timeout helper。                                                                      | 你需要与交易确认 helper 一致的超时行为。                                                            |
| `@vue-solana/core/transaction`     | 交易发送和确认 helper。                                                                                              | 你需要感知钱包的发送路径，或需要为现有签名获取确认结果。                                            |
| `@vue-solana/core/token-accounts`  | 无状态 SPL Token 账户读取（`getTokenAccountsByOwner`、`getTokenAccount`、`getTokenBalance`）。                       | 你需要通过 Kit RPC `jsonParsed` API 读取 token 账户或余额。                                         |
| `@vue-solana/core/types`           | 共享 TypeScript 类型。                                                                                               | 你需要 `SolanaConfig`、`SolanaContext`、`SolanaWallet`、钱包元数据或交易选项类型。                  |
| `@vue-solana/core/wallet`          | 钱包状态断言和钱包能力错误。                                                                                         | 你需要在调用钱包方法前验证所选钱包已连接或支持签名。                                                |
| `@vue-solana/core/wallet-standard` | Wallet Standard chain 映射、发现、订阅和 adapter helper。                                                            | 你正在 Solana Wallet Standard 之上构建自己的钱包发现层。                                            |

### Clusters 和 RPC

- `DEFAULT_CLUSTER`：默认 cluster，当前为 `devnet`。
- `getClusterEndpoint(cluster?)`：返回 cluster 的 HTTP RPC endpoint。
- `getClusterWebSocketEndpoint(cluster?)`：返回 cluster 的 WebSocket endpoint。
- `getWebSocketEndpoint(endpoint)`：把 `http`/`https` RPC URL 转换为 `ws`/`wss` URL。
- `createSolanaClient(config?)`：创建 `@solana/kit` 客户端，其 `rpc` 连接到解析后的 endpoint 和 WebSocket 订阅。
- `createSolanaContext(config?)`：为框架无关应用的设置创建 `{ cluster, endpoint, wsEndpoint, client }`。

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

`createSolanaContext` 等价写法：

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

`@vue-solana/core/kit` subpath 导出大多数应用需要从 `@solana/kit` 获得的一切，无需直接安装它：

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)`：为给定的 `SolanaConfig` 构建 Kit 客户端。复用 `clusters.ts` 的 endpoint 解析，并从解析后的 WebSocket endpoint 连接 `rpcSubscriptionsUrl`。
- `client.rpc`：以 RPC 函数形式暴露完整的 Solana 读取 API（`getSlot`、`getBalance`、`getBlockHeight`、`getSignatureStatuses` 等），通过 `.send()` 调用。
- `address(value)`：验证并返回 `Address`（base58 字符串 brand）——替代 `new PublicKey(...)` 的 Kit 版本。
- `lamports(value: bigint)`：返回 `Lamports` 值——替代原始 lamport 数字的 Kit 版本。
- 类型：`Address`、`Commitment`、`Lamports`、`Rpc`、`Signature`、`SolanaRpcApi`、`SolanaClient`。

RPC 数值结果是 `bigint`，账户数据是 `Uint8Array` 而不是 `Buffer`。详见 [Kit 迁移](/zh/guides/kit-migration)。

### 动作

`createSolanaActionStore()` 将每次调用接收新 `AbortSignal` 的异步函数包装成 abort-on-redispatch 的动作状态机。Vue 组合式函数 `useAction()` 构建于此 store 之上，`isSolanaActionAborted()` 用于检测被取消或被取代的调用。

### 地址

- `parseAddress(value)`：解析地址字符串、类似 ref 的值或 getter，输入为空时返回 `null`。无效 base58 字符串抛出 `INVALID_ADDRESS`。按原样接受 `Address` 值。

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
```

### 钱包

- `isWalletConnected(wallet)`：检查钱包是否已连接且有 public key。
- `assertWalletConnected(wallet)`：如果钱包未连接则抛出 `WALLET_NOT_CONNECTED`。
- `assertWalletCanSign(wallet)`：如果钱包未连接或不支持 `signTransaction` 则抛出错误。
- `assertWalletCanSignMessage(wallet)`：如果钱包未连接或不支持 `signMessage` 则抛出错误。

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### 交易

- `signAndSendTransaction(client, wallet, transaction, options?)`：使用配置的钱包签名并发送原始 wire 交易字节，返回 RPC signature。暴露 `signAndSendTransaction` 的钱包会委托给它；否则交易用 `wallet.signTransaction` 签名，并通过 `client.rpc.sendTransaction(...).send()` 提交。Android Mobile Wallet Adapter 钱包优先使用签名加应用侧 RPC 提交，让应用拥有提交过程，并能在钱包 handoff 后可靠返回 RPC signature。
- `confirmTransactionSignature(client, signature, options?)`：等待已提交签名达到请求的 commitment。默认使用 `confirmed` commitment、60 秒超时，并轮询 `client.rpc.getSignatureStatuses([signature]).send()`。

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL Token

Token 读取使用 Kit RPC `jsonParsed` API——无需 `@solana/spl-token` 依赖。

- `getTokenAccountsByOwner(client, owner, options?)`：以 `TokenAccountInfo[]` 返回某个所有者的所有 SPL Token 和 Token-2022 账户（`{ address, mint, owner, amount: bigint, decimals, state, isNative }`）。传入 `programId` 可限制为单个 program。
- `getTokenAccount(client, address, commitment?)`：返回单个解析后的 token 账户（`TokenAccountInfo | null`）。账户不存在或不是 token 账户时返回 `null`。
- `getTokenBalance(client, mint, owner, commitment?)`：读取给定 mint 的所有者 token 账户，返回 `{ amount, decimals }`。不存在 token 账户时返回 `null`。

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### 错误和超时

- `SolanaError`：规范化错误类，带稳定 `code` 和可选原始 `cause`。
- `createSolanaError(code, message, options?)`：创建规范化 Solana 错误。
- `isSolanaError(error)`：把 unknown error 收窄为 `SolanaError`。
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`：把未知失败转换为 `SolanaError`，并把常见钱包拒绝映射到 `USER_REJECTED`。
- `withTimeout(promise, timeoutMs, createError)`：用调用方提供的超时错误与 promise 竞争。
- `withSolanaTimeout(promise, timeoutMs, message)`：用 `TRANSACTION_TIMEOUT` 错误与 promise 竞争。

## 错误模型

Vue Solana 会把常见的钱包、RPC、地址、交易和存储失败规范化为 `SolanaError`。应用应基于稳定的 `error.code` 值分支，而不是解析 adapter 或 RPC 消息。

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // The user declined a wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // The operation timed out; check signature state before retrying.
        break;
      case "RPC_FAILURE":
        // RPC or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

稳定错误 code 包括：

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `USER_REJECTED`
- `INVALID_ADDRESS`
- `TRANSACTION_TIMEOUT`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` 保留原始钱包 adapter、RPC、解析或存储错误用于调试。除非应用明确信任该来源，否则不要向最终用户展示原始 `cause` 详情。

## Buffer Polyfill

序列化 Solana 交易的浏览器代码可能需要 Node 兼容的 `Buffer` 全局。在交易代码之前用 `@vue-solana/core/buffer-polyfill` 的 `installSolanaBufferPolyfill()` 初始化它。仅剩的包自有类型 shim 覆盖此 polyfill 导入的浏览器 `buffer/` subpath。
