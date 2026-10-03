---
title: "계정 읽기"
description: Vue 또는 Nuxt에서 잔액, 계정 데이터, 프로그램 계정, 서명 상태를 안전하게 읽습니다.
ogSection: 가이드
surroundOrder: 9
---

Vue Solana는 일반적인 Solana 읽기 경로를 위한 컴포저블을 제공합니다. 잔액, 계정 정보, 프로그램 계정, 서명 상태를 읽을 수 있습니다.

트랜잭션 서명 없이 체인 상태를 읽어야 할 때 이 가이드를 사용하세요.

## 주소 파싱

프레임워크와 무관한 코드에서는 `parseAddress()`로 Solana 주소를 정규화할 수 있습니다.

```ts
import { parseAddress } from "@vue-solana/core/address";
import { createSolanaClient } from "@vue-solana/core/kit";

const address = parseAddress("11111111111111111111111111111111");

if (address) {
  const client = createSolanaClient({ cluster: "devnet" });
  const { value: lamports } = await client.rpc.getBalance(address).send();
}
```

`parseAddress()`는 `Address`, 주소 문자열, ref 형태 객체, getter, `null`, `undefined`를 받을 수 있습니다. 잘못된 주소 문자열은 `INVALID_ADDRESS`를 throw합니다.

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

단일 계정에는 `useAccountInfo()`를 사용합니다.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh } = useAccountInfo(address, {
  commitment: "confirmed",
});
</script>
```

컴포저블은 정규화된 계정 데이터(`executable`, `lamports`, `owner`, `space`, 디코딩된 `data` 바이트)를 반환하며, 주소가 `null`이 되거나 잘못되면 오래된 state를 비웁니다. 필요할 때 계정을 다시 읽으려면 `refresh()`를 호출하세요.

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
const { status, error, refresh, stopPolling } = useSignatureStatus(signature, {
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

잘못된 주소 문자열은 오래된 데이터를 지우고 `error`를 설정하며 RPC 메서드를 호출하지 않습니다. 사용자에게 보여 줄 메시지는 `error.value.code`를 기준으로 분기하세요. 파싱할 수 없는 주소는 `INVALID_ADDRESS`를 보고합니다.

## refresh와 에러 의미

`useBalance`, `useAccountInfo`, `useProgramAccounts`, `useTokenAccounts`, `useTokenBalance`는 하나의 상태 머신을 공유하므로 세 가지 경우에 동일하게 동작합니다.

**`refresh()`는 거부합니다. 실패해도 resolve하지 않습니다.** 성공하면 새 값으로 resolve하고, 입력이 비어 있으면 `null`로 resolve하며, 그 외에는 정규화된 `SolanaError`와 함께 거부합니다. Vue가 거부를 삼키므로 `@click="refresh"`만 쓰는 것은 괜찮지만, 직접 작성한 코드는 처리해야 합니다:

```ts
// 거부된 promise에는 에러 상태가 없으므로 이건 쓸모가 없습니다.
await refresh();

// await 하고 보고합니다.
try {
  await refresh();
} catch (cause) {
  console.error(cause);
}
```

`useRequest()`만 예외입니다. 이 컴포저블의 `refresh()`는 거부하는 대신 시도 결과로 resolve합니다.

**읽기가 실패하면 데이터가 빈 값으로 되돌아갑니다.** 이전에 읽어둔 잔액이 새 에러 옆에 남아 있으면 최신 데이터처럼 보이므로 남겨 두지 않습니다. 무엇을 렌더링할지는 `error`로 분기하세요:

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="errorMessage" />
  <p v-else-if="loading">불러오는 중…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

**`useTokenBalance`의 결과는 읽기 전용입니다.** `balance`과 `decimals`은 한 번의 읽기에서 파생된 계산 ref입니다. 읽기만 하세요. 대입해도 효과가 없습니다.

## RPC 비용 체크리스트

- 가능하면 직접 단일 계정 읽기를 선호하세요.
- 프로그램 계정 스캔에는 필터를 사용하세요.
- 계정 데이터 일부만 필요하면 `dataSlice`를 사용하세요.
- landing page 또는 모든 route navigation에서 broad scan을 실행하지 마세요.
- 공개 RPC endpoint에서 공격적인 polling interval을 피하세요.
- 많은 사용자가 반복 요청할 데이터는 캐시하거나 인덱싱하세요.
