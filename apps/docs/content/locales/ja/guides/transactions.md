---
title: "トランザクション"
description: Vue Solana でトランザクションに署名、送信、確認し、状態を処理します。
ogSection: ガイド
surroundOrder: 10
---

Vue Solana は、トランザクションを送信するためのウォレット対応ヘルパーと、リアクティブなトランザクション状態のためのコンポーザブルを提供します。

このガイドでは Vue Solana の境界を扱います: ウォレット機能のチェック、署名、送信、確認、エラーです。トランザクションメッセージは、`@vue-solana/vue/kit`（Nuxt アプリでは `@vue-solana/nuxt/kit`）から再エクスポートされる Kit ヘルパーと、プログラムクライアントのインストラクションヘルパーで構築してください。`@solana/kit` を自分でインストールする必要はありません。

## Core の送信ヘルパー

すでに Kit クライアント、ウォレット、生のワイヤートランザクションバイトがある場合は、`@vue-solana/core/transaction` の `signAndSendTransaction()` を使用してください。

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

このヘルパーは RPC の署名文字列を返します。

Android Mobile Wallet Adapter ウォレットの場合、可能であれば `signTransaction` と、アプリ側の `client.rpc.sendTransaction(...).send()` による RPC 送信が優先されます。これによりアプリが送信を所有し、ウォレットハンドオフ後も RPC の署名を確実に返せます。

## 署名を確認する

送信した署名がコミットメントレベルに到達するまで待つ必要がある場合は、`confirmTransactionSignature()` を使用してください。

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

確認はデフォルトで `confirmed` コミットメントと 60 秒のタイムアウトになります。`client.rpc.getSignatureStatuses([signature]).send()` をポーリングするため、トランザクションはすでに送信済みである必要があります。

## クライアントから送信するトランザクション

`createSolanaClient()` は、公式の `@solana/kit-plugin-rpc` トランザクションスタックをデフォルトで構成します: `solanaRpc()` に続いて `rpcAirdrop()` です。`solanaRpc()` 自体がトランザクションプランナーと、プラン署名・プラン送信のエグゼキューターをインストールします。以前の独自フォールバック送信処理は使用されません。

ウォレットのポップアップなしでクライアントが計画、署名、送信、確認を行う場合は、`useSendTransaction()` または `useSendTransactions()` を使用してください。公式エグゼキューターは新しいブロックハッシュを取得し、リソース制限とプリフライトシミュレーションを処理し、クライアントの署名者で署名し、RPC 経由で送信し、`confirmed` コミットメントまで待機します。コンポーザブルが `status` を `sent` にするのは、この送信と確認の処理が完了した後だけです。単一の結果は `data.context.signature` を公開し、バッチの結果にはプラン結果ツリーが含まれます。

直接 core または Vue のクライアントを `payer` または `payerSecretKey` で構成してください。クライアント送信パスには `payer` が必要です。`payerSecretKey` は base64 でエンコードされた 64 バイトの Ed25519 キーペアで、信頼できる開発フローまたはサーバー側フローでのみ適切です。生のシークレットや `payerSecretKey` を Nuxt の public ランタイム設定に置かず、資金のある署名鍵をエンドユーザーのブラウザに公開しないでください。

ウォレットフローは別です: `useSignAndSendTransaction()` はデフォルトで RPC 送信後に返ることも、`confirm: true` で選択したコミットメントまで待つこともできます。接続済みのユーザーがウォレットでトランザクションを承認する必要がある場合は、その動作を維持してください。

## 実際の devnet 送金を構築する

この例では、devnet 上で小さなシステム送金を作成します。Kit の v0 トランザクションメッセージを構築し、Vue Solana が署名のためにウォレットへ渡すワイヤーバイトにシリアライズします。

トランザクションを作成・シリアライズするブラウザアプリは、トランザクションのコードが実行される前に、Vue パッケージの Buffer ポリフィルを一度初期化する必要があります:

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

`createTransferTransaction` は生のワイヤートランザクションバイト（`Uint8Array`）を返します。これは `SolanaWallet.signTransaction` と `useSignAndSendTransaction()` が受け取る形式です。

テスト中は devnet の SOL を使用してください。`1_000` lamports（`0.000001` SOL）のような小さな値から始めてください。チュートリアルやサンプルフローを検証する際に、実際の資金が入ったウォレットを決して使わないでください。

## Vue の署名と送信フロー

Vue コンポーネントでリアクティブな状態、エラー、任意の確認が必要な場合は、`useSignAndSendTransaction()` を使用してください。

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

