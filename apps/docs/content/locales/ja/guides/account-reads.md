---
title: "アカウント読み取り"
description: "Vue または Nuxt から、残高、アカウントデータ、プログラムアカウント、署名ステータスを安全に読み取ります。"
ogSection: ガイド
surroundOrder: 9
---

Vue Solana には、Solana の一般的な読み取り経路に対応するコンポーザブルが含まれています。残高、アカウント情報、プログラムアカウント、署名ステータスです。

トランザクションに署名せずにチェーン状態を読み取る必要がある場合は、このガイドを参照してください。

## アドレスの解析

フレームワークに依存しないコードでは、`parseAddress()` を使って Solana アドレスを正規化できます。

```ts
import { parseAddress } from "@vue-solana/core/address";
import { createSolanaClient } from "@vue-solana/core/kit";

const address = parseAddress("11111111111111111111111111111111");

if (address) {
  const client = createSolanaClient({ cluster: "devnet" });
  const { value: lamports } = await client.rpc.getBalance(address).send();
}
```

`parseAddress()` は `Address`、アドレス文字列、ref 風オブジェクト、getter、`null`、`undefined` を受け取ります。不正なアドレス文字列は `INVALID_ADDRESS` をスローします。

## Vue で残高を読み取る

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## アカウント情報を読み取る

単一のアカウントには `useAccountInfo()` を使用します。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh } = useAccountInfo(address, {
  commitment: "confirmed",
});
</script>
```

このコンポーザブルは正規化されたアカウントデータ（`executable`、`lamports`、`owner`、`space`、デコード済みの `data` バイト列）を返し、アドレスが `null` または不正になったときは古い状態をクリアします。必要に応じて `refresh()` を呼び出すとアカウントを再読み取りできます。

## プログラムアカウントを読み取る

プログラム ID が所有するアカウントには `useProgramAccounts()` を使用します。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> 警告: プログラムアカウントのスキャンは高コストになる可能性があります。本番環境での読み取りには、絞り込んだフィルタ、`dataSlice`、キャッシュ、ページネーション、インデックス、または専用の RPC インフラストラクチャを使用してください。

## 署名ステータスを読み取る

既知のトランザクション署名を追跡するには `useSignatureStatus()` を使用します。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, error, refresh, stopPolling } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

ポーリングは短時間の進捗表示 UI に使用してください。トラフィックの多いページで無期限にポーリングすることは避けてください。

## Nuxt の自動インポート

Nuxt は同じ読み取りヘルパーを自動インポートされるコンポーザブルとして公開します。

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Nuxt のコンポーザブルは SSR 中に呼び出すことができ、ハイドレーションによって実際のクライアントコンテキストが提供されるまでは不活性な状態を返します。データがブラウザ専用のコンテキストに依存する場合は、クライアントのライフサイクルフックまたはユーザー操作からネットワーク更新をトリガーしてください。

## null と不正な入力

アドレス、プログラム ID、または署名が `null` の場合、読み取り系コンポーザブルは RPC を呼び出さずに状態をクリアします。

不正なアドレス文字列は古いデータをクリアし、`error` を設定し、RPC メソッドを呼び出しません。ユーザー向けのメッセージには `error.value.code` で分岐してください。解析できないアドレスは `INVALID_ADDRESS` を報告します。

## 更新とエラーのセマンティクス

`useBalance`、`useAccountInfo`、`useProgramAccounts`、`useTokenAccounts`、`useTokenBalance` は同じステートマシンを共有しているため、間違えやすい 3 つのケースでも同じように動作します。

**`refresh()` は失敗時に reject します（resolve しません）。** 成功時は新しい値で resolve し、入力が空の場合は `null` で resolve し、それ以外の場合は正規化された `SolanaError` で reject します。`@click="refresh"` のようにそのまま書く場合は Vue が reject を握りつぶすため問題ありませんが、手書きのコードでは処理する必要があります。

```ts
// No error state on a rejected promise, so this silently does nothing useful.
await refresh();

// Await it and report.
try {
  await refresh();
} catch (cause) {
  console.error(cause);
}
```

`useRequest()` は例外で、その `refresh()` は reject せず、試行結果で resolve します。

**読み取りが失敗するとデータは空の値に戻ります。** 以前に読み込んだ残高が新しいエラーの横に残り続けることはありません。最新データでないのに最新データのように見えてしまうためです。何を描画するかは `error` で分岐して判断してください。

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="errorMessage" />
  <p v-else-if="loading">Loading…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

**`useTokenBalance` の結果は読み取り専用です。** その `balance` と `decimals` は 1 回の読み取りから導出された computed ref です。読み取ることはできますが、代入しても効果はありません。

## RPC コストのチェックリスト

- 可能な場合は単一アカウントの直接読み取りを優先してください。
- プログラムアカウントのスキャンにはフィルタを使用してください。
- アカウントデータの一部だけが必要な場合は `dataSlice` を使用してください。
- ランディングページやすべてのルート遷移からの広範なスキャンは避けてください。
- 公開 RPC エンドポイントでは攻撃的なポーリング間隔を避けてください。
- 多くのユーザーが繰り返し要求するデータはキャッシュするかインデックス化してください。
