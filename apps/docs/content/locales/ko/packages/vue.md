---
title: "@vue-solana/vue"
description: Solana 앱을 위한 Vue 플러그인과 컴포저블입니다.
ogSection: 패키지
surroundOrder: 15
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue)는 Solana RPC 접근, 잔액 읽기, 지갑 상태, 트랜잭션 helper 상태를 위한 Vue 플러그인과 컴포저블을 제공합니다.

## 설치

```sh
pnpm add @vue-solana/vue
```

트랜잭션을 만들거나 직렬화하는 브라우저 앱은 `@vue-solana/vue/buffer-polyfill`에서 Buffer polyfill을 초기화할 수 있습니다.

## 플러그인 설정

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
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

Android Mobile Wallet Adapter 등록은 지원되는 Android Chrome 클라이언트에서 기본으로 활성화됩니다. MWA app identity를 조정하려면 `mobileWallet` 옵션을 전달하고, Android mobile wallet 등록을 비활성화하려면 `mobileWallet: false`를 전달하세요.

iOS browser wallet link는 iOS 브라우저에서 Phantom, Solflare, Backpack에 대해 기본으로 활성화됩니다. App identity, redirect URL, chains, cluster를 조정하려면 `iosWallet` 옵션을 전달하고, iOS wallet link discovery를 비활성화하려면 `iosWallet: false`를 전달하세요.

커스텀 RPC 엔드포인트도 전달할 수 있습니다.

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet-beta",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

## 컴포저블

