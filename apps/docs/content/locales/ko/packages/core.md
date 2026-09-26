---
title: "@vue-solana/core"
description: 프레임워크 독립 Solana 설정, RPC, 지갑 타입, 트랜잭션 helper입니다.
ogSection: 패키지
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core)는 Vue Solana 패키지가 사용하는 프레임워크 독립 Solana primitive를 포함합니다.

Vue plugin을 설치하지 않고 Kit client, endpoint helper, 공유 wallet type, Android Mobile Wallet Adapter 등록 helper, iOS browser wallet helper, token account 읽기, transaction helper를 사용하고 싶을 때 이 package를 직접 사용하세요.

`@vue-solana/core`는 현대적인 [`@solana/kit`](https://www.npmjs.com/package/@solana/kit)을 기반으로 합니다. `createSolanaClient()`와 `@vue-solana/core/kit` subpath는 Kit primitive를 다시 export합니다. legacy `@solana/web3-compat` API와 `web3` subpath는 v2.0.0에서 제거되었습니다 - 전체 before/after 매핑은 [Kit Migration](/ko/guides/kit-migration)을 참고하세요.

## 설치

```sh
pnpm add @vue-solana/core
```

## 빠른 시작

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

Kit client를 직접 만들 수도 있습니다:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()`는 `{ cluster, endpoint, wsEndpoint, client }`를 반환하며, `client`는 `client.rpc`와 `client.rpcSubscriptions`를 갖습니다.

Root export는 계속 지원됩니다. 더 좁은 import에는 direct subpath export도 사용할 수 있습니다.

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Direct subpath:

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

## 관련 가이드

- [RPC와 클러스터](/ko/guides/rpc-and-clusters): cluster name, custom RPC endpoint, WebSocket endpoint, client helper를 설정합니다.
- [지갑](/ko/guides/wallets): Wallet Standard 지갑을 검색하고, mobile wallet source를 등록하고, wallet capability를 확인합니다.
- [트랜잭션](/ko/guides/transactions): transaction을 안전하게 서명, 전송, 확인하고 timeout을 처리합니다.
- [오류](/ko/guides/errors): 안정적인 `SolanaError` code로 분기하고 raw cause를 사용자 UI에서 숨깁니다.

## 설정

```ts
type SolanaCluster = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  payer?: TransactionSigner;
  payerSecretKey?: string;
}
```

지원 cluster는 `mainnet`(이전 별칭 `mainnet-beta`), `testnet`, `devnet`, `localnet`입니다. Wallet helper는 `getSolanaChain()`이 cluster에서 파생하는 `solana:devnet` 같은 Wallet Standard chain identifier를 사용합니다. `endpoint`를 생략하면 선택한 cluster의 공개 Solana RPC endpoint를 사용합니다. `wsEndpoint`를 생략하면 RPC endpoint에서 파생됩니다.

`autoConnect` 기본값은 `false`입니다. Vue plugin 또는 Nuxt module에서 활성화하면 Vue Solana는 사용자가 이전에 선택했고 client에서 다시 discovery된 wallet identity만 reconnect합니다. `localStorage["vue-solana:selected-wallet"]`에는 `name`, 가능한 경우 `platform`/`source` 같은 wallet identity metadata만 저장합니다. private key, session data, transaction data를 저장하지 않으며 임의로 설치된 wallet에 연결하지 않습니다.

`payer`는 client fee payer와 client-sent transaction signer로 사용하는 Kit `TransactionSigner`입니다. `payerSecretKey`는 secret key가 먼저 오는 base64 64-byte Ed25519 keypair이며 client 생성 시 signer로 resolve됩니다. 두 옵션 모두 direct core/Vue client에서 지원됩니다.

`createSolanaClient()`은 기본적으로 `@solana/kit-plugin-rpc`의 official `solanaRpc()`, `rpcTransactionPlanner()`, `rpcTransactionPlanSendingExecutor()` 스택을 compose합니다. 기존 custom fallback sender는 사용하지 않습니다. client는 RPC read/subscription과 `planTransaction(s)`, `sendTransaction(s)`를 노출합니다. official executor는 새 blockhash, resource limit와 preflight 처리, client signer를 이용한 서명, RPC 제출을 수행하고 send가 resolve되기 전에 `confirmed` commitment을 기다립니다. client send에는 `payer` signer가 필요합니다.

Nuxt public runtime config에 raw secret이나 `payerSecretKey`를 넣지 마세요. end-user browser에 funded signing key를 배포하지 말고 server/relayer 경계 또는 demo용 ephemeral signer를 사용하세요.

Solana mainnet에는 `mainnet`을 사용하세요. 이는 Solana의 공식 mainnet 클러스터 이름입니다. 이전 표기법인 `mainnet-beta`는 여전히 허용되며 같은 `https://api.mainnet.solana.com` 엔드포인트로 리다이렉트됩니다.

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client`는 `createSolanaClient()`가 만든 [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) client이며 `client.rpc`, `client.rpcSubscriptions`, `planTransaction(s)`, `sendTransaction(s)`를 노출합니다.

## Wallet Interface

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

Solana Wallet Standard로 발견된 browser wallet과 지원되는 iOS browser wallet link는 이 interface로 adapt됩니다. `SolanaWallet`을 구현한 custom object도 제공할 수 있습니다. 발견된 wallet은 browser extension이 이전 승인 계정을 노출하더라도 `connect()`가 성공할 때까지 disconnected 상태로 유지됩니다.

`publicKey`는 연결된 계정의 base58로 인코딩된 Kit `Address`(string)입니다. `SolanaTransaction`은 `Uint8Array` - wallet이 그대로 서명하는 raw wire transaction byte이며, 첫 번째 byte가 legacy와 versioned transaction을 구분합니다.

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
- `protocol-link`는 향후 가능한 desktop native wallet adapter를 위해 예약되어 있습니다.

## Wallet Standard Helper

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain`은 wallet discovery, mobile wallet registration, iOS wallet link, wallet adapter signing option에서 사용하는 Wallet Standard chain identifier입니다. 설정된 Solana cluster에서 이를 파생해야 하면 `getSolanaChain(cluster)`를 사용하세요.

