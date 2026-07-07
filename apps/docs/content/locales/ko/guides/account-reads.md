---
title: "계정 읽기"
description: Vue 또는 Nuxt에서 잔액, 계정 데이터, 프로그램 계정, 서명 상태를 안전하게 읽습니다.
ogSection: 가이드
surroundOrder: 10
---

Vue Solana는 일반적인 Solana 읽기 경로를 위한 컴포저블을 제공합니다. 잔액, 계정 정보, 프로그램 계정, 서명 상태를 읽을 수 있습니다.

트랜잭션 서명 없이 체인 상태를 읽어야 할 때 이 가이드를 사용하세요.

## 주소 파싱

프레임워크와 무관한 코드에서는 `parsePublicKey()`로 Solana 주소를 정규화할 수 있습니다.

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");

if (publicKey) {
  const balance = await connection.getBalance(publicKey);
}
```

`parsePublicKey()`는 `PublicKey`, 주소 문자열, ref 형태 객체, getter, `null`, `undefined`를 받을 수 있습니다. 잘못된 주소 문자열은 `INVALID_ADDRESS`를 throw합니다.

## Vue에서 잔액 읽기

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## 계정 정보 읽기

단일 계정에는 `useAccountInfo()`를 사용합니다. 계정 변경을 실시간으로 받아야 하면 `watch`를 활성화하세요.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});
</script>
```

`watch: true`를 활성화하면 Vue Solana가 컴포넌트 unmount 시 WebSocket listener를 자동으로 제거합니다. 현재 listener를 더 일찍 제거하고 해당 컴포저블 인스턴스에서 자동 재시작을 막으려면 `stopWatching()`을 호출하세요.

## 프로그램 계정 읽기

프로그램 id가 소유한 계정에는 `useProgramAccounts()`를 사용합니다.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> 경고: 프로그램 계정 스캔은 비용이 클 수 있습니다. 프로덕션 읽기에는 좁은 필터, `dataSlice`, 캐싱, 페이지네이션, 인덱싱 또는 전용 RPC 인프라를 사용하세요.

## 서명 상태 읽기

알려진 트랜잭션 서명을 추적하려면 `useSignatureStatus()`를 사용합니다.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, confirmationStatus, error, refresh } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

짧게 표시되는 진행 UI에는 polling을 사용할 수 있습니다. 트래픽이 많은 페이지에서 무기한 polling하지 마세요.

## Nuxt 자동 Import

Nuxt는 같은 읽기 helper를 자동 import 컴포저블로 노출합니다.

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Nuxt 컴포저블은 SSR 중 호출할 수 있으며 hydration으로 실제 client context가 제공될 때까지 inert state를 반환합니다. 브라우저 전용 context에 의존하는 데이터의 네트워크 refresh는 client lifecycle hook 또는 사용자 액션에서 실행하세요.

## Null 및 잘못된 입력

주소, 프로그램 id 또는 서명이 `null`이면 읽기 컴포저블은 RPC를 호출하지 않고 state를 비웁니다.

잘못된 주소 문자열은 오래된 데이터를 지우고 `error`를 설정하며 RPC 메서드를 호출하지 않습니다. 사용자에게 보여 줄 메시지는 `error.value.code`를 기준으로 분기하세요.

## RPC 비용 체크리스트

- 가능하면 직접 단일 계정 읽기를 선호하세요.
- 프로그램 계정 스캔에는 필터를 사용하세요.
- 계정 데이터 일부만 필요하면 `dataSlice`를 사용하세요.
- landing page 또는 모든 route navigation에서 broad scan을 실행하지 마세요.
- 공개 RPC endpoint에서 공격적인 polling interval을 피하세요.
- 많은 사용자가 반복 요청할 데이터는 캐시하거나 인덱싱하세요.
