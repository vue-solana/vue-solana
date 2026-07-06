---
title: Vue Vite 예제
description: Vue Solana의 Vue 3 Vite 예제 앱을 실행하고 테스트합니다.
ogSection: 예제
surroundOrder: 17
---

Vue Vite 예제는 로컬 개발 중 `@vue-solana/vue` 패키지를 확인하기 위한 앱입니다. RPC 상태, 직접 connection 호출, 잔액 읽기, 지갑 상태, 메시지 서명, 목업 트랜잭션 흐름을 보여 줍니다.

## 소스

- 저장소: `examples/vue-vite`
- 라이브 데모: [데모](/ko/demo)

## 실행

```sh
pnpm install
pnpm --filter vue-vite dev
```

## 확인할 것

- 앱이 devnet cluster와 RPC endpoint를 표시하는지 확인합니다.
- 최신 blockhash를 불러옵니다.
- Solana 공개 키를 입력하고 잔액을 읽습니다.
- Phantom, Solflare, Backpack 같은 지갑 확장을 설치하고 devnet으로 전환합니다.
- 지갑을 검색하고 연결/해제합니다.
- 지원 지갑에서 메시지 서명을 테스트합니다.

## Devnet SOL

전송 흐름을 테스트하려면 [Solana Faucet](https://faucet.solana.com)에서 devnet SOL을 받으세요. 실제 mainnet 자산으로 테스트하지 마세요.
