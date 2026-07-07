---
title: "트랜잭션"
description: Vue Solana로 트랜잭션에 서명하고, 전송하고, 확인하고, 상태를 처리합니다.
ogSection: 가이드
surroundOrder: 11
---

Vue Solana는 트랜잭션 제출을 위한 wallet-aware helper와 반응형 트랜잭션 상태를 위한 컴포저블을 제공합니다.

이 가이드는 Vue Solana 경계에서 필요한 지갑 capability 확인, 서명, 전송, confirmation, 오류 처리를 다룹니다. 트랜잭션 instruction은 `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3` 또는 program client로 구성하세요.

## Core Send Helper

이미 `Connection`, wallet, transaction이 있다면 `@vue-solana/core/transaction`의 `signAndSendTransaction()`을 사용하세요.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction, {
  skipPreflight: false,
});
```

이 helper는 RPC signature 문자열을 반환합니다.

Android Mobile Wallet Adapter 지갑의 경우, 가능한 때에는 Vue Solana가 `signTransaction`과 `connection.sendRawTransaction()`을 선호합니다. 이렇게 하면 앱이 제출을 소유하고 wallet handoff 이후에도 RPC signature를 안정적으로 반환할 수 있습니다.

## 서명 확인

제출된 signature가 특정 commitment level에 도달할 때까지 기다려야 하면 `confirmTransactionSignature()`를 사용하세요.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(connection, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

confirmation 기본값은 `confirmed` commitment와 60초 timeout입니다.

## 실제 Devnet 전송 만들기

이 예제는 devnet에서 아주 작은 system transfer를 만듭니다. Solana primitive에는 Vue 패키지 web3 subpath를 사용하고, 지갑 상태와 제출에는 Vue Solana를 사용합니다.

브라우저 앱에서 트랜잭션을 만들거나 serialize한다면 transaction code가 실행되기 전에 Vue 패키지 Buffer polyfill을 한 번 초기화하세요.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

```ts
import { PublicKey, SystemProgram, Transaction } from "@vue-solana/vue/web3";

async function createTransferTransaction(params: {
  connection: Connection;
  from: PublicKey;
  to: string;
  lamports: number;
}) {
  const recipient = new PublicKey(params.to);
  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: params.from,
    blockhash,
    lastValidBlockHeight,
  });

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: params.from,
      toPubkey: recipient,
      lamports: params.lamports,
    }),
  );

  return transaction;
}
```

테스트 중에는 devnet SOL을 사용하세요. `1_000` lamports(`0.000001` SOL)처럼 아주 작은 값으로 시작합니다. 튜토리얼이나 예제 flow를 검증할 때 실제 자금이 있는 지갑을 사용하지 마세요.

## Vue 서명 및 전송 Flow

Vue component에서 반응형 status, error, 선택적 confirmation이 필요하면 `useSignAndSendTransaction()`을 사용하세요.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useConnection } from "@vue-solana/vue/useConnection";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PASTE_DEVNET_RECIPIENT_ADDRESS");
const lamports = ref(1_000);
const connection = useConnection();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  if (!publicKey.value) return;

  const transaction = await createTransferTransaction({
    connection,
    from: publicKey.value,
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

async function submit(transaction: Transaction) {
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
  await signAndSendTransaction(connection, wallet, transaction);
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