`status` は送信と確認を区別します。`signature` が返るということは、トランザクションが RPC に送信されたことを意味します。`confirmation` は、送信済みの署名が要求したコミットメントに到達したことを意味します。送信後に確認がタイムアウトした場合は、署名を表示し続け、再試行する前にそのステータスを確認してください。

### ウォレットリクエストの入力と戻り値

ウォレット署名フローは、Solana トランザクションスキーマに準拠した生の `Uint8Array` ワイヤーバイトをトランザクション入力として受け取ります。`@vue-solana/vue/kit` の Kit ヘルパーで構築する（または base64/base58 の RPC レスポンスからデコードする）形を想定しており、base64 文字列、トランザクションオブジェクト、インストラクションのリストはここでは受け付けません。

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` は署名する生のメッセージバイトを受け取ります。すべてのウォレット送信リクエストは、Kit の `SendTransactionOptions` も受け付けます:

| オプション            | 説明                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | 送信前のプリフライトシミュレーションをスキップします。                                                                                 |
| `maxRetries`          | RPC ノードのリトライ回数（`bigint`）。                                                                                                 |
| `minContextSlot`      | トランザクション内のブロックハッシュまたはナンスが存在することが知られているスロット。これより前に送信すると拒否されることがあります。 |
| `preflightCommitment` | プリフライトシミュレーションで使用するコミットメント。                                                                                 |

戻り値の形:

- `useSignMessage().execute(bytes)` は `{ signedMessage, signature }` に解決され、どちらも `Uint8Array` です。
- `useSignTransactions().execute(transactions)` は署名済みの `Uint8Array[]` に解決されます（`signedTransactions` としても公開されます）。トランザクションが 1 つの場合は要素 1 つの配列を渡してください。
- `useSignAndSendTransaction().execute(transaction)` は送信された `signature` 文字列に解決されます。`confirm: true` の場合は `confirmation` も埋まります。
- `useSignAndSendTransactions().execute(transactions)` は署名の `string[]` に解決されます（`signatures` としても公開されます）。

ウォレットは署名前にメッセージやトランザクションを変更することがあり（たとえば独自のインストラクションを追加したり、手数料支払者を変更したり）、Wallet Standard はそれを明示的に許可しています。入力とバイト単位で一致すると仮定せず、返された `signedMessage` や署名済みトランザクションバイトを読み直してください。

## Explorer リンク

Explorer リンクは、アプリが使用しているクラスタと一致している必要があります。

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

devnet の場合、リンクは `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet` のようになります。`mainnet` と従来の `mainnet-beta` エイリアスは、どちらも意図的にクラスタクエリを省略します。

## 汎用的なトランザクション状態

非同期のトランザクション的な処理が、組み込みの署名・送信ヘルパーに合わない場合は、`useTransaction()` を使用してください。

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` は、カスタムフローのローディング、成功、エラー、タイムアウトの状態を一元管理します。

## Nuxt の自動インポート

Nuxt は次を公開します:

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

トランザクションのメソッドは、クライアント上のユーザー操作から呼び出してください。SSR 中にウォレット署名をトリガーしないでください。Nuxt モジュールのオプションは意図的に `payer` と `payerSecretKey` を省略しています。public ランタイム設定にシークレットを置く代わりに、`clientPlugin: false` とクライアント専用の Vue プラグインで `payer` を構成してください。

別のフローから返された署名を確認する必要がある場合は、`useSolanaTransactionConfirmation({ commitment: "confirmed" })` を使用して `confirm(signature)` を呼び出してください。タイムアウトやリダイレクト後もステータスの確認を続けたい場合は、`useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })` を使用してください。

## エラー処理

トランザクションヘルパーは、失敗を `SolanaError` に正規化します。

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

## 安全チェックリスト

- クライアント送信の署名鍵は、信頼できるサーバー上、または明示的に一時的なデモ署名者に保ってください。資金のあるシークレットを Nuxt の public ランタイム設定経由で公開しないでください。
- ウォレットのプロンプトを開く前に、ユーザーが何に署名しようとしているかを表示してください。
- 明示的なユーザー操作なしにトランザクションへ署名したり送信したりしないでください。
- 秘密鍵を要求したり扱ったりしないでください。
- 署名アクションを表示する前に、ウォレットの機能を確認してください。
- RPC やウォレットのエラーは信頼できないデータとして扱い、安全な UI メッセージにマッピングしてください。
- タイムアウト後は、二重送信を避けるために再試行前に署名のステータスを確認してください。
- 確認が失敗したりタイムアウトしたりしても、送信した署名を UI に保持してください。
- ユーザーが devnet と mainnet のトランザクションを誤解しないよう、正しい Solana Explorer クラスタへのリンクを掲載してください。
