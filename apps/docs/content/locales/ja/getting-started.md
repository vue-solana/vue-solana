---
title: はじめに
description: Vue Solana パッケージをインストールし、Vue または Nuxt を設定して、devnet で RPC の読み取りをテストします。
ogSection: はじめに
surroundOrder: 2
---

このガイドでは、Vue Solana パッケージのインストール、Vue または Nuxt の設定、Solana RPC の読み取りのテスト、対応ウォレットへの接続、メッセージ署名、devnet への実際の送金、結果の確認までを扱います。安全にテストできるよう、サンプルはデフォルトで devnet を使用します。

## 始める前に

Vue/Nuxt 連携なしで Solana のプリミティブが必要な場合は、`@vue-solana/core` を直接使用してください。これは `@solana/kit` を基盤としており、`createSolanaClient()` と `@solana/kit` のすべてを `@vue-solana/core/kit` から再エクスポートします。フレームワーク連携が必要な場合は `@vue-solana/vue` または `@vue-solana/nuxt` を使用します。

対応しているクラスター:

- `mainnet`: Solana の本番クラスターです。Solana の公式な mainnet クラスター名です。
- `devnet`: アプリ開発に最適なデフォルトです。
- `testnet`: バリデータとプロトコルのテスト用ネットワークです。
- `localnet`: ローカルのバリデータです。

学習とテストの間は `devnet` を使用してください。実際の SOL を扱う準備ができたときにのみ `mainnet` を使用します。

現在のウォレット対応:

- Solana Wallet Standard パッケージ経由のブラウザ拡張ウォレット。
- Android Chrome および Chrome PWA 上で `@solana-mobile/wallet-standard-mobile` 経由の Android ネイティブモバイルウォレット。
- ウォレット固有のユニバーサルリンク経由の、Phantom、Solflare、Backpack 向け iOS ブラウザウォレット。
- `SolanaWallet` を実装した手動／カスタムのウォレットオブジェクト。

予定されているが未対応のもの:

- ウォレット固有のプロトコルリンク、または将来のネイティブ Wallet Standard 登録経由のデスクトップネイティブアプリウォレット。

## Vue 用のインストール

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Vue アプリでは、低レベルの Solana パッケージや Buffer パッケージを直接インストールすることなく、`@vue-solana/vue/kit`（`createSolanaClient`、`address`、`lamports`、各種型）と `@vue-solana/vue/buffer-polyfill` を使用できます。注入されたクライアントを取得するには、`@vue-solana/vue/useSolanaClient` の `useSolanaClient()` を使用します。

## Nuxt 用のインストール

```sh
npx nuxt module add @vue-solana/nuxt
```

これによりパッケージがインストールされ、`nuxt.config.ts` の `modules` 配列に `@vue-solana/nuxt` が追加されます。

Nuxt アプリでは、`@vue-solana/core`、`@vue-solana/vue`、低レベルの Solana パッケージや Buffer パッケージを直接インストールすることなく、`@vue-solana/nuxt/kit` と `@vue-solana/nuxt/buffer-polyfill` を使用できます。自動インポートされる `useSolanaClient()` は、注入された Kit クライアントを返します。

## v3 に関する注意

