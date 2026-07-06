---
title: 트랜잭션
description: Vue Solana에서 트랜잭션을 서명, 전송, 확인하고 오류를 처리합니다.
ogSection: 가이드
surroundOrder: 11
---

트랜잭션은 Solana 상태를 변경합니다. 앱은 트랜잭션을 만들고, 지갑은 사용자의 승인을 받은 뒤 서명하며, 앱은 RPC로 제출하고 confirmation을 기다립니다.

## Core helper

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(wallet, transaction, connection);
```

지갑이 연결되어 있고 필요한 signing capability를 지원하는지 먼저 확인하세요.

## Devnet 전송 예

```ts
import { PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@vue-solana/vue/web3";

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(recipient),
    lamports: 0.001 * LAMPORTS_PER_SOL,
  }),
);
```

devnet에서 먼저 테스트하고, 아주 작은 금액으로 시작하세요.

## Vue에서 전송

```ts
const { send, signature, loading, error } = useSignAndSendTransaction();

await send(transaction);
```

## Nuxt에서 전송

```ts
const { send, signature, loading, error } = useSolanaSignAndSendTransaction();
```

## 확인과 Explorer

서명이 제출되면 confirmation을 기다리고 Explorer 링크를 제공할 수 있습니다.

```ts
const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
```

## 일반 트랜잭션 상태

`useTransaction()`은 임의의 async handler에 대해 loading, error, signature 상태를 관리하는 데 사용할 수 있습니다.

```ts
const { execute, loading, error, signature } = useTransaction(async () => {
  return await runTransaction();
});
```

## 오류 처리

- 사용자가 승인을 거절할 수 있습니다.
- 지갑이 기능을 지원하지 않을 수 있습니다.
- RPC가 rate limit 또는 네트워크 오류를 반환할 수 있습니다.
- confirmation timeout이 발생할 수 있습니다.

사용자에게는 안전하고 이해 가능한 메시지를 보여 주고, 디버깅 세부 정보는 로깅 경계에서 다루세요.

## 안전 체크리스트

- 클러스터를 명확히 표시합니다.
- 수신자 주소와 금액을 확인시킵니다.
- mainnet 전송 전에 별도 확인 단계를 둡니다.
- private key를 앱에서 절대 다루지 않습니다.
- 테스트와 문서 예제는 devnet을 기본값으로 둡니다.
