---
title: RPC와 클러스터
description: Solana 클러스터, RPC 엔드포인트, WebSocket 엔드포인트, client helper를 설정합니다.
ogSection: 가이드
surroundOrder: 8
---

Vue Solana는 `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt` 전반에서 클러스터와 엔드포인트 설정을 공유합니다.

클러스터를 선택하거나, 커스텀 RPC 엔드포인트를 제공하거나, RPC 컴포저블이 무엇을 노출하는지 이해해야 할 때 이 가이드를 사용하세요.

## 클러스터 이름

지원되는 클러스터 이름은 다음과 같습니다.

- `devnet`
- `testnet`
- `mainnet`
- `mainnet-beta` (`mainnet`의 이전 별칭)
- `localnet`

Solana mainnet에는 `mainnet`을 사용하세요. 이는 Solana의 공식 mainnet 클러스터 이름입니다. 이전 표기법인 `mainnet-beta`는 여전히 허용되며 같은 엔드포인트로 리다이렉트됩니다.

예제와 개발에 가장 안전한 클러스터이므로 `devnet`이 기본값입니다.

## Core 설정

프레임워크에 독립적인 client 설정이 필요하면 `@vue-solana/core/rpc`를 사용하세요.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

`createSolanaContext()`는 resolved `cluster`, HTTP `endpoint`, WebSocket `wsEndpoint`, 그리고 RPC 요청을 보내는 `rpc`를 가진 Kit `client`를 반환합니다.

## 커스텀 RPC 엔드포인트

프로덕션 앱은 일반적으로 public cluster endpoint 대신 전용 RPC provider를 사용해야 합니다.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

`wsEndpoint`를 생략하면 Vue Solana는 HTTP 엔드포인트에서 `https`를 `wss`로, `http`를 `ws`로 변환해 WebSocket 엔드포인트를 파생합니다.

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Vue 설정

앱 시작 지점 근처에서 Vue 플러그인을 한 번 설치하세요.

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      commitment: "confirmed",
    }),
  )
  .mount("#app");
```

그런 다음 컴포넌트에서 `useRpc()`로 RPC 상태를 읽습니다.

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, latestBlockhash, error, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">Unable to reach RPC.</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Nuxt 설정

`nuxt.config.ts`에서 모듈을 설정합니다.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt는 모듈 옵션을 public runtime config에 저장하므로 옵션은 JSON 직렬화가 가능해야 합니다. Nuxt module은 `payer`와 `payerSecretKey`를 의도적으로 제외하므로 public runtime config에 raw secret을 넣지 마세요. ephemeral `payer`는 client-only plugin에서 만들고 `clientPlugin: false`를 설정한 뒤 Vue plugin을 install하세요.

direct core와 Vue client는 `createSolanaClient()` / `createSolanaPlugin()`에 `payer` 또는 `payerSecretKey`를 전달할 수 있습니다. default client는 client-sent transaction에 official `solanaRpc()`, `rpcTransactionPlanner()`, `rpcTransactionPlanSendingExecutor()` 구성을 사용합니다.

Nuxt 페이지와 컴포넌트에서는 자동 import되는 `useSolanaRpc()` 컴포저블을 사용하세요.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

Nuxt runtime plugin은 client-only입니다. 컴포저블은 SSR 중에도 호출할 수 있지만, 지갑과 RPC 작업은 client lifecycle hook 또는 사용자 액션에서 트리거해야 합니다.

## 엔드포인트 헬퍼

클라이언트를 만들지 않고 built-in 엔드포인트 값을 가져와야 할 때는 `@vue-solana/core/clusters`를 사용하세요.

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## 프로덕션 메모

- 프로덕션 트래픽에는 전용 RPC provider를 선호하세요.
- Public RPC endpoint에서 광범위하거나 빈번한 scan을 피하세요.
- WebSocket subscription은 의도적으로 사용하고 더 이상 필요하지 않을 때 항상 정리하세요.
- RPC 응답을 신뢰할 수 없는 입력으로 취급하고, 누락되거나 오래되었거나 실패한 데이터를 처리하세요.
