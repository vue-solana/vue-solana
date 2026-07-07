---
title: Vue Solana 문서
description: 개발자가 Vue와 Nuxt에서 Solana를 사용할 수 있게 돕는 라이브러리 문서입니다.
ogSection: 개요
surroundOrder: 1
---

Vue Solana는 Solana 애플리케이션을 만들기 위한 Vue 및 Nuxt 패키지 생태계입니다.

Vue Solana는 Vue와 Nuxt 컴포저블을 통해 RPC 설정, 반응형 계정 읽기, 잔액 읽기, 브라우저 확장 지갑 검색, Android Mobile Wallet Adapter 검색, iOS 브라우저 지갑 링크, 지갑 연결/해제, 트랜잭션 전송 플로를 제공합니다. 예제는 안전한 테스트를 위해 기본적으로 devnet을 사용합니다.

## 패키지

- [`@vue-solana/core`](/packages/core): 프레임워크에 독립적인 Solana 설정, 엔드포인트 헬퍼, 지갑 타입, 트랜잭션 헬퍼입니다.
- [`@vue-solana/vue`](/packages/vue): Vue 플러그인과 컴포저블입니다.
- [`@vue-solana/nuxt`](/packages/nuxt): Vue 플러그인을 설치하고 컴포저블을 자동 import하는 Nuxt 모듈입니다.

`@vue-solana/core`는 `@solana/web3-compat` 위에 만들어져 있으며 지원되는 Solana primitive를 `@vue-solana/core/web3`에서 다시 export합니다. Vue 앱은 `@vue-solana/vue/web3`, Nuxt 앱은 `@vue-solana/nuxt/web3`를 사용할 수 있으므로 core를 직접 설치하지 않아도 됩니다.

## 먼저 읽기

- [시작하기](/getting-started)
- [지갑 가이드](/guides/wallets)
- [트랜잭션 가이드](/guides/transactions)
- [Vue 개발자를 위한 Solana](/concepts/solana-for-vue-developers)
- [클러스터](/concepts/clusters)
- [v1 로드맵](/roadmap)
- [Agent Skill](/agent-skill)
- [문제 해결](/troubleshooting)

## API 레퍼런스

- [`@vue-solana/core`](/packages/core): 설정, 엔드포인트, 지갑 인터페이스, Wallet Standard 헬퍼, 모바일/iOS 헬퍼, 트랜잭션 헬퍼, 정규화된 오류입니다.
- [`@vue-solana/vue`](/packages/vue): RPC, 계정 읽기, 지갑, 메시지, 서명, 트랜잭션을 위한 Vue 플러그인과 컴포저블입니다.
- [`@vue-solana/nuxt`](/packages/nuxt): Nuxt 모듈 옵션, 런타임 동작, 자동 import 컴포저블입니다.

## 예제

- [라이브 데모](/demo)
- [Vue Vite 예제](/examples/vue-vite)
- [Nuxt 예제](/examples/nuxt)

## 패키지 사용자에게

자신의 앱에 Vue 또는 Nuxt 패키지를 설치하려면 [시작하기](/getting-started)부터 읽으세요. 컴포저블을 프로젝트에 연결하기 전에 [라이브 데모](/demo)에서 devnet RPC 읽기, 지갑 연결, 메시지 서명, 전송 플로를 먼저 확인할 수 있습니다.

공식 Solana 참고 자료:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Faucet](https://faucet.solana.com)
