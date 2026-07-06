---
title: 오류
description: Vue Solana의 정규화된 SolanaError 코드와 사용자 친화적인 오류 처리 방법입니다.
ogSection: 가이드
surroundOrder: 13
---

Vue Solana는 지갑, RPC, 주소, 트랜잭션, timeout, storage 실패를 안정적인 오류 코드로 정규화합니다. UI는 raw error 문자열 대신 안정적인 코드에 따라 분기하는 것이 좋습니다.

## SolanaError 형태

```ts
interface SolanaError extends Error {
  code: string;
  cause?: unknown;
}
```

`cause`는 디버깅에 유용하지만 사용자에게 그대로 보여 주지 마세요.

## Core에서 처리

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await send();
} catch (error) {
  if (isSolanaError(error)) {
    console.info(error.code);
  }
}
```

## Vue/Nuxt 상태

컴포저블은 일반적으로 `error` ref를 제공합니다.

```ts
const { error, loading } = useSolanaBalance(address);
```

오류 ref를 UI 메시지로 매핑하세요.

## 사용자 메시지

- 주소 오류: "유효한 Solana 주소를 입력하세요."
- 지갑 미연결: "먼저 지갑을 연결하세요."
- 기능 미지원: "선택한 지갑은 이 기능을 지원하지 않습니다."
- 사용자 거절: "지갑에서 요청이 취소되었습니다."
- 네트워크 오류: "RPC 요청에 실패했습니다. 잠시 후 다시 시도하세요."

## 재시도 지침

읽기 요청은 재시도할 수 있지만, 쓰기 작업은 중복 제출 위험이 있습니다. 트랜잭션 제출 후에는 signature 상태를 확인하고, 사용자가 명확히 요청할 때만 다시 제출하세요.
