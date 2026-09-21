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
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
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
- `@vue-solana/vue/kit`

Buffer polyfill이 필요한 브라우저 트랜잭션 코드에는 `@vue-solana/vue/buffer-polyfill`을 사용하세요. Kit API(`createSolanaClient`, `address`, `lamports` 및 타입)에는 `@vue-solana/vue/kit`을 사용하세요. 더 낮은 수준의 core 사용에는 direct `@vue-solana/core/*` import도 계속 지원됩니다.

- `useSolana()`: 주입된 전체 Solana context를 반환합니다.
- `useSolanaClient()`: Kit `{ client, rpc }`를 context에서 반환합니다. 새 코드에 권장됩니다.
- `useRpc()`: cluster, endpoint, connection status, latest blockhash, 주입된 Kit `client`, `checkConnection()`을 반환합니다.
- `useConnection()`: 주입된 Kit client를 반환합니다(`useSolanaClient()` 사용을 권장하며 deprecated입니다).
- `useAccountInfo(address, options?)`: 정규화된 account data(executable, lamports, owner, space, data bytes)를 로드합니다.
- `useProgramAccounts(programId, options?)`: optional filters와 data slicing으로 program id가 소유한 accounts를 로드합니다.
- `useWallet()`: active wallet ref, computed connection state, wallet action을 반환합니다.
- `useWallets()`: 발견된 browser extension wallet, Android Mobile Wallet Adapter wallet, 지원되는 iOS browser wallet entry, wallet 선택 action을 반환합니다.
- `useBalance(address, commitment?)`: address string의 lamport balance를 로드합니다.
- `useAirdrop()`: 테스트 네트워크와 로컬 validator에서 계정에 SOL을 에어드랍합니다.
- `useTokenAccounts(owner, options?)`: 기본적으로 Token과 Token-2022 program 모두를 쿼리하여 owner의 모든 SPL token account를 로드합니다.
- `useTokenBalance(mint, owner)`: associated token account를 통해 mint/owner 쌍의 SPL token balance와 decimals를 로드합니다.
- `useTransaction(handler, options?)`: optional timeout 설정을 지원하는 generic async transaction state helper입니다.
- `useTransactionConfirmation(options?)`: 제출된 signature를 reactive status 및 timeout/error state와 함께 confirm합니다.
- `useSignatureStatus(signature, options?)`: signature status update를 읽거나 polling하거나 subscribe합니다.
- `useSignMessage()`: 지원되는 경우 설정된 wallet을 통해 임의의 인증 메시지에 서명합니다.
- `useSignAndSendTransaction()`: optional confirmation waiting과 함께 설정된 wallet을 통해 transaction에 서명하고 전송합니다.
- `useAction(handler)`: 재디스패치 시 abort되는 generic async action 상태 머신입니다.
- `useRequest(source, options?)`: 소스가 변경되면 다시 실행되는 one-shot request로, stale-while-revalidate를 지원합니다.
- `useSubscription(source, options?)`: RPC 구독 및 기타 reactive stream 소스의 실시간 데이터입니다.
- `useTrackedData(source, options?)`: one-shot fetch로 시드되는 RPC 구독으로, slot 기준 deduplicate됩니다.
- `useSignIn()`: 지갑의 Sign In With Solana(SIWS) 기능을 트리거합니다.
- `useSelectedWalletAccount()`: 지속성과 필터링이 있는 앱 전역 selected wallet account context를 읽습니다.
- `useSignTransactions()` / `useSignAndSendTransactions()`: 지갑 요청 한 번으로 여러 transaction을 서명하거나 서명 후 전송합니다.
- `usePayer()` / `useIdentity()`: Kit client의 reactive signer입니다(signer plugin 필요).
- `usePlanTransaction()` / `usePlanTransactions()`: instruction 입력에서 transaction message를 계획합니다.
- `useClientCapability(name)`: 클라이언트에 capability가 설치되어 있음을 단언하고, 없으면 설명적인 오류를 던집니다.

## 관련 가이드

- [RPC와 클러스터](/ko/guides/rpc-and-clusters): connection state를 읽고 endpoint를 설정합니다.
- [지갑](/ko/guides/wallets): wallet을 discover, select, connect, disconnect하고 capability를 확인합니다.
- [계정 읽기](/ko/guides/account-reads): balance, account info, program accounts, signature status를 읽습니다.
- [트랜잭션](/ko/guides/transactions): transaction을 sign, send, confirm하고 진행 상태를 표시합니다.
- [메시지 서명](/ko/guides/message-signing): 오프체인 인증 또는 소유권 challenge에 서명합니다.
- [E2E 테스팅](/ko/guides/e2e-testing): Playwright 테스트에서 RPC, RPC 구독, 지갑을 모킹합니다.
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

