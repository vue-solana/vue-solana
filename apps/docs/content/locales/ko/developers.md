---
title: 개발자 포털
description: Vue Solana로 빌드하기 위한 퀵스타트, 기계 판독 가능 엔드포인트, 통합 규약.
ogSection: 프로젝트
surroundOrder: 23
---

이 포털은 Vue/Nuxt 라이브러리 자체와 이 문서 사이트의 기계 판독 가능 표면 모두를 대상으로 Vue Solana와 통합하는 개발자와 AI 에이전트를 위한 시작점입니다.

## 퀵스타트: Vue로 Solana 앱 만들기

1. 스택에 맞는 패키지를 설치하세요: Nuxt는 `pnpm add @vue-solana/nuxt`, 순수 Vue 3는 `pnpm add @vue-solana/vue @vue-solana/core`.
2. 플러그인 또는 모듈을 등록하고([시작하기](/ko/getting-started) 참고) 클러스터를 지정하세요 — 기본값은 devnet입니다.
3. 컴포저블로 데이터를 읽으세요: `useSolanaClient`, `useBalance`, `useTokenAccounts`.
4. `useWallets`와 `useWallet`으로 지갑을 연결하세요 (브라우저 확장, Mobile Wallet Adapter, iOS 지갑 링크).
5. `useSignMessage`와 `useSignAndSendTransaction`으로 서명하고 전송하세요.

Solana RPC에는 API 키가 없습니다: 컴포저블은 공개 devnet/mainnet 엔드포인트와 통신하며, 자체 RPC 공급자로 교체할 수 있습니다. [라이브 데모](/ko/demo)는 브라우저에서 배포된 패키지를 devnet 대상으로 실행합니다 — 가입이 필요 없습니다.

## 이 사이트의 기계 판독 가능 표면

이 문서 사이트는 가입이나 키 없이 문서화된 기계 표면을 노출합니다:

- `/llms.txt` — 에이전트를 위한 모든 문서 페이지의 인덱스.
- `/llms-full.txt` — 전체 문서 코퍼스를 하나의 마크다운 문서로.
- `/openapi.json` — 모든 엔드포인트, RFC 9457 오류 모델, 버저닝 정책, rate limit 규약을 다루는 OpenAPI 3.1 스펙.
- 모든 문서 페이지에서 `Accept: text/markdown` 협상 (또는 URL에 `.md` 추가).
- `/sitemap.xml` — 전체 URL 목록.

오류는 `recovery` 확장 객체와 함께 RFC 9457(`application/problem+json`)을 따릅니다; 알 수 없는 경로의 404는 `Accept: text/markdown`으로 요청하면 마크다운 복구 본문을 반환합니다.

## 샌드박스

Solana [devnet 클러스터](/ko/concepts/clusters)가 공유 샌드박스입니다: 무료이고, 자격 증명이 필요 없으며, 에어드랍으로 실제 자금 없이 전송을 테스트할 수 있습니다. 데모 페이지는 devnet으로 설정되어 있으며 모든 가이드의 예제도 devnet 대상으로 실행됩니다.

## API 키와 인증

관리할 것이 없습니다. 패키지는 자신의 앱에서 실행하는 클라이언트 라이브러리이고, 이 사이트의 기계 엔드포인트는 공개입니다. 향후 키가 필요한 기능이 생기면 [로드맵](/ko/roadmap) 페이지에서 먼저 공지됩니다.
