---
title: "交易"
description: 使用 Vue Solana 签署、发送、确认并处理交易状态。
ogSection: 指南
surroundOrder: 11
---

Vue Solana 提供了感知钱包的钱包提交辅助函数，以及用于响应式交易状态的组合式函数。

本指南涵盖 Vue Solana 的边界：钱包能力检查、签名、发送、确认和错误。请使用 `@solana/kit` 和你的程序客户端的指令辅助函数来构建交易消息。

## Core 发送辅助函数

当你已经拥有 Kit 客户端、钱包和原始 wire 交易字节时，请使用来自 `@vue-solana/core/transaction` 的 `signAndSendTransaction()`。

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

该辅助函数返回 RPC 签名字符串。

对于 Android Mobile Wallet Adapter 钱包，Vue Solana 会在可用时优先使用 `signTransaction`，并通过 `client.rpc.sendTransaction(...).send()` 在应用侧提交 RPC，这样应用拥有提交过程，并能在钱包切换后可靠返回 RPC 签名。

## 确认签名

当你需要等待已提交签名达到某个 commitment 级别时，请使用 `confirmTransactionSignature()`。

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

确认默认使用 `confirmed` commitment 和 60 秒超时。它会轮询 `client.rpc.getSignatureStatuses([signature]).send()`，因此交易必须已经提交。

## 构建真实的 Devnet 转账

此示例在 devnet 上创建一笔很小的系统转账。它构建一条 Kit v0 交易消息，并将其序列化为 Vue Solana 交给钱包签署的 wire 字节。

创建或序列化交易的浏览器应用，应在交易代码运行前初始化一次 Vue 包的 Buffer polyfill：

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

`createTransferTransaction` 返回原始 wire 交易字节（`Uint8Array`），这正是 `SolanaWallet.signTransaction` 和 `useSignAndSendTransaction()` 所接受的格式。

测试时使用 devnet SOL。从非常小的值开始，例如 `1_000` lamports（`0.000001` SOL）。验证教程或示例流程时，永远不要使用包含真实资金的钱包。

## Vue 签署并发送流程

当 Vue 组件需要响应式状态、错误和可选确认时，请使用 `useSignAndSendTransaction()`。

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

`status` 会区分提交和确认。返回 `signature` 表示交易已提交到 RPC。`confirmation` 表示已提交的签名达到了请求的 commitment。如果提交后确认超时，请继续显示签名，并在重试前检查其状态。

## 浏览器链接

浏览器链接应与你的应用使用的集群匹配。

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

对于 devnet，链接应类似 `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`。主网链接会有意省略 cluster 查询参数。

## 通用交易状态

当你的异步交易类操作不适合内置签署/发送辅助函数时，请使用 `useTransaction()`。

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` 为自定义流程集中管理 loading、success、error 和 timeout 状态。

## Nuxt 自动导入

Nuxt 暴露：

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

请从客户端的用户操作调用交易方法。不要在 SSR 期间触发钱包签名。

当你需要确认另一个流程返回的签名时，使用 `useSolanaTransactionConfirmation({ commitment: "confirmed" })` 并调用 `confirm(signature)`。当你希望在超时或重定向后继续检查状态时，使用 `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })`。

## 错误处理

交易辅助函数会将失败标准化为 `SolanaError`。

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

## 安全检查清单

- 打开钱包提示前，向用户展示他们即将签署的内容。
- 没有明确的用户操作时，永远不要签署或发送交易。
- 永远不要请求或处理私钥。
- 显示签名操作前检查钱包能力。
- 将 RPC 和钱包错误视为不可信数据；将它们映射为安全的 UI 消息。
- 超时后，请先检查签名状态再重试，以避免重复提交。
- 即使确认失败或超时，也要在 UI 中保留已提交的签名。
- 链接到正确的 Solana Explorer 集群，避免用户混淆 devnet 和 mainnet 交易。
