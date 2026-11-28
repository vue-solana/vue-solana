---
title: 로드맵
description: Vue Solana의 계획된 기능과 개선 사항.
ogSection: 로드맵
surroundOrder: 22
---

패키지는 RPC 읽기, 지갑 탐색 및 연결, 잔액 조회, 트랜잭션, 계정 읽기, 메시지 서명, 정규화된 오류 처리, Sign In With Solana, 배치 트랜잭션 서명 및 전송, 트랜잭션 계획, SWR 캐시 adapter, SPL token 헬퍼를 위해 프로덕션 사용이 안정적입니다. 이 로드맵은 특정 릴리스에 얽매이지 않고 영향도 순으로 다음에 올 내용을 설명합니다.

## 현재 감사 결과 및 다음 단계

2026년 11월 18일 감사 결과, 당시에는 여기에 나열된 기능이 모두 완전한 공개 기능으로 출시되지 않았지만 일부는 기반 구현이 있었습니다. 시뮬레이션, Nuxt 서버 RPC, 트랜잭션 히스토리는 출시되었고, 트랜잭션 diagnostics join은 구현되어 릴리스 대기 중입니다. 사용자 요청으로 우선순위가 바뀌지 않는 한 나머지 항목을 이 순서로 진행하세요.

| 우선순위 | 항목                                                                                                                       | 상태                                                                                                     | 다음 단계                                                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | 수수료/컴퓨트 예산 policy                                                                                                  | 계획됨                                                                                                   | [feature queue plan](https://github.com/vue-solana/vue-solana/blob/main/plans/feature-queue-phases.md)의 Phase 1을 구현합니다. Kit setter 위의 policy이며, 전송이나 동적 수수료 oracle은 없습니다. |
| 2        | 트랜잭션 diagnostics join                                                                                                  | 구현됨; 릴리스 대기                                                                                      | Phase 2: `@vue-solana/core/diagnostics`, `useTransactionDiagnostics()`, `useSolanaTransactionDiagnostics()`로 제공 예정입니다. [오류](/ko/guides/errors)를 참고하세요.                             |
| 3        | token/portfolio 읽기                                                                                                       | 구현됨; 릴리스 대기                                                                                      | Phase 3은 `getTokenPortfolio()`, `useTokenPortfolio()`, `useSolanaTokenPortfolio()`로 제공됩니다. Token-2022는 opt-in subpath 뒤에 유지합니다. [계정 읽기](/ko/guides/account-reads)를 참고하세요. |
| 4        | program-client 반응성                                                                                                      | 계획됨                                                                                                   | Phase 4: Codama 생성 client 주변의 reactive adapter를 추가합니다. codegen이나 registry는 없습니다.                                                                                                 |
| 5        | bundle/SSR polish                                                                                                          | 병렬 트랙                                                                                                | Phase 5: [bundle follow-ups](https://github.com/vue-solana/vue-solana/blob/main/plans/deferred/bundle-performance-followups.md)의 iOS lazy-loading, SSR 감사, size guard를 진행합니다.             |
| Shipped  | 트랜잭션 시뮬레이션 헬퍼                                                                                                   | 4.3.0에서 `simulateTransaction()`, `useSimulateTransaction()`, `useSolanaSimulateTransaction()`로 출시됨 | 기록은 [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md)에 보관됨.                                     |
| Shipped  | Nuxt 서버 RPC 유틸리티                                                                                                     | 4.4.0에서 `@vue-solana/nuxt/server`(`createServerSolanaClient()`, `useServerSolanaClient()`)로 구현됨.   | Nuxt package 문서의 SSR 중 서버 측 RPC 섹션을 참고하세요.                                                                                                                                          |
| Shipped  | 트랜잭션 히스토리                                                                                                          | 4.5.0에서 `getTransactionHistory()`, `useTransactionHistory()`, `useSolanaTransactionHistory()`로 출시됨 | 기록은 [`plans/archived/transaction-history.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/transaction-history.md)에 보관됨.                                               |
| 나중     | 버전 관리된 문서, iOS 지갑 제공자 추가, Anchor 헬퍼, 지갑 모달/UI, 데스크톱 네이티브 지갑, RPC 장애 조치, 고급 계정 인덱싱 | 미구현 또는 보류. API 또는 아키텍처 규모가 큼                                                            | 각각 전용 계획이 생길 때까지 여기에 둡니다. UI 결정은 [UI library report](https://github.com/vue-solana/vue-solana/blob/main/reports/Vue%20Solana%20UI%20library.md)를 참고하세요.                 |

이전 항목 두 가지는 이미 다뤄졌습니다. 실시간 subscription은 `useSubscription()`, `useTrackedData()`, SWR adapter로 구현되어 있습니다. `plans/deferred/native-wallet-plan.md`에서 완료로 표시된 “데스크톱 네이티브 지갑”은 구현이 아니라 보류 결정을 기록한 것입니다.

## 트랜잭션

### 트랜잭션 시뮬레이션 헬퍼

출시됨: core의 `simulateTransaction()`, Vue의 `useSimulateTransaction()`, Nuxt의 `useSolanaSimulateTransaction()`로 제출 전에 트랜잭션을 시뮬레이션하여, 앱이 SOL을 소비하지 않고 수수료, 계정 변경, 예상 실패를 미리 확인할 수 있습니다.

## 생태계 통합

### 데스크톱 네이티브 지갑 지원

통합 지갑 플로우를 통한 프로토콜 링크 방식의 데스크톱 네이티브 지갑 지원.

### 추가 iOS 지갑 제공자

현재 Phantom, Solflare, Backpack 유니버설 링크 외에 더 많은 iOS 브라우저 지갑을 지원합니다.

### Anchor provider와 프로그램 헬퍼

Anchor 프로그램 계정 및 인스트럭션을 위한 Anchor provider와 헬퍼.

### 전용 지갑 모달 또는 UI 패키지

연결 및 서명 플로우가 미리 구축된 전용 지갑 모달 또는 UI 패키지.

### Nuxt 서버 RPC 유틸리티

4.4.0 구현: `@vue-solana/nuxt/server`의 `createServerSolanaClient()`와 `useServerSolanaClient()`가 비밀 값을 노출하지 않고 Nitro server route에서 Solana 데이터를 읽습니다.

### 버전 관리된 문서

아직 Kit 경로로 마이그레이션하지 않은 사용자를 위해 `/v1/` 아래에 보관된 레거시 문서 빌드와 `v1 | latest` 드롭다운, 이전 URL 리다이렉트 제공.

## 복원력과 고급 패턴

### RPC 제공자 장애 조치

RPC 제공자 장애 조치와 레이트 리밋 처리.

### 고급 계정 인덱싱

고급 프로그램 account 인덱싱 패턴과 캐싱.
