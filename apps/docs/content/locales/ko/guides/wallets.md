---
title: "지갑"
description: 지갑을 검색하고, 활성 지갑을 선택하고, 연결/해제하고, capability를 확인합니다.
ogSection: 가이드
surroundOrder: 9
---

Vue Solana는 브라우저 확장 지갑, Android Mobile Wallet Adapter 지갑, 지원되는 iOS 브라우저 지갑 링크를 하나의 지갑 flow로 노출합니다.

지갑 검색과 선택에는 `useWallets()`를 사용하세요. 활성 public key 읽기, 연결, 연결 해제, wallet capability 확인에는 `useWallet()`을 사용합니다.

현재 지갑 지원은 다음 라이브러리를 기반으로 합니다.

- 브라우저 확장 지갑: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, `@solana/wallet-standard-features`.
- Android 모바일 네이티브 지갑: `@solana-mobile/wallet-standard-mobile`. 지원되는 Android Chrome mobile web 및 PWA runtime에서 Solana Mobile Wallet Adapter를 Wallet Standard 지갑으로 등록합니다.
- iOS 브라우저 지갑: Phantom, Solflare, Backpack용 wallet-specific universal link.
- Solana primitive와 transaction type: Vue 앱은 `@vue-solana/vue/web3`, Nuxt 앱은 `@vue-solana/nuxt/web3`, 프레임워크 독립 core 사용은 `@vue-solana/core/web3`.

## 지갑 소스

현재 지갑 source는 다음과 같습니다.

- Solana Wallet Standard를 통한 브라우저 확장 지갑.
- 지원되는 Android Chrome client에서 Wallet Standard 등록을 통한 Android Mobile Wallet Adapter.
- Phantom, Solflare, Backpack 같은 지원 지갑의 iOS 브라우저 지갑 링크.

모든 source는 같은 discovered wallet list에 나타납니다. 플랫폼별 UI copy가 꼭 필요한 경우가 아니라면 앱은 browser, Android, iOS 지갑을 위한 별도 public flow를 만들지 않아야 합니다.

## 지원 행렬

| 지갑 경로                    | v1 상태                               | 표시 방식                                               | 메모                                                              |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------- |
| 브라우저 확장 지갑           | 지원                                  | `platform: "browser"`, `source: "wallet-standard"`      | Solana Wallet Standard 등록을 사용합니다.                         |
| Android 네이티브 모바일 지갑 | Android Chrome 및 Chrome PWA에서 지원 | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | `@solana-mobile/wallet-standard-mobile`로 등록됩니다.             |
| iOS 브라우저 지갑            | 설정된 wallet link에 대해 지원        | `platform: "mobile"`, `source: "deep-link"`             | Phantom, Solflare, Backpack이 universal link로 노출됩니다.        |
| 수동/custom wallet 객체      | 지원                                  | 앱이 제공한 wallet                                      | `SolanaWallet` interface를 구현해야 합니다.                       |
| 데스크톱 네이티브 앱 지갑    | v1에서 보류                           | 기본 노출 없음                                          | 향후 adapter를 위해 `protocol-link` metadata가 예약되어 있습니다. |

오늘 동작하는 것:

- 지원되는 모든 source의 지갑을 하나의 `wallets` list에서 검색.
- 즉시 연결하지 않고 활성 지갑 하나를 선택.
- 선택된 지갑 identity metadata를 optional reconnect flow를 위해 저장.
- 선택된 지갑이 지원하면 연결, 연결 해제, 메시지 서명, 트랜잭션 서명, 트랜잭션 서명/전송.
- `canSignMessage`, `canSignTransaction`, `canSignAllTransactions`, `canSignAndSendTransaction`에서 unsupported-capability UI 렌더링.

v1에 포함되지 않는 것:

- built-in wallet modal 또는 UI package.
- desktop native protocol-link adapter.
- server-side wallet prompt.
- private key 또는 seed phrase 처리.

## Vue 지갑 Flow

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

지갑 선택은 연결이 아닙니다. `connect()`가 성공적으로 resolve될 때까지 지갑은 disconnected 상태로 유지됩니다.

## Nuxt 지갑 Flow

Nuxt는 같은 지갑 flow를 `useSolanaWallets()`와 `useSolanaWallet()`로 자동 import합니다.

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

지갑 작업은 client에서 사용자 액션으로 트리거하세요. Wallet prompt는 SSR 중 실행하면 안 됩니다.

## Capability 확인

지갑마다 지원하는 feature가 다를 수 있습니다. Action을 렌더링하기 전에 capability를 확인하세요.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

프레임워크와 무관한 코드에서는 `@vue-solana/core/wallet`의 wallet assertion을 사용하세요.

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey.toBase58());

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Auto Connect

`autoConnect`는 사용자가 이전에 선택했고 client에서 다시 discovery된 wallet identity만 reconnect합니다.

Vue Solana는 `localStorage["vue-solana:selected-wallet"]`에 wallet identity metadata만 저장합니다. 저장되는 값은 `name`, 그리고 가능한 경우 `platform`/`source`입니다. private key, session data, transaction data는 절대 저장하지 않습니다.

