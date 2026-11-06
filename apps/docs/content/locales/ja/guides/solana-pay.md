---
title: "Solana Pay"
description: "Solana Pay の転送リクエストを作成し、QR コードを表示・スキャンし、reference による決済確認を行います。"
ogSection: ガイド
surroundOrder: 11
---

Solana Pay は支払いリクエストのための URL 標準です。転送リクエストは、受取人、省略可能な金額、省略可能な SPL トークンの mint、省略可能な表示用フィールドをエンコードします。ウォレットや支払いアプリはその URL を読み取り、対応する転送を準備します。

Vue Solana は `@solana/kit` を直接用いて Solana Pay を実装しています。追加の Solana Pay パッケージは不要で、`qrcode` は QR コードを描画するときだけ遅延読み込みされます。

| 必要なもの                               | API                                                      |
| ---------------------------------------- | -------------------------------------------------------- |
| リクエスト URL を構築する                | `encodeURL()`, `encodeTransferRequestURL()`              |
| 遅延トランザクションリクエストを構築する | `encodeTransactionRequestURL()`                          |
| スキャンまたは貼り付けた URL を読み取る  | `parseURL()`                                             |
| QR コードを描画する                      | `createQR()`, `createQRDataURL()`, `createQRCanvas()`    |
| オンチェーンで reference を追跡する      | `createSolanaPayReference()`, `verifySolanaPayPayment()` |

## 転送リクエストを作成する

`encodeURL()` は Kit の `Address` 値を受け取ります。金額は `bigint` の lamports で、10 進数の SOL 文字列としてエンコードされるため、`100_000_000n` は `amount=0.1` になります。

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
// parsed.amount is a bigint again: 100000000n
```

後で支払いを見つける必要がある場合は `reference` を追加してください。reference は転送自体には関与しない公開鍵で、支払者がトランザクションに添付し、`getSignaturesForAddress(reference)` が決済を返します。

```ts
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
});
```

`encodeTransactionRequestURL({ link })` は代わりにトランザクションリクエストを構築します。ウォレットが `link` を取得し、サーバーが署名対象のトランザクションで応答します。Vue Solana はこれらの URL を解析・エンコードしますが、リンク先のトランザクションを構築したり送信したりはしないため、エンドポイントとその認可は利用者の責任です。

Vue では、`useSolanaPay()` が同じプリミティブをラップし、reference を自動で生成します。

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

`createTransferRequest` は URL を文字列で返し、`requestUrl`、`parsedRequest`、`reference`、および `status: "pending"` を設定します。`parseRequest(value)` は信頼できない入力を解析し、`createReference()` は単独の reference を生成し、`reset()` は状態をクリアします。

## QR コードを描画する

`createQR(url)` は SVG テキストを返します。`createQRDataURL()` は `Buffer` ポリフィルを必要としないパーセントエンコード済みの `data:` URL を返し、`createQRCanvas(canvas, url, options)` は canvas 要素に書き込みます。

```ts
import { createQR } from "@vue-solana/core/solana-pay";

