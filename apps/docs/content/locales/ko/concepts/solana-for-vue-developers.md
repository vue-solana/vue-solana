---
title: Vue 개발자를 위한 Solana
description: Vue와 Nuxt 개발자를 위한 실용적인 Solana 개념입니다.
ogSection: 개념
surroundOrder: 5
---

이 페이지는 Vue Solana 패키지를 사용할 때 보게 되는 Solana 용어를 설명합니다. 완전한 이론서가 아니라 실용적인 안내입니다.

공식 참고 자료:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Transactions](https://solana.com/docs/core/transactions)

## Connection과 RPC

프런트엔드 앱은 RPC 엔드포인트를 통해 Solana 데이터를 읽습니다. `@vue-solana/vue/web3`와 `@vue-solana/nuxt/web3`는 해당 엔드포인트로 요청을 보내는 지원 `Connection` 클래스를 노출합니다.

Vue Solana 패키지는 Vue와 Nuxt 코드가 같은 클러스터, 엔드포인트, commitment, 지갑 상태를 공유할 수 있도록 이 connection을 만들고 제공합니다.

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## 공개 키와 주소

공개 키는 Solana 계정 주소입니다. 프런트엔드 앱에서 공개 키를 보여 주는 것은 안전합니다.

```ts
import { PublicKey } from "@vue-solana/vue/web3";

const publicKey = new PublicKey("PASTE_A_SOLANA_ADDRESS");
```

프런트엔드 코드에 private key, seed phrase, secret key 배열을 절대 노출하지 마세요.

## Lamports와 SOL

SOL은 Solana의 네이티브 토큰입니다. Lamport는 SOL의 가장 작은 단위입니다.

```txt
1 SOL = 1,000,000,000 lamports
```

RPC 잔액 메서드는 lamports를 반환합니다. SOL 변환은 표시용으로만 하세요.

```ts
const lamports = await connection.getBalance(publicKey);
const sol = lamports / 1_000_000_000;
```

## 지갑

지갑은 키를 보관하고 트랜잭션에 서명합니다. 브라우저 확장 지갑에는 Phantom, Solflare, Backpack이 있습니다. Android native mobile wallet은 지원되는 Android Chrome 런타임에서 Solana Mobile Wallet Adapter를 통해 연결할 수 있습니다. Phantom, Solflare, Backpack은 wallet-specific universal link를 통해 iOS 브라우저에서도 연결할 수 있습니다.

Vue Solana는 통합 `useWallets()` 플로를 통해 Solana Wallet Standard 브라우저 확장 지갑, Android Mobile Wallet Adapter 지갑, 지원되는 iOS 브라우저 지갑 링크를 검색합니다. RPC 읽기와 잔액 읽기는 지갑 없이 동작합니다. 연결, 서명, 트랜잭션 전송에는 검색된 지갑 또는 `SolanaWallet` 인터페이스를 구현한 커스텀 객체가 필요합니다.

현재 지원 상태와 desktop native wallet의 post-v1 상태는 [지갑](/guides/wallets)을 참고하세요.

## 트랜잭션과 서명

트랜잭션은 Solana 상태를 변경하는 instruction 묶음입니다. 예를 들어 SOL 전송, 계정 생성, 프로그램 호출이 있습니다.

서명은 지갑 소유자가 트랜잭션을 승인했음을 증명합니다. 프런트엔드 앱은 사용자의 지갑에 서명을 요청해야 하며 private key를 보관해서는 안 됩니다.

## Commitment 레벨

Commitment는 반환 데이터가 어느 정도 final 상태여야 하는지 제어합니다.

- `processed`: 가장 빠르지만 finality가 가장 낮습니다.
- `confirmed`: 대부분의 앱 UI 읽기에 좋은 기본값입니다.
- `finalized`: 가장 느리지만 finality가 가장 높습니다.

예시:

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

공식 참고 자료: [Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## 안전 원칙

- 빌드와 테스트 중에는 `devnet`을 사용하세요.
- 개발용으로 실제 자금이 있는 지갑을 사용하지 마세요.
- 프런트엔드 앱에 private key를 하드코딩하지 마세요.
- 실제 SOL과 프로덕션 프로그램을 다룰 준비가 되었을 때만 `mainnet-beta`를 사용하세요.