v3.0.0 は ESM のみを公開します。`require` エクスポート条件と最上位の `main` フィールドは、すべての `@vue-solana/*` パッケージから削除されました。Nuxt アプリと Vite アプリはすでに ESM をバンドルしているため変更は不要ですが、Vue Solana パッケージを `require()` する素の Node スクリプトは ESM に変更する必要があります。`kit` サブパスも `@solana/kit` の完全なミラーになったため、v2 で追加していた場合は自身の `package.json` から `@solana/kit` を削除できます。詳細は [v2 から v3 へのアップグレード](/ja/guides/migration#移行-v2-から-v3) を参照してください。

## v2 に関する注意

v2.0.0 はレガシーな `@solana/web3-compat` サーフェスを削除しました。コンテキストは `connection` を持たなくなり、`@vue-solana/*/web3` サブパスは削除されました。すべてのコンポーザブルは Kit ファーストであり、`SolanaWallet.publicKey` は base58 の `Address` 文字列です。以前の v1 ドキュメントで説明していた `@solana/buffer/` シムはなくなりました。残っているパッケージ所有のシムは、Buffer ポリフィルが使用するブラウザの `buffer/` サブパスのみを対象としています。変更前後の完全な対応表については [Kit 移行ガイド](/ja/guides/migration) を参照してください。

## Vue のセットアップ

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
      iosWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet` と `iosWallet` は省略可能です。Android の Mobile Wallet Adapter 登録と、iOS の Phantom、Solflare、Backpack へのリンクは、ブラウザランタイムが対応していればデフォルトで有効になります。どちらかのソースを無効にするには `mobileWallet: false` または `iosWallet: false` を渡します。

Vue のコンポーザブルについては、新しいコードではサブパスからの直接インポートを推奨します:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
```

`useRpc()` は解決済みのクラスター状態と注入された Kit の `client` を返し、`useBalance()` は `client.rpc` を通じて読み取ります。`useSolanaClient()` は同じ `client` とその読み取り専用の `rpc` を直接返し、さらに `@vue-solana/vue/kit` の `address()`/`lamports()` も提供します。変更前後の完全な対応表については [Kit 移行ガイド](/ja/guides/migration) を参照してください。

### クライアントとプラグインのライフサイクル

`createSolanaPlugin()` は `install()` の間に一度だけ Kit クライアントを構築します。プラグインはモジュールスコープで作成し、そのインスタンスを再利用してください:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

`createSolanaPlugin()` を再度呼び出すと新しいクライアントとコンテキストが構築され、既存のウォレット選択と RPC 状態は破棄されます。設定がリアクティブな場合（たとえばクラスターの切り替え）は、設定に対してメモ化して、レンダリングのたびではなく値が実際に変わったときにだけ新しいプラグイン（およびクライアント）が構築されるようにしてください:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Kit クライアントは構築時に `createClient().use(...)` のプラグインを実行します。そのうちのいずれかが非同期の場合、クライアント（およびそこから構築されるコンテキスト）はその Promise が解決してから有効になります。実際の RPC やウォレットの処理は、セットアップ中や SSR 中に実行するのではなく、ハイドレーション後のライフサイクルフックまたはユーザー操作に遅延させてください。

## Nuxt のセットアップ

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

Nuxt モジュールはクライアント専用でランタイムプラグインをインストールし、`@vue-solana/vue/*` の直接サブパスからコンポーザブルを自動インポートします。コンポーザブルは SSR 中に呼び出しても安全ですが、実際の RPC やウォレットの操作は、`onMounted()` やユーザー操作などハイドレーション後に実行してください。Nuxt の `solana` オプションは public runtime config に置かれるため、JSON シリアライズ可能な状態に保ってください。

直接の Vue および core のクライアントは、クライアント側で送信するトランザクション用に `payer` と `payerSecretKey` を受け付けます。`payerSecretKey` は base64 の 64 バイトの Ed25519 キーペアであるため、Nuxt の public runtime config に置いたり、資金のあるキーをブラウザに配布したりしてはいけません。Nuxt の `ModuleOptions` は意図的にこの 2 つのフィールドを省略しているので、モジュールが 2 つ目のプラグインをインストールしないよう `clientPlugin: false` を指定し、クライアント専用プラグインでクライアント所有の `payer` をインストールしてください。

## ウォレットなしで RPC をテストする

RPC の読み取りはブラウザウォレットがなくても動作します。

Vue では `useRpc()` を使用します:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, client } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const { value } = await client.rpc.getLatestBlockhash().send();
  latestBlockhash.value = value.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

新しいコードでは Kit クライアントを使用できます。`useSolanaClient()` はウォレットを必要とせず、同じ情報を Kit RPC API 用の型で返します（読み取り呼び出しは `bigint` を返します）:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>

<template>
  <main>
    <p>Slot: {{ slot }}</p>
  </main>
</template>
```

Nuxt では、自動インポートされる `useSolanaRpc()` を使用します:

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </main>
</template>
```

Nuxt では、同じ Kit の読み取りを自動インポートされる `useSolanaClient()` から行えます:

```vue
<script setup lang="ts">
const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>
```

## devnet または testnet の SOL を取得する

devnet と testnet の SOL は実際の価値を持たないテスト用トークンです。

公式のフォーセットを使用します:

```txt
https://faucet.solana.com
```

このガイドを進める間は `Devnet` を選択してください。testnet クラスターに対してテストする場合にのみ `Testnet` を選択します。

Solana CLI がインストールされている場合は、次のコマンドも実行できます:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

テスト中は実際の資金が入ったウォレットを決して使用しないでください。

## サンプルを実行する

サンプルアプリをローカルで実行するには、まず Vue Solana リポジトリをクローンします:

```sh
git clone https://github.com/vue-solana/vue-solana.git
cd vue-solana
pnpm install
pnpm build:packages
```

Vue Vite のサンプルを起動します:

`pnpm dev:vue`

Nuxt のサンプルを起動します:

`pnpm dev:nuxt`

