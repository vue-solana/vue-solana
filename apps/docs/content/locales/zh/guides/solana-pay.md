---
title: "Solana Pay"
description: 创建 Solana Pay 转账请求，渲染和扫描二维码，并按引用确认结算。
ogSection: 指南
surroundOrder: 11
---

Solana Pay 是用于支付请求的 URL 标准。转账请求会编码收款方、可选金额、可选 SPL 代币 mint 以及可选展示字段。钱包和支付应用读取该 URL 并准备匹配的转账。

Vue Solana 直接基于 `@solana/kit` 实现 Solana Pay。无需额外的 Solana Pay 包，`qrcode` 只在你渲染二维码时才延迟加载。

| 需求                 | API                                                      |
| -------------------- | -------------------------------------------------------- |
| 构建请求 URL         | `encodeURL()`, `encodeTransferRequestURL()`              |
| 构建延迟交易请求     | `encodeTransactionRequestURL()`                          |
| 读取扫描或粘贴的 URL | `parseURL()`                                             |
| 渲染二维码           | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| 在链上跟踪引用       | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## 创建转账请求

`encodeURL()` 接收 Kit 的 `Address` 值。金额是以 lamport 为单位的 `bigint`，会编码为十进制 SOL 字符串，因此 `100_000_000n` 会变成 `amount=0.1`。

```ts
import { address } from "@vue-solana/vue/kit";
import { encodeURL, parseURL } from "@vue-solana/core/solana-pay";

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  label: "Example store",
  message: "Order 1042",
  memo: "order-1042",
});

// solana:PASTE_A_SOLANA_ADDRESS?amount=0.1&label=Example+store&message=Order+1042&memo=order-1042
console.log(url.toString());

const parsed = parseURL(url.toString());
// parsed.amount 又变回 bigint：100000000n
```

当你需要事后查找付款时，添加 `reference`。引用是一个不参与转账本身的公钥；付款方会把它附加到交易上，之后 `getSignaturesForAddress(reference)` 就能返回该结算。

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })` 则构建交易请求：钱包获取 `link`，你的服务器返回一个待签名交易。Vue Solana 会解析和编码这类 URL，但不会构建或发送链接指向的交易，因此该端点及其授权由你负责。

在 Vue 中，`useSolanaPay()` 封装了同样的基础函数，并为你生成引用：

```vue
<script setup lang="ts">
import { address } from "@vue-solana/vue/kit";
import { useSolanaPay } from "@vue-solana/vue/useSolanaPay";

const { createTransferRequest, requestUrl, reference, parsedRequest, status, loading, error } =
  useSolanaPay();

async function createRequest() {
  await createTransferRequest({
    recipient: address("PASTE_A_SOLANA_ADDRESS"),
    amount: 100_000_000n,
    label: "Example store",
    message: "Order 1042",
  });
}
</script>
```

`createTransferRequest` 以字符串形式返回 URL，并填充 `requestUrl`、`parsedRequest`、`reference` 和 `status: "pending"`。`parseRequest(value)` 解析不可信输入，`createReference()` 生成独立引用，`reset()` 清空状态。

## 渲染二维码

`createQR(url)` 返回 SVG 文本。`createQRDataURL()` 返回经过百分号编码的 `data:` URL，不需要 `Buffer` polyfill；`createQRCanvas(canvas, url, options)` 写入 canvas 元素。

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

在 Vue 中用 `v-html` 渲染该字符串——SVG 来自 `qrcode` 编码器，而不是用户输入：

```vue
<script setup lang="ts">
import { useSolanaQrCode } from "@vue-solana/vue/useSolanaQrCode";

const { svg, generate, loading, error } = useSolanaQrCode();

async function showQr(requestUrl: string) {
  await generate(requestUrl);
}
</script>

<template>
  <div v-if="svg" v-html="svg" />
</template>
```

`generate(url)` 默认生成 512 px 白底黑码。额外选项按 `createQR` 的参数顺序传入，因此 `generate(url, { size: 320, background: "#fff", color: "#111" })` 等价于 `createQR(url, 320, "#fff", "#111")`。

## 扫描和校验

`useSolanaQrScanner()` 打开后置摄像头，用 `BarcodeDetector` 轮询二维码，并用 `parseURL()` 解析每个结果。它仅在浏览器中运行：请放在客户端边界之后，切勿在 SSR 期间调用 `start()`。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSolanaQrScanner } from "@vue-solana/vue/useSolanaQrScanner";

const video = ref<HTMLVideoElement | null>(null);
const { scanning, parsed, error, start, stop, reset } = useSolanaQrScanner();

async function beginScan() {
  await start({ video: video.value ?? undefined, scanIntervalMs: 500 });
}
</script>

<template>
  <video ref="video" playsinline muted />
  <button type="button" @click="beginScan">Start scanner</button>
  <button type="button" @click="stop">Stop</button>
  <p v-if="scanning">Scanning…</p>
  <p v-if="error">Camera unavailable — paste the payment URL instead.</p>
</template>
```

