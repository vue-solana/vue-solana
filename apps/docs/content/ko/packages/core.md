---
title: "@vue-solana/core"
description: 프레임워크에 독립적인 Solana 설정, RPC, 지갑 타입, 트랜잭션 헬퍼입니다.
ogSection: 패키지
surroundOrder: 14
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core)는 Vue Solana 패키지가 사용하는 프레임워크 독립 Solana primitive를 제공합니다.

Vue 플러그인을 설치하지 않고 connection helper, 공유 지갑 타입, Android Mobile Wallet Adapter 등록 helper, iOS browser wallet helper, 트랜잭션 helper가 필요할 때 직접 사용하세요.

`@vue-solana/core`는 `@solana/web3-compat`를 감싸며 `Connection`, `PublicKey`, `Transaction`, `VersionedTransaction` 같은 Solana primitive를 다시 export합니다.

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

root export는 계속 지원됩니다. 더 좁은 import를 위해 direct subpath도 사용할 수 있습니다.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import { PublicKey, Transaction } from "@vue-solana/core/web3";
import type { SolanaConfig } from "@vue-solana/core/types";
```

## 주요 subpath

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

## 관련 가이드

- [RPC와 클러스터](/ko/guides/rpc-and-clusters)
- [지갑](/ko/guides/wallets)
- [트랜잭션](/ko/guides/transactions)
- [오류](/ko/guides/errors)

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

`endpoint`를 생략하면 선택한 클러스터의 공개 Solana RPC endpoint를 사용합니다. `wsEndpoint`를 생략하면 RPC endpoint에서 파생됩니다. `autoConnect`는 기본값이 `false`이며, 이전에 사용자가 선택한 지갑 identity metadata만 저장합니다.

## Context

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  connection: Connection;
}
```

## Wallet interface

```ts
interface SolanaWallet {
  publicKey: PublicKey | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
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

Browser Wallet Standard 지갑, 지원 iOS wallet link, Android Mobile Wallet Adapter 지갑은 이 인터페이스로 adapt됩니다. 직접 `SolanaWallet` 객체를 제공할 수도 있습니다.

## Wallet metadata

브라우저 확장 지갑은 `platform: "browser"`, Android MWA는 `platform: "mobile"`과 `source: "mobile-wallet-adapter"`, iOS 링크는 `platform: "mobile"`과 `source: "deep-link"`를 사용합니다. `protocol-link`는 향후 desktop native wallet adapter를 위해 예약되어 있습니다.

## Helper 요약

- `parsePublicKey(value)`: 주소 문자열, `PublicKey`, ref-like 값, getter를 파싱합니다.
- `getClusterEndpoint(cluster?)`: HTTP RPC endpoint를 반환합니다.
- `getClusterWebSocketEndpoint(cluster?)`: WebSocket endpoint를 반환합니다.
- `createSolanaConnection(config?)`: `Connection`을 만듭니다.
- `createSolanaContext(config?)`: `SolanaContext`를 만듭니다.
- `getSolanaChain(cluster)`: Wallet Standard chain id를 반환합니다.
- `getRegisteredSolanaWallets()`: 등록된 Solana Wallet Standard 지갑을 반환합니다.
- `registerSolanaMobileWallet(options?)`: 지원 Android 환경에서 MWA를 등록합니다.
- `getSolanaIosWallets(options?)`: iOS browser wallet entry를 반환합니다.
- `signAndSendTransaction(wallet, transaction, connection)`: 지갑을 사용해 트랜잭션을 서명하고 전송합니다.

## 알려진 TypeScript 이슈

현재 `@solana/web3-compat@0.0.21`에는 root declaration metadata 문제가 있습니다. Vue Solana 패키지는 문서화된 import 경로에 필요한 임시 shim을 포함합니다. 앱에서 `@solana/web3-compat`를 직접 import하지 않는 한 보통 별도 shim이 필요하지 않습니다.
