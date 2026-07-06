---
title: "交易"
description: 使用 Vue Solana 签名、发送、确认并处理交易状态。
ogSection: 指南
surroundOrder: 11
---

Vue Solana 提供感知钱包的交易提交 helper，以及用于响应式交易状态的 composable。

本指南覆盖 Vue Solana 边界：钱包能力检查、签名、发送、确认和错误。请使用 `@vue-solana/vue/web3`、`@vue-solana/nuxt/web3` 或你的 program client 构建交易指令。

## Core 发送 Helper

当你已经有 `Connection`、wallet 和 transaction 时，请使用 `@vue-solana/core/transaction` 中的 `signAndSendTransaction()`。

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(connection, wallet, transaction, {
  skipPreflight: false,
});
```

该 helper 返回 RPC signature 字符串。

对于 Android Mobile Wallet Adapter 钱包，当 `signTransaction` 可用时，Vue Solana 会优先使用 `signTransaction` 加 `connection.sendRawTransaction()`，这样应用拥有提交过程，并能在钱包 handoff 后可靠返回 RPC signature。

## 确认签名

需要等待已提交签名达到某个 commitment level 时，使用 `confirmTransactionSignature()`。

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(connection, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

确认默认使用 `confirmed` commitment 和 60 秒超时。

## 构建真实 Devnet 转账

此示例在 devnet 上创建一个很小的 system transfer。它使用 Vue 包的 web3 subpath 获取 Solana primitive，并使用 Vue Solana 处理钱包状态和提交。

创建或序列化交易的浏览器应用应在交易代码运行前初始化一次 Vue 包的 Buffer polyfill：

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

测试时请使用 devnet SOL。从很小的值开始，例如 `1_000` lamports（`0.000001` SOL）。验证教程或示例流程时，永远不要使用有真实资金的钱包。

## Vue 签名和发送流程

当 Vue 组件需要响应式状态、错误和可选确认时，请使用 `useSignAndSendTransaction()`。

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

`status` 区分提交和确认。返回 `signature` 表示交易已提交到 RPC。`confirmation` 表示已提交签名达到请求的 commitment。如果提交后确认超时，请继续显示 signature，并在重试前检查其状态。

## Explorer 链接

Explorer 链接应匹配应用正在使用的 cluster。

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

devnet 链接应类似 `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`。Mainnet 链接有意省略 cluster query。

## 通用交易状态

当你的异步交易类操作不适合内置签名/发送 helper 时，请使用 `useTransaction()`。

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` 为自定义流程集中处理 loading、success、error 和 timeout 状态。

## Nuxt 自动导入

Nuxt 暴露：

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

请从客户端用户操作调用交易方法。不要在 SSR 期间触发钱包签名。

当你需要确认另一个流程返回的签名时，请使用 `useSolanaTransactionConfirmation({ commitment: "confirmed" })` 并调用 `confirm(signature)`。当你想在超时或重定向后继续检查状态时，请使用 `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })`。

## 错误处理

交易 helper 会把失败规范化为 `SolanaError`。

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

## 安全检查清单

- 打开钱包提示前，向用户展示他们将要签署的内容。
- 没有明确用户操作时，永远不要签名或发送交易。
- 永远不要请求或处理私钥。
- 展示签名操作前检查钱包能力。
- 把 RPC 和钱包错误视为不可信数据；将它们映射为安全的 UI 消息。
- 超时后，重试前检查签名状态，避免重复提交。
- 即使确认失败或超时，也在 UI 中保留已提交签名。
- 链接到正确的 Solana Explorer cluster，避免用户混淆 devnet 和 mainnet 交易。
