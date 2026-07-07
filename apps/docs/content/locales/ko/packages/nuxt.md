---
title: "@vue-solana/nuxt"
description: Solana 앱을 위한 Nuxt 모듈입니다.
ogSection: 패키지
surroundOrder: 16
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt)는 Nuxt 앱에 Vue Solana 플러그인을 설치하고 컴포저블을 자동 import합니다.

## 설치

```sh
npx nuxt module add @vue-solana/nuxt
```

이 명령은 package를 설치하고 `nuxt.config.ts`의 `modules` 배열에 `@vue-solana/nuxt`를 추가합니다.

트랜잭션을 만들거나 직렬화하는 브라우저 앱은 `@vue-solana/nuxt/buffer-polyfill`에서 Buffer polyfill을 초기화하고, `@vue-solana/nuxt/web3`에서 지원되는 Solana primitive를 import할 수 있습니다.

## 모듈 설정

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

커스텀 RPC 엔드포인트도 설정할 수 있습니다.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

지원되는 클러스터는 `mainnet-beta`, `devnet`, `testnet`, `localnet`입니다. Solana mainnet에는 Solana의 공식 클러스터 이름인 `mainnet-beta`를 사용하세요.

Nuxt module option은 public runtime config에 저장되므로 JSON 직렬화가 가능해야 합니다. Custom `wallet` adapter object는 의도적으로 Nuxt config에서 제외됩니다. Custom wallet object를 inject해야 한다면 client-only Vue 코드에서 Vue plugin을 직접 사용하세요.

Mobile wallet option은 JSON 직렬화 가능한 app identity와 redirect 설정만 포함한다면 `nuxt.config.ts`에 안전하게 설정할 수 있습니다.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

각 mobile wallet source를 비활성화하려면 `mobileWallet: false` 또는 `iosWallet: false`를 전달하세요. 이 모듈은 Vite가 브라우저 트랜잭션 및 wallet 코드를 올바르게 bundle할 수 있도록 일반적인 Solana, Wallet Adapter, mobile wallet dependency도 pre-optimize합니다.

## 자동 Import 컴포저블

이 모듈은 root Vue package barrel이 아니라 direct `@vue-solana/vue/*` subpath에서 다음 컴포저블을 자동 import합니다. 이렇게 하면 한 페이지가 하나의 컴포저블만 사용해도 Nuxt SSR bundle이 관련 없는 Solana runtime code를 가져오지 않아도 됩니다.

- `useSolana()`: 주입된 전체 Solana context를 반환합니다.
- `useSolanaRpc()`: cluster, endpoint, RPC status, latest blockhash, `checkConnection()`을 반환합니다.
- `useSolanaConnection()`: Solana `Connection` instance를 반환합니다.
- `useSolanaAccountInfo(address, options?)`: account info를 읽고 account 변경을 subscribe할 수 있습니다.
- `useSolanaWallet()`: selected wallet state, connection state, capabilities, wallet actions를 반환합니다.
- `useSolanaWallets()`: discovered wallets와 wallet selection/refresh actions를 반환합니다.
- `useSolanaBalance(address, commitment?)`: public key 또는 address의 lamport balance를 읽습니다.
- `useSolanaProgramAccounts(programId, options?)`: filters와 data slicing으로 program-owned accounts를 읽습니다.
- `useSolanaTransactionConfirmation(options?)`: 기존 transaction signature를 confirm합니다.
- `useSolanaSignatureStatus(signature, options?)`: signature status를 읽거나 polling하거나 subscribe합니다.
- `useSolanaSignMessage()`: 오프체인 인증 또는 소유권 challenge message에 서명합니다.
- `useSolanaSignAndSendTransaction()`: transaction에 서명하고 전송하며 선택적으로 confirm합니다.

이들은 Vue composable의 Nuxt alias입니다.

Vue package는 caller가 `@vue-solana/vue/useRpc`에서 명시적으로 import하므로 `useRpc()` 같은 짧은 이름을 사용합니다.

Nuxt module은 auto-imported composable이 앱 전체 Nuxt namespace를 공유하고 앱 코드나 다른 module과 충돌하지 않아야 하므로 `useSolanaRpc()` 같은 prefixed name을 노출합니다.

`useSolana()`는 이미 namespaced이며 Vue와 Nuxt 모두에서 canonical context accessor 역할을 하므로 예외입니다.

Nuxt 앱 안에서는 explicit import 없이 auto-import가 작동하도록 `useSolana*` 이름을 사용하세요.

