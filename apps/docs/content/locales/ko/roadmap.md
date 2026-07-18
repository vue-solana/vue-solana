---
title: 로드맵
description: Vue Solana 릴리스 이력과 계획된 post-v1 작업입니다.
ogSection: 로드맵
surroundOrder: 19
---

**v1.0.0이 릴리스되었습니다.** 로드맵의 8단계가 모두 완료되었습니다. 패키지는 RPC 설정, 지갑 검색, 지갑 연결, 잔액 읽기, 트랜잭션 확인, 계정 읽기, 메시지 서명, 정규화된 오류 처리와 함께 프로덕션 사용이 안정적입니다.

자세한 구현 트래커는 [`plans/v1-roadmap.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/v1-roadmap.md)에 있습니다. 이 페이지는 애플리케이션 개발자를 위해 완료된 v1 작업과 계획된 post-v1 기능을 요약합니다.

## v1 기능 (릴리스됨)

- 안정적인 public package export와 컴포저블 이름입니다.
- 문서화된 모든 public 설정 옵션의 실제 동작 또는 v1 전 제거입니다.
- 예측 가능한 지갑 선택, 재연결, 연결 해제, unsupported-feature 처리입니다.
- signature 제출 외에 트랜잭션 confirmation 헬퍼입니다.
- 반응형 계정 및 signature status 컴포저블입니다.
- wallet-auth 플로를 위한 메시지 서명 지원입니다.
- 정규화된 지갑, 트랜잭션, RPC, timeout, invalid-input 오류입니다.
- 명확한 desktop native wallet 지원 상태입니다.
- 업데이트된 예제, 패키지 문서, 테스트, E2E coverage입니다.

## 로드맵 단계

### 1. Public API 안정화

상태: 완료. 모든 public 옵션은 v1 전에 구현되었거나 제거되었습니다. `autoConnect`는 이전에 선택한 지갑 identity에 대한 opt-in reconnect 동작으로 v1에 포함됩니다.

### 2. 지갑 UX 기반

상태: 완료. 지갑 선택은 reload 후에도 유지되지만 임의의 설치 지갑에 연결하지 않습니다. v1은 사용자가 이전에 선택한 지갑만 복원하고, 명시적으로 활성화된 경우에만 auto-connect합니다.

### 3. 트랜잭션 라이프사이클

상태: 완료. v1에는 signing부터 confirmation 또는 timeout까지 진행 상태를 표시할 수 있는 confirmation 헬퍼와 반응형 transaction status가 포함됩니다.

### 4. 반응형 계정 데이터

상태: 완료. v1에는 `useAccountInfo()`, `useSignatureStatus()` 같은 계정 및 signature status 컴포저블과 subscription cleanup이 포함됩니다.

### 5. 메시지 서명과 capability

상태: 완료. v1에는 `signMessage`, `useSignMessage()`, Nuxt `useSolanaSignMessage()` auto-import를 통한 지갑 메시지 서명이 포함됩니다. 활성 지갑과 검색된 지갑 capability 헬퍼를 통해 앱은 connect, disconnect, message signing, transaction signing 지원 여부에 맞는 UI를 렌더링할 수 있습니다.

### 6. 오류 모델

상태: 완료. v1은 no selected wallet, unsupported feature, user rejection, invalid address, timeout, storage failure, RPC failure 같은 일반 실패를 user-facing UI에서 사용할 수 있는 안정적인 `SolanaError` 코드로 정규화합니다.

### 7. Desktop Native Wallet 결정

상태: 완료. Desktop native wallet 지원은 명시적으로 v1에서 제외되며 post-v1 후보로 남습니다. v1은 desktop-native 전용 public flow를 추가하지 않고 `useWallets()`와 `useWallet()`을 통한 통합 지갑 선택을 유지합니다.

### 8. 문서, 예제, 테스트

상태: 완료. Docs 앱은 v1 사용법의 기본 source of truth입니다. [시작하기](/getting-started)부터 읽고, public API는 [`@vue-solana/core`](/packages/core), [`@vue-solana/vue`](/packages/vue), [`@vue-solana/nuxt`](/packages/nuxt) 패키지 레퍼런스를 사용하세요. [지갑](/guides/wallets), [트랜잭션](/guides/transactions), [계정 읽기](/guides/account-reads), [메시지 서명](/guides/message-signing), [오류](/guides/errors) 가이드는 소스 코드 확인 없이 안정적인 v1 workflow를 설명합니다.

[Vue Vite 예제](/examples/vue-vite)와 [Nuxt 예제](/examples/nuxt)는 devnet-first 사용, 지갑 선택 persistence, 지갑 capability 확인, 메시지 서명, 트랜잭션 제출, confirmation status, explorer 링크, unsupported-capability UI path를 보여 줍니다. Unit test와 Wallet Standard E2E coverage는 저장소 test suite에 있습니다. v1 태그 전 아래 검증 명령을 실행하세요.

## Post-v1 계획

### 티어 1: 높은 가치의 생태계 통합

- SPL token 계정 헬퍼와 토큰 잔액 컴포저블.
- 프로토콜 링크를 통한 desktop native wallet 지원.
- 추가 iOS wallet provider.

### 티어 2: 개발자 경험 개선

- Anchor provider 및 program 헬퍼.
- 전용 지갑 modal 또는 UI 패키지.
- 서버 측 읽기를 위한 Nuxt server RPC 유틸리티.

### 티어 3: 복원력과 고급 패턴

- RPC provider failover와 rate-limit 처리.
- 고급 program account indexing 패턴과 캐싱.
- 트랜잭션 시뮬레이션 헬퍼.
- 실시간 온체인 데이터를 위한 이벤트 구독 추상화.

## 검증

전체 로컬 검증 suite를 릴리스 태그 전에 실행하세요.

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
pnpm smoke:standalone-installs
```

필요하면 real-network E2E도 수동으로 실행할 수 있습니다.

```sh
pnpm test:e2e:integration
```
