---
title: 메시지 서명
description: 온체인 트랜잭션을 만들지 않고 인증 또는 소유권 메시지에 서명합니다.
ogSection: 가이드
surroundOrder: 12
---

메시지 서명은 오프체인 메시지에 대해 지갑 제어 권한을 증명합니다. 온체인 상태 변경을 승인하지 않으며 트랜잭션 서명도 아닙니다.

인증 challenge, 계정 소유권 확인, 앱이 오프체인에서 검증하는 동의 문구에 메시지 서명을 사용하세요.

## Vue 메시지 서명

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const canSign = computed(() => connected.value && canSignMessage.value);

async function signIn() {
  const message = new TextEncoder().encode("Sign in to example.com");
  await execute(message);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSign" @click="signIn">Sign message</button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <p v-if="error">Unable to sign message.</p>
  </section>
</template>
```

메시지 서명 기능을 노출하지 않는 지갑은 `canSignMessage`를 false로 보고합니다. 지원되지 않는 상태에서 `execute()`를 호출하면 `WALLET_FEATURE_UNSUPPORTED`로 거부됩니다.

## Nuxt 메시지 서명

Nuxt는 `useSolanaSignMessage()`와 `useSolanaWallet()`을 자동 import합니다.

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

메시지 서명은 클라이언트의 사용자 액션에서만 호출하세요.

## Challenge 문구

명확하고 앱에 특화된 challenge 문구를 사용하세요. 사용자는 자신이 무엇에 서명하는지 이해할 수 있어야 합니다.

좋은 challenge 문구에는 보통 다음이 포함됩니다.

- 앱 또는 도메인 이름.
- 서명의 목적.
- Nonce 또는 일회성 challenge 값.
- 발급 시각과 만료 시각.

예:

```txt
Sign in to example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Issued At: 2026-07-02T12:00:00Z
Expires At: 2026-07-02T12:10:00Z
```

## 검증 경계

Vue Solana는 지갑 서명을 요청하는 부분을 돕습니다. 서버 측 검증, nonce 저장, 만료 검사, 세션 생성은 앱의 책임입니다.

일반 텍스트에 대한 서명을 토큰 전송이나 온체인 상태 변경 권한으로 취급하지 마세요.

## 오류 처리

메시지 서명 오류는 지갑 및 트랜잭션 헬퍼와 같은 정규화된 `SolanaError` 모델을 사용합니다.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "WALLET_NOT_CONNECTED":
      return "Connect your wallet first.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support message signing.";
    case "USER_REJECTED":
      return "The message signature was rejected.";
    default:
      return null;
  }
});
```

## 안전 체크리스트

- 인증 challenge에는 일회성 nonce를 사용하세요.
- Challenge는 빠르게 만료시키세요.
- 세션을 만들기 전에 서버에서 서명을 검증하세요.
- 서명할 텍스트는 사람이 읽을 수 있게 작성하세요.
- 메시지 서명이 트랜잭션 제출이라고 암시하지 마세요.
- 인증 문구에 트랜잭션 서명 흐름을 재사용하지 마세요.
