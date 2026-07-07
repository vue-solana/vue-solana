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

오래된 Vue Solana 패키지 버전을 쓰거나 앱 코드에서 `@solana/web3-compat`를 직접 import할 때만 로컬 shim을 추가하세요. `@solana/web3-compat` 새 릴리스마다 이 메모를 다시 확인하세요. upstream이 유효한 root declaration을 배포하면 package-owned shim은 제거되어야 합니다.

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

`mobileWallet`과 `iosWallet`은 선택 사항입니다. 브라우저 runtime이 지원하면 Android Mobile Wallet Adapter 등록과 iOS Phantom, Solflare, Backpack 링크가 기본 활성화됩니다. 특정 source를 끄려면 `mobileWallet: false` 또는 `iosWallet: false`를 전달하세요.

새 코드에서는 Vue 컴포저블을 direct subpath에서 import하는 것을 권장합니다.

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

Nuxt module은 runtime plugin을 client 전용으로 설치하고 `@vue-solana/vue/*` direct subpath에서 컴포저블을 자동 import합니다. 컴포저블은 SSR 중 호출해도 안전하지만 실제 RPC와 지갑 작업은 `onMounted()` 또는 사용자 액션처럼 hydration 이후 실행하세요. Nuxt `solana` option은 public runtime config에 있으므로 JSON 직렬화가 가능해야 합니다.

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
    <button type="button" @click="checkConnection">Check RPC</button>
  </main>
</template>
```

## Devnet 또는 Testnet SOL 받기

Devnet과 testnet SOL은 실제 가치가 없는 테스트 토큰입니다.

공식 faucet을 사용하세요.

```txt
https://faucet.solana.com
```

이 가이드를 따라 할 때는 `Devnet`을 선택하세요. Testnet cluster를 대상으로 테스트할 때만 `Testnet`을 선택합니다.

Solana CLI가 설치되어 있다면 다음도 사용할 수 있습니다.

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

테스트 중에는 실제 자금이 있는 지갑을 절대 사용하지 마세요.

## 예제 실행

예제 앱을 로컬에서 실행하려면 먼저 Vue Solana 저장소를 clone하세요.

```sh
git clone https://github.com/vue-solana/vue-solana.git
cd vue-solana
pnpm install
pnpm build:packages
```

Vue Vite 예제를 시작합니다.

`pnpm dev:vue`

Nuxt 예제를 시작합니다.

`pnpm dev:nuxt`

예제는 plugin/module setup, RPC state, direct connection call, balance read, unified wallet discovery, persisted wallet selection, wallet state, message signing, generic transaction state, transaction transfer flow, confirmation status, explorer link, unsupported capability UI를 보여 줍니다. 안전한 테스트를 위해 기본적으로 devnet을 사용합니다.

## 지갑 연결

Phantom, Solflare, Backpack 또는 다른 Solana Wallet Standard 브라우저 지갑을 설치하세요. 테스트 전에 지갑을 devnet으로 전환합니다.

Android Chrome 또는 Android Chrome PWA에서는 Phantom, Solflare, Seed Vault Wallet 같은 호환 Solana 모바일 지갑을 설치하세요. `refreshWallets()` 후 `Mobile Wallet Adapter`가 같은 wallet list에 나타날 수 있습니다.

Vue:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

Nuxt:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

`wallets`에서 지갑을 선택한 뒤 `connect()`를 호출하세요. 지갑 선택은 활성 지갑을 설정할 뿐 연결하지 않습니다. 일부 extension은 page refresh 후 이전에 승인된 account를 노출하지만, Vue Solana는 `connect()`가 성공할 때까지 `connected`를 false로 유지합니다.

`autoConnect`가 활성화되면 Vue Solana는 사용자가 이전에 선택한 wallet identity만, 그리고 client에서 해당 지갑이 다시 discovery된 뒤에만 복원합니다. `localStorage`에는 private key, session, transaction이 아니라 `name`, `platform`, `source` metadata만 저장합니다.

iOS 브라우저 지갑 지원은 Mobile Wallet Adapter web support가 Android Chrome 전용이기 때문에 wallet-specific universal link를 사용합니다. Phantom, Solflare, Backpack은 iOS browser에서 같은 `useWallets()` list에 나타납니다.

## 수동 지갑 테스트

브라우저 extension, Android MWA wallet 또는 iOS browser wallet을 직접 검증할 때 이 체크리스트를 사용하세요.

1. 앱을 `devnet`으로 설정하고 UI가 devnet endpoint를 표시하는지 확인합니다.
2. 지원 지갑을 설치하고 지갑 자체를 devnet으로 전환합니다.
3. `https://faucet.solana.com`에서 devnet SOL로 지갑을 충전합니다.
4. 예제 앱을 열고 wallet refresh action을 클릭합니다.
5. 지갑이 예상 source와 함께 unified wallet list에 나타나는지 확인합니다.
6. 지갑을 선택하고, 선택만으로 연결되지 않는지 확인합니다.
7. connect를 클릭하고 wallet prompt를 승인합니다.
8. `connect()` resolve 후 public key와 `connected` state가 업데이트되는지 확인합니다.
9. 페이지를 reload하고 이전에 선택한 wallet identity가 임의 지갑 선택 없이 복원될 수 있는지 확인합니다.
10. disconnect하고 public key와 connected state가 clear되는지 확인합니다.

