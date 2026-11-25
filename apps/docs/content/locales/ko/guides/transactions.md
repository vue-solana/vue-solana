---
title: "트랜잭션"
description: Vue Solana로 트랜잭션에 서명하고, 전송하고, 확인하고, 상태를 처리합니다.
ogSection: 가이드
surroundOrder: 10
---

Vue Solana는 트랜잭션 제출을 위한 wallet-aware helper와 반응형 트랜잭션 상태를 위한 컴포저블을 제공합니다.

이 가이드는 Vue Solana 경계에서 필요한 지갑 capability 확인, 서명, 전송, confirmation, 오류 처리를 다룹니다. 트랜잭션 message는 `@vue-solana/vue/kit`(Nuxt 앱은 `@vue-solana/nuxt/kit`)에서 다시 export되는 Kit helper와 program client의 instruction helper로 구성하세요.

## Core Send Helper

이미 Kit client, wallet, raw wire transaction bytes가 있다면 `@vue-solana/core/transaction`의 `signAndSendTransaction()`을 사용하세요.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

이 helper는 RPC signature 문자열을 반환합니다.

Android Mobile Wallet Adapter 지갑의 경우, 가능한 때에는 Vue Solana가 `signTransaction`과 `client.rpc.sendTransaction(...).send()`를 통한 app-side RPC 제출을 선호합니다. 이렇게 하면 앱이 제출을 소유하고 wallet handoff 이후에도 RPC signature를 안정적으로 반환할 수 있습니다.

## 트랜잭션 시뮬레이션

제출하기 전에 raw wire transaction을 미리 보려면 `@vue-solana/core/transaction`의 `simulateTransaction()`을 사용하세요. 이 helper는 정규화된 `err`, `logs`, `fee`, lamport 및 token balance 변경, loaded addresses, return data, units consumed를 반환합니다. `err`가 null이 아니면 실패한 시뮬레이션이 데이터로 반환된 것이며, 잘못된 입력이나 RPC/transport 실패만 reject됩니다. 시뮬레이션은 트랜잭션을 제출하지 않으며 향후 포함을 보장하지도 않습니다.

```ts
import { simulateTransaction } from "@vue-solana/core/transaction";
import { useSimulateTransaction } from "@vue-solana/vue/useSimulateTransaction";

const transaction = await createTransferTransaction({
  rpc: client.rpc,
  from,
  to: recipient,
  lamports: 1_000,
});

const preview = await simulateTransaction(client, transaction, {
  replaceRecentBlockhash: true,
});
console.log(
  preview.err,
  preview.fee,
  preview.logs,
  preview.balanceChanges,
  preview.loadedAddresses,
);

// Inside a Vue component setup:
const { data, status, error, execute } = useSimulateTransaction();
await execute(transaction, { replaceRecentBlockhash: true });
```

`useSimulateTransaction()`은 같은 결과를 `data`로 노출하며, `status` 값은 `idle`, `simulating`, `simulated`, `error`입니다. 공유 action-state 패턴을 따르고 `payer`가 필요하지 않습니다. Nuxt에서는 import 없이 `useSolanaSimulateTransaction()`를 호출하세요.

## 수수료 및 컴퓨트 예산 정책

Kit 트랜잭션 메시지에서 컴퓨트 유닛 한도와 가격을 선택하려면 `@vue-solana/core/fee-policy`의 `resolveFeePolicy()`를 사용하세요. 이 함수는 컴퓨트 예산 명령을 적용한 새 메시지와 예산을 설명하는 보고서를 반환합니다. 시뮬레이션 결과가 있으면 전달하고, 없으면 클라이언트의 `rpc.simulateTransaction`으로 Kit 리소스 한도를 추정할 수 있습니다.

```ts
import { resolveFeePolicy } from "@vue-solana/core/fee-policy";
import { useComputeBudget } from "@vue-solana/vue/useComputeBudget";

const { message: budgetedMessage, budget } = await resolveFeePolicy(
  message,
  {
    mode: "standard",
    computeUnitBufferPercent: 20,
    maxLamports: 6_000n,
  },
  { simulationResult: preview },
);

// Inside a Vue component setup:
const {
  budget: reactiveBudget,
  status,
  error,
  apply,
} = useComputeBudget(
  messageRef,
  { mode: "priority", maxMicroLamportsPerComputeUnit: 50_000n },
  { simulationResult: simulationResultRef },
);
await apply();
```

