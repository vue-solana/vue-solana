---
title: 로드맵
description: Vue Solana의 계획된 기능과 개선 사항.
ogSection: 로드맵
surroundOrder: 22
---

패키지는 RPC 읽기, 지갑 탐색 및 연결, 잔액 조회, 트랜잭션, 계정 읽기, 메시지 서명, 정규화된 오류 처리, Sign In With Solana, 배치 트랜잭션 서명 및 전송, 트랜잭션 계획, SWR 캐시 adapter, SPL token 헬퍼를 위해 프로덕션 사용이 안정적입니다. 이 로드맵은 특정 릴리스에 얽매이지 않고 영향도 순으로 다음에 올 내용을 설명합니다.

## 현재 감사 결과 및 다음 단계

2026년 11월 18일 감사 결과, 당시에는 여기에 나열된 기능이 모두 완전한 공개 기능으로 출시되지 않았지만 일부는 기반 구현이 있었습니다. 그 후 트랜잭션 시뮬레이션이 출시되었습니다. 사용자 요청으로 우선순위가 바뀌지 않는 한 나머지 항목을 이 순서로 진행하세요.

| 우선순위 | 항목                                                                               | 상태                                                                                                        | 다음 단계                                                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | 트랜잭션 시뮬레이션 헬퍼                                                           | `simulateTransaction()`, `useSimulateTransaction()`, `useSolanaSimulateTransaction()`로 출시됨              | 후속 작업은 [`plans/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/use-simulate-transaction.md)에서 추적합니다.         |
| 2        | iOS 지갑 지연 로딩                                                                 | 누락된 기능이 아니라 성능 작업입니다. 즉시 로드되는 `createSolanaPlugin` 청크의 약 58%를 제거할 수 있습니다 | [`plans/bundle-performance-followups.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/bundle-performance-followups.md)의 집중 변경으로 예약합니다. |
| 3        | Nuxt 서버 RPC 유틸리티                                                             | 미구현. core는 서버 코드에서 수동으로 사용할 수 있습니다                                                    | 비밀 값을 엄격히 배제하는 Nitro/서버 export를 정의합니다.                                                                                                       |
| 4        | 버전 관리된 문서                                                                   | 미구현                                                                                                      | 보관된 `/v1/` 문서와 이전 URL 리다이렉트를 만듭니다.                                                                                                            |
| 나중     | iOS 지갑 제공자 추가                                                               | Phantom, Solflare, Backpack은 구현됨. Trust Wallet은 남아 있음                                              | 제공자별 링크와 callback을 조사한 뒤 `useWallets()` 뒤에 추가합니다.                                                                                            |
| 나중     | Anchor 헬퍼, 지갑 모달/UI, 데스크톱 네이티브 지갑, RPC 장애 조치, 고급 계정 인덱싱 | 미구현. API 또는 아키텍처 규모가 큼                                                                         | 각각 전용 계획이 생길 때까지 여기에 둡니다.                                                                                                                     |

이전 항목 두 가지는 이미 다뤄졌습니다. 실시간 subscription은 `useSubscription()`, `useTrackedData()`, SWR adapter로 구현되어 있습니다. `plans/native-wallet-plan.md`에서 완료로 표시된 “데스크톱 네이티브 지갑”은 구현이 아니라 보류 결정을 기록한 것입니다.

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

서버 측 Solana RPC 읽기를 위한 Nuxt 서버 유틸리티.

### 버전 관리된 문서

아직 Kit 경로로 마이그레이션하지 않은 사용자를 위해 `/v1/` 아래에 보관된 레거시 문서 빌드와 `v1 | latest` 드롭다운, 이전 URL 리다이렉트 제공.

## 복원력과 고급 패턴

### RPC 제공자 장애 조치

RPC 제공자 장애 조치와 레이트 리밋 처리.

### 고급 계정 인덱싱

고급 프로그램 account 인덱싱 패턴과 캐싱.
