---
title: Vue 개발자를 위한 Solana
description: Vue와 Nuxt 개발자가 Solana 앱을 만들 때 알아야 할 핵심 개념입니다.
ogSection: 개념
surroundOrder: 5
---

Solana 앱은 일반 웹 앱과 비슷하게 UI 상태를 관리하지만, 데이터 읽기와 쓰기는 RPC, 공개 키, 지갑 서명, 트랜잭션 확인 같은 블록체인 개념을 통해 이루어집니다.

## RPC

Solana RPC는 앱이 클러스터와 통신하는 HTTP/WebSocket API입니다. 계정 읽기, 잔액 조회, blockhash 조회, 트랜잭션 제출과 확인에 사용됩니다.

Vue Solana는 설정된 클러스터에서 `Connection`을 만들고 Vue/Nuxt 컴포저블로 노출합니다.

## 공개 키

Solana 주소는 `PublicKey`입니다. UI에서는 문자열로 입력받는 경우가 많지만 RPC 호출 전에는 `PublicKey`로 파싱해야 합니다. 잘못된 주소는 사용자 입력 오류로 처리하세요.

## Lamports와 SOL

SOL의 최소 단위는 lamports입니다.

```ts
const lamportsPerSol = 1_000_000_000;
```

잔액은 보통 lamports로 읽고, UI에서 SOL로 변환해 표시합니다.

## 지갑

지갑은 개인 키를 보관하고 사용자의 승인으로 메시지 또는 트랜잭션에 서명합니다. 앱은 개인 키를 직접 다루지 않아야 합니다.

Vue Solana의 지갑 흐름은 브라우저 확장, Android 모바일 지갑, iOS 지갑 링크, 커스텀 지갑을 같은 API로 노출합니다.

## 트랜잭션과 서명

Solana에서 상태를 변경하려면 트랜잭션이 필요합니다. 앱은 트랜잭션을 만들고 지갑은 사용자가 승인한 뒤 서명합니다. 그 다음 앱은 트랜잭션을 RPC로 제출하고 confirmation을 기다립니다.

메시지 서명은 트랜잭션을 제출하지 않습니다. 로그인 또는 지갑 소유권 증명에 사용할 수 있지만, 서버에서 nonce와 만료 시간을 검증해야 합니다.

## Commitment

Commitment는 RPC 응답과 confirmation이 어느 정도 확정된 상태를 요구하는지 나타냅니다. 개발 중에는 기본값을 사용해도 되지만, 프로덕션에서는 UX와 안전 요구사항에 맞게 명시적으로 선택하세요.

## 안전 원칙

- 학습과 테스트에는 `devnet`을 사용하세요.
- `mainnet-beta`에서는 실제 자산이 이동합니다.
- 앱에서 seed phrase 또는 개인 키를 요구하지 마세요.
- 사용자가 서명할 메시지와 트랜잭션 목적을 명확히 보여 주세요.
- RPC 응답은 신뢰할 수 없는 외부 입력으로 취급하세요.
