---
title: 문제 해결
description: 일반적인 설정, TypeScript, 지갑, RPC, Nuxt 문제입니다.
ogSection: 지원
surroundOrder: 4
---

이 가이드는 Vue, Nuxt, TypeScript, 지갑 검색, RPC 호출, 트랜잭션에서 흔히 발생하는 Vue Solana 설정 문제를 진단하는 데 사용합니다. 앱과 일치하는 오류 메시지나 동작에서 시작한 뒤 issue를 열기 전에 순서대로 확인하세요.

## TypeScript가 `@solana/web3-compat`를 resolve하지 못함

`@solana/web3-compat@0.0.21`은 현재 TypeScript metadata가 깨져 있습니다. 런타임 import는 여전히 실제 패키지를 사용합니다. 현재 Vue Solana 패키지는 임시 package-owned declaration shim을 publish하므로 `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt`의 문서화된 import는 consumer-local shim 없이 typecheck되어야 합니다.

그래도 TypeScript가 declaration 누락을 보고하면 먼저 최신 Vue Solana 패키지 버전을 사용 중인지, 앱 코드에서 `@solana/web3-compat`를 직접 import하지 않는지 확인하세요. 오래된 Vue Solana 버전 또는 직접 `@solana/web3-compat` import의 경우 앱에 `types/web3-compat.d.ts`를 추가합니다.

```ts
declare module "@solana/web3-compat" {
  export type {
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    TransactionSignature,
  } from "@solana/web3.js";
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
}
```