- `getSolanaChain(cluster)`: `mainnet-beta` 또는 `mainnet`, `devnet`, `testnet`, `localnet`을 Solana Wallet Standard chain ID로 매핑합니다.
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

| Import path                        | 포함 내용                                                                                                           | 사용할 때                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/address`         | `parseAddress()`와 address input type.                                                                              | Solana 주소를 string, ref-like object, getter로 받고 검증되고 정규화된 `Address`가 필요할 때.                  |
| `@vue-solana/core/clusters`        | 기본 cluster 및 endpoint helper.                                                                                    | `mainnet`, `mainnet-beta`, `testnet`, `devnet`, `localnet`의 built-in RPC 또는 WebSocket endpoint가 필요할 때. |
| `@vue-solana/core/errors`          | `SolanaError`, error factory, error guard.                                                                          | 지갑, RPC, 주소, 트랜잭션, timeout, storage 실패에 대한 안정적인 error code가 필요할 때.                       |
| `@vue-solana/core/ios-wallet`      | iOS browser wallet discovery, deep-link adapter, callback handling.                                                 | Vue plugin의 unified wallet flow 없이 iOS wallet link를 직접 wiring할 때.                                      |
| `@vue-solana/core/kit`             | `createSolanaClient()`와 `@solana/kit` re-export(`Address`, `address`, `lamports`, `SolanaRpcApi`, `SolanaClient`). | 전체 `@solana/kit` dependency graph 없이 현대 Kit API를 원할 때.                                               |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter registration helper.                                                                  | Wallet Standard wallet을 읽기 전에 Android MWA를 등록해야 할 때.                                               |
| `@vue-solana/core/rpc`             | `createSolanaContext()`.                                                                                            | Vue plugin 없이 configured Kit client와 resolved cluster endpoint가 필요할 때.                                 |
| `@vue-solana/core/timeout`         | Solana timeout error를 만드는 Promise timeout helper.                                                               | transaction confirmation helper와 일관된 timeout behavior가 필요할 때.                                         |
| `@vue-solana/core/transaction`     | Transaction send 및 confirmation helper.                                                                            | Wallet-aware send path 또는 기존 signature의 confirmation result가 필요할 때.                                  |
| `@vue-solana/core/token-accounts`  | 무상태 SPL Token account 읽기(`getTokenAccountsByOwner`, `getTokenAccount`, `getTokenBalance`).                     | Kit RPC `jsonParsed` API를 통해 token account 또는 balance 읽기가 필요할 때.                                   |
| `@vue-solana/core/types`           | 공유 TypeScript type.                                                                                               | `SolanaConfig`, `SolanaContext`, `SolanaWallet`, wallet metadata, transaction option type이 필요할 때.         |
| `@vue-solana/core/wallet`          | Wallet state assertion 및 wallet capability error.                                                                  | 선택된 wallet이 연결되어 있거나 signing을 지원하는지 wallet method 호출 전에 검증해야 할 때.                   |
| `@vue-solana/core/wallet-standard` | Wallet Standard chain mapping, discovery, subscription, adapter helper.                                             | Solana Wallet Standard 위에 자체 wallet discovery layer를 만들 때.                                             |

### 클러스터와 RPC

- `DEFAULT_CLUSTER`: 기본 cluster이며 현재 `devnet`입니다.
- `getClusterEndpoint(cluster?)`: cluster의 HTTP RPC endpoint를 반환합니다.
- `getClusterWebSocketEndpoint(cluster?)`: cluster의 WebSocket endpoint를 반환합니다.
- `getWebSocketEndpoint(endpoint)`: `http`/`https` RPC URL을 `ws`/`wss` URL로 변환합니다.
- `createSolanaClient(config?)`: resolved endpoint와 WebSocket subscription에 `rpc`가 연결된 `@solana/kit` client를 만들고, official planner와 transaction-sending executor를 기본적으로 설치합니다.
- `createSolanaContext(config?)`: 프레임워크 독립 app setup을 위해 `{ cluster, endpoint, wsEndpoint, client }`을 만듭니다.

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

`createSolanaContext`에 해당하는 예시:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

`@vue-solana/core/kit` subpath는 대부분의 앱이 `@solana/kit`에서 필요한 모든 것을 직접 설치하지 않고 export합니다:

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)`: 주어진 `SolanaConfig`로 Kit client를 만듭니다. `clusters.ts` endpoint resolution을 재사용하고 resolved WebSocket endpoint에서 `rpcSubscriptionsUrl`을 연결하며 official transaction planner와 RPC transaction-sending executor를 기본적으로 설치합니다.
- `client.rpc`는 전체 Solana read API(`getSlot`, `getBalance`, `getBlockHeight`, `getSignatureStatuses` 등)를 `.send()`로 호출하는 RPC function으로 노출합니다.
- `address(value)`: `Address`(base58 string brand)를 검증하고 반환합니다 - `new PublicKey(...)`의 Kit 대체입니다.
- `lamports(value: bigint)`: `Lamports` 값을 반환합니다 - raw lamport number의 Kit 대체입니다.
- Types: `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`.

