---
title: "RPC とクラスター"
description: Solana のクラスター、RPC エンドポイント、WebSocket エンドポイント、クライアントヘルパーを設定します。
ogSection: ガイド
surroundOrder: 7
---

Vue Solana はクラスターとエンドポイントの設定を `@vue-solana/core`、`@vue-solana/vue`、`@vue-solana/nuxt` の間で共有します。

このガイドは、クラスターを選択する必要があるとき、カスタム RPC エンドポイントを指定するとき、または RPC コンポーザブルが何を公開しているかを理解したいときに参照してください。

## クラスター名

サポートされているクラスター名は次のとおりです。

- `devnet`
- `testnet`
- `mainnet`
- `mainnet-beta` (`mainnet` のレガシーエイリアス)
- `localnet`

Solana のメインネットには `mainnet` を使用してください。これは Solana 公式のメインネットクラスター名です。レガシーな `mainnet-beta` 表記も引き続き受け付けられ、同じエンドポイントにリダイレクトされます。

`devnet` はサンプルと開発にとって最も安全なクラスターであるため、デフォルトになっています。

## core のセットアップ

フレームワークに依存しないクライアントセットアップが必要な場合は `@vue-solana/core/rpc` を使用してください。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

`createSolanaContext()` は、解決済みの `cluster`、HTTP の `endpoint`、WebSocket の `wsEndpoint`、そして `rpc` で RPC リクエストを送信する Kit の `client` を返します。

## カスタム RPC エンドポイント

本番アプリでは通常、公開クラスターのエンドポイントではなく専用の RPC プロバイダーを使用してください。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

`wsEndpoint` を省略した場合、Vue Solana は HTTP エンドポイントから `https` を `wss` に、`http` を `ws` に変換して導出します。

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## ホスト型 RPC のセットアップ

組み込みの devnet エンドポイントは最初の読み取りには十分です。残す予定のサンプルや WebSocket サブスクリプションを使うアプリでは、[Chainstack](https://chainstack.com/pricing/) や [Alchemy](https://www.alchemy.com/pricing) などのプロバイダーで無料のキー付きエンドポイントを作成してください。[クラスターの概念](/ja/concepts/clusters#ホスト型-rpc-プロバイダー) で無料プランとトレードオフを比較しています。

プロバイダーの HTTP URL を `endpoint` として渡します。

```ts
createSolanaPlugin({
  cluster: "devnet",
  endpoint: "https://solana-devnet.g.alchemy.com/v2/YOUR_KEY",
});
```

`wsEndpoint` は省略できます。Vue Solana は `https` を `wss` に自動変換するため、WebSocket URL は上記の HTTP URL から導出されます。プロバイダーが別のホストやポートを使う場合だけ、`wsEndpoint` を明示してください。

Nuxt では、サーバー専用のキーは非公開 runtime config に保持し、[SSR 中のサーバー側 RPC](/ja/guides/rpc-and-clusters#ssr-中のサーバー側-rpc) のように `useServerSolanaClient()` で読み取ってください。生のキーを `runtimeConfig.public.solana` に入れないでください。公開 config はブラウザバンドルに含まれます。純粋なクライアントアプリではエンドポイント文字列が設計上ユーザーに見えるため、プロバイダーのドメイン / IP 許可リストを使い、キーをバージョン管理の外に置いてください。

無料プランは学習と低トラフィック向けです。`useProgramAccounts()`、`useTokenAccounts()`、履歴参照に依存する前に、プロバイダーの対応メソッドを確認してください。同じメソッドが devnet では利用できても mainnet では制限されたり、アーカイブプランが必要になったりします。

## Vue のセットアップ

アプリの起動時に近い場所で、Vue プラグインを一度だけインストールしてください。

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      commitment: "confirmed",
    }),
  )
  .mount("#app");
