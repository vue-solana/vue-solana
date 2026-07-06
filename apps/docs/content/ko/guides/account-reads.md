---
title: 계정 읽기
description: Vue Solana에서 주소를 파싱하고 잔액, 계정 정보, 프로그램 계정을 읽습니다.
ogSection: 가이드
surroundOrder: 10
---

Solana 계정 읽기는 지갑 연결 없이도 가능합니다. 필요한 것은 올바른 클러스터와 RPC connection, 그리고 유효한 공개 키입니다.

## 주소 파싱

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey(address);
```

입력이 비어 있거나 잘못된 주소면 `null`을 반환합니다. 사용자 입력은 RPC 호출 전에 검증하세요.

## 잔액 읽기

Vue에서는 `useBalance()`를 사용합니다.

```ts
const address = ref("");
const { balance, sol, refresh, loading, error } = useBalance(address);
```

Nuxt에서는 자동 import된 `useSolanaBalance()`를 사용할 수 있습니다.

```ts
const { balance, sol, refresh } = useSolanaBalance(address);
```

## 직접 계정 정보 읽기

```ts
const { connection } = useRpc();
const accountInfo = await connection.getAccountInfo(publicKey);
```

`null`은 계정이 없거나 해당 클러스터에 존재하지 않음을 의미할 수 있습니다.

## 프로그램 계정 읽기

```ts
const accounts = await connection.getProgramAccounts(programId);
```

큰 프로그램에서는 필터와 data slicing을 사용하고, 공개 RPC rate limit을 고려하세요.

## 서명 상태 읽기

```ts
const status = await connection.getSignatureStatus(signature);
```

트랜잭션 제출 후 상태 확인 또는 사용자에게 진행 상황을 표시할 때 유용합니다.

## RPC 비용 체크리스트

- 입력 주소가 바뀔 때만 요청하세요.
- 반복 polling에는 지수 backoff 또는 명시적 refresh 버튼을 고려하세요.
- 공개 RPC에서 큰 `getProgramAccounts` 호출을 남발하지 마세요.
- 사용자에게 raw RPC 오류 대신 정규화된 메시지를 표시하세요.