프리셋 모드는 `economy`, `standard`, `priority`입니다. `computeUnitBufferPercent`는 관측된 유닛에 여유를 더하고, `maxMicroLamportsPerComputeUnit`는 유닛당 가격을 제한하며, `maxLamports`는 우선 수수료를 낮춰 예상 총 수수료를 제한합니다. 이 로컬 제한은 이 함수가 적용하며 네트워크 보장이 아닙니다. `maxLamports`를 초과하는 기본 수수료는 제한으로 없앨 수 없고, 무엇이 적용되었는지는 보고서의 `capped`와 `cappedBy`로 확인할 수 있습니다. 모든 수수료와 유닛 값은 추정치이며 전송 시점의 약속이 아닙니다.

`useComputeBudget()`는 `budget`, `message`, `status`, `error`, `loading`, `apply()`, `refresh()`, `reset()`을 노출합니다. 반응형 소스가 바뀌거나 스코프가 해제되면 진행 중인 작업을 대체합니다. Nuxt에서는 import 없이 `useSolanaComputeBudget()`를 호출하세요. 두 계층 모두 메시지에 서명하거나 전송하지 않습니다.

## 트랜잭션 기록

구문 분석된 트랜잭션을 가져오지 않고 주소에 발생한 내용을 나열하려면 `@vue-solana/core/transaction-history`의 `getTransactionHistory()`를 사용하세요. 각 항목은 `signature`, `slot`, 선택적 `blockTime`, `err`, 선택적 `memo`, 선택적 `confirmationStatus` 같은 signature 메타데이터입니다. null이 아닌 `err`는 데이터로 반환된 실패한 트랜잭션입니다. 페이지가 가득하면 `hasMore`가 설정되고 `nextBefore`가 노출되며, 이를 `before`로 다시 전달하면 이전 트랜잭션을 불러올 수 있습니다.

```ts
import { getTransactionHistory } from "@vue-solana/core/transaction-history";
import { useTransactionHistory } from "@vue-solana/vue/useTransactionHistory";

const page = await getTransactionHistory(client, address, { limit: 50 });
const older = page.nextBefore
  ? await getTransactionHistory(client, address, { before: page.nextBefore, limit: 50 })
  : null;

// Inside a Vue component setup:
const { items, hasMore, loadingMore, refresh, loadMore } = useTransactionHistory(address);
await refresh();
if (hasMore.value) await loadMore();
```

`useTransactionHistory()`는 ref 또는 getter 주소를 감시하고 오래된 요청을 무효화하며 scope가 해제되면 진행 중 요청을 abort합니다. `status` 값은 `idle`, `loading`, `loaded`, `error`입니다. Nuxt에서는 import 없이 `useSolanaTransactionHistory()`를 호출하세요.

## 서명 확인

제출된 signature가 특정 commitment level에 도달할 때까지 기다려야 하면 `confirmTransactionSignature()`를 사용하세요.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

confirmation 기본값은 `confirmed` commitment와 60초 timeout입니다. 이는 `client.rpc.getSignatureStatuses([signature]).send()`를 폴링하므로, 트랜잭션이 이미 제출되어 있어야 합니다.

## 클라이언트 전송 트랜잭션

`createSolanaClient()`은 기본적으로 `@solana/kit-plugin-rpc` official transaction stack인 `solanaRpc()`와 `rpcAirdrop()`를 compose합니다. `solanaRpc()`가 transaction planner와 plan-signing/plan-sending executor를 직접 설치합니다. 기존 custom fallback sender는 사용하지 않습니다.

client가 wallet popup 없이 plan, sign, submit, confirm해야 할 때 `useSendTransaction()` 또는 `useSendTransactions()`를 사용하세요. official executor는 새 blockhash를 가져오고 resource limit과 preflight를 처리하며 client signer로 서명하고 RPC로 제출한 뒤 `confirmed`를 기다립니다. send-and-confirm 작업이 완료된 뒤에만 composable의 `status`가 `sent`가 됩니다. 단일 결과는 `data.context.signature`를 제공하고 batch 결과는 plan result tree를 포함합니다.

direct core/Vue client를 `payer` 또는 `payerSecretKey`로 설정하세요. client-sent 경로에는 `payer`가 필요합니다. `payerSecretKey`는 base64 64-byte Ed25519 keypair이며 trusted development 또는 server flow에만 적합합니다. Nuxt public runtime config에 raw secret이나 `payerSecretKey`를 넣지 말고 funded keypair를 end-user browser에 노출하지 마세요.

