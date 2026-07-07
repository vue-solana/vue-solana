---
title: Agent Skill
description: AI 코딩 에이전트를 위한 Vue Solana Agent Skill 설치 방법입니다.
ogSection: 도구
surroundOrder: 3
---

Vue Solana는 Agent Skills 형식을 지원하는 AI 코딩 에이전트가 사용할 수 있는 설치형 Agent Skill을 제공합니다. 이 skill은 Vue Solana 설정 패턴, 패키지 선택 규칙, 지갑 플로 안내, Nuxt SSR 주의점, 트랜잭션 gotcha, 검증 명령을 에이전트에 제공합니다.

다음을 사용하는 앱을 빌드, 디버그, 리뷰, 문서화하도록 에이전트에 요청할 때 사용하세요.

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- Vue 또는 Nuxt 앱에서 사용하는 `@vue-solana/vue/web3` 및 `@vue-solana/nuxt/web3` primitive

## 설치

Skills CLI로 GitHub 저장소에서 설치합니다.

```sh
# 모든 skill 설치
npx skills add vue-solana/vue-solana

# Vue Solana skill 설치
npx skills add vue-solana/vue-solana --skill vue-solana

# 사용 가능한 skill 목록 보기
npx skills add vue-solana/vue-solana --list

# 전역 설치
npx skills add vue-solana/vue-solana --global
```

CLI는 설치 중 선택한 에이전트의 skill 디렉터리에 skill을 설치합니다. Claude의 경우 현재 프로젝트의 `.claude/skills/`이며, `--global`을 사용하면 `~/.claude/skills/`입니다.

## 포함 내용

- `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/vue/web3`, `@vue-solana/nuxt`, `@vue-solana/nuxt/web3`를 언제 사용할지에 대한 규칙입니다.
- Vue 플러그인 설정과 권장 direct 컴포저블 import 방식입니다.
- Nuxt 모듈 설정과 자동 import 컴포저블입니다.
- `useWallets()` 및 `useWallet()`을 통한 통합 지갑 검색과 연결입니다.
- 브라우저 확장 지갑, Android Mobile Wallet Adapter 지원, iOS 브라우저 지갑 지원, 현재 desktop native wallet 제한입니다.
- RPC, 잔액, 트랜잭션 헬퍼 사용법입니다.
- 트랜잭션 코드용 `installSolanaBufferPolyfill()` 브라우저 polyfill 안내입니다.
- 현재 `@solana/web3-compat@0.0.21` TypeScript 메타데이터 우회 방법입니다.
- Vue Solana 자체 변경을 검증하는 저장소 명령입니다.

## 소스

Skill 소스는 [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md)입니다.
