---
title: "Solana Pay"
description: Solana Pay 전송 요청을 만들고, QR 코드를 렌더링하고 스캔하며, reference로 정산을 확인합니다.
ogSection: 가이드
surroundOrder: 15
---

Solana Pay는 결제 요청을 위한 URL 표준입니다. 전송 요청에는 recipient, 선택적 amount, 선택적 SPL token mint, 선택적 표시 필드가 인코딩됩니다. 지갑과 결제 앱은 이 URL을 읽고 일치하는 전송을 준비합니다.

Vue Solana는 Solana Pay를 `@solana/kit` 위에 직접 구현합니다. 추가 Solana Pay 패키지가 필요하지 않으며, `qrcode`는 QR 코드를 렌더링할 때만 지연 로드됩니다.

| 필요한 작업                  | API                                                      |
| ---------------------------- | -------------------------------------------------------- |
| 요청 URL 만들기              | `encodeURL()`, `encodeTransferRequestURL()`              |
| 지연된 트랜잭션 요청 만들기  | `encodeTransactionRequestURL()`                          |
| 스캔하거나 붙여넣은 URL 읽기 | `parseURL()`                                             |
| QR 코드 렌더링               | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| 온체인 reference 추적        | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## 전송 요청 만들기

`encodeURL()`은 Kit `Address` 값을 받습니다. amount는 lamport 단위의 `bigint`이며 소수점 SOL 문자열로 인코딩되므로 `100_000_000n`은 `amount=0.1`이 됩니다.

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
// parsed.amount는 다시 bigint입니다: 100000000n
```

나중에 결제를 찾아야 한다면 `reference`를 추가하세요. reference는 전송 자체에는 관여하지 않는 public key입니다. payer가 트랜잭션에 이를 첨부하면 `getSignaturesForAddress(reference)`로 정산 내역을 조회할 수 있습니다.

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })`는 대신 트랜잭션 요청을 만듭니다. 지갑이 `link`를 가져오면 서버가 서명할 트랜잭션으로 응답합니다. Vue Solana는 이런 URL을 파싱하고 인코딩하지만 연결된 트랜잭션을 만들거나 전송하지 않으므로, 엔드포인트와 그 권한 관리는 앱의 책임입니다.

Vue에서는 `useSolanaPay()`가 같은 프리미티브를 감싸고 reference를 대신 생성합니다:

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

`createTransferRequest`는 URL을 문자열로 반환하고 `requestUrl`, `parsedRequest`, `reference`, `status: "pending"`을 채웁니다. `parseRequest(value)`는 신뢰할 수 없는 입력을 파싱하고, `createReference()`는 독립적인 reference를 만들며, `reset()`은 상태를 초기화합니다.

## QR 코드 렌더링

`createQR(url)`은 SVG 텍스트를 반환합니다. `createQRDataURL()`은 `Buffer` polyfill이 필요 없는 퍼센트 인코딩 `data:` URL을 반환하고, `createQRCanvas(canvas, url, options)`는 canvas 요소에 그립니다.

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

Vue에서는 `v-html`로 문자열을 렌더링하세요. SVG는 사용자 입력이 아니라 `qrcode` 인코더에서 나옵니다:

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

`generate(url)`은 기본값으로 512 px 흰 바탕 검정 코드를 만듭니다. 추가 옵션은 `createQR` 인자 순서대로 전달되므로 `generate(url, { size: 320, background: "#fff", color: "#111" })`은 `createQR(url, 320, "#fff", "#111")`과 같습니다.

## 스캔과 검증

`useSolanaQrScanner()`는 후면 카메라를 열고 `BarcodeDetector`로 QR 코드를 주기적으로 확인하며 각 결과를 `parseURL()`로 파싱합니다. 브라우저 전용이므로 클라이언트 경계 뒤에서 사용하고 SSR 중에는 `start()`를 호출하지 마세요.

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

