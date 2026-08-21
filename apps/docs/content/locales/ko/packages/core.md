---
title: "@vue-solana/core"
description: 프레임워크 독립 Solana 설정, RPC, 지갑 타입, 트랜잭션 helper입니다.
ogSection: 패키지
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core)는 Vue Solana 패키지가 사용하는 프레임워크 독립 Solana primitive를 포함합니다.

Vue plugin을 설치하지 않고 connection helper, 공유 wallet type, Android Mobile Wallet Adapter 등록 helper, iOS browser wallet helper, transaction helper를 사용하고 싶을 때 이 package를 직접 사용하세요.

`@vue-solana/core`는 `@solana/web3-compat`를 감싸며 대부분의 Vue Solana 앱에 필요한 `Connection`, `PublicKey`, `Transaction`, `VersionedTransaction` 같은 Solana primitive를 다시 export합니다.

## 설치

```sh
pnpm add @vue-solana/core
```

## 빠른 시작

```ts
import { createSolanaContext } from "@vue-solana/core";

const solana = createSolanaContext({
  cluster: "devnet",
});

const { blockhash } = await solana.connection.getLatestBlockhash();

console.log(solana.endpoint, blockhash);
```

Root export는 계속 지원됩니다. 더 좁은 import에는 direct subpath export도 사용할 수 있습니다.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import { PublicKey, Transaction } from "@vue-solana/core/web3";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Direct subpath:

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
- `@vue-solana/core/spl-token`
- `@vue-solana/core/token-accounts`

## 관련 가이드

- [RPC와 클러스터](/ko/guides/rpc-and-clusters): cluster name, custom RPC endpoint, WebSocket endpoint, connection helper를 설정합니다.
- [지갑](/ko/guides/wallets): Wallet Standard 지갑을 검색하고, mobile wallet source를 등록하고, wallet capability를 확인합니다.
- [트랜잭션](/ko/guides/transactions): transaction을 안전하게 서명, 전송, 확인하고 timeout을 처리합니다.
- [오류](/ko/guides/errors): 안정적인 `SolanaError` code로 분기하고 raw cause를 사용자 UI에서 숨깁니다.

## 설정

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

지원 cluster는 `mainnet-beta`, `testnet`, `devnet`, `localnet`입니다. Wallet helper는 `getSolanaChain()`이 cluster에서 파생하는 `solana:devnet` 같은 Wallet Standard chain identifier를 사용합니다. `endpoint`를 생략하면 선택한 cluster의 공개 Solana RPC endpoint를 사용합니다. `wsEndpoint`를 생략하면 RPC endpoint에서 파생됩니다.

`autoConnect` 기본값은 `false`입니다. Vue plugin 또는 Nuxt module에서 활성화하면 Vue Solana는 사용자가 이전에 선택했고 client에서 다시 discovery된 wallet identity만 reconnect합니다. `localStorage["vue-solana:selected-wallet"]`에는 `name`, 가능한 경우 `platform`/`source` 같은 wallet identity metadata만 저장합니다. private key, session data, transaction data를 저장하지 않으며 임의로 설치된 wallet에 연결하지 않습니다.

Solana mainnet에는 `mainnet-beta`를 사용하세요. 이는 Solana의 공식 cluster name이며, package는 의도적으로 `mainnet` alias를 사용하지 않습니다.

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  connection: Connection;
}
```

## Wallet Interface

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

Solana Wallet Standard로 발견된 browser wallet과 지원되는 iOS browser wallet link는 이 interface로 adapt됩니다. `SolanaWallet`을 구현한 custom object도 제공할 수 있습니다. 발견된 wallet은 browser extension이 이전 승인 계정을 노출하더라도 `connect()`가 성공할 때까지 disconnected 상태로 유지됩니다.

Android Mobile Wallet Adapter는 `@solana-mobile/wallet-standard-mobile`을 통해 등록된 뒤 같은 Wallet Standard adapter를 통해 adapt됩니다.

## Wallet Metadata

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

현재 metadata 값:

- Browser extension wallet은 `platform: "browser"`, `source: "wallet-standard"`를 사용합니다.
- Android Mobile Wallet Adapter는 `platform: "mobile"`, `source: "mobile-wallet-adapter"`를 사용합니다.
- iOS browser wallet은 `platform: "mobile"`, `source: "deep-link"`를 사용합니다.
- `protocol-link`는 post-v1 desktop native wallet adapter 가능성을 위해 예약되어 있습니다.

## Wallet Standard Helper

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain`은 wallet discovery, mobile wallet registration, iOS wallet link, wallet adapter signing option에서 사용하는 Wallet Standard chain identifier입니다. 설정된 Solana cluster에서 이를 파생해야 하면 `getSolanaChain(cluster)`를 사용하세요.

