---
title: Nuxt 예제
description: Vue Solana의 Nuxt 예제 앱을 실행하고 테스트합니다.
ogSection: 예제
surroundOrder: 18
---

Nuxt 예제는 로컬 개발 중 `@vue-solana/nuxt` 모듈을 확인하기 위한 앱입니다. 모듈 설정, 자동 import 컴포저블, RPC 상태, 잔액 읽기, 지갑 상태, 메시지 서명, 트랜잭션 흐름을 보여 줍니다.

## 소스

- 저장소: `examples/nuxt`
- 라이브 데모: [데모](/ko/demo)

## 실행

```sh
pnpm install
pnpm --filter nuxt-example dev
```

## 확인할 것

- `@vue-solana/nuxt` 모듈이 앱에 설치되는지 확인합니다.
- `useSolanaRpc()`로 devnet RPC 상태를 확인합니다.
- `useSolanaBalance()`로 공개 키 잔액을 읽습니다.
- `useSolanaWallet()`로 지갑 검색, 선택, 연결/해제를 테스트합니다.
- 지원 지갑에서 메시지 서명을 테스트합니다.
- devnet에서 아주 작은 전송만 테스트합니다.

## 지갑 메모

브라우저 확장 지갑은 devnet으로 전환해야 합니다. 모바일 지갑 흐름은 플랫폼과 브라우저 지원 여부에 따라 다르게 표시될 수 있습니다.