예상 wallet source:

| Platform                     | Expected source         | Notes                                                                              |
| ---------------------------- | ----------------------- | ---------------------------------------------------------------------------------- |
| Desktop browser extension    | `wallet-standard`       | Phantom, Solflare, Backpack 및 다른 standard wallet이 설치되면 나타날 수 있습니다. |
| Android Chrome or Chrome PWA | `mobile-wallet-adapter` | 호환 native wallet과 Android MWA browser support가 필요합니다.                     |
| iOS browser                  | `deep-link`             | Phantom, Solflare, Backpack entry는 wallet-specific universal link를 사용합니다.   |
| Desktop native app           | Not implemented in v1   | Desktop native protocol link는 v1에서 명시적으로 보류됩니다.                       |

## 메시지 서명

메시지 서명은 wallet ownership check 또는 authentication challenge에 사용하세요. 트랜잭션을 제출하지 않으며 on-chain state 변경을 승인하지 않습니다.

Vue:

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Nuxt:

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

`canSignMessage`가 false이면 auth button을 disabled로 렌더링하세요. 일부 지갑은 연결과 트랜잭션 서명은 지원하지만 임의 메시지 서명은 지원하지 않을 수 있습니다.

수동 테스트에는 domain, nonce, expiration time이 포함된 명확한 challenge string을 사용하세요. 사용자에게 비어 있거나 모호한 메시지에 서명하도록 요청하지 마세요.

```ts
const challenge = new TextEncoder().encode(
  "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

서명 후 UI가 반환된 signature bytes를 보여 주고 message signature를 on-chain transaction으로 취급하지 않는지 확인하세요.

## 전송 보내기

Vue와 Nuxt 예제에는 실제 전송을 위한 recipient address와 amount field가 포함되어 있습니다. 기본적으로 devnet을 사용하므로 실제 가치가 없는 SOL로 테스트할 수 있습니다. Mainnet에서는 `mainnet-beta` 또는 mainnet RPC endpoint를 설정하고 fee를 낼 실제 SOL이 있는 지갑을 사용합니다.

테스트 중에는 `0.000001` SOL 같은 아주 작은 금액으로 시작하세요.

트랜잭션을 만들거나 serialize하는 브라우저 앱은 transaction code 전에 framework package Buffer polyfill을 초기화해야 합니다.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

지갑은 transaction approval prompt를 표시합니다. 승인 후 예제는 transaction signature, confirmation state, explorer link를 보여 줍니다. Android Mobile Wallet Adapter에서는 가능한 경우 Vue Solana가 wallet signing과 app-side RPC submission을 선호하여 wallet이 browser로 redirect한 뒤에도 반환 signature가 더 안정적이게 합니다.

수동 전송 테스트:

1. 앱과 지갑을 모두 devnet으로 유지합니다.
2. 직접 제어하는 recipient address 또는 새로 만든 devnet wallet을 사용합니다.
3. `0.000001` SOL로 시작합니다.
4. 승인 전 wallet prompt를 검토합니다.
5. 제출 후 예제가 confirmation status를 표시할 때까지 기다립니다.
6. Explorer link를 열고 devnet cluster query를 사용하는지 확인합니다.
7. sender와 recipient balance를 refresh합니다.

Explorer URL은 cluster-aware여야 합니다.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Signature가 반환된 뒤 confirmation이 timeout되면 즉시 다시 제출하지 마세요. 먼저 signature status 또는 explorer를 확인하세요. 트랜잭션이 여전히 confirm될 수 있습니다.

## 최종 검증

앱 flow에 의존하기 전에 devnet에서 다음 동작을 확인하세요.

- RPC 읽기가 지갑 없이 동작합니다.
- Wallet discovery가 현재 platform에서 지원되는 wallet source만 보여 줍니다.
- Wallet selection과 connection은 별도 사용자 action입니다.
- Optional `autoConnect`는 이전에 선택한 wallet identity만 복원합니다.
- 지원되지 않는 message signing 또는 transaction signing capability는 UI에서 disabled됩니다.
- Message signing은 on-chain transaction을 제출하지 않고 signature를 반환합니다.
- Transfer submission은 signature와 confirmation status를 반환합니다.
- Explorer link는 앱과 같은 cluster를 가리킵니다.
- 실제 자금 위험을 이해하고 의도적으로 mainnet을 설정할 때만 `mainnet-beta`를 사용합니다.

## 더 읽기

- [Vue 개발자를 위한 Solana](/ko/concepts/solana-for-vue-developers)
- [클러스터](/ko/concepts/clusters)
- [지갑](/ko/guides/wallets)
- [트랜잭션 가이드](/ko/guides/transactions)
- [문제 해결](/ko/troubleshooting)
- [Solana Documentation](https://solana.com/docs)