- `getSolanaChain(cluster)`: `mainnet-beta`, `devnet`, `testnet`, `localnet`을 Solana Wallet Standard chain ID로 매핑합니다.
- `isSolanaStandardWallet(wallet)`: Wallet Standard wallet이 Solana를 지원하는지 확인합니다.
- `getRegisteredSolanaWallets()`: browser 환경에서 발견된 Solana Wallet Standard wallet을 반환합니다. 지원 client에서 등록된 Android Mobile Wallet Adapter도 포함됩니다.
- `subscribeSolanaWallets(listener)`: Wallet Standard register/unregister event를 구독합니다.
- `adaptSolanaStandardWallet(walletInfo, options?)`: 발견된 Wallet Standard wallet을 `SolanaWallet`으로 adapt합니다.

## Mobile Wallet Helper

- `registerSolanaMobileWallet(options?)`: 지원되는 Android Chrome client에서 Wallet Standard를 통해 Android Mobile Wallet Adapter를 등록합니다.
- `isSolanaMobileWalletSupported()`: 현재 runtime이 Android MWA web registration을 지원하는지 반환합니다.
- `getDefaultMobileWalletAppIdentity()`: 현재 document에서 기본 Mobile Wallet Adapter app identity를 파생합니다.
- `getSolanaIosWallets(options?)`: iOS browser에서 Phantom, Solflare, Backpack iOS browser wallet entry를 반환합니다.
- `adaptSolanaIosWallet(walletInfo, options?)`: iOS deep-link wallet entry를 `SolanaWallet`으로 adapt합니다.
- `handleSolanaIosWalletCallback(options?)`: iOS wallet redirect callback을 validate 및 decrypt합니다.
- `isSolanaIosBrowserWalletSupported()`: 현재 runtime에서 iOS browser wallet link를 노출해야 하는지 반환합니다.

이 helper들은 SSR-safe입니다. Android registration은 `window`가 없거나 browser가 Android Chrome mobile web/PWA runtime이 아니면 등록하지 않고 반환합니다. iOS wallet discovery는 browser가 iOS browser runtime이 아니면 빈 list를 반환합니다.

## Helper

Root `@vue-solana/core` export는 아래 public helper를 다시 export합니다. 더 좁은 import나 명확한 module boundary가 필요하면 direct subpath를 사용하세요.

| Import path                        | 포함 내용                                                               | 사용할 때                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@vue-solana/core/address`         | `parsePublicKey()`와 public-key input type.                             | Solana 주소를 string, `PublicKey`, ref-like object, getter로 받고 정규화된 `PublicKey`가 필요할 때.    |
| `@vue-solana/core/clusters`        | 기본 cluster 및 endpoint helper.                                        | `mainnet-beta`, `testnet`, `devnet`, `localnet`의 built-in RPC 또는 WebSocket endpoint가 필요할 때.    |
| `@vue-solana/core/errors`          | `SolanaError`, error factory, error guard.                              | 지갑, RPC, 주소, 트랜잭션, timeout, storage 실패에 대한 안정적인 error code가 필요할 때.               |
| `@vue-solana/core/ios-wallet`      | iOS browser wallet discovery, deep-link adapter, callback handling.     | Vue plugin의 unified wallet flow 없이 iOS wallet link를 직접 wiring할 때.                              |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter registration helper.                      | Wallet Standard wallet을 읽기 전에 Android MWA를 등록해야 할 때.                                       |
| `@vue-solana/core/rpc`             | `createSolanaConnection()`과 `createSolanaContext()`.                   | Vue plugin 없이 configured `Connection`과 resolved cluster endpoint가 필요할 때.                       |
| `@vue-solana/core/timeout`         | Solana timeout error를 만드는 Promise timeout helper.                   | transaction confirmation helper와 일관된 timeout behavior가 필요할 때.                                 |
| `@vue-solana/core/transaction`     | Transaction send 및 confirmation helper.                                | Wallet-aware send path 또는 기존 signature의 confirmation result가 필요할 때.                          |
| `@vue-solana/core/spl-token`       | SPL Token type reexport (`TokenAccount`, `Mint`, program ID).           | `@solana/spl-token`을 직접 import하지 않고 SPL Token type과 constant가 필요할 때.                      |
| `@vue-solana/core/token-accounts`  | 무상태 SPL Token account helper (`getTokenAccountsByOwner` 등).         | token account를 fetch하거나 unpack하거나, associated token address에서 balance를 파생해야 할 때.       |
| `@vue-solana/core/types`           | 공유 TypeScript type.                                                   | `SolanaConfig`, `SolanaContext`, `SolanaWallet`, wallet metadata, transaction option type이 필요할 때. |
| `@vue-solana/core/wallet`          | Wallet state assertion 및 wallet capability error.                      | 선택된 wallet이 연결되어 있거나 signing을 지원하는지 wallet method 호출 전에 검증해야 할 때.           |
| `@vue-solana/core/wallet-standard` | Wallet Standard chain mapping, discovery, subscription, adapter helper. | Solana Wallet Standard 위에 자체 wallet discovery layer를 만들 때.                                     |

### 클러스터와 RPC

- `DEFAULT_CLUSTER`: 기본 cluster이며 현재 `devnet`입니다.
- `getClusterEndpoint(cluster?)`: cluster의 HTTP RPC endpoint를 반환합니다.
- `getClusterWebSocketEndpoint(cluster?)`: cluster의 WebSocket endpoint를 반환합니다.
- `getWebSocketEndpoint(endpoint)`: `http`/`https` RPC URL을 `ws`/`wss` URL로 변환합니다.
- `createSolanaConnection(config?)`: resolved endpoint와 commitment로 `Connection`을 만듭니다.
- `createSolanaContext(config?)`: 프레임워크 독립 app setup을 위해 `{ cluster, endpoint, wsEndpoint, connection }`을 만듭니다.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.connection.getSlot();
```