```

その後、コンポーネントから `useRpc()` で RPC の状態を読み取ります。

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, latestBlockhash, error, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">Unable to reach RPC.</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Nuxt のセットアップ

`nuxt.config.ts` でモジュールを設定します。

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt はモジュールオプションを public runtime config に保存するため、オプションは JSON シリアライズ可能でなければなりません。Nuxt モジュールは意図的に `payer` と `payerSecretKey` を除外しています。生のシークレットを public runtime config に置かないでください。`clientPlugin: false` を指定したクライアント専用プラグインで、エフェメラルな `payer` をインストールしてください。

core と Vue のクライアントを直接使う場合は、`createSolanaClient()` / `createSolanaPlugin()` に `payer` または `payerSecretKey` を渡せます。デフォルトのクライアントは、クライアント側から送信するトランザクションに公式の `solanaRpc()` スタックを使用し、`solanaRpc()` はトランザクションプランナーと、プランの署名・送信エグゼキューターを自身でインストールします。

Nuxt のページとコンポーネントでは、自動インポートされる `useSolanaRpc()` コンポーザブルを使用してください。

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

Nuxt のブラウザ用ランタイムプラグインはクライアント専用ですが、サーバープラグインが SSR 中に設定済みのクラスターとエンドポイントを使ってリクエストスコープのコンテキストをインストールするため、`useSolanaRpc()` はハードコードされた `devnet` ではなく設定済みのクラスターを描画します。ウォレットの状態はハイドレーションまで不活性です。ウォレットの処理はクライアントのライフサイクルフックまたはユーザー操作に置いてください。

## SSR 中のサーバー側 RPC

初期 HTML に含める必要があるデータについては、RPC の URL と API キーを `solanaServer` の下の**非公開**の runtime config に保管し、Nitro のサーバールートで `@vue-solana/nuxt/server` の `useServerSolanaClient()` を通じて読み取ります。このユーティリティは読み取り側のオプション（`cluster`、`endpoint`、`wsEndpoint`、`commitment`）のみを受け付け、`wallet`、`payer`、`payerSecretKey` は実行時に除去します。非公開の設定はブラウザにバンドルされません。認証情報を `runtimeConfig.public.solana` に置かないでください。

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
  },
  runtimeConfig: {
    solanaServer: {
      // Private: this value is never bundled into the browser.
      endpoint: process.env.SOLANA_RPC_URL,
      commitment: "confirmed",
    },
  },
});
```

`nuxt.config.ts`（または環境変数 `NUXT_SOLANA_SERVER_ENDPOINT`）で非公開のエンドポイントを設定します:

```ts
// server/api/slot.get.ts
import { useServerSolanaClient } from "@vue-solana/nuxt/server";

export default defineEventHandler(async () => {
  const { rpc } = useServerSolanaClient();
  const slot = await rpc.getSlot().send();
  return { slot: slot.toString() };
});
```

Nitro のサーバールートから、ページが必要とするフィールドだけを読み取ります:

```vue
<script setup lang="ts">
const { data, refresh } = await useAsyncData("solana-slot", () =>
  $fetch<{ slot: string }>("/api/slot"),
);
</script>

<template>
  <p>Slot: {{ data?.slot ?? "Loading..." }}</p>
  <button type="button" @click="refresh()">Refresh</button>
</template>
```

`useAsyncData()` は結果を Nuxt のペイロードに格納するため、クライアントはハイドレーション時に再取得しません。スロット番号や残高などの `bigint` の結果は、サーバールートで文字列に変換してください。ブラウザに公開されるのは、返したフィールドだけです。ウォレットの検出、署名、プロンプトは、ハイドレーション後にクライアントコンポーネントに置く必要があります。

## エンドポイントヘルパー

クライアントを作成せずに組み込みのエンドポイント値が必要な場合は `@vue-solana/core/clusters` を使用してください。

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## 本番環境の注意点

- 本番トラフィックには専用の RPC プロバイダーを優先してください。
- 公開 RPC エンドポイントで広範または頻繁なスキャンを行わないでください。
- WebSocket サブスクリプションは意図的に使用し、不要になったら必ずクリーンアップしてください。
- RPC のレスポンスは信頼できない入力として扱い、欠落したデータ、古いデータ、失敗したデータを処理してください。
