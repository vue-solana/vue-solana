---
title: 소개
description: Vue Solana가 무엇인지, 누가 유지보수하는지, 프로젝트가 어떻게 운영되는지 설명합니다.
ogSection: 프로젝트
surroundOrder: 20
---

Vue Solana는 Solana 애플리케이션 구축을 위한 Vue 및 Nuxt 라이브러리를 공개하는 오픈 소스 프로젝트입니다. 공식 Solana JavaScript SDK(Solana Kit)를 타입이 지정된 반응형 컴포저블로 감싸서 Vue 3 및 Nuxt 개발자가 RPC 배관을 직접 만들지 않고도 잔액 조회, 지갑 검색, 메시지 서명, 트랜잭션 전송을 할 수 있게 해줍니다.

이 프로젝트는 Vue Solana 팀이 유지보수하며 GitHub에서 커뮤니티의 기여를 받습니다. 모든 소스 코드는 `https://github.com/vue-solana/vue-solana`에 MIT 라이선스로 공개되어 있으며, 모든 패키지는 npm의 `@vue-solana` 스코프로 배포됩니다.

## 패키지의 역할

- `@vue-solana/core`: 프레임워크에 종속되지 않는 Solana 설정, 엔드포인트 헬퍼, 지갑 타입, 트랜잭션 헬퍼.
- `@vue-solana/vue`: RPC 읽기, 지갑, 잔액, 메시지, 서명, 트랜잭션을 위한 Vue 플러그인과 컴포저블.
- `@vue-solana/nuxt`: Vue 플러그인을 설치하고 컴포저블을 자동 임포트하는 Nuxt 모듈.

## 프로젝트 운영 방식

개발은 GitHub에서 공개적으로 이루어집니다: 이슈에서 버그와 기능 요청을 추적하고, 풀 리퀘스트는 리뷰를 거치며, 릴리스는 npm에 배포됩니다. 지금 보고 있는 문서는 이 저장소의 Markdown으로부터 빌드되어 Vercel에 배포됩니다.

## 로드맵과 거버넌스

계획된 기능은 [로드맵](/ko/roadmap) 페이지에서 공개적으로 추적됩니다. 패키지의 호환성을 깨는 변경은 semver를 따르며, 이 사이트의 기계 판독 가능 표면(llms.txt, openapi.json)은 명시적인 버저닝 정책과 함께 [OpenAPI 스펙](/ko/openapi.json)에 문서화되어 있습니다.

## 연락처

질문, 버그 보고, 보안 문제는 [문의](/ko/contact) 페이지를 참고하세요.