### 주소

- `parsePublicKey(value)`: `PublicKey`, 주소 문자열, ref-like value 또는 getter를 파싱하고 nullish input에는 `null`을 반환합니다.

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");
const balance = publicKey ? await connection.getBalance(publicKey) : null;
```

### 지갑

- `isWalletConnected(wallet)`: wallet이 연결되어 있고 public key가 있는지 확인합니다.
- `assertWalletConnected(wallet)`: wallet이 연결되어 있지 않으면 `WALLET_NOT_CONNECTED`를 throw합니다.
- `assertWalletCanSign(wallet)`: wallet이 disconnected이거나 `signTransaction`을 지원하지 않으면 throw합니다.
- `assertWalletCanSignMessage(wallet)`: wallet이 disconnected이거나 `signMessage`를 지원하지 않으면 throw합니다.

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### 트랜잭션

- `signAndSendTransaction(connection, wallet, transaction, options?)`: configured wallet로 transaction에 서명하고 전송한 뒤 RPC signature를 반환합니다. Android Mobile Wallet Adapter wallet은 가능한 경우 `signTransaction`과 `connection.sendRawTransaction()`을 사용해 앱이 제출을 소유하고 wallet handoff 후 RPC signature를 안정적으로 반환하게 합니다.
- `confirmTransactionSignature(connection, signature, options?)`: 제출된 signature가 요청한 commitment에 도달할 때까지 기다립니다. 기본값은 `confirmed` commitment와 60초 timeout입니다.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction);
await confirmTransactionSignature(connection, signature, { commitment: "confirmed" });
```

### SPL Token

- `TOKEN_PROGRAM_ID`와 `TOKEN_2022_PROGRAM_ID`: 원본 SPL Token과 Token-2022 extension의 program ID입니다.
- `TokenAccount` (`Account`의 reexport): `mint`, `owner`, `amount` 및 delegation 필드를 포함한 unpack된 token account state.
- `Mint`: `decimals`, `supply` 및 authority 필드를 포함한 unpack된 mint account state.
- `AccountState`: token account state enum (`Uninitialized`, `Initialized`, `Frozen`).
- `getTokenAccountsByOwner(connection, owner, options?)`: owner의 모든 token account를 fetch 및 unpack합니다. 기본적으로 Token과 Token-2022 program 모두를 쿼리합니다. `programId`를 전달하면 단일 program으로 제한합니다.
- `getTokenAccount(connection, address)`: 단일 token account를 fetch 및 unpack합니다. 계정이 없으면 `null`을 반환합니다.
- `getTokenBalance(connection, mint, owner)`: associated token address를 파생하고, token account와 mint를 fetch한 뒤 `{ amount, decimals }`를 반환합니다. ATA나 mint 계정이 없으면 `null`을 반환합니다.
- `getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve?)`: associated token account address를 결정적으로 파생합니다.
- `unpackAccount(address, accountData)`와 `unpackMint(address, accountData)`: 원시 account data를 typed object로 unpack합니다.

```ts
import { getTokenBalance, TOKEN_PROGRAM_ID } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(connection, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### 오류와 Timeout

- `SolanaError`: 안정적인 `code`와 optional original `cause`가 있는 정규화 error class.
- `createSolanaError(code, message, options?)`: 정규화된 Solana error를 만듭니다.
- `isSolanaError(error)`: unknown error를 `SolanaError`로 narrow합니다.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: unknown failure를 `SolanaError`로 변환하고 일반 wallet rejection을 `USER_REJECTED`로 매핑합니다.
- `withTimeout(promise, timeoutMs, createError)`: promise를 caller-provided timeout error와 race합니다.
- `withSolanaTimeout(promise, timeoutMs, message)`: promise를 `TRANSACTION_TIMEOUT` error와 race합니다.

## 오류 모델

Vue Solana는 일반적인 wallet, RPC, address, transaction, storage failure를 `SolanaError`로 정규화합니다. 앱은 adapter 또는 RPC message를 parsing하지 말고 안정적인 `error.code` 값을 기준으로 분기해야 합니다.

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

안정적인 error code:

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `USER_REJECTED`
- `INVALID_ADDRESS`
- `TRANSACTION_TIMEOUT`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause`는 debugging을 위해 original wallet adapter, RPC, parsing, storage error를 보존합니다. 앱이 해당 source를 명시적으로 신뢰하지 않는 한 raw `cause` detail을 최종 사용자에게 보여 주지 마세요.

## 알려진 TypeScript 이슈

`@solana/web3-compat@0.0.21` TypeScript metadata 문제는 [문제 해결](/ko/troubleshooting)을 참고하세요. 현재 `@vue-solana/core` package는 문서화된 core import path를 위한 임시 declaration shim을 배포합니다.