サンプルでは、プラグイン／モジュールの設定、RPC 状態、直接の接続呼び出し、残高の読み取り、統合されたウォレット検出、永続化されたウォレット選択、ウォレット状態、メッセージ署名、汎用的なトランザクション状態、トランザクションの送金フロー、公式の Kit プランナーと RPC plan-sending executor によるクライアント送信トランザクション、確認ステータス、エクスプローラーリンク、未対応機能の UI を実演します。安全にテストできるよう、デフォルトで devnet を使用します。

## ウォレットを接続する

Phantom、Solflare、Backpack、またはその他の Solana Wallet Standard 対応ブラウザウォレットをインストールしてください。テストの前にウォレットを devnet に切り替えます。

Android Chrome または Android Chrome の PWA では、Phantom、Solflare、Seed Vault Wallet など互換性のある Solana モバイルウォレットをインストールしてください。`Mobile Wallet Adapter` は `refreshWallets()` の後に同じウォレット一覧に表示されることがあります。

Vue の場合:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

Nuxt の場合:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

`wallets` からウォレットを選択してから `connect()` を呼び出します。ウォレットの選択はアクティブなウォレットを設定するだけで、接続は行いません。一部の拡張機能はページを再読み込みした後に以前承認されたアカウントを公開しますが、Vue Solana は `connect()` が成功するまで `connected` を false のままにします。

`autoConnect` が有効な場合、Vue Solana はユーザーが以前に選択したウォレットの識別情報のみを復元し、しかもそのウォレットがクライアント上で再度検出された後にのみ復元します。`localStorage` に保存するのは `name`、`platform`、`source` のメタデータであり、秘密鍵、セッション、トランザクションは保存しません。

iOS のブラウザウォレット対応は、Mobile Wallet Adapter の Web サポートが Android のみであるため、ウォレット固有のユニバーサルリンクを使用します。iOS ブラウザでは Phantom、Solflare、Backpack が同じ `useWallets()` の一覧に表示されます。

## ウォレットの手動テスト

ブラウザ拡張ウォレット、Android MWA ウォレット、iOS ブラウザウォレットを手動で検証するときは、次のチェックリストを使用してください。

1. アプリを `devnet` 用に設定し、UI に devnet のエンドポイントが表示されることを確認します。
2. 対応ウォレットをインストールし、ウォレット自体を devnet に切り替えます。
3. `https://faucet.solana.com` から devnet の SOL をウォレットに入金します。
4. サンプルアプリを開き、ウォレットの更新アクションをクリックします。
5. ウォレットが想定どおりのソースで統合ウォレット一覧に表示されることを確認します。
6. ウォレットを選択し、選択だけでは接続されないことを確認します。
7. 接続をクリックし、ウォレットのプロンプトを承認します。
8. `connect()` が解決した後に公開鍵と `connected` 状態が更新されることを確認します。
9. ページを再読み込みし、以前に選択したウォレットの識別情報が、任意のウォレット選択なしで復元できることを確認します。
10. 切断し、公開鍵と接続状態がクリアされることを確認します。

想定されるウォレットソース:

| プラットフォーム                 | 想定されるソース        | 備考                                                                                         |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| デスクトップブラウザ拡張         | `wallet-standard`       | インストールされていれば Phantom、Solflare、Backpack、その他の標準ウォレットが表示されます。 |
| Android Chrome または Chrome PWA | `mobile-wallet-adapter` | 互換性のあるネイティブウォレットと Android の MWA ブラウザ対応が必要です。                   |
| iOS ブラウザ                     | `deep-link`             | Phantom、Solflare、Backpack のエントリはウォレット固有のユニバーサルリンクを使用します。     |
| デスクトップネイティブアプリ     | 未実装                  | デスクトップネイティブのプロトコルリンクはまだサポートされていません。                       |

## メッセージに署名する

メッセージ署名は、ウォレットの所有確認や認証チャレンジに使用します。トランザクションを送信せず、オンチェーンの状態変更を承認することもありません。

Vue の場合:

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Nuxt の場合:

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

`canSignMessage` が false の場合は、無効化された認証ボタンを表示してください。一部のウォレットは、任意のメッセージ署名に対応していなくても接続やトランザクション署名が可能です。

手動テストでは、ドメイン、ナンス、有効期限を含む明確なチャレンジ文字列を使用してください。空のメッセージや曖昧なメッセージへの署名をユーザーに求めないでください。

