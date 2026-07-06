---
title: RPC와 클러스터
description: Vue Solana에서 클러스터, RPC 엔드포인트, connection helper를 설정합니다.
ogSection: 가이드
surroundOrder: 8
---

RPC는 앱이 Solana 클러스터와 통신하는 경로입니다. Vue Solana는 클러스터 이름, HTTP RPC 엔드포인트, WebSocket 엔드포인트를 일관되게 설정하도록 돕습니다.

## 클러스터 이름

지원 값은 `mainnet-beta`, `devnet`, `testnet`, `localnet`입니다. 개발 중에는 `devnet`을 사용하고, 실제 자산을 다룰 준비가 되었을 때만 `mainnet-beta`를 사용하세요.

## Core에서 설정

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
});

const slot = await solana.connection.getSlot();
```

## 커스텀 엔드포인트

```ts
const solana = createSolanaContext({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc.example",
  wsEndpoint: "wss://your-rpc.example",
});
```

전용 RPC를 사용하면 rate limit, 안정성, observability를 더 잘 제어할 수 있습니다.

## Vue 설정

```ts
createApp(App)
  .use(createSolanaPlugin({ cluster: "devnet" }))
  .mount("#app");
```

컴포넌트에서는 `useRpc()`를 사용합니다.

```ts
const { cluster, endpoint, wsEndpoint, connection } = useRpc();
```

## Nuxt 설정

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

컴포넌트에서는 자동 import된 `useSolanaRpc()`를 사용할 수 있습니다.

```ts
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
```

## 엔드포인트 헬퍼

- `getClusterEndpoint(cluster?)`: 클러스터의 HTTP RPC 엔드포인트를 반환합니다.
- `getClusterWebSocketEndpoint(cluster?)`: 클러스터의 WebSocket 엔드포인트를 반환합니다.
- `getWebSocketEndpoint(endpoint)`: HTTP URL을 WebSocket URL로 변환합니다.
- `createSolanaConnection(config?)`: 설정된 `Connection`을 만듭니다.
- `createSolanaContext(config?)`: `{ cluster, endpoint, wsEndpoint, connection }`을 만듭니다.

## 프로덕션 메모

- 공개 RPC는 rate limit이 있을 수 있습니다.
- 사용자에게 cluster와 네트워크 상태를 명확히 표시하세요.
- mainnet 작업 전에는 endpoint가 의도한 네트워크인지 검증하세요.
- RPC 응답은 외부 입력이므로 UI에 그대로 노출하지 마세요.