`tsconfig.json`에 해당 파일이 포함되어 있는지 확인하세요.

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "types/**/*.d.ts"]
}
```

이 workaround를 유지하기 전에 새 `@solana/web3-compat` 버전을 다시 확인하세요. upstream이 유효한 root declaration을 제공하면 package-owned shim은 제거되어야 합니다.

## `Vue Solana plugin is not installed`

클라이언트 코드가 플러그인을 설치하지 않은 상태에서 Solana connection 또는 wallet action을 사용하려 했다는 뜻입니다. 현재 컴포저블은 Nuxt가 서버에서 렌더링할 때 inert SSR-safe 상태를 반환하지만, 실제 RPC와 지갑 작업에는 여전히 client plugin context가 필요합니다.

Vue:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

Nuxt에서는 모듈을 등록하세요.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

Nuxt 모듈은 Vue Solana 플러그인을 client-only로 유지합니다. 자동 import 컴포저블은 SSR 중에도 호출할 수 있지만 서버에서 직접 RPC 또는 지갑 작업을 하지 마세요. 실제 Solana connection이 필요할 때는 client lifecycle hook이나 사용자 action에서 RPC 읽기를 트리거하세요.

## `No Solana wallet is configured`

선택되었거나 수동으로 설정된 지갑이 없습니다. `connect()` 또는 트랜잭션 전송 전에 `useWallets()` 또는 `useSolanaWallets()`로 검색된 지갑을 선택하세요.

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

RPC 읽기와 잔액 읽기는 지갑 없이 동작합니다.

## 브라우저 지갑이 감지되지 않음

일반적인 원인:

- Solana 지갑 확장이 설치되어 있지 않습니다.
- 현재 브라우저 profile에서 지갑 확장이 비활성화되어 있습니다.
- 앱이 SSR 또는 non-browser 환경에서 실행 중입니다.
- 지갑이 Wallet Standard를 구현하지 않습니다.

Phantom, Solflare, Backpack 같은 지갑을 설치한 뒤 페이지 load 후 `refreshWallets()`를 호출하세요.

## Mobile Wallet Adapter가 감지되지 않음

Android Mobile Wallet Adapter web registration은 지원되는 Android Chrome mobile web 및 Chrome PWA 런타임에서만 동작합니다.

일반적인 원인:

- 앱이 desktop, iOS, Firefox Android, Brave Android, Opera Android 또는 다른 unsupported browser에서 실행 중입니다.
- 호환되는 Solana mobile wallet이 설치되어 있지 않습니다.
- Vue 플러그인 또는 Nuxt 모듈에 `mobileWallet: false`가 전달되었습니다.
- 지갑 검색이 hydration 전 또는 페이지가 `window`에 접근하기 전에 실행되었습니다.

Android Chrome에서 앱을 열고 호환 지갑을 설치한 뒤 페이지 load 후 `refreshWallets()`를 호출하세요.

## iOS 지갑 링크가 완료되지 않음

iOS 지갑 지원은 Phantom, Solflare, Backpack universal link를 사용합니다. 지갑 앱은 승인 후 앱 URL로 redirect합니다.

일반적인 원인:

- 앱이 iOS 브라우저에서 실행 중이 아닙니다.
- 기기에 Phantom, Solflare, Backpack이 설치되어 있지 않습니다.
- Vue 플러그인 또는 Nuxt 모듈에 `iosWallet: false`가 전달되었습니다.
- 설정된 `redirectUrl`이 지갑 상태를 refresh하는 같은 앱 페이지로 돌아오지 않습니다.
- 지갑 refresh 또는 callback 처리가 클라이언트가 아니라 SSR 중에만 실행됩니다.

iOS 지갑 작업은 client-side로 유지하고, redirect URL이 앱을 다시 로드하는지 확인하며, redirected page load 후 `refreshWallets()`를 호출하세요. Vue 플러그인은 지갑 refresh 중 iOS callback을 처리합니다. core 헬퍼를 직접 사용하는 앱은 반환된 connection에 의존하기 전에 `handleSolanaIosWalletCallback()`을 호출해야 합니다.

## `Solana wallet is not connected`

지갑이 `connected: true`와 non-null `publicKey`를 보고하기 전에 transaction helper가 호출되었습니다.

먼저 `connect()`를 호출하거나 전송 전에 `connected.value`를 확인하세요.

## 로컬 개발 중 새로고침 후 지갑이 연결된 것처럼 보임

검색된 지갑을 선택하는 것만으로 연결된 상태가 되면 안 됩니다. 브라우저 확장이 이전에 승인된 계정을 노출하더라도 `connected`는 `connect()`가 성공한 뒤에만 true가 되어야 합니다.

로컬 Vue 또는 Nuxt 예제가 reload 직후 여전히 연결된 것처럼 보이면 workspace 패키지를 다시 빌드하고 dev server를 완전히 재시작해서 Vite/Nuxt가 stale package output을 버리게 하세요.

```sh
pnpm build:packages
pnpm dev:vue
```

Nuxt는 패키지를 다시 빌드한 뒤 `pnpm dev:nuxt`를 사용하세요.

## `Solana wallet does not support signTransaction`

설정된 지갑이 `signAndSendTransaction` 또는 `signTransaction`을 노출하지 않습니다. 선택한 Solana chain에서 transaction signing을 지원하는 지갑을 사용하세요.

## 지갑 트랜잭션이 결과를 반환하지 않음

wallet adapter가 mobile handoff를 시작했지만 browser promise를 settle하지 못할 때 발생할 수 있습니다. Vue Solana는 앱이 sending 상태에 갇히지 않도록 `loading`을 clear하고 `error`를 설정합니다. 지갑이 response를 잃기 전에 제출했다면 트랜잭션은 성공했을 수 있으므로 재시도하기 전에 지갑 activity 또는 Solana explorer를 확인하세요.

Android Mobile Wallet Adapter 지갑은 `signTransaction`이 가능할 때 지갑 서명과 app-side RPC 제출을 선호합니다. 이 경로는 지갑이 성공적으로 전송했지만 브라우저 페이지가 adapter의 반환 signature를 받지 못하는 일반적인 상황을 피합니다.

## `Buffer is not defined`

일부 `@solana/web3-compat` transaction path는 여전히 Node 호환 `Buffer` global을 기대합니다. 브라우저 Vue 앱에서는 트랜잭션 생성 또는 직렬화 전에 Vue 패키지 Buffer polyfill을 초기화하세요. Nuxt 앱에서는 `@vue-solana/nuxt/buffer-polyfill`을 사용합니다.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

이 헬퍼는 framework package가 제공하므로 앱은 Vue Solana transaction 예제를 위해 `buffer`를 직접 설치하거나 import할 필요가 없습니다.

## Module `buffer` Has Been Externalized

콘솔에 `Module "buffer" has been externalized for browser compatibility`가 표시되면 앱의 직접 `buffer` import를 `@vue-solana/vue/buffer-polyfill` 또는 `@vue-solana/nuxt/buffer-polyfill`의 `installSolanaBufferPolyfill()`로 교체한 뒤 dev server를 재시작하세요. Vite가 이전 optimized dependency를 캐시했을 수 있습니다.

## 잔액 읽기 실패

일반적인 원인:

- 주소 문자열이 유효한 Solana public key가 아닙니다.
- RPC 엔드포인트가 unavailable 또는 rate-limited 상태입니다.
- 지갑 주소가 설정된 RPC 엔드포인트와 다른 클러스터에 있습니다.

`useRpc()` 또는 `useSolanaRpc()`로 설정된 cluster와 endpoint를 확인하세요.

## Nuxt 자동 import가 없음

`@vue-solana/nuxt`가 `modules`에 들어 있는지 확인하고 패키지 설치 후 Nuxt dev server를 재시작하세요.

TypeScript가 여전히 auto-import를 인식하지 못하면 Nuxt 타입을 다시 생성하세요.

```sh
npx nuxi prepare
```