```ts
const challenge = new TextEncoder().encode(
  "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

署名後は、UI が返された署名バイトを表示し、メッセージ署名をオンチェーンのトランザクションとして扱っていないことを確認してください。

## 送金を実行する

Vue と Nuxt のサンプルには、実際の送金用の受取アドレスと金額のフィールドがあります。実際の価値を持たない SOL でテストできるよう、デフォルトで devnet を使用します。mainnet の場合は `mainnet` または mainnet の RPC エンドポイントを設定し、手数料用に実際の SOL を持つウォレットを使用してください。

テスト中は `0.000001` SOL のようなごく少額から始めてください。

トランザクションを作成またはシリアライズするブラウザアプリは、トランザクションのコードより前にフレームワークパッケージの Buffer ポリフィルを初期化する必要があります:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

ウォレットがトランザクションの承認を求めます。承認後、サンプルはトランザクション署名、確認状態、エクスプローラーリンクを表示します。Android の Mobile Wallet Adapter では、Vue Solana は対応している場合にウォレット署名とアプリ側の RPC 送信を優先します。これにより、ウォレットがブラウザにリダイレクトして戻った後も返される署名がより確実になります。

手動で送金をテストするには:

1. アプリとウォレットの両方を devnet に保ちます。
2. 自分が管理する受取アドレス、または新しく生成した devnet ウォレットを使用します。
3. `0.000001` SOL から始めます。
4. 承認する前にウォレットのプロンプトを確認します。
5. 送信後、サンプルが確認ステータスを表示するまで待ちます。
6. エクスプローラーリンクを開き、devnet クラスターのクエリが使われていることを確認します。
7. 送信者と受取者の残高を更新します。

エクスプローラーの URL はクラスターを考慮している必要があります:

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

署名が返された後に確認がタイムアウトした場合は、すぐに再送信しないでください。まず署名ステータスまたはエクスプローラーを確認してください。トランザクションはまだ確認される可能性があります。

クライアント送信のデモは、デフォルトクライアントがインストールする公式の `rpcTransactionPlanSendingExecutor()` を使用します。`signTransaction` に対応したウォレットを接続し、サンプルが要求する箇所でデモ用の payer に資金を用意し、`useSolanaSendTransaction()` または `useSolanaSendTransactions()` を使用してください。executor はトランザクションを送信し、コンポーザブルが `sent` を報告する前に `confirmed` commitment まで待機します。ウォレットの送信ポップアップが別途表示されることはありません。Nuxt では、デモ用の payer は `nuxt.config.ts` ではなくクライアント専用プラグインで作成し、モジュールが自身のプラグインをスキップするよう `clientPlugin: false` を設定してください。

## Solana Pay で支払いを受け付ける

Vue Solana は [Solana Pay](https://docs.solanapay.com/) をファーストクラスでサポートしています。送金リクエストの URL を構築し、ウォレットがスキャンする QR コードを描画し、リファレンスによる決済の確認を行えます。

```ts
import { address } from "@vue-solana/vue/kit";
import { encodeURL } from "@vue-solana/core/solana-pay";
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();
const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
  label: "My Store",
});
```

Vue では `useSolanaPay()`、`useSolanaQrCode()`、`useSolanaQrScanner()` を使って、リクエストの作成、QR コードの描画、支払いリクエストのスキャン、支払いの確認を行えます。詳しくは [Solana Pay ガイド](/ja/guides/solana-pay) を参照してください。

## 最終確認

アプリのフローに依存する前に、devnet で次の挙動を確認してください:

- RPC の読み取りがウォレットなしで動作する。
- ウォレット検出が、現在のプラットフォームで対応しているウォレットソースのみを表示する。
- ウォレットの選択と接続が別々のユーザー操作になっている。
- 省略可能な `autoConnect` が、以前に選択したウォレットの識別情報のみを復元する。
- 未対応のメッセージ署名やトランザクション署名の機能が UI で無効化されている。
- メッセージ署名がオンチェーンのトランザクションを送信せずに署名を返す。
- 送金の送信が署名と確認ステータスを返す。
- クライアント送信トランザクションが公式のプランナーと RPC plan-sending executor を使用し、設定された `payer` 署名者を必要とし、`confirmed` commitment の後にのみ `sent` になる。
- エクスプローラーリンクがアプリと同じクラスターを指している。
- `mainnet` は、意図的に mainnet を設定し、実際の SOL が危険にさらされることを理解している場合にのみ使用する。

## さらに読む

- [Vue 開発者のための Solana](/ja/concepts/solana-for-vue-developers)
- [クラスター](/ja/concepts/clusters)
- [ウォレット](/ja/guides/wallets)
- [トランザクションガイド](/ja/guides/transactions)
- [Kit 移行](/ja/guides/migration)
- [トラブルシューティング](/ja/troubleshooting)
- [Solana Kit ドキュメント](https://www.solanakit.com/) — 公式の Kit ガイド、レシピ、API リファレンス
- [Solana ドキュメント](https://solana.com/docs)