Root export는 계속 지원됩니다. 컴포저블은 새 코드에서 direct subpath import를 선호하세요. 이렇게 하면 bundler가 관련 없는 package entry 코드를 평가하지 않아도 됩니다.

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Direct package subpath:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/web3`

`PublicKey`, `Transaction`, `TransactionInstruction` 같은 지원되는 raw Solana primitive에는 `@vue-solana/vue/web3`를 사용하세요. Buffer polyfill이 필요한 브라우저 트랜잭션 코드에는 `@vue-solana/vue/buffer-polyfill`을 사용하세요. 더 낮은 수준의 core 사용에는 direct `@vue-solana/core/*` import도 계속 지원됩니다.

- `useSolana()`: 주입된 전체 Solana context를 반환합니다.
- `useRpc()`: cluster, endpoint, connection status, latest blockhash, `checkConnection()`을 반환합니다.
- `useConnection()`: Solana `Connection`을 반환합니다.
- `useAccountInfo(address, options?)`: account data를 로드하고 account 변경을 subscribe할 수 있습니다.
- `useProgramAccounts(programId, options?)`: optional filters와 data slicing으로 program id가 소유한 accounts를 로드합니다.
- `useWallet()`: active wallet ref, computed connection state, wallet action을 반환합니다.
- `useWallets()`: 발견된 browser extension wallet, Android Mobile Wallet Adapter wallet, 지원되는 iOS browser wallet entry, wallet 선택 action을 반환합니다.
- `useBalance(address, commitment?)`: `PublicKey` 또는 address string의 lamport balance를 로드합니다.
- `useTokenAccounts(owner, options?)`: 기본적으로 Token과 Token-2022 program 모두를 쿼리하여 owner의 모든 SPL token account를 로드합니다.
- `useTokenBalance(mint, owner)`: associated token account를 통해 mint/owner 쌍의 SPL token balance와 decimals를 로드합니다.
- `useTransaction(handler, options?)`: optional timeout 설정을 지원하는 generic async transaction state helper입니다.
- `useTransactionConfirmation(options?)`: 제출된 signature를 reactive status 및 timeout/error state와 함께 confirm합니다.
- `useSignatureStatus(signature, options?)`: signature status update를 읽거나 polling하거나 subscribe합니다.
- `useSignMessage()`: 지원되는 경우 설정된 wallet을 통해 임의의 인증 메시지에 서명합니다.
- `useSignAndSendTransaction()`: optional confirmation waiting과 함께 설정된 wallet을 통해 transaction에 서명하고 전송합니다.

## 관련 가이드

- [RPC와 클러스터](/ko/guides/rpc-and-clusters): connection state를 읽고 endpoint를 설정합니다.
- [지갑](/ko/guides/wallets): wallet을 discover, select, connect, disconnect하고 capability를 확인합니다.
- [계정 읽기](/ko/guides/account-reads): balance, account info, program accounts, signature status를 읽습니다.
- [트랜잭션](/ko/guides/transactions): transaction을 sign, send, confirm하고 진행 상태를 표시합니다.
- [메시지 서명](/ko/guides/message-signing): 오프체인 인증 또는 소유권 challenge에 서명합니다.
- [오류](/ko/guides/errors): composable `error` ref를 안전한 UI 메시지로 매핑합니다.

## RPC 상태 읽기

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

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
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

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

## Token Account 읽기

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load token accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Token accounts: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenAccounts()`는 owner가 null이면 RPC를 호출하지 않고 state를 clear합니다. 옵션에 `programId`를 전달하면 단일 token program으로 결과를 제한할 수 있습니다.

## Token Balance 읽기

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter valid mint and owner addresses.";
    case "RPC_FAILURE":
      return "Unable to load token balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimals)</p>
    <p v-else>No token account found.</p>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useTokenBalance()`는 associated token account가 없으면 error로 처리하지 않고 null balance와 decimals를 반환합니다.

## 오류 처리

Composable `error` ref는 `@vue-solana/core/errors`의 `SolanaError | null`을 사용합니다. 사용자-facing UI에는 `error.value.code`로 분기하고, 원래 wallet, RPC, address parsing, timeout, storage failure 디버깅에는 `error.value.cause`를 보관하세요.

```ts
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

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
```

## Account Info 읽기

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load account data from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()`는 address가 null이면 RPC를 호출하지 않고 state를 clear합니다. 잘못된 address string은 stale `accountInfo`를 clear하고 `error`를 설정하며 `getAccountInfo()`를 호출하지 않습니다. `watch: true`가 활성화되면 websocket listener는 component unmount 시 자동 제거됩니다. `stopWatching()`을 호출하면 현재 listener가 제거되고 해당 composable instance에서 자동 재시작이 방지됩니다.

## Program Accounts 읽기

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana program id.";
    case "RPC_FAILURE":
      return "Unable to load program accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()`는 program id가 null이면 RPC를 호출하지 않고 state를 clear합니다. 잘못된 program id string은 stale `accounts`를 clear하고 `error`를 설정하며 `getProgramAccounts()`를 호출하지 않습니다.

> 경고: `useProgramAccounts()`는 비용이 클 수 있습니다. 각 refresh는 큰 program-owned account set을 scan하고, 상당한 RPC credit을 소비하고, provider rate limit에 걸리거나 timeout될 수 있습니다. High-traffic UI path에서 broad scan을 실행하지 마세요. 프로덕션 read에는 좁은 filter, `dataSlice`, caching, indexing, pagination strategy, 전용 RPC infrastructure를 사용하세요.

## 지갑 상태

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
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
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Browser extension wallet은 Solana Wallet Standard를 통해 발견됩니다. Android Mobile Wallet Adapter wallet은 `@solana-mobile/wallet-standard-mobile`을 통해 등록되며 지원되는 Android Chrome 클라이언트에서 같은 `useWallets()` 목록에 노출됩니다. iOS Phantom, Solflare, Backpack entry는 iOS 브라우저에서 wallet-specific universal link로 노출됩니다. `refreshWallets()`는 발견된 wallet list만 업데이트하고, `selectWallet()`은 active wallet만 설정합니다. Page refresh 후 extension이 이전에 승인된 account를 노출하더라도 `connect()`가 성공하기 전까지 `connected`는 false입니다.

Desktop native app wallet adapter는 아직 구현되지 않았습니다. Desktop native support에는 wallet-specific protocol link 또는 향후 native Wallet Standard registration이 필요합니다.

Plugin context가 없으면 composable은 inert SSR-safe state를 반환합니다. 실제 RPC와 wallet operation에는 여전히 plugin이 제공한 client context가 필요합니다.

## 메시지 서명

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
```

메시지 서명은 지갑 소유권 또는 인증 challenge를 위한 것입니다. 트랜잭션 서명이 아니며 온체인 상태 변경을 승인하지 않습니다. 메시지 서명을 노출하지 않는 지갑은 `canSignMessage`를 false로 보고하고 `execute()`는 unsupported-wallet error로 거부됩니다.

## 트랜잭션 상태

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

현재 wallet은 연결되어 있어야 하며 `signAndSendTransaction` 또는 `signTransaction`을 지원해야 합니다. Android Mobile Wallet Adapter wallet은 가능할 때 `signTransaction`과 app-side RPC submission을 선호합니다. 이렇게 하면 wallet이 성공적으로 전송했지만 browser page가 wallet adapter의 반환 signature를 받지 못하는 mobile handoff edge case를 피할 수 있습니다.

`confirm: true`가 없으면 `execute()`는 제출 후 반환하고 `status`를 `sent`로 설정합니다. Confirmation을 활성화하면 status는 `sending`, `confirming`을 거쳐 요청한 commitment에 맞게 `processed`, `confirmed`, `finalized` 중 하나로 이동합니다. Confirmation timeout 또는 failure가 발생해도 제출된 `signature`는 유지되므로 앱은 explorer 링크를 보여줄 수 있습니다.

`useSignAndSendTransaction()`은 wallet adapter가 결과를 반환하지 않는 경우에도 `loading`을 clear합니다. 이 stale case에서는 `error`가 설정되고 chain status를 알 수 없을 수 있으므로 retry 전에 연결된 wallet 또는 explorer를 확인하세요.

## 기존 Signature Confirm

앱에 이미 제출된 signature가 있고 signing/sending과 별도로 특정 commitment를 기다리고 싶다면 `useTransactionConfirmation()`을 사용하세요.

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

이 composable은 confirmation timeout 또는 RPC failure가 발생해도 제출된 `signature`를 유지하므로, 앱은 사용자에게 `error`를 표시하면서도 explorer 링크를 계속 보여줄 수 있습니다.

## Signature Status 추적

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling, stopSubscription } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
    subscribe: true,
    commitment: "confirmed",
  },
);
```

Polling은 interval마다 `getSignatureStatuses()`를 사용하므로 UI에 update가 더 이상 필요하지 않으면 polling을 중지하세요. `stopPolling()`은 현재 interval을 clear하고 해당 composable instance에서 automatic polling restart를 방지합니다. 잘못된 signature는 stale `status`를 clear하고 `error`를 설정하며 RPC를 호출하거나 polling을 시작하지 않습니다. `0` 이하의 잘못된 `pollIntervalMs` 값은 `RangeError`를 설정하고 polling을 시작하지 않습니다. `subscribe: true`는 `onSignature()`를 사용하고 component unmount 시 listener를 제거합니다. `stopSubscription()`은 현재 signature listener를 제거하고 해당 composable instance에서 automatic restart를 방지합니다.

## 예제 앱

완전한 실행 가능한 Vue와 Vite 흐름은 [Vue Vite 예제](/ko/examples/vue-vite)를 참고하세요.
