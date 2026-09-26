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

## 客户端发送交易

`createSolanaClient()` 默认组合 `@solana/kit-plugin-rpc` 的官方交易 stack：`solanaRpc()`、`rpcTransactionPlanner()` 和 `rpcTransactionPlanSendingExecutor()`。旧的 custom fallback sender 不再使用。

当 client 应在不显示 wallet popup 的情况下 plan、sign、submit 和 confirm 时，使用 `useSendTransaction()` 或 `useSendTransactions()`。官方 executor 会获取新的 blockhash、处理 resource limit 和 preflight、使用 client signer 签名、通过 RPC 提交并等待 `confirmed`。只有 send-and-confirm 操作完成后，composable 才会将 `status` 设为 `sent`。单笔结果在 `data.context.signature` 提供签名，batch 结果包含 plan result tree。

使用 `payer` 或 `payerSecretKey` 配置 direct core/Vue client，或提供带 embedded signer 的交易消息。`payerSecretKey` 是 base64 编码的 64 字节 Ed25519 keypair，只适合 trusted development 或 server flow。永远不要把 raw secret 或 `payerSecretKey` 放入 Nuxt public runtime config，也不要把有资金的 keypair 暴露给 end-user browser。

钱包流程是分开的：`useSignAndSendTransaction()` 默认在 RPC submission 后返回，也可以在传入 `confirm: true` 时等待所选 commitment。当 connected user 必须在 wallet 中批准每笔交易时，请保持这种行为。

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

### 钱包请求的输入与返回值

钱包签名流程接受符合 Solana 交易 schema 的原始 `Uint8Array` wire 字节作为交易输入。使用 `@solana/kit` 构建它们（或从 base64/base58 RPC 响应中解码）；此处不接受 base64 字符串、交易对象和指令列表。

```ts
import { compileTransaction, getTransactionEncoder } from "@solana/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` 接受要签名的原始消息字节。每个钱包发送请求还接受 Kit 的 `SendTransactionOptions`：

| Option                | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| `skipPreflight`       | 发送前跳过 preflight 模拟。                                                 |
| `maxRetries`          | RPC 节点重试次数（`bigint`）。                                              |
| `minContextSlot`      | 交易中任何 blockhash 或 nonce 已知存在的 slot；早于该 slot 发送可能被拒绝。 |
| `preflightCommitment` | 用于 preflight 模拟的 commitment。                                          |

返回形态：

- `useSignMessage().execute(bytes)` resolve 为 `{ signedMessage, signature }`，两者均为 `Uint8Array`。
- `useSignTransactions().execute(transactions)` resolve 为已签名的 `Uint8Array[]`（也以 `signedTransactions` 暴露）；单笔交易请传入单元素数组。
- `useSignAndSendTransaction().execute(transaction)` resolve 为已提交的 `signature` 字符串；配合 `confirm: true` 时还会填充 `confirmation`。
- `useSignAndSendTransactions().execute(transactions)` resolve 为签名组成的 `string[]`（也以 `signatures` 暴露）。

钱包可能在签名前修改消息或交易（例如添加自己的指令或更改 fee payer），Wallet Standard 明确允许这样做。请重新读取返回的 `signedMessage` 或已签名交易字节，而不要假设它们与你的输入逐字节一致。

## 浏览器链接

浏览器链接应与你的应用使用的集群匹配。

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

对于 devnet，链接应类似 `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`。`mainnet` 和旧别名 `mainnet-beta` 链接都会有意省略 cluster 查询参数。

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

请从客户端的用户操作调用交易方法。不要在 SSR 期间触发钱包签名。Nuxt module option 省略了 `payer` 和 `payerSecretKey`；不要把 secret 放入 public runtime config，而应在 client-only Vue plugin 中配置 signer 或使用 connected wallet 的 embedded signer。

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

- 将 client-sent signing key 保存在 trusted server 或明确的 ephemeral demo signer 中；永远不要通过 Nuxt public runtime config 暴露有资金的 secret。
- 打开钱包提示前，向用户展示他们即将签署的内容。
- 没有明确的用户操作时，永远不要签署或发送交易。
- 永远不要请求或处理私钥。
- 显示签名操作前检查钱包能力。
- 将 RPC 和钱包错误视为不可信数据；将它们映射为安全的 UI 消息。
- 超时后，请先检查签名状态再重试，以避免重复提交。
- 即使确认失败或超时，也要在 UI 中保留已提交的签名。
- 链接到正确的 Solana Explorer 集群，避免用户混淆 devnet 和 mainnet 交易。
