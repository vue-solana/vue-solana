---
title: Agent Skill
description: Vue Solana 프로젝트와 패키지 사용자를 돕는 installable Agent Skill입니다.
ogSection: 도구
surroundOrder: 3
---

Vue Solana는 에이전트가 이 저장소와 패키지를 올바르게 다루도록 돕는 installable Agent Skill을 제공합니다.

이 skill은 Vue Solana 아키텍처, 패키지 경계, 권장 import, Solana 지갑 흐름, 문서 정책을 에이전트에게 알려 줍니다. 프로젝트에 설치하면 에이전트가 `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt` 사용법을 더 일관되게 따를 수 있습니다.

## 설치

```sh
npx skills add vue-solana/vue-solana
```

이미 설치된 skill을 갱신하려면 같은 명령을 다시 실행하세요.

## 포함 내용

- 패키지별 책임과 public API 경계.
- Nuxt 모듈과 Vue 플러그인 설정 지침.
- Wallet Standard, Android Mobile Wallet Adapter, iOS deep-link 지갑 흐름.
- `@solana/web3-compat` TypeScript 메타데이터 이슈와 shim 정책.
- devnet 우선 테스트와 mainnet 안전 규칙.

## 사용 예

에이전트에게 다음처럼 요청할 수 있습니다.

```txt
Add a wallet connect button using @vue-solana/vue.
```

```txt
Build a Nuxt page that reads a devnet account balance with @vue-solana/nuxt.
```

```txt
Review this Vue Solana transaction flow for safety issues.
```

## 소스

공개 installable skill은 저장소의 `skills/vue-solana/` 아래에 있습니다. 개발 전용 skill은 `.agents-dev/skills/`에 있으며 공개 설치 대상이 아닙니다.
