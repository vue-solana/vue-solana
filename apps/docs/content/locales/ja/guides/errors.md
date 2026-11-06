---
title: "エラー"
description: core のヘルパーと Vue/Nuxt のコンポーザブルから返される、正規化された Solana エラーを処理します。
ogSection: ガイド
surroundOrder: 13
---

Vue Solana は、一般的なウォレット、RPC、アドレス、トランザクション、タイムアウト、ストレージの失敗を `SolanaError` に正規化します。

UI の判断には安定した `error.code` の値を使用してください。デバッグとログのために `error.cause` を保持してください。

## エラーの構造

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` には次のものが含まれます。

- `code`: 安定した機械可読なエラーコード。
- `message`: 人間が読める開発者向けメッセージ。
- `cause`: ウォレット、RPC 呼び出し、パーサー、タイムアウト、ストレージ操作からの元のエラー (任意)。
- `feature`: サポートされていない機能のエラーに対する、任意のウォレット機能名。

## 安定したエラーコード

- `NO_WALLET_SELECTED`: アクティブなウォレットが選択されていません。
- `WALLET_NOT_CONNECTED`: アクティブなウォレットが接続されていないか、公開鍵がありません。
- `WALLET_FEATURE_UNSUPPORTED`: アクティブなウォレットが要求された機能をサポートしていません。
- `WALLET_FAILURE`: より具体的なコードなしでウォレット側の操作が失敗しました — 接続/切断、保存済みウォレットの自動接続、モバイルウォレットの登録、iOS コールバックの処理など。
- `USER_REJECTED`: ユーザーがウォレットの要求を拒否しました。
- `INVALID_SIGNATURE`: ウォレットが、そのアカウントの鍵と一致しないメッセージ署名またはサインイン署名を返しました。
- `INVALID_ADDRESS`: アドレス文字列を Solana アドレスとして解析できませんでした。
- `INVALID_INPUT`: ヘルパーが不正なエンドポイント、タイムアウト、またはオプション値を受け取りました。
- `TRANSACTION_TIMEOUT`: トランザクション関連の操作がタイムアウトしました。
- `TRANSACTION_NOT_FOUND`: 確認の期限までに、署名が RPC のステータス結果に現れませんでした。
- `TRANSACTION_FAILED`: 送信したトランザクションが、要求された commitment に到達する前にエラーになりました。
- `REDIRECT_TIMEOUT`: iOS ウォレットが時間内にアプリへリダイレクトしませんでした。
- `DECRYPTION_FAILED`: iOS ウォレットのコールバックを復号またはデコードできませんでした。
- `RPC_FAILURE`: RPC の送信、読み取り、または確認が失敗しました。
- `STORAGE_FAILURE`: ブラウザストレージの読み取りまたは書き込みができませんでした。

## core でのエラーハンドリング

不明な失敗を捕捉するときは `isSolanaError()` を使用してください。

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    console.log(error.code);
    console.debug(error.cause);
  }
}
```

Vue Solana のエラーモデルに従うべき、フレームワーク非依存のヘルパーを自分で書くときは `normalizeSolanaError()` を使用してください。

```ts
import { normalizeSolanaError } from "@vue-solana/core/errors";

async function loadData() {
  try {
    return await client.rpc.getLatestBlockhash().send();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE", "Unable to load blockhash");
  }
}
```

`normalizeSolanaError()` は一般的なウォレット拒否の形式を `USER_REJECTED` にマッピングします。

## Vue のエラー ref

Vue のコンポーザブルは `error` ref を公開します。

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load data from RPC.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
</script>
```

## Nuxt のエラー ref

Nuxt で自動インポートされるコンポーザブルも同じエラーモデルを公開します。

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## ユーザー向けメッセージ

アプリがそのソースを明示的に信頼している場合を除き、生の `cause` の詳細をエンドユーザーに直接表示しないでください。ウォレットや RPC のエラーメッセージには、UI にとって紛らわしい、または安全でないプロバイダー固有のテキストが含まれることがあります。

代わりに、安定したエラーコードを短いアプリ固有のメッセージにマッピングしてください。

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "Request canceled.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support that action.";
    case "RPC_FAILURE":
      return "Network request failed. Try again.";
    default:
      return "Something went wrong.";
  }
}
```

## リトライの指針

- `RPC_FAILURE` は、その操作を繰り返しても安全な場合にのみリトライしてください。
- `TRANSACTION_TIMEOUT` の後は、リトライする前に署名のステータスを確認してください。
- `USER_REJECTED` を自動でリトライしないでください。
- `INVALID_ADDRESS` をリトライしないでください。入力を修正するようユーザーに求めてください。
- `WALLET_FEATURE_UNSUPPORTED` を引き起こすアクションは、非表示にするか無効にしてください。