Raw Solana primitive와 browser Buffer helper는 auto-import가 아니라 explicit import입니다.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
import { PublicKey, Transaction } from "@vue-solana/nuxt/web3";
```

더 낮은 수준의 core 사용에만 direct `@vue-solana/core/*` import를 사용하세요.

Direct package subpath:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/web3`

Runtime plugin은 client-only입니다. Auto-imported composable은 SSR 중에도 호출할 수 있으며 hydration이 실제 client context를 제공하기 전까지 inert state를 반환합니다. RPC와 wallet 작업은 client lifecycle hook 또는 사용자 액션에서 트리거하세요.

Android Mobile Wallet Adapter 등록도 client에서만 실행됩니다. Android Chrome과 Chrome PWA에서는 `Mobile Wallet Adapter`가 browser extension wallet과 같은 `useSolanaWallets()` 목록에 나타날 수 있습니다. iOS browser에서는 Phantom, Solflare, Backpack이 wallet-specific universal link를 통해 같은 목록에 나타날 수 있습니다. Desktop native app wallet adapter는 계획되어 있지만 아직 구현되지 않았습니다.

## 관련 가이드

- [RPC와 클러스터](/ko/guides/rpc-and-clusters): Nuxt module을 설정하고 RPC 상태를 읽습니다.
- [지갑](/ko/guides/wallets): client flow에서 `useSolanaWallets()`와 `useSolanaWallet()`을 안전하게 사용합니다.
- [계정 읽기](/ko/guides/account-reads): balance, account data, program accounts, signature status를 읽습니다.
- [트랜잭션](/ko/guides/transactions): Nuxt에서 transaction을 sign, send, confirm하고 status를 처리합니다.
- [메시지 서명](/ko/guides/message-signing): 오프체인 메시지에 대한 wallet signature를 요청합니다.
- [오류](/ko/guides/errors): auto-imported composable error를 안전한 UI 메시지로 매핑합니다.

## RPC 상태 읽기

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "Unable to reach the configured Solana RPC endpoint."
    : "Unable to check the Solana connection.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## 잔액 읽기

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## 오류 처리

Nuxt auto-imported composable은 `@vue-solana/vue`와 같은 정규화된 `SolanaError | null` ref를 노출합니다. UI 분기에는 stable `error.value.code` 값을 사용하고, 원래 wallet, RPC, parsing, timeout, storage failure를 logging하려면 `error.value.cause`를 보관하세요.

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## Account Data 읽기

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

Public RPC node에서 `useSolanaProgramAccounts()`는 신중하게 사용하세요. 좁은 filter를 선호하고, partial read에는 `dataSlice`를 사용하며, broad scan polling을 피하세요.

## 지갑 상태

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() }}</p>
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallet은 Solana Wallet Standard를 통해 발견됩니다. Android Mobile Wallet Adapter wallet은 지원되는 Android Chrome client에서 `@solana-mobile/wallet-standard-mobile`을 통해 등록되고 같은 wallet list에 노출됩니다. iOS Phantom, Solflare, Backpack entry는 iOS browser에서 wallet-specific universal link를 통해 노출됩니다. `refreshWallets()`는 발견된 wallet list만 업데이트하고, `selectWallet()`은 active wallet만 설정합니다. Page refresh 후 extension이 이전에 승인된 account를 노출하더라도 `connect()`가 성공하기 전까지 `connected`는 false입니다.

## 메시지 서명

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
</script>
```

메시지 서명은 지갑 소유권 또는 인증 challenge를 위한 것입니다. 트랜잭션 서명이 아니며 온체인 상태 변경을 승인하지 않습니다. 메시지 서명을 노출하지 않는 지갑은 `canSignMessage`를 false로 보고하고 `execute()`는 unsupported-wallet error로 거부됩니다.

## 트랜잭션 서명, 전송, Confirm

연결된 wallet이 transaction에 서명하고 제출해야 할 때 client-side 사용자 액션에서 `useSolanaSignAndSendTransaction()`을 사용하세요. UI가 signature submission에서 멈추지 않고 confirmation을 기다려야 한다면 `confirm: true`를 전달하세요.

```vue
<script setup lang="ts">
import { Transaction } from "@vue-solana/nuxt/web3";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction() {
  const transaction = new Transaction();
  // Add instructions, recent blockhash, and fee payer before requesting a wallet signature.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Submitted: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to complete the transaction.</p>
  </section>
</template>
```

Status는 RPC 제출 후 `sending`에서 `sent`로 이동합니다. Confirmation이 활성화되면 `confirming`을 거쳐 `confirmed` 또는 `finalized` 같은 도달한 commitment에서 끝납니다. 제출 후 confirmation timeout이 발생해도 `signature`는 유지되므로 앱은 explorer link를 표시하거나 retry 전에 signature status를 polling할 수 있습니다.

Wallet prompt는 hydration 이후 사용자 interaction으로 트리거되어야 합니다. SSR, server route, page load 시 자동으로 `execute()`를 호출하지 마세요.

## 기존 Signature Confirm

이미 signature가 있고 reactive confirmation state가 필요할 때는 `useSolanaTransactionConfirmation()`을 사용하세요.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirm signature</button>
    <p>Status: {{ status }}</p>
    <p v-if="confirmation">Reached {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to confirm the signature.</p>
  </section>
</template>
```

## Signature Status 추적

제출된 signature에 대해 지속적인 status check가 필요하면 `useSolanaSignatureStatus()`를 사용하세요. Timeout 이후에도 transaction이 land할 수 있으므로 이 기능이 유용합니다.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling, stopSubscription } = useSolanaSignatureStatus(
  signature,
  {
    pollIntervalMs: 2_000,
  },
);

onBeforeUnmount(() => {
  stopPolling();
  void stopSubscription();
});
</script>
```

Explorer link에는 설정된 cluster를 사용하세요. Devnet link에는 `?cluster=devnet`을 포함하고, mainnet link에는 cluster query를 포함하지 않아야 합니다.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## 예제 앱

완전한 실행 가능한 Nuxt 흐름은 [Nuxt 예제](/ko/examples/nuxt)를 참고하세요.