wallet flow는 별개입니다. `useSignAndSendTransaction()`는 기본적으로 RPC submission 뒤에 반환하거나 `confirm: true`로 선택한 commitment을 기다릴 수 있습니다. connected user가 wallet에서 각 트랜잭션을 승인해야 한다면 이 동작을 유지하세요.

## 실제 Devnet 전송 만들기

이 예제는 devnet에서 아주 작은 system transfer를 만듭니다. Kit v0 transaction message를 만들고, Vue Solana가 서명을 위해 wallet에 넘겨주는 wire bytes로 serialize합니다.

브라우저 앱에서 트랜잭션을 만들거나 serialize한다면 transaction code가 실행되기 전에 Vue 패키지 Buffer polyfill을 한 번 초기화하세요.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

```ts
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
} from "@vue-solana/vue/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

function createTransferInstruction(from: Address, to: Address, lamports: number) {
  const data = new DataView(new ArrayBuffer(12));
  data.setUint32(0, 2, true); // System program transfer instruction index
  data.setBigUint64(4, BigInt(lamports), true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(data.buffer),
  };
}

async function createTransferTransaction(params: {
  rpc: { getLatestBlockhash(): { send(): Promise<{ value: { blockhash: string } }> } };
  from: Address;
  to: string;
  lamports: number;
}) {
  const recipient = address(params.to);
  const { value: latestBlockhash } = await params.rpc.getLatestBlockhash().send();

  const message = setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash,
    setTransactionMessageFeePayer(
      params.from,
      appendTransactionMessageInstruction(
        createTransferInstruction(params.from, recipient, params.lamports),
        createTransactionMessage({ version: 0 }),
      ),
    ),
  );

  return getTransactionEncoder().encode(compileTransaction(message));
}
```

`createTransferTransaction`은 raw wire transaction bytes(`Uint8Array`)를 반환하며, 이는 `SolanaWallet.signTransaction`과 `useSignAndSendTransaction()`이 받아들이는 형식입니다.

테스트 중에는 devnet SOL을 사용하세요. `1_000` lamports(`0.000001` SOL)처럼 아주 작은 값으로 시작합니다. 튜토리얼이나 예제 flow를 검증할 때 실제 자금이 있는 지갑을 사용하지 마세요.

## Vue 서명 및 전송 Flow

Vue component에서 반응형 status, error, 선택적 confirmation이 필요하면 `useSignAndSendTransaction()`을 사용하세요.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PASTE_DEVNET_RECIPIENT_ADDRESS");
const lamports = ref(1_000);
const { client } = useSolanaClient();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  const from = publicKey.value;
  if (!from) return;

  const transaction = await createTransferTransaction({
    rpc: client.rpc,
    from,
    to: recipient.value,
    lamports: lamports.value,
  });

  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed" },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to send transaction.</p>
  </section>
</template>
```

`status`는 제출과 confirmation을 구분합니다. `signature`가 반환되었다면 트랜잭션이 RPC에 제출된 것입니다. `confirmation`은 제출된 signature가 요청한 commitment에 도달했다는 뜻입니다. 제출 후 confirmation이 timeout되면 signature를 계속 보여 주고, 재시도 전에 해당 status를 확인하세요.

### 지갑 요청 입력과 반환값

지갑 서명 flow는 트랜잭션 입력으로 Solana 트랜잭션 스키마를 따르는 raw `Uint8Array` wire 바이트를 받습니다. `@vue-solana/vue/kit`의 helper로 만들거나 base64/base58 RPC 응답에서 디코딩하세요. base64 문자열, 트랜잭션 객체, instruction 목록은 여기서 허용되지 않습니다.

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()`는 서명할 raw 메시지 바이트를 받습니다. 모든 지갑 전송 요청은 Kit `SendTransactionOptions`도 받습니다:

| Option                | Description                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `skipPreflight`       | 전송 전 preflight 시뮬레이션을 건너뜁니다.                                                       |
| `maxRetries`          | RPC 노드 재시도 횟수(`bigint`).                                                                  |
| `minContextSlot`      | 트랜잭션의 blockhash 또는 nonce가 존재한다고 알려진 slot. 이보다 먼저 보내면 거부될 수 있습니다. |
| `preflightCommitment` | preflight 시뮬레이션에 사용하는 commitment.                                                      |

