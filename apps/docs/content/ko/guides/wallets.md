---
title: 지갑
description: Vue Solana의 unified wallet flow로 브라우저, 모바일, 커스텀 지갑을 다룹니다.
ogSection: 가이드
surroundOrder: 9
---

Vue Solana는 여러 지갑 소스를 하나의 API로 노출합니다. UI는 브라우저 확장, Android Mobile Wallet Adapter, iOS browser wallet link, 수동 지갑을 같은 흐름으로 다룰 수 있습니다.

## 지갑 소스

- 브라우저 확장 지갑: Solana Wallet Standard를 통해 검색됩니다.
- Android 모바일 지갑: 지원 환경에서 `@solana-mobile/wallet-standard-mobile`로 등록됩니다.
- iOS 브라우저 지갑: Phantom, Solflare, Backpack 링크로 노출됩니다.
- 커스텀 지갑: `SolanaWallet` 인터페이스를 구현하면 직접 제공할 수 있습니다.

## 지원 행렬

| 소스                  | 플랫폼   | 연결 방식                    |
| --------------------- | -------- | ---------------------------- |
| Wallet Standard       | 브라우저 | 확장 프로그램 또는 주입 지갑 |
| Mobile Wallet Adapter | Android  | 모바일 지갑 앱               |
| iOS wallet links      | iOS      | universal/deep link          |
| Custom wallet         | 앱 정의  | `SolanaWallet` 구현          |

## Vue 흐름

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { useWallet, useWallets } from "@vue-solana/vue";

const { wallets, refresh } = useWallets();
const { wallet, publicKey, connected, setWallet, connect, disconnect } = useWallet();

onMounted(refresh);
</script>
```

사용자가 지갑을 선택하면 `setWallet(walletInfo)`를 호출하고, 사용자가 명시적으로 연결을 요청할 때 `connect()`를 호출하세요.

## Nuxt 흐름

Nuxt에서는 자동 import된 `useSolanaWallet()`을 사용할 수 있습니다.

```ts
const { wallets, wallet, publicKey, connected, refresh, setWallet, connect, disconnect } =
  useSolanaWallet();
```

실제 지갑 검색과 연결은 클라이언트 액션에서 실행하세요.

## Capability 확인

지갑마다 기능이 다릅니다. 호출 전 capability를 확인하세요.

- `signMessage`
- `signTransaction`
- `signAllTransactions`
- `signAndSendTransaction`

지원하지 않는 기능을 호출하면 사용자에게 해당 지갑이 기능을 지원하지 않는다고 안내하세요.

## autoConnect

`autoConnect`는 사용자가 이전에 선택한 지갑 identity만 다시 연결하려고 시도합니다. Vue Solana는 `localStorage["vue-solana:selected-wallet"]`에 `name`, `platform`, `source` 같은 identity metadata만 저장합니다. 개인 키, 세션 데이터, 트랜잭션 데이터는 저장하지 않습니다.

## 메시지 서명 인증

메시지 서명으로 로그인하려면 서버가 nonce, 도메인, 만료 시간, 공개 키, 서명을 검증해야 합니다. 같은 메시지를 재사용하지 마세요.

## 보안 메모

- seed phrase나 개인 키를 요청하지 마세요.
- 지갑이 연결되었다는 사실만으로 사용자를 인증하지 마세요.
- 사용자가 서명할 내용과 네트워크를 명확히 표시하세요.
- mainnet 전송에는 별도 확인 UI를 두세요.
