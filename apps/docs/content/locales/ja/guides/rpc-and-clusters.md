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

Nuxt のランタイムプラグインはクライアント専用です。コンポーザブルは SSR 中にも呼び出せますが、ウォレットと RPC の処理はクライアントのライフサイクルフックまたはユーザー操作から開始してください。

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
