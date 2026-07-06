---
title: 클러스터
description: Solana 클러스터 이름, RPC 엔드포인트, 개발 환경 선택 방법입니다.
ogSection: 개념
surroundOrder: 6
---

Solana 클러스터는 앱이 연결할 네트워크입니다. Vue Solana는 Solana의 공식 클러스터 이름을 사용합니다.

## 지원 클러스터

- `mainnet-beta`: 실제 SOL과 토큰이 있는 메인넷입니다.
- `devnet`: 앱 개발과 테스트에 권장되는 네트워크입니다.
- `testnet`: validator와 프로토콜 테스트용 네트워크입니다.
- `localnet`: 로컬 validator입니다.

`mainnet` 대신 `mainnet-beta`를 사용하세요. Solana의 공식 메인넷 클러스터 이름입니다.

## 기본 설정

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Nuxt에서는 다음처럼 설정합니다.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

## 커스텀 RPC 엔드포인트

프로덕션에서는 공개 RPC 대신 전용 RPC 제공자를 사용하는 것이 좋습니다.

```ts
createSolanaPlugin({
  cluster: "mainnet-beta",
  endpoint: "https://your-rpc-provider.example",
  wsEndpoint: "wss://your-rpc-provider.example",
});
```

`wsEndpoint`를 생략하면 HTTP 엔드포인트에서 파생됩니다.

## Faucet

devnet SOL은 [Solana Faucet](https://faucet.solana.com)에서 받을 수 있습니다. 지갑이 devnet으로 전환되어 있는지 확인하세요.
