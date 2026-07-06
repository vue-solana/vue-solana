---
title: "@vue-solana/vue"
description: Vue 앱을 위한 Solana 플러그인과 컴포저블입니다.
ogSection: 패키지
surroundOrder: 15
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue)는 Vue 3 앱에 Solana context를 제공하고 RPC, 계정 읽기, 지갑, 메시지 서명, 트랜잭션 흐름을 컴포저블로 노출합니다.

## 설치

```sh
pnpm add @vue-solana/vue
```

## 플러그인 설정

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(createSolanaPlugin({ cluster: "devnet" }))
  .mount("#app");
```

## Direct subpath import

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Solana primitive는 `@vue-solana/vue/web3`에서 import할 수 있습니다.

```ts
import { PublicKey, Transaction } from "@vue-solana/vue/web3";
```

## 관련 가이드

- [시작하기](/ko/getting-started)
- [RPC와 클러스터](/ko/guides/rpc-and-clusters)
- [지갑](/ko/guides/wallets)
- [계정 읽기](/ko/guides/account-reads)
- [트랜잭션](/ko/guides/transactions)

## RPC

```ts
const { cluster, endpoint, wsEndpoint, connection } = useRpc();
```

## 잔액

```ts
const address = ref("");
const { balance, sol, refresh, loading, error } = useBalance(address);
```

## 계정 정보

```ts
const { connection } = useRpc();
const accountInfo = await connection.getAccountInfo(publicKey);
```

## 지갑 상태

```ts
const { wallets, refresh } = useWallets();
const { wallet, publicKey, connected, setWallet, connect, disconnect } = useWallet();
```

검색된 지갑을 선택한 뒤 사용자가 명시적으로 연결을 요청할 때 `connect()`를 호출하세요.

## 메시지 서명

```ts
const { signMessage, signature, signedMessage, loading, error } = useSignMessage();

await signMessage("Sign in to Vue Solana on devnet");
```

## 전송

```ts
const { send, signature, loading, error } = useSignAndSendTransaction();

await send(transaction);
```

## 일반 async 트랜잭션 상태

```ts
const { execute, loading, error, signature } = useTransaction(async () => {
  return await runTransaction();
});
```

## SSR 메모

Vue 패키지는 일반 Vue 앱을 대상으로 합니다. SSR 환경에서는 실제 지갑 작업을 클라이언트에서만 실행하고, Nuxt 앱에서는 `@vue-solana/nuxt`를 사용하는 것이 좋습니다.
