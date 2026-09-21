---
title: "트랜잭션"
description: Vue Solana로 트랜잭션에 서명하고, 전송하고, 확인하고, 상태를 처리합니다.
ogSection: 가이드
surroundOrder: 11
---

Vue Solana는 트랜잭션 제출을 위한 wallet-aware helper와 반응형 트랜잭션 상태를 위한 컴포저블을 제공합니다.

이 가이드는 Vue Solana 경계에서 필요한 지갑 capability 확인, 서명, 전송, confirmation, 오류 처리를 다룹니다. 트랜잭션 message는 `@solana/kit`과 program client의 instruction helper로 구성하세요.

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
} from "@solana/kit";

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

지갑 서명 flow는 트랜잭션 입력으로 Solana 트랜잭션 스키마를 따르는 raw `Uint8Array` wire 바이트를 받습니다. `@solana/kit`으로 만들거나 base64/base58 RPC 응답에서 디코딩하세요. base64 문자열, 트랜잭션 객체, instruction 목록은 여기서 허용되지 않습니다.

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

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
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

devnet 링크는 `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet` 형태여야 합니다. Mainnet 링크는 의도적으로 cluster query를 생략합니다.

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

트랜잭션 메서드는 클라이언트의 사용자 액션에서 호출하세요. SSR 중 wallet signing을 트리거하지 마세요.

다른 flow에서 반환된 signature를 확인해야 하면 `useSolanaTransactionConfirmation({ commitment: "confirmed" })`를 사용하고 `confirm(signature)`를 호출하세요. timeout 또는 redirect 이후 상태를 계속 확인하려면 `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })`를 사용합니다.

## 오류 처리

트랜잭션 helper는 실패를 `SolanaError`로 정규화합니다.

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

- wallet prompt를 열기 전에 사용자가 무엇에 서명하려는지 보여 주세요.
- 명시적 사용자 액션 없이 트랜잭션에 서명하거나 전송하지 마세요.
- private key를 요청하거나 처리하지 마세요.
- signing action을 보여 주기 전에 wallet capability를 확인하세요.
- RPC와 wallet error는 신뢰할 수 없는 데이터로 취급하고 안전한 UI 메시지로 매핑하세요.
- timeout 후에는 중복 제출을 피하기 위해 재시도 전에 signature status를 확인하세요.
- confirmation 실패 또는 timeout이 발생해도 제출된 signature는 UI에 유지하세요.
- 사용자가 devnet과 mainnet 트랜잭션을 혼동하지 않도록 올바른 Solana Explorer cluster로 링크하세요.