`start()`는 `navigator.mediaDevices`가 없으면 거부됩니다. 브라우저에 `BarcodeDetector`가 없으면 카메라는 열리지만 아무것도 감지되지 않으므로, `scanFromText(text)`를 호출하는 붙여넣기 필드를 제공하세요. `start()`와 `scanFromText()` 모두 `parsed`에 `parseURL()` 결과를 넣고 파싱에 실패하면 `error`를 남깁니다. 스캔 루프는 파싱 오류를 무시하고 계속 스캔합니다.

스캔한 데이터는 적대적인 입력으로 취급하세요. recipient, amount, token mint, label, memo를 보여 주고 사용자가 확인한 뒤에만 지갑 프롬프트를 띄우세요. Vue Solana에는 자동 전송 경로가 없으며, 추가해서도 안 됩니다.

## 정산 추적

전송 요청은 요청일 뿐입니다. 정산은 reference를 포함하고, 예상 recipient에게 지불하며, 예상 amount와 token을 담은 확정된 트랜잭션을 의미합니다.

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

`verifySolanaPayPayment()`는 timeout까지 `getSignaturesForAddress(reference)`를 주기적으로 조회하고 `{ status, signature, verified, reason }`을 반환합니다. `verified`가 `true`일 때만 주문을 처리하세요. `getSolanaPayPaymentStatus(rpc, reference)`는 검증 없는 더 저렴한 조회입니다. 아직 signature가 없으면 `pending`, 있으면 `found`, RPC 호출이 실패하면 `error`를 보고합니다.

`useSolanaPay()`는 파싱된 요청과 대조해 검증하고 결과를 `status`(`idle`, `pending`, `found`, `confirmed`, `finalized`, `expired`, `error`)에 저장하는 `confirmTransfer()`를 제공합니다. `useSolanaPayConfirmation()`은 같은 상태를 주기적으로 조회합니다:

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()`은 컴포넌트가 unmount되면 polling을 중지합니다. 더 일찍 끝내려면 `stopPolling()`을 호출하세요.

## Nuxt Auto-Import

Nuxt 모듈은 `useSolanaPay()`, `useSolanaPayConfirmation()`, `useSolanaQrCode()`, `useSolanaQrScanner()`를 같은 이름으로 auto-import합니다. 서버 렌더링이 카메라 API를 건드리지 않도록 스캐너와 모든 `BarcodeDetector` 접근을 `<ClientOnly>`로 감싸세요.

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

Core helper는 auto-import되지 않습니다. Kit 타입은 `@vue-solana/nuxt/kit`에서, 나머지는 Vue 패키지 subpath에서 import하거나 컴포저블을 호출하세요.

## 보안 경계

- 보여 주기 전에 항상 `parseURL()`로 URL을 파싱하고, 스캔한 문자열을 신뢰하지 마세요.
- recipient, amount, token, memo를 보여 주고 서명 전에 사용자의 명시적 동작을 요구하세요.
- 스캔한 코드에서 트랜잭션을 자동 전송하지 마세요.
- 상품이나 크레딧을 제공하기 전에 온체인에서 검증하세요.
- 클라이언트 코드에 private key나 secret을 저장하지 말고, Nuxt public runtime config에 자금이 있는 키를 넣지 마세요.
- `reference`는 조회 키일 뿐 그 자체로 결제 증명이 아닙니다.

## Devnet 수동 테스트

1. 지갑을 devnet으로 전환하고 `https://faucet.solana.com`에서 무료 SOL을 받으세요.
2. 몇 천 lamport의 전송 요청을 만들고 QR 코드를 렌더링하세요.
3. Solana Pay를 지원하는 지갑으로 스캔하거나, 직접 만든 스캔 UI에 URL을 붙여넣으세요.
4. 지갑에 표시되는 recipient, amount, memo가 페이지에 표시된 값과 같은지 확인하세요.
5. 전송을 승인한 뒤 같은 reference로 `verifySolanaPayPayment()`를 호출하고 `verified`가 `true`가 되는지 확인하세요.
6. 잘못된 amount나 recipient로 정산을 다시 실행해 검증되지 않는지 확인하세요.

테스트 중에는 작은 금액을 사용하세요. payer가 reference account를 첨부하지 않고 일반 전송을 보내면 reference가 정산되지 않는 것이 정상입니다.