RPC numeric result는 `bigint`이고, account data는 `Buffer`가 아니라 `Uint8Array`입니다. 자세한 내용은 [Kit Migration](/ko/guides/kit-migration)을 참고하세요.

### Actions

`createSolanaActionStore()`는 호출마다 새 `AbortSignal`을 받는 비동기 함수를 abort-on-redispatch 방식의 상태 머신으로 감쌉니다. Vue composable `useAction()`이 이 store 위에 구축되어 있고, `isSolanaActionAborted()`는 취소되거나 대체된 호출을 감지합니다.

### 주소

- `parseAddress(value)`: address string, ref-like value 또는 getter를 파싱하고 nullish input에는 `null`을 반환합니다. 유효하지 않은 base58 string에는 `INVALID_ADDRESS`를 throw합니다. `Address` 값은 그대로 받아들입니다.

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
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

- `signAndSendTransaction(client, wallet, transaction, options?)`: configured wallet로 raw wire transaction byte에 서명하고 전송한 뒤 RPC signature를 반환합니다. `signAndSendTransaction`을 노출하는 wallet은 해당 기능에 위임되고, 그렇지 않으면 트랜잭션은 `wallet.signTransaction`으로 서명된 뒤 `client.rpc.sendTransaction(...).send()`로 제출됩니다. Android Mobile Wallet Adapter wallet은 앱이 제출을 소유하고 wallet handoff 후 RPC signature를 안정적으로 반환할 수 있도록 서명과 app-side RPC 제출을 선호합니다.
- `confirmTransactionSignature(client, signature, options?)`: 제출된 signature가 요청한 commitment에 도달할 때까지 기다립니다. 기본값은 `confirmed` commitment, 60초 timeout, `client.rpc.getSignatureStatuses([signature]).send()` 폴링입니다.

wallet-aware helper와 client-sent flow는 별개입니다. client는 `createSolanaClient()`가 설치한 official `rpcTransactionPlanSendingExecutor()`를 통해 `sendTransaction()`과 `sendTransactions()`를 노출하고 Vue composable이 이 method들을 감쌉니다. plan, sign, submit 후 `confirmed` commitment을 기다리며, send-and-confirm가 완료된 뒤에만 `sent` 상태가 됩니다. 단일 결과의 `data.context.signature`에서 제출된 signature를 확인할 수 있고, batch 결과에는 전체 plan result tree가 포함됩니다. official sender는 wallet popup을 표시하지 않습니다.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL Token

Token 읽기는 Kit RPC `jsonParsed` API를 사용합니다 - `@solana/spl-token` dependency가 없습니다.

- `getTokenAccountsByOwner(client, owner, options?)`: owner의 모든 SPL Token 및 Token-2022 account를 `TokenAccountInfo[]`(`{ address, mint, owner, amount: bigint, decimals, state, isNative }`)로 반환합니다. `programId`를 전달하면 단일 program으로 제한합니다.
- `getTokenAccount(client, address, commitment?)`: 단일 parsed token account(`TokenAccountInfo | null`)를 반환합니다. account가 없거나 token account가 아니면 `null`을 반환합니다.
- `getTokenBalance(client, mint, owner, commitment?)`: 주어진 mint에 대한 owner의 token account를 읽고 `{ amount, decimals }`를 반환합니다. token account가 없으면 `null`을 반환합니다.

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
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

## Buffer Polyfill

Solana transaction을 직렬화하는 browser code는 Node 호환 `Buffer` global이 필요할 수 있습니다. transaction code 전에 `@vue-solana/core/buffer-polyfill`의 `installSolanaBufferPolyfill()`로 초기화하세요. 남은 유일한 package-owned type shim은 이 polyfill이 import하는 browser `buffer/` subpath를 다룹니다.