const svg = await createQR(url, 512, "white", "black");
```

Vue では、この文字列を `v-html` で描画します。SVG はユーザー入力ではなく `qrcode` エンコーダーに由来します。

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

`generate(url)` はデフォルトで黒背景に白の 512 px コードを生成します。追加オプションは `createQR` の引数順で渡されるため、`generate(url, { size: 320, background: "#fff", color: "#111" })` は `createQR(url, 320, "#fff", "#111")` に対応します。

## スキャンと検証

`useSolanaQrScanner()` は背面カメラを開き、`BarcodeDetector` で QR コードをポーリングし、各結果を `parseURL()` で解析します。ブラウザ専用であるため、クライアント境界の内側に置き、SSR 中に `start()` を呼び出さないでください。

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

`start()` は `navigator.mediaDevices` が存在しない場合に reject します。ブラウザに `BarcodeDetector` がない場合、カメラは開きますが何も検出されないため、`scanFromText(text)` を呼び出す貼り付け用フィールドを用意してください。`start()` と `scanFromText()` はどちらも `parsed` に `parseURL()` の結果を設定し、解析に失敗した場合は `error` を設定したままにします。スキャンループは解析エラーを無視してスキャンを続けます。

スキャンしたデータは敵対的な入力として扱ってください。受取人、金額、トークン mint、ラベル、メモを表示し、ウォレットのプロンプトを出す前にユーザーへ確認してもらいます。Vue Solana には自動送信の経路はなく、追加すべきでもありません。

## 決済の追跡

転送リクエストはあくまでリクエストです。決済とは、reference を含み、期待される受取人に支払い、期待される金額とトークンを持つ、確認済みのトランザクションを指します。

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

`verifySolanaPayPayment()` はタイムアウトまで `getSignaturesForAddress(reference)` をポーリングし、`{ status, signature, verified, reason }` を返します。注文を履行してよいのは `verified` が `true` の場合だけです。`getSolanaPayPaymentStatus(rpc, reference)` はより安価な非検証の読み取りで、署名がまだ存在しない場合は `pending`、存在する場合は `found`、RPC 呼び出しが失敗した場合は `error` を報告します。

`useSolanaPay()` は `confirmTransfer()` を公開し、解析済みリクエストに対して検証して結果を `status`（`idle`、`pending`、`found`、`confirmed`、`finalized`、`expired`、`error`）に保存します。`useSolanaPayConfirmation()` は同じステータスを一定間隔でポーリングします。

```ts
import { useSolanaPayConfirmation } from "@vue-solana/vue/useSolanaPayConfirmation";

const { status, check, startPolling, stopPolling } = useSolanaPayConfirmation();

startPolling(rpc, reference, 2_000);
// polling stops on unmount; call stopPolling() to end it earlier
```

`useSolanaPayConfirmation()` はコンポーネントのアンマウント時にポーリングを停止します。より早く終了させたい場合は `stopPolling()` を呼び出してください。

## Nuxt の自動インポート

Nuxt モジュールは `useSolanaPay()`、`useSolanaPayConfirmation()`、`useSolanaQrCode()`、`useSolanaQrScanner()` を同じ名前で自動インポートします。スキャナーと `BarcodeDetector` へのアクセスは `<ClientOnly>` でラップし、サーバーサイドレンダリングがカメラ API に触れないようにしてください。

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

コアのヘルパーは自動インポートされません。Kit の型は `@vue-solana/nuxt/kit` から、その他は Vue パッケージのサブパスからインポートするか、コンポーザブルを呼び出してください。

両方のサンプルアプリは、これらのコンポーザブルを実行可能なマーチャント用パネル（`SolanaPayPanel`）とスキャナー用パネル（`SolanaPayScannerPanel`）に組み込んでいます。Nuxt のスキャナーは `<ClientOnly>` の内側にあり、スキャナー用パネルはリクエストをウォレットで開くだけで、決して送信しません。

## セキュリティ境界

- 表示する前に必ずすべての URL を `parseURL()` で解析してください。スキャンした文字列を信頼してはいけません。
- 受取人、金額、トークン、メモを表示し、署名の前に明示的なユーザー操作を必須にしてください。
- スキャンしたコードからトランザクションを自動送信しないでください。
- 商品やクレジットを渡す前にオンチェーンで検証してください。
- 秘密鍵やシークレットをクライアントコードに保存しないでください。また、資金のある鍵を Nuxt の public ランタイム設定に置かないでください。
- `reference` は参照キーとして扱い、それ自体を支払いの証明とはみなさないでください。

## 手動の Devnet テスト

1. ウォレットを devnet に切り替え、`https://faucet.solana.com` から無料の SOL をリクエストします。
2. 数千 lamports の転送リクエストを作成し、QR コードを描画します。
3. Solana Pay 対応ウォレットでスキャンするか、URL を自作のスキャナー UI に貼り付けます。
4. ウォレットに、ページと同じ受取人、金額、メモが表示されることを確認します。
5. 転送を承認し、同じ reference で `verifySolanaPayPayment()` を呼び出して、`verified` が `true` になることを確認します。
6. 誤った金額または受取人で決済確認を再実行し、検証されないことを確認します。

テスト中はごく少額を使用してください。支払者が reference アカウントを添付せずに通常の転送を送った場合、reference が決済されないのは想定どおりの結果です。
