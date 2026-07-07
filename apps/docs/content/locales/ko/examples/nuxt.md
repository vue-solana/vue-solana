---
title: Nuxt 예제
description: @vue-solana/nuxt를 위한 실행 가능한 Nuxt 예제 앱입니다.
ogSection: 예제
surroundOrder: 18
---

Nuxt 예제는 `@vue-solana/nuxt`를 위한 실행 가능한 Nuxt 앱입니다.

소스: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

라이브 데모: [vue-solana-docs.vercel.app/demo](/demo)

## 보여 주는 것

- `modules: ['@vue-solana/nuxt']`로 Nuxt 모듈을 설치합니다.
- `solana: { cluster: 'devnet' }`으로 모듈을 설정합니다.
- 자동 import된 `useSolanaRpc()`로 RPC 상태를 읽습니다.
- `useSolanaConnection()`으로 주입된 connection을 사용합니다.
- `useSolanaBalance()`로 lamport 잔액을 읽습니다.
- `useSolanaWallets()`로 브라우저 확장 지갑, Android Mobile Wallet Adapter 지갑, 지원되는 iOS 브라우저 지갑 항목을 검색합니다.
- `useSolanaWallet()`으로 활성 지갑 상태를 관리합니다.
- 지갑 선택 메타데이터를 저장하고 reload 후 이전에 선택한 지갑 identity를 복원합니다.
- `autoConnect` 옵션으로 다시 검색된 이전 선택 지갑에만 재연결합니다.
- 메시지 또는 트랜잭션 서명을 지원하지 않는 지갑에 대한 unsupported-capability 상태를 렌더링합니다.
- 연결된 지갑이 지원할 때 자동 import된 `useSolanaSignMessage()`로 인증 메시지에 서명합니다.
- `useSolanaSignAndSendTransaction()`으로 실제 전송을 보내고 제출 상태와 확인 상태를 보여 줍니다. 예제는 안전한 테스트를 위해 기본적으로 devnet을 사용합니다.
- 제출된 signature에 대해 클러스터를 반영한 Solana Explorer 링크를 만듭니다.
- generic async transaction 상태에는 `@vue-solana/vue/useTransaction`의 `useTransaction()`을 사용합니다.

앱은 기본적으로 `devnet`을 사용합니다. Devnet SOL은 실제 가치가 없습니다.

## 저장소 루트에서 실행

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

터미널에 출력되는 Nuxt URL을 엽니다. 보통 `http://localhost:3000`입니다.

## 확인할 것

- 초기 모듈/RPC 상태와 최신 blockhash를 확인합니다.
- `Load Blockhash`를 눌러 `connection.getLatestBlockhash()`를 직접 호출합니다.
- devnet 지갑 주소를 붙여 넣고 잔액을 새로고침합니다.
- Solana 브라우저 지갑을 설치하고 devnet으로 전환합니다.
- Android Chrome에서는 호환되는 Solana mobile wallet을 설치하고 `Mobile Wallet Adapter`를 찾습니다.
- iOS 브라우저에서는 Phantom, Solflare, Backpack을 설치하고 같은 목록에 지갑 항목이 표시되는지 확인합니다.
- 검색된 지갑을 선택하고 연결합니다.
- 페이지를 reload하고 임의의 설치 지갑이 선택되지 않고 같은 지갑 identity가 복원되는지 확인합니다.
- 지갑이 메시지 서명을 지원하면 샘플 auth 메시지에 서명합니다.
- 선택한 지갑이 `signMessage`를 지원하지 않을 때 메시지 서명 버튼이 비활성화되거나 설명이 표시되는지 확인합니다.
- generic mock transaction을 실행합니다.
- recipient 주소와 금액을 입력한 뒤 실제 전송을 보냅니다. 테스트 중에는 예제를 devnet으로 유지하세요.
- 트랜잭션이 submitted signature에서 confirmation status로 이동하는지 확인합니다.
- Explorer 링크를 열고 `?cluster=devnet`이 포함되어 있는지 확인합니다.

전송 예제는 `@vue-solana/nuxt/buffer-polyfill`의 `installSolanaBufferPolyfill()`로 브라우저 `Buffer` polyfill을 초기화합니다. Vite가 이전에 externalized Buffer import를 캐시했다면 Nuxt dev server를 재시작하세요.

signature가 표시된 뒤 confirmation이 timeout되면 중복 전송을 즉시 제출하지 마세요. 예제의 signature status 또는 explorer 링크로 트랜잭션이 나중에 confirm되었는지 확인하세요.

## Devnet SOL

공식 faucet에서 무료 devnet SOL을 요청하세요.

```txt
https://faucet.solana.com
```

## 지갑 메모

예제는 통합 지갑 검색을 사용합니다. 브라우저 확장 지갑 플로를 테스트하기 전에 Phantom, Solflare, Backpack 또는 다른 standard wallet을 설치하세요. 지원되는 Android Chrome 런타임에서는 `@solana-mobile/wallet-standard-mobile`이 설치된 native mobile wallet을 같은 지갑 목록의 `Mobile Wallet Adapter`로 노출할 수 있습니다. iOS 브라우저에서는 Phantom, Solflare, Backpack이 wallet-specific universal link를 통해 표시될 수 있습니다.

Desktop native wallet protocol-link 지원은 의도적으로 v1 예제 플로에 포함되지 않습니다.