## Kit Client 사용

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Check Slot</button>
  </section>
</template>
```

`useSolanaClient()`는 `useSolana()`와 같은 context를 반환하지만 Kit 읽기용으로 형태를 갖춥니다. `client`는 전체 `@solana/kit` 클라이언트이고 `rpc`는 그 read API입니다. RPC 결과는 `bigint`, account data는 `Uint8Array`입니다. [Kit 마이그레이션](/ko/guides/kit-migration)을 참고하세요.

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
    <p>Public key: {{ publicKey }}</p>
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

## Sign In With Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Sign in to My App",
    // 서버에서 nonce를 생성하고 서버에서 검증하세요.
    nonce: await fetchNonceFromBackend(),
  });

  // 세션을 만들기 전에 검증할 수 있도록
  // { account.address, signature, signedMessage }를 백엔드로 보내세요.
}
```

지갑은 SIWS 기능을 지원해야 합니다(그렇지 않으면 `canSignIn`이 false이고, `signIn()`은 `WALLET_FEATURE_UNSUPPORTED` 오류로 거부됩니다). 선택된 account가 없는 지갑은 먼저 connect됩니다.

### 서버에서 서명 검증하기

지갑은 사용자가 동의한 SIWS 메시지인 `signedMessage`에 대한 서명을 반환합니다. 검증 없이 결과를 신뢰하면 악의적인 클라이언트가 신원을 위조할 수 있으므로, 세션을 발급하기 전에 서버에서 검증하세요:

1. **메시지 확인**: `signedMessage`를 디코드하고 도메인이 여러분의 origin과 일치하는지, `uri`가 여러분의 것인지, `nonce`가 이 세션을 위해 서버가 발급한 것과 일치하는지, statement/resources가 예상과 일치하는지 확인하세요.
2. **서명 검증**: 서명은 SIWS 메시지 바이트의 Ed25519 서명입니다. `tweetnacl`(`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`)이나 다른 Ed25519 라이브러리로 sign-in 결과의 account `publicKey`에 대해 검증하세요.
3. **세션 바인딩**: 메시지 검사와 서명 검증이 모두 통과된 후에만 세션을 생성하세요. `account.address`를 키로 사용합니다.

서버는 발급한 nonce로부터 기대하는 메시지를 다시 도출하거나 수신된 메시지의 모든 필드를 검증하여, 만료되었거나 재사용된 nonce를 거부해야 합니다.

## 데이터 페칭 컴포저블

`useRequest`, `useSubscription`, `useTrackedData`는 Kit reactive store 프리미티브 위에 구축된 SWR 스타일 데이터 레이어입니다:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value는 SolanaRpcResponse 봉투입니다: data.value.value와
// data.value.context.slot.
```

- `useRequest`는 ref/computed 소스의 identity가 변경되면 다시 실행됩니다. `null`을 전달하면 비활성화됩니다(상태 `disabled`).
- `useSubscription`은 재연결하는 동안 stale 값을 유지합니다. `reconnect()`가 stream을 다시 엽니다.
- `useTrackedData`는 fetch와 구독을 slot 기준으로 deduplicate하여 순서가 뒤바뀐 도착도 값을 되돌릴 수 없습니다.

`rpcValueMapper`와 `rpcSubscriptionValueMapper` 콜백은 **래핑되지 않은** 응답 값(`balance의 경우 value.lamports`)을 받고, 반환되는 `data` ref는 전체 `SolanaRpcResponse` 봉투를 유지하므로 `data.value?.context.slot`을 읽을 수 있습니다.

### `useRequest`로 one-shot 요청하기

`useRequest`는 범용 SWR 요청입니다. 요청 함수, Kit 요청 객체(`send()`가 있는 것), 그중 하나의 `ref`/`computed`, 또는 비활성화를 위한 `null`을 받습니다:

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // 내부 signal과 결합되는 선택적 시도별 취소.
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value는 raw 응답 값입니다. status는
// "fetching" | "success" | "error" | "disabled"입니다.
```

재검증이 실행되는 동안 이전 `data`와 `error`가 채워진 상태로 유지되므로 UI는 계속 렌더링됩니다. `refresh()`는 수동으로 다시 실행되고 시도 결과로 resolve됩니다.

### `useSubscription`으로 스트림 구독하기

