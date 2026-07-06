---
title: 문제 해결
description: Vue Solana 설치, TypeScript, 지갑, RPC, Nuxt 자동 import 문제를 해결합니다.
ogSection: 지원
surroundOrder: 4
---

이 페이지는 Vue Solana를 사용할 때 자주 만나는 문제와 해결 방법을 정리합니다.

## TypeScript가 `@solana/web3-compat` 타입을 찾지 못함

`@solana/web3-compat@0.0.21`은 현재 package metadata가 누락된 declaration 파일을 가리킵니다. 최신 Vue Solana 패키지는 자체 declaration shim을 포함하므로 문서화된 `@vue-solana/*` import를 사용할 때는 보통 추가 설정이 필요하지 않습니다.

앱 코드에서 `@solana/web3-compat`를 직접 import하거나 오래된 Vue Solana 버전을 사용한다면 임시 shim을 추가할 수 있습니다.

```ts
declare module "@solana/web3-compat" {
  export * from "@solana/web3.js";
}
```

새 `@solana/web3-compat` 릴리스가 나오면 이 workaround가 여전히 필요한지 확인하세요.

## `useSolana()`가 플러그인을 찾지 못함

Vue 앱에서는 앱 생성 시 `createSolanaPlugin()`을 설치해야 합니다.

```ts
createApp(App)
  .use(createSolanaPlugin({ cluster: "devnet" }))
  .mount("#app");
```

Nuxt 앱에서는 `nuxt.config.ts`에 모듈을 추가해야 합니다.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

## 지갑이 감지되지 않음

- 브라우저 확장 지갑을 설치했는지 확인하세요.
- 지갑이 Solana Wallet Standard를 지원하는지 확인하세요.
- 앱을 HTTPS 또는 localhost에서 실행하세요.
- `refresh()` 또는 "Load Wallets" 동작을 다시 실행하세요.
- 모바일에서는 지원 브라우저와 플랫폼 조건을 확인하세요.

## iOS에서 지갑이 다르게 보임

iOS 브라우저는 확장 지갑을 주입하지 않는 경우가 많습니다. Vue Solana는 Phantom, Solflare, Backpack용 browser wallet link를 노출합니다. 이 항목은 연결 가능한 deep link로 표시될 수 있으며, 실제 승인 흐름은 지갑 앱에서 처리됩니다.

## Android 모바일 지갑이 표시되지 않음

Android Mobile Wallet Adapter 웹 등록은 Android Chrome 또는 Chrome PWA 같은 지원 환경에서만 동작합니다. 데스크톱 브라우저나 지원되지 않는 모바일 브라우저에서는 등록이 생략됩니다.

## Buffer 관련 오류

브라우저 번들에서 Buffer polyfill이 필요한 경우 문서화된 subpath를 사용하세요.

```ts
import "@vue-solana/vue/buffer-polyfill";
```

Nuxt에서는 다음을 사용할 수 있습니다.

```ts
import "@vue-solana/nuxt/buffer-polyfill";
```

## 잔액이 `null`임

`useBalance()`는 입력 주소가 비어 있거나 잘못되었을 때 `null`을 반환할 수 있습니다. 주소를 `PublicKey`로 파싱할 수 있는지 확인하고, devnet/mainnet 클러스터가 지갑 주소와 맞는지 확인하세요.

## Nuxt 자동 import가 동작하지 않음

- Nuxt 서버를 재시작하세요.
- `.nuxt` 디렉터리를 지우고 다시 실행하세요.
- `@vue-solana/nuxt`가 `modules` 배열에 있는지 확인하세요.
- 직접 import가 필요하면 `@vue-solana/vue/*` subpath를 사용할 수 있습니다.

## RPC 오류가 반복됨

공개 RPC 엔드포인트는 rate limit이 있을 수 있습니다. 프로덕션에서는 전용 RPC 제공자를 사용하고 `endpoint` 및 `wsEndpoint`를 명시적으로 설정하세요. 사용자에게는 정규화된 오류 메시지를 보여 주고 raw RPC 응답은 로깅 경계에서만 다루세요.
