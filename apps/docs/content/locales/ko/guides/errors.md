---
title: "오류"
description: core helper와 Vue/Nuxt 컴포저블에서 정규화된 Solana 오류를 처리합니다.
ogSection: 가이드
surroundOrder: 13
---

Vue Solana는 일반적인 지갑, RPC, 주소, 트랜잭션, timeout, storage 실패를 `SolanaError`로 정규화합니다.

UI 판단에는 안정적인 `error.code` 값을 사용하세요. `error.cause`는 debugging과 log용으로 보관합니다.

## 오류 형태

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError`에는 다음이 포함됩니다.

- `code`: 안정적인 machine-readable 오류 코드.
- `message`: 사람이 읽을 수 있는 developer message.
- `cause`: 지갑, RPC 호출, parser, timeout, storage 작업에서 온 원본 오류.
- `feature`: 지원되지 않는 capability 오류에 대한 선택적 wallet feature 이름.

## 안정적인 오류 코드

- `NO_WALLET_SELECTED`: 활성 지갑이 선택되지 않았습니다.
- `WALLET_NOT_CONNECTED`: 활성 지갑이 연결되어 있지 않거나 public key가 없습니다.
- `WALLET_FEATURE_UNSUPPORTED`: 활성 지갑이 요청한 feature를 지원하지 않습니다.
- `USER_REJECTED`: 사용자가 지갑 요청을 거절했습니다.
- `INVALID_ADDRESS`: 주소 문자열을 Solana public key로 파싱할 수 없습니다.
- `TRANSACTION_TIMEOUT`: 트랜잭션 관련 작업이 timeout되었습니다.
- `RPC_FAILURE`: RPC send, read, confirmation이 실패했습니다.
- `STORAGE_FAILURE`: 브라우저 storage를 읽거나 쓸 수 없습니다.

## Core 오류 처리

알 수 없는 실패를 catch할 때는 `isSolanaError()`를 사용하세요.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(connection, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    console.log(error.code);
    console.debug(error.cause);
  }
}
```

Vue Solana의 오류 모델을 따르는 프레임워크 독립 helper를 직접 작성할 때는 `normalizeSolanaError()`를 사용하세요.

```ts
import { normalizeSolanaError } from "@vue-solana/core/errors";

async function loadData() {
  try {
    return await connection.getLatestBlockhash();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE", "Unable to load blockhash");
  }
}
```

`normalizeSolanaError()`는 일반적인 wallet rejection 형태를 `USER_REJECTED`로 매핑합니다.

## Vue Error Refs

Vue 컴포저블은 `error` ref를 노출합니다.

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load data from RPC.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
</script>
```

## Nuxt Error Refs

Nuxt 자동 import 컴포저블도 같은 오류 모델을 노출합니다.

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## 사용자에게 보여 줄 메시지

앱이 해당 source를 명시적으로 신뢰하지 않는 한 raw `cause` details를 최종 사용자에게 직접 보여 주지 마세요. 지갑과 RPC 오류 메시지는 provider별 문구를 포함할 수 있어 UI에서 혼란스럽거나 안전하지 않을 수 있습니다.

대신 안정적인 error code를 짧은 앱별 메시지로 매핑하세요.

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "Request canceled.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support that action.";
    case "RPC_FAILURE":
      return "Network request failed. Try again.";
    default:
      return "Something went wrong.";
  }
}
```

## 재시도 지침

- `RPC_FAILURE`는 작업을 반복해도 안전할 때만 재시도하세요.
- `TRANSACTION_TIMEOUT` 후에는 재시도하기 전에 signature status를 확인하세요.
- `USER_REJECTED`는 자동으로 재시도하지 마세요.
- `INVALID_ADDRESS`는 재시도하지 말고 사용자에게 입력을 수정하게 하세요.
- `WALLET_FEATURE_UNSUPPORTED`를 만드는 action은 숨기거나 비활성화하세요.
