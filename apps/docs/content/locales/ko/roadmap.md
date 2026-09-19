---
title: 로드맵
description: Vue Solana의 계획된 기능과 개선 사항.
ogSection: 로드맵
surroundOrder: 19
---

패키지는 RPC 읽기, 지갑 탐색 및 연결, 잔액 조회, 트랜잭션, 계정 읽기, 메시지 서명, 정규화된 오류 처리를 위해 프로덕션 사용이 안정적입니다. 이 로드맵은 특정 릴리스에 얽매이지 않고 영향도 순으로 다음에 올 내용을 설명합니다.

## 핵심 컴포저블

- 모든 비동기 함수를 래핑하고 abort 지원과 ref 기반 fresh closure로 `status`, `data`, `error`, `dispatch`를 추적하는 범용 `useAction` 컴포저블.
- 소스가 변경되면 반응형으로 다시 실행되는 일회용 `useRequest` 컴포저블. stale-while-revalidate와 시도별 취소를 지원합니다.
- 라이브 RPC 구독 스트림(account 알림, slot 알림, logs)을 위한 `useSubscription` 컴포저블. 재연결, 오류 복구, stale-while-revalidate를 지원합니다.
- 초기 RPC fetch를 구독과 페어링하고 결과를 slot 기준으로 deduplicate하여 빠른 첫 페인트와 라이브 업데이트를 모두 제공하는 `useTrackedData` 컴포저블.
- 느슨하게 타입화된 클라이언트에 capability가 설치되어 있는지 마운트 시점에 확인하고, 없으면 명확한 오류 메시지를 표시하는 `useClientCapability` 컴포저블.

## 지갑 기능

- 지갑 기반 인증을 위한 Sign In With Solana(`useSignIn`).
- 선택된 지갑 account를 스토리지에 저장하고 사용 가능한 지갑 필터링을 지원하는 지갑 선택 context.
- 클라이언트의 fee payer와 acting identity를 반응형으로 추적하는 `usePayer` 및 `useIdentity` 컴포저블.
- 다중 트랜잭션 지갑 요청을 위한 배치 트랜잭션 서명 및 전송(`useSignTransactions`, `useSignAndSendTransactions`).

## 트랜잭션

- 서명 전에 instruction 입력으로부터 트랜잭션 메시지를 계획하는 트랜잭션 계획 컴포저블(`usePlanTransaction`).
- 트랜잭션 시뮬레이션 헬퍼.
- 실시간 온체인 데이터를 위한 이벤트 구독 추상화.

## 생태계 통합

- `@solana/react` query adapter를 미러링하는 Vue 데이터 페칭 라이브러리(Pinia 기반 Query 또는 SWR 계열)용 캐시 adapter.
- Kit 클라이언트 기반의 SPL token account 헬퍼와 token balance 컴포저블.
- 통합 지갑 플로우를 통한 프로토콜 링크 방식의 데스크톱 네이티브 지갑 지원.
- 추가 iOS 지갑 제공자.
- Anchor provider와 프로그램 헬퍼.
- 전용 지갑 모달 또는 UI 패키지.
- 서버 측 읽기를 위한 Nuxt 서버 RPC 유틸리티.
- 버전 관리된 문서: 아직 Kit 경로로 마이그레이션하지 않은 사용자를 위해 `/v1/` 아래에 보관된 레거시 문서 빌드와 `v1 | latest` 드롭다운, 이전 URL 리다이렉트 제공.

## 복원력과 고급 패턴

- RPC 제공자 장애 조치와 레이트 리밋 처리.
- 고급 프로그램 account 인덱싱 패턴과 캐싱.
