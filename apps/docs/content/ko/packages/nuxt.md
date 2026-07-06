---
title: "@vue-solana/nuxt"
description: Nuxt 앱을 위한 Vue Solana 모듈과 자동 import 컴포저블입니다.
ogSection: 패키지
surroundOrder: 16
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt)는 Nuxt 앱에 Vue Solana 플러그인을 설치하고 Solana 컴포저블을 자동 import합니다.

## 설치

```sh
npx nuxt module add @vue-solana/nuxt
```

## 모듈 설정

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

## 옵션

- `cluster`: `mainnet-beta`, `devnet`, `testnet`, `localnet`.
- `endpoint`: 커스텀 HTTP RPC endpoint.
- `wsEndpoint`: 커스텀 WebSocket endpoint.
- `commitment`: Solana commitment.
- `autoConnect`: 이전에 선택한 지갑 identity를 클라이언트에서 다시 연결 시도합니다.
- `mobileWallet`: Android Mobile Wallet Adapter 설정 또는 `false`.
- `iosWallet`: iOS browser wallet link 설정 또는 `false`.

Nuxt `solana` 옵션은 public runtime config에 저장되므로 JSON 직렬화가 가능해야 합니다.

## 자동 import 컴포저블

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaBalance()`
- `useSolanaWallet()`
- `useSolanaSignAndSendTransaction()`

## Direct imports

```ts
import { PublicKey } from "@vue-solana/nuxt/web3";
import "@vue-solana/nuxt/buffer-polyfill";
```

## SSR와 클라이언트 작업

컴포저블 호출은 SSR 중에도 안전해야 하지만 실제 RPC와 지갑 작업은 hydration 이후 실행하세요. 지갑 검색, 연결, 메시지 서명, 트랜잭션 전송은 사용자 액션 또는 `onMounted()`에서 실행하는 것이 좋습니다.

## 예제

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <section>
    <p>{{ cluster }}</p>
    <p>{{ endpoint }}</p>
    <p>{{ latestBlockhash }}</p>
    <button @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## 관련 가이드

- [시작하기](/ko/getting-started)
- [RPC와 클러스터](/ko/guides/rpc-and-clusters)
- [지갑](/ko/guides/wallets)
- [트랜잭션](/ko/guides/transactions)
- [Nuxt 예제](/ko/examples/nuxt)