반환 형태:

- `useSignMessage().execute(bytes)`는 `{ signedMessage, signature }`로 resolve되며 둘 다 `Uint8Array`입니다.
- `useSignTransactions().execute(transactions)`는 서명된 `Uint8Array[]`로 resolve됩니다(`signedTransactions`로도 노출됨). 트랜잭션 하나에는 단일 요소 배열을 전달하세요.
- `useSignAndSendTransaction().execute(transaction)`는 제출된 `signature` 문자열로 resolve됩니다. `confirm: true`이면 `confirmation`도 채웁니다.
- `useSignAndSendTransactions().execute(transactions)`는 signature의 `string[]`로 resolve됩니다(`signatures`로도 노출됨).

지갑은 서명 전에 메시지나 트랜잭션을 수정할 수 있습니다(예: 자체 instruction 추가 또는 fee payer 변경). Wallet Standard가 이를 명시적으로 허용합니다. 입력과 바이트 단위로 일치한다고 가정하지 말고 반환된 `signedMessage`나 서명된 트랜잭션 바이트를 다시 읽으세요.

## Explorer 링크

Explorer 링크는 앱이 사용하는 cluster와 일치해야 합니다.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

devnet 링크는 `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet` 형태여야 합니다. `mainnet`과 이전 별칭 `mainnet-beta` 링크는 의도적으로 cluster query를 생략합니다.

## 일반 트랜잭션 상태

비동기 transaction-like 작업이 built-in sign/send helper에 맞지 않으면 `useTransaction()`을 사용하세요.

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()`은 custom flow의 loading, success, error, timeout 상태를 한곳에서 관리합니다.

## Nuxt 자동 Import

Nuxt는 다음을 노출합니다.

- `useSolanaSignAndSendTransaction()`
- `useSolanaSendTransaction()`
- `useSolanaSendTransactions()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const { signature, status, error, execute } = useSolanaSignAndSendTransaction();

async function submit(transaction: Uint8Array) {
  await execute(transaction, { confirm: true });
}
</script>
```

트랜잭션 메서드는 클라이언트의 사용자 액션에서 호출하세요. SSR 중 wallet signing을 트리거하지 마세요. Nuxt module option은 `payer`와 `payerSecretKey`를 제외하므로, public runtime config에 secret을 넣지 말고 `clientPlugin: false`와 함께 client-only Vue plugin에서 `payer`를 설정하세요.

다른 flow에서 반환된 signature를 확인해야 하면 `useSolanaTransactionConfirmation({ commitment: "confirmed" })`를 사용하고 `confirm(signature)`를 호출하세요. timeout 또는 redirect 이후 상태를 계속 확인하려면 `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })`를 사용합니다.

## 오류 처리

트랜잭션 helper는 실패를 `SolanaError`로 정규화합니다. 실패한 트랜잭션의 데이터가 이미 있다면 [실패한 트랜잭션 진단](/ko/guides/errors)으로 설명 가능한 객체로 합칠 수 있습니다.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
      case "WALLET_NOT_CONNECTED":
        // Ask the user to connect a wallet.
        break;
      case "WALLET_FEATURE_UNSUPPORTED":
        // Hide or disable unsupported transaction actions.
        break;
      case "USER_REJECTED":
        // The user declined the wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // Check signature status before retrying.
        break;
      case "RPC_FAILURE":
        // RPC send or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

## 안전 체크리스트

- client-sent signing key는 trusted server 또는 명시적인 ephemeral demo signer에 두고, Nuxt public runtime config를 통해 funded secret을 노출하지 마세요.
- wallet prompt를 열기 전에 사용자가 무엇에 서명하려는지 보여 주세요.
- 명시적 사용자 액션 없이 트랜잭션에 서명하거나 전송하지 마세요.
- private key를 요청하거나 처리하지 마세요.
- signing action을 보여 주기 전에 wallet capability를 확인하세요.
- RPC와 wallet error는 신뢰할 수 없는 데이터로 취급하고 안전한 UI 메시지로 매핑하세요.
- timeout 후에는 중복 제출을 피하기 위해 재시도 전에 signature status를 확인하세요.
- confirmation 실패 또는 timeout이 발생해도 제출된 signature는 UI에 유지하세요.
- 사용자가 devnet과 mainnet 트랜잭션을 혼동하지 않도록 올바른 Solana Explorer cluster로 링크하세요.