当缺少 `navigator.mediaDevices` 时 `start()` 会失败。浏览器没有 `BarcodeDetector` 时，摄像头仍会打开但不会检测到内容，因此请提供一个粘贴输入框并调用 `scanFromText(text)`。`start()` 和 `scanFromText()` 都会把 `parseURL()` 的结果写入 `parsed`，解析失败时保留 `error`；扫描循环会忽略解析错误并继续扫描。

把扫描到的数据当作敌意输入。展示收款方、金额、代币 mint、标签和备注，并让用户确认后再发起任何钱包请求。Vue Solana 不提供任何自动发送路径，你也不应自行添加。

## 跟踪结算

转账请求只是一个请求。结算指的是已确认的交易，它包含你的引用、向预期收款方付款，并携带预期金额和代币。

```ts
import { verifySolanaPayPayment } from "@vue-solana/core/solana-pay-confirmation";

const result = await verifySolanaPayPayment(rpc, {
  reference,
  expectedRecipient: "PASTE_A_SOLANA_ADDRESS",
  expectedAmount: 100_000_000n,
  // expectedTokenMint: mint, // required for SPL token payments
  commitment: "confirmed",
  timeoutMs: 30_000,
});
```

`verifySolanaPayPayment()` 会在超时前轮询 `getSignaturesForAddress(reference)`，并返回 `{ status, signature, verified, reason }`。只有 `verified` 为 `true` 时才履约。`getSolanaPayPaymentStatus(rpc, reference)` 是更便宜的非校验读取：尚无签名时报告 `pending`，存在签名时报告 `found`，RPC 调用失败时报告 `error`。

`useSolanaPay()` 提供 `confirmTransfer()`，它会对照已解析的请求进行校验，并把结果写入 `status`（`idle`、`pending`、`found`、`confirmed`、`finalized`、`expired`、`error`）。`useSolanaPayConfirmation()` 按间隔轮询同一状态：

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()` 会在组件卸载时停止轮询；调用 `stopPolling()` 可提前结束。

## Nuxt 自动导入

Nuxt 模块以相同名称自动导入 `useSolanaPay()`、`useSolanaPayConfirmation()`、`useSolanaQrCode()` 和 `useSolanaQrScanner()`。请把扫描器和所有 `BarcodeDetector` 访问包在 `<ClientOnly>` 中，确保服务端渲染永远不会接触摄像头 API。

```vue
<template>
  <ClientOnly>
    <QrScannerPanel />
    <template #fallback>
      <p>Scanner loads in the browser.</p>
    </template>
  </ClientOnly>
</template>
```

核心辅助函数不会被自动导入。Kit 类型从 `@vue-solana/nuxt/kit` 导入，其余从 Vue 包子路径导入，或直接调用组合式函数。

两个示例应用都将这些组合式函数接入可运行的商户（`SolanaPayPanel`）和扫描器（`SolanaPayScannerPanel`）面板。Nuxt 扫描器始终位于 `<ClientOnly>` 内，扫描器面板只会在钱包中打开请求，绝不会发送。

## 安全边界

- 展示之前先用 `parseURL()` 解析每个 URL；绝不要信任扫描到的字符串。
- 展示收款方、金额、代币和备注，并在签名前要求用户明确操作。
- 绝不从扫描到的代码自动发送交易。
- 在发货或授信之前先在链上校验。
- 绝不在客户端代码中保存私钥或密钥，也绝不要把有资金的密钥放进 Nuxt 公共运行时配置。
- 把 `reference` 当作查询键，而不是付款凭证本身。

## Devnet 手动测试

1. 把钱包切换到 devnet，并在 `https://faucet.solana.com` 领取免费 SOL。
2. 创建一个几千 lamport 的转账请求并渲染二维码。
3. 用支持 Solana Pay 的钱包扫描，或把 URL 粘贴到你自己的扫描界面。
4. 确认钱包显示的收款方、金额和备注与页面显示一致。
5. 批准转账，然后用相同的引用调用 `verifySolanaPayPayment()`，确认 `verified` 变为 `true`。
6. 用错误的金额或收款方再次执行结算，确认无法通过校验。

测试时使用小额。当付款方发送普通转账而未附加引用账户时，引用始终不会结算，这是预期结果。