사용자가 명시적으로 wallet selection을 지우면 `selectWallet(null)`을 호출하세요. 앱이 custom wallet object를 소유할 때만 `useWallet()`의 `setWallet(customWallet)`을 사용합니다. 일반 앱 UI는 `useWallets()`에서 지갑을 선택해야 합니다.

local storage를 사용할 수 없으면 현재 page session에서는 wallet selection이 동작하지만 persisted restore는 정규화된 `STORAGE_FAILURE` 오류와 함께 실패할 수 있습니다.

## 인증용 메시지 서명

메시지 서명은 off-chain auth에서 wallet control을 증명합니다. on-chain transaction을 승인하지 않습니다. 명확한 challenge text를 사용하고 backend에서 검증하세요.

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

Nonce는 1회용이며 짧게 유지하세요. Raw wallet 또는 RPC error message를 사용자에게 보여 주는 auth error로 사용하지 마세요.

## 모바일 지갑

지원되는 Android Chrome client에서는 Vue plugin과 Nuxt module에서 Android Mobile Wallet Adapter 등록이 기본 활성화됩니다.

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

Android Mobile Wallet Adapter 등록을 끄려면 `mobileWallet: false`를 전달하세요.

iOS wallet link는 iOS browser에서 기본 활성화됩니다. App identity, redirect URL, chain, cluster를 customize하려면 `iosWallet` options를 전달하세요. iOS wallet link discovery를 끄려면 `iosWallet: false`를 전달합니다.

Android 메모:

- Android MWA 등록은 client-only이며 SSR 중에는 no-op입니다.
- Mobile wallet adapter bridge를 지원하는 Android Chrome 또는 Chrome PWA runtime에서만 동작할 것으로 예상됩니다.
- Wallet handoff는 browser를 떠났다가 앱으로 돌아올 수 있습니다. Redirect 후 제출된 signature를 사용자가 볼 수 있도록 UI state를 보존하세요.
- Vue Solana는 MWA wallet을 extension wallet과 같은 `SolanaWallet` interface로 adapt합니다.
- Mobile wallet package는 기본 wallet-not-found handler를 통해 installed-wallet fallback UI를 처리합니다.
- MWA가 설치된 wallet app에 연결되기 전에 browser가 1회 Local Network Access prompt를 표시할 수 있습니다.
- Android MWA transaction send에서는 wallet이 `signTransaction`을 지원할 때 Vue Solana가 mobile wallet에 서명을 요청한 뒤 앱의 RPC connection으로 signed transaction을 제출합니다. 이렇게 하면 반환 signature를 앱이 제어하고, wallet은 성공적으로 전송했지만 browser page가 wallet adapter response를 받지 못하는 mobile handoff edge case를 피할 수 있습니다.

iOS 메모:

| Capability                 | v1 동작                                                                         |
| -------------------------- | ------------------------------------------------------------------------------- |
| Discovery                  | iOS browser에서 Phantom, Solflare, Backpack entry가 나타날 수 있습니다.         |
| Connection                 | Wallet-specific universal link와 redirect callback을 사용합니다.                |
| Session handling           | Redirect 후 지갑이 연결되었다고 가정하기 전에 callback state를 처리해야 합니다. |
| Transactions               | Capability는 wallet link와 반환된 session data에 따라 다릅니다.                 |
| Desktop Safari native apps | v1 desktop-native path로 구현되지 않았습니다.                                   |

iOS core helper를 직접 사용한다면 client startup 초기에 `handleSolanaIosWalletCallback()`을 호출해 redirect data가 앱의 wallet state 읽기 전에 validate 및 decrypt되도록 하세요.

## 수동 Wallet Interface

Custom wallet integration은 Vue plugin 또는 `setWallet()`을 통해 `SolanaWallet` 객체를 직접 제공할 수 있습니다.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

수동 wallet object는 private key를 Vue Solana에 노출해서는 안 됩니다. Key custody는 wallet provider 내부에 유지하세요.

## Direct Core Helper

직접 core helper를 사용하는 것은 자체 wallet integration layer를 만들 때로 제한하세요.

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

iOS core helper를 직접 사용한다면 redirect 후 반환된 iOS wallet connection에 의존하기 전에 `handleSolanaIosWalletCallback()`을 호출하세요.

## 보안 메모

- 사용자에게 private key를 요청하지 마세요.
- wallet session 또는 transaction data를 local storage에 저장하지 마세요.
- wallet name, icon, metadata는 신뢰할 수 없는 display data로 취급하세요.
- 메시지 또는 트랜잭션에 서명하기 전에 명시적인 사용자 액션을 요구하세요.
- 지원되지 않는 capability에 대해서는 blind wallet call을 시도하지 말고 disabled 또는 explanatory UI를 보여 주세요.
- 예제와 튜토리얼은 devnet을 기본값으로 유지하세요. 실제 자금이 의도된 경우에만 `mainnet-beta`를 사용합니다.

공식 reference:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana Documentation](https://solana.com/docs)
