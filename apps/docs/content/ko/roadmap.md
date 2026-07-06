---
title: v1 로드맵
description: Vue Solana v1까지의 완료된 작업과 향후 후보 작업입니다.
ogSection: 로드맵
surroundOrder: 19
---

이 로드맵은 Vue Solana 패키지가 v1에 가까워지기 위해 완료한 작업과 이후 후보 작업을 정리합니다.

## 완료된 기반 작업

- pnpm workspace 기반 monorepo 구성.
- `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt` 초기 패키지 구현.
- `@solana/web3-compat` 기반 runtime import와 package-owned declaration shim.
- Vue 플러그인과 Nuxt 모듈.
- RPC, connection, balance, wallet, message signing, transaction 컴포저블.
- Wallet Standard 기반 브라우저 지갑 검색.
- Android Mobile Wallet Adapter와 iOS browser wallet link 지원.
- Vue Vite 및 Nuxt 예제 앱.
- 영어, 스페인어, 중국어, 한국어 문서.

## v1 전 후보 작업

- core helper와 Vue/Nuxt 컴포저블 테스트 보강.
- 에러 코드와 사용자 메시지 표면 안정화.
- public API export surface 최종 검토.
- 실제 지갑 UX와 모바일 환경 수동 테스트.
- 릴리스 전 문서와 예제 동기화.

## v1 이후 후보

- desktop native wallet protocol link 지원.
- 더 많은 wallet capability와 signing flow 예제.
- SPL Token 및 Token-2022 helper.
- Anchor 또는 Codama client 통합 예제.
- 더 많은 접근성 및 E2E 테스트.

## 검증 명령

```sh
pnpm typecheck
pnpm build
```

문서 앱은 다음 명령으로 확인할 수 있습니다.

```sh
pnpm --filter docs build
```
