---
title: "@vue-solana/core"
description: 框架无关的 Solana 配置、RPC、钱包类型和交易 helper。
ogSection: 包
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) 包含 Vue Solana 包使用的框架无关 Solana primitive。

当你想要连接 helper、共享钱包类型、Android Mobile Wallet Adapter 注册 helper、iOS 浏览器钱包 helper 和交易 helper，但不想安装 Vue 插件时，可以直接使用此包。

`@vue-solana/core` 包装 `@solana/web3-compat`，并重新导出大多数 Vue Solana 应用需要的 Solana primitive，包括 `Connection`、`PublicKey`、`Transaction` 和 `VersionedTransaction`。

## 安装

```sh
pnpm add @vue-solana/core
```

## 快速开始

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({
  cluster: "devnet",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

根导出仍然受支持。也可以使用直接 subpath 导出进行更窄的导入：

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import { PublicKey, Transaction } from "@vue-solana/core/web3";
import type { SolanaConfig } from "@vue-solana/core/types";
```

直接 subpath：

- `@vue-solana/core/address`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/web3`

## 相关指南

- [RPC 和 Clusters](/zh/guides/rpc-and-clusters)：配置 cluster 名称、自定义 RPC endpoint、WebSocket endpoint 和连接 helper。
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
  connection: Connection;
}
```

## 钱包接口

```ts
interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: <T extends SolanaTransaction>(transaction: T) => Promise<T>;
  signAllTransactions?: <T extends SolanaTransaction>(transactions: T[]) => Promise<T[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendOptions,
  ) => Promise<{ signature: TransactionSignature }>;
}
```

通过 Solana Wallet Standard 发现的浏览器钱包和受支持的 iOS 浏览器钱包链接会适配到此接口。你也可以提供一个实现 `SolanaWallet` 的自定义对象。即使浏览器扩展暴露了之前授权的账户，已发现钱包在 `connect()` 成功解析前仍保持断开状态。

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
- `protocol-link` 为可能的 post-v1 桌面原生钱包 adapter 保留。

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

| Import path                        | 包含内容                                                  | 何时使用                                                                                             |
| ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/address`         | `parsePublicKey()` 和 public-key 输入类型。               | 你接受字符串、`PublicKey`、类似 ref 的对象或 getter 形式的 Solana 地址，并需要规范化为 `PublicKey`。 |
| `@vue-solana/core/clusters`        | 默认 cluster 和 endpoint helper。                         | 你需要包内置的 `mainnet-beta`、`testnet`、`devnet` 或 `localnet` RPC/WebSocket endpoint。            |
| `@vue-solana/core/errors`          | `SolanaError`、错误工厂和错误 guard。                     | 你需要稳定错误 code 来处理面向用户的钱包、RPC、地址、交易、超时或存储失败。                          |
| `@vue-solana/core/ios-wallet`      | iOS 浏览器钱包发现、deep-link adapter 和回调处理。        | 你在不使用 Vue 插件统一钱包流程的情况下接入 iOS 钱包链接。                                           |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter 注册 helper。               | 你需要在读取 Wallet Standard 钱包前注册 Android MWA。                                                |
| `@vue-solana/core/rpc`             | `createSolanaConnection()` 和 `createSolanaContext()`。   | 你想在不安装 Vue 插件的情况下获得已配置的 `Connection` 和解析后的 cluster endpoint。                 |
| `@vue-solana/core/timeout`         | 生成 Solana 超时错误的 Promise timeout helper。           | 你需要与交易确认 helper 一致的超时行为。                                                             |
| `@vue-solana/core/transaction`     | 交易发送和确认 helper。                                   | 你需要感知钱包的发送路径，或需要为现有签名获取确认结果。                                             |
| `@vue-solana/core/types`           | 共享 TypeScript 类型。                                    | 你需要 `SolanaConfig`、`SolanaContext`、`SolanaWallet`、钱包元数据或交易选项类型。                   |
| `@vue-solana/core/wallet`          | 钱包状态断言和钱包能力错误。                              | 你需要在调用钱包方法前验证所选钱包已连接或支持签名。                                                 |
| `@vue-solana/core/wallet-standard` | Wallet Standard chain 映射、发现、订阅和 adapter helper。 | 你正在 Solana Wallet Standard 之上构建自己的钱包发现层。                                             |

### Clusters 和 RPC

- `DEFAULT_CLUSTER`：默认 cluster，当前为 `devnet`。
- `getClusterEndpoint(cluster?)`：返回 cluster 的 HTTP RPC endpoint。
- `getClusterWebSocketEndpoint(cluster?)`：返回 cluster 的 WebSocket endpoint。
- `getWebSocketEndpoint(endpoint)`：把 `http`/`https` RPC URL 转换为 `ws`/`wss` URL。
- `createSolanaConnection(config?)`：使用解析后的 endpoint 和 commitment 创建 `Connection`。
- `createSolanaContext(config?)`：为框架无关应用设置创建 `{ cluster, endpoint, wsEndpoint, connection }`。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.connection.getSlot();
```

### 地址

- `parsePublicKey(value)`：解析 `PublicKey`、地址字符串、类似 ref 的值或 getter，并在输入为空时返回 `null`。

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");
const balance = publicKey ? await connection.getBalance(publicKey) : null;
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

- `signAndSendTransaction(connection, wallet, transaction, options?)`：使用配置的钱包签名并发送交易，返回 RPC signature。当 Android Mobile Wallet Adapter 钱包支持 `signTransaction` 时，会使用 `signTransaction` 加 `connection.sendRawTransaction()`，让应用拥有提交过程，并能在钱包 handoff 后可靠返回 RPC signature。
- `confirmTransactionSignature(connection, signature, options?)`：等待已提交签名达到请求的 commitment。默认使用 `confirmed` commitment 和 60 秒超时。

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction);
await confirmTransactionSignature(connection, signature, { commitment: "confirmed" });
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
  await signAndSendTransaction(connection, wallet, transaction);
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

## 已知 TypeScript 问题

有关 `@solana/web3-compat@0.0.21` TypeScript 元数据问题，请参阅[故障排查](/zh/troubleshooting)。当前 `@vue-solana/core` 包会为文档中的 core 导入路径发布临时声明 shim。