`useSubscription`은 Kit reactive stream 소스(`reactiveStore()` 기반 duck typing)를 소비하고, 컴포넌트 unmount 시 연결을 해제하며, stale-while-revalidate를 통한 수동 재연결을 지원합니다:

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// 상태는 "loading" | "loaded" | "error" | "disabled"입니다.
// reconnect()는 data가 마지막으로 알려진 값을 유지한 채 stream을 다시 엽니다.
```

오류는 마지막으로 알려진 `data`를 보존합니다. `null` 소스는 구독을 비활성화하고 상태를 지웁니다.

### 마운트 간 캐시 키 지정

마운트 간 캐시 키 지정을 위해서는 `@vue-solana/vue/swr`의 SWR 어댑터를 사용하세요:

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

같은 키로 마운트된 컴포넌트는 자체 요청이 재검증되는 동안 마지막으로 알려진 값으로 시드됩니다. `useAction` 어댑터는 없습니다. action은 읽을 수 있어 캐시 가능한 데이터가 아니라 mutation이므로, 데이터 레이어의 mutation API(또는 `useAction` 자체)를 사용하세요.

캐시 동작 세부 사항:

- 키는 어댑터별로 네임스페이스가 지정됩니다(`request:`, `subscription:`, `tracked:`). 따라서 동일한 키를 어댑터 간에 안전하게 사용할 수 있습니다.
- `null`/`undefined` 소스는 컴포저블을 비활성화하고 해당 키의 캐시 항목을 **지웁니다**. 컴포넌트가 이미 비활성화된 소스로 마운트되는 경우에도 마찬가지입니다.
- `useTrackedDataSwr`는 전체 `SolanaRpcResponse` 봉투를 캐시하므로, 리마운트된 컴포넌트는 값과 slot context를 모두 복원합니다.
- 캐시는 모듈 수준 `Map`입니다. 서버에서는 요청별로 키에 네임스페이스를 지정하거나 요청 사이에 `clearSwrCache()`를 호출하여 요청 간 누수를 방지하세요.

devnet에 대한 5개 컴포저블 모두의 실행 가능한 데모(SWR 리마운트 동작 포함)는 [Vue Vite 예제](/ko/examples/vue-vite)의 Live Data Panels를 참고하세요.

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

## 배치 트랜잭션

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// N개 트랜잭션에 대한 지갑 요청 한 번.
const signed = await signMany([transactionA, transactionB]);

// N개 서명에 대한 지갑 요청 한 번.
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

둘 다 지갑의 배치 기능을 우선합니다. `useSignTransactions`는 legacy 배치 `signAllTransactions` 기능으로 폴백하고, `useSignAndSendTransactions`는 단일 요청을 순차적으로 전송하는 방식으로 폴백합니다. 배치 서명은 전부 아니면 전부입니다(거부되면 아무것도 서명되지 않음). 하지만 sign-and-send 폴백은 이후 트랜잭션이 실패하면 이전 트랜잭션이 이미 제출된 상태로 남을 수 있습니다. 이 경우 이미 전송된 트랜잭션을 `signatures`에 담은 `PartialSignAndSendError`로 거부되므로 재시도 시 건너뛸 수 있습니다:

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures: 이미 도달한 트랜잭션 — 나머지만 다시 전송합니다.
  }
}
```

## 선택된 지갑 Account

영속성과 필터링을 갖춘 앱 전체 selected-account 상태를 위해 루트 근처에 provider를 한 번 마운트하고 어디서든 읽으세요:

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

선택 항목은 기본적으로 `localStorage`에 `${walletName}:${accountAddress}`로 저장되고(`stateSync`로 커스터마이즈하거나 `null`로 비활성화) 지갑과 account가 사용 가능할 때 다음 방문 시 복원됩니다. `filterWallet`은 어떤 지갑 account가 제공되는지 제한합니다. Nuxt에서는 모듈의 runtime plugin이 이 context를 자동으로 설치합니다.

## 클라이언트 Capability와 계획

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// Kit 클라이언트의 반응형 signer(signer plugin 필요).
const payer = usePayer();
const identity = useIdentity();

// 전송 없이 instruction으로 트랜잭션 메시지를 계획합니다.
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")`는 클라이언트에 capability가 설치되어 있는지 확인하고, 없으면 setup 중에 설명적인 오류(훅 이름과 설치 방법 명시)를 throw합니다. `usePlanTransaction()` / `usePlanTransactions()`는 계획 capability가 필요합니다. 예: `@solana/kit-plugin-rpc`의 `rpcTransactionPlanner()`.

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
