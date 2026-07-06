---
title: 시작하기
description: Vue Solana 패키지를 설치하고 Vue 또는 Nuxt를 설정한 뒤 devnet에서 RPC 읽기를 테스트합니다.
ogSection: 시작하기
surroundOrder: 2
---

이 가이드는 Vue Solana 패키지 설치, Vue/Nuxt 설정, Solana RPC 읽기 테스트, 지원 지갑 연결, 메시지 서명, 실제 devnet 전송, 결과 확인까지 다룹니다. 예제는 안전한 테스트를 위해 기본적으로 devnet을 사용합니다.

## 시작 전 확인

Vue/Nuxt 통합 없이 `Connection`, `PublicKey`, 트랜잭션 같은 Solana primitive가 필요하면 `@vue-solana/core`를 직접 사용하세요. 프레임워크 통합이 필요하면 `@vue-solana/vue` 또는 `@vue-solana/nuxt`를 사용합니다.

지원 클러스터:

- `mainnet-beta`: Solana 메인넷. Solana의 공식 메인넷 클러스터 이름입니다.
- `devnet`: 앱 개발에 가장 적합한 기본값입니다.
- `testnet`: validator와 프로토콜 테스트 네트워크입니다.
- `localnet`: 로컬 validator입니다.

학습과 테스트 중에는 `devnet`을 사용하세요. 실제 SOL과 상호작용할 준비가 되었을 때만 `mainnet-beta`를 사용합니다.

현재 지갑 지원:

- Solana Wallet Standard 패키지를 통한 브라우저 확장 지갑.
- Android Chrome 및 Chrome PWA에서 `@solana-mobile/wallet-standard-mobile`을 통한 Android 네이티브 모바일 지갑.
- Phantom, Solflare, Backpack용 iOS 브라우저 지갑 universal link.
- `SolanaWallet`을 구현한 수동/커스텀 지갑 객체.

아직 지원하지 않는 항목:

- 지갑별 protocol link 또는 미래의 네이티브 Wallet Standard 등록을 통한 데스크톱 네이티브 앱 지갑.

## Vue 설치

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Vue 앱은 low-level Solana 또는 Buffer 패키지를 직접 설치하지 않고 `@vue-solana/vue/web3`와 `@vue-solana/vue/buffer-polyfill`을 사용할 수 있습니다.

## Nuxt 설치

```sh
npx nuxt module add @vue-solana/nuxt
```

이 명령은 패키지를 설치하고 `nuxt.config.ts`의 `modules` 배열에 `@vue-solana/nuxt`를 추가합니다.

Nuxt 앱은 `@vue-solana/core`, `@vue-solana/vue`, low-level Solana/Buffer 패키지를 직접 설치하지 않고 `@vue-solana/nuxt/web3`와 `@vue-solana/nuxt/buffer-polyfill`을 사용할 수 있습니다.

## 알려진 TypeScript 이슈

`@solana/web3-compat@0.0.21`은 현재 TypeScript 패키지 메타데이터가 깨져 있습니다. 패키지 메타데이터는 `dist/types/index.d.ts`를 가리키지만, 배포된 패키지에 해당 파일이 포함되어 있지 않습니다.

런타임 import는 여전히 실제 `@solana/web3-compat` 패키지를 사용합니다. 현재 Vue Solana 패키지는 임시 패키지 소유 declaration shim을 함께 배포하므로, 문서화된 `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/nuxt` import를 따르면 앱에서 별도 shim이 필요하지 않습니다.

오래된 Vue Solana 패키지 버전을 쓰거나 앱 코드에서 `@solana/web3-compat`를 직접 import할 때만 로컬 shim을 추가하세요. `@solana/web3-compat` 새 릴리스마다 이 메모를 다시 확인하세요.

## Vue 설정

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
      iosWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet`과 `iosWallet`은 선택 사항입니다. 브라우저 런타임이 지원하면 Android Mobile Wallet Adapter 등록과 iOS Phantom, Solflare, Backpack 링크가 기본 활성화됩니다. 특정 소스를 끄려면 `mobileWallet: false` 또는 `iosWallet: false`를 전달하세요.

새 코드에서는 Vue 컴포저블을 직접 subpath에서 import하는 것을 권장합니다.

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
```

## Nuxt 설정

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

Nuxt 모듈은 런타임 플러그인을 클라이언트 전용으로 설치하고 `@vue-solana/vue/*` direct subpath에서 컴포저블을 자동 import합니다. 컴포저블은 SSR 중 호출해도 안전하지만 실제 RPC와 지갑 작업은 `onMounted()` 또는 사용자 액션처럼 hydration 이후 실행하세요. Nuxt `solana` 옵션은 public runtime config에 저장되므로 JSON 직렬화가 가능해야 합니다.

## 지갑 없이 RPC 테스트

RPC 읽기는 브라우저 지갑 없이 동작합니다.

Vue에서는 `useRpc()`를 사용합니다.

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, connection } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const result = await connection.getLatestBlockhash();
  latestBlockhash.value = result.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

Nuxt에서는 자동 import된 `useSolanaRpc()`를 사용합니다.

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button @click="checkConnection">Check RPC</button>
  </main>
</template>
```

## 잔액 읽기

Solana 주소 또는 `PublicKey`를 넘겨 lamport 잔액을 읽습니다.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("");
const { balance, sol, refresh, error, loading } = useBalance(address);
</script>
```

## 지갑 연결

지원 지갑은 unified wallet flow로 검색됩니다. 브라우저 확장, Android MWA, iOS 링크, 커스텀 지갑이 모두 같은 `useWallets()`와 `useWallet()` API를 통해 노출됩니다.

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useWallet, useWallets } from "@vue-solana/vue";

const { wallets, refresh } = useWallets();
const { wallet, publicKey, connected, setWallet, connect, disconnect } = useWallet();

onMounted(refresh);
</script>
```

지갑은 직접 선택하고 `connect()`가 성공할 때까지 연결된 것으로 간주하지 마세요. 개인 키나 seed phrase를 절대 앱에 요청하지 마세요.

## 메시지 서명

메시지 서명은 트랜잭션을 보내지 않고 지갑 소유권을 증명하는 데 적합합니다.

```ts
const { signMessage, signature, error } = useSolanaSignMessage();

await signMessage("Sign in to Vue Solana on devnet");
```

서명 검증은 서버 또는 신뢰할 수 있는 경계에서 nonce, 도메인, 만료 시간과 함께 수행해야 합니다.

## 실제 devnet 전송 테스트

전송 테스트에는 devnet SOL이 필요합니다. 지갑을 devnet으로 전환하고 [Solana Faucet](https://faucet.solana.com)에서 테스트 SOL을 받으세요.

메인넷에서 사용하기 전에 항상 다음을 확인하세요.

- 클러스터가 의도한 값인지 확인합니다.
- 수신자 주소를 표시하고 사용자에게 확인받습니다.
- 아주 작은 금액으로 테스트합니다.
- 오류 메시지에 raw RPC 응답이나 민감한 세부 정보를 그대로 노출하지 않습니다.

## 다음 단계

- [RPC와 클러스터](/ko/guides/rpc-and-clusters)
- [지갑](/ko/guides/wallets)
- [계정 읽기](/ko/guides/account-reads)
- [트랜잭션](/ko/guides/transactions)
- [문제 해결](/ko/troubleshooting)
