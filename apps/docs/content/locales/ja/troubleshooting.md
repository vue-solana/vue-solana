---
title: トラブルシューティング
description: よくあるセットアップ、TypeScript、ウォレット、RPC、Nuxt の問題。
ogSection: サポート
surroundOrder: 4
---

このガイドは、Vue、Nuxt、TypeScript、ウォレットの検出、RPC 呼び出し、トランザクションにまたがる、よくある Vue Solana のセットアップ問題を診断するために使用します。まずアプリの状況に一致するエラーメッセージや挙動を探し、issue を作成する前に記載された順序で確認してください。

## `@solana/web3-compat` を解決できない

v2.0.0 で `@solana/web3-compat` はすべての Vue Solana パッケージから削除されたため、このパッケージに対する宣言が見つからないというエラーは、ほぼ常にアプリが削除済みのレガシーなサーフェスからインポートしていることを意味します。すなわち `@vue-solana/core/web3`、`@vue-solana/vue/web3`、`@vue-solana/nuxt/web3`、または `@solana/web3-compat` への直接依存です。

これらのインポートを Kit 相当のものに更新してください — [Kit 移行ガイド](/ja/guides/migration) を参照してください。まだ v1.x のパッケージを使用している場合、v1 のパッケージはドキュメント化された core のインポート向けにパッケージ側の宣言シムを同梱しており、v1 のアプリはパッケージを直接インポートする場合にのみ独自の `@solana/web3-compat` シムを追加できました。`@vue-solana/*@^2` にアップグレードすれば、シムは一切不要になります。

## パッケージを require したときの `ERR_PACKAGE_PATH_NOT_EXPORTED`

v3 は ESM のみを公開します。`require` の export 条件と最上位の `main` フィールドが削除されたため、CommonJS の `require("@vue-solana/core")` は `No "exports" main defined` で失敗し、サブパスを require すると `Package subpath './kit' is not defined by "exports"` で失敗します。

インポートするモジュールを ESM にしてください。`package.json` に `"type": "module"` を追加するか、ファイル名を `.mjs` に変更します。

```js
import { createSolanaClient } from "@vue-solana/core/kit";
```

Nuxt と Vite のアプリはすでに ESM をバンドルしているため影響を受けません。CommonJS を離れられない場合は、`.cjs` ビルドを引き続き提供している `@vue-solana/*@^2` に固定してください。

## `Vue Solana plugin is not installed`

これは、プラグインをインストールせずにクライアント側のコードが Solana クライアントやウォレットのアクションを使用しようとしたことを意味します。現在のコンポーザブルは、Nuxt がサーバーでレンダリングする際に不活性な SSR セーフの状態を返しますが、実際の RPC とウォレットの操作には依然としてクライアントプラグインのコンテキストが必要です。

Vue の場合:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

Nuxt の場合は、モジュールを登録します。

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

Nuxt モジュールは Vue Solana プラグインをクライアント専用に保ちます。自動インポートされるコンポーザブルは SSR 中にも呼び出せますが、サーバー上で直接 RPC やウォレットの操作を行わないでください。実際の Solana クライアントが必要な場合は、クライアントのライフサイクルフックまたはユーザー操作から RPC の読み取りを開始してください。

## `No Solana wallet is configured`

ウォレットが選択されておらず、手動で設定もされていません。`connect()` を呼び出す前やトランザクションを送信する前に、`useWallets()` または `useSolanaWallets()` を使って検出済みのウォレットを選択してください。

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

RPC の読み取りと残高の読み取りは、ウォレットなしで動作します。

## ブラウザウォレットが検出されない

よくある原因:

- Solana ウォレットの拡張機能がインストールされていない。
- 現在のブラウザプロファイルでウォレット拡張機能が無効になっている。
- アプリが SSR または非ブラウザ環境で実行されている。
- ウォレットが Wallet Standard を実装していない。

Phantom、Solflare、Backpack などのウォレットをインストールし、ページの読み込み後に `refreshWallets()` を呼び出してください。

## Mobile Wallet Adapter が検出されない

Android の Mobile Wallet Adapter の Web 登録は、セキュアコンテキスト (HTTPS) で提供される Android ブラウザでのみ動作します。

よくある原因:

- アプリがデスクトップ、iOS、Firefox Android、Brave Android、Opera Android、またはその他のサポートされていないブラウザで実行されている。
- 互換性のある Solana モバイルウォレットがインストールされていない。
- Vue プラグインまたは Nuxt モジュールに `mobileWallet: false` が渡された。
- ハイドレーション前、またはページが `window` にアクセスできるようになる前にウォレットの検出が実行された。

Android Chrome でアプリを開き、互換性のあるウォレットをインストールしてから、ページの読み込み後に `refreshWallets()` を呼び出してください。

## iOS ウォレットのリンクが完了しない

iOS ウォレットのサポートは、Phantom、Solflare、Backpack のユニバーサルリンクを使用します。承認後、ウォレットアプリはアプリの URL にリダイレクトして戻ります。

よくある原因:

- アプリが iOS ブラウザで実行されていない。
- 端末に Phantom、Solflare、Backpack のいずれかがインストールされていない。
- Vue プラグインまたは Nuxt モジュールに `iosWallet: false` が渡された。
- 設定された `redirectUrl` が、ウォレットの状態を更新するのと同じアプリページに戻らない。
- ウォレットの更新やコールバックの処理が、クライアントではなく SSR 中にのみ実行されている。

iOS ウォレットの処理はクライアント側に保ち、リダイレクト URL がアプリを再度読み込むことを確認して、リダイレクト後のページの読み込み後に `refreshWallets()` を呼び出してください。Vue プラグインはウォレットの更新時に iOS のコールバックを処理します。core のヘルパーを直接使うアプリは、適応されたウォレットセッションに依存する前に `handleSolanaIosWalletCallback()` を呼び出す必要があります。

## `Solana wallet is not connected`

ウォレットが `connected: true` と null でない `publicKey` を報告する前に、トランザクションヘルパーが呼び出されました。

先に `connect()` を呼び出すか、送信前に `connected.value` を確認してください。

## ローカル開発でリフレッシュ後にウォレットが接続済みとして表示される

検出済みのウォレットを選択することは、それを接続済みにしてはいけません。ブラウザ拡張機能が以前に承認されたアカウントを公開している場合でも、`connected` は `connect()` が成功した後にのみ true になるべきです。

ローカルの Vue または Nuxt のサンプルで、リフレッシュ直後にも接続済みとして表示される場合は、ワークスペースのパッケージを再ビルドし、開発サーバーを完全に再起動して、Vite/Nuxt が古いパッケージ出力を破棄するようにしてください。

```sh
pnpm build:packages
pnpm dev:vue
```

Nuxt の場合は、パッケージを再ビルドした後に `pnpm dev:nuxt` を使用してください。

## `Solana wallet does not support signTransaction`

設定されたウォレットが `signAndSendTransaction` も `signTransaction` も公開していません。選択した Solana チェーンでトランザクションの署名をサポートするウォレットを使用してください。

## ウォレットのトランザクションが結果を返さなかった

これは、ウォレットアダプターがモバイルへのハンドオフを開始したものの、ブラウザ側のプロミスを決着させない場合に起こりえます。Vue Solana はアプリを送信中状態のまま放置せず、`loading` をクリアして `error` を設定します。レスポンスが失われる前にウォレットがトランザクションを送信していた場合、トランザクションは成功している可能性があるため、リトライする前にウォレットのアクティビティや Solana エクスプローラーで確認してください。

Android の Mobile Wallet Adapter のウォレットは、`signTransaction` が利用できる場合、ウォレットでの署名とアプリ側からの RPC 送信を優先します。この経路により、ウォレットの送信は成功したもののアダプターが返す署名がブラウザページに届かないというよくあるケースを避けられます。

## `Buffer is not defined`

一部の Solana トランザクションのシリアライズ経路は、ブラウザランタイムでも Node 互換の `Buffer` グローバルを前提としています。ブラウザの Vue アプリでは、トランザクションを作成またはシリアライズする前に Vue パッケージの Buffer ポリフィルを初期化してください。Nuxt アプリでは `@vue-solana/nuxt/buffer-polyfill` を使用します。

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

このヘルパーはフレームワークパッケージが提供するため、Vue Solana のトランザクションのサンプルでアプリが `buffer` を直接インストールしたりインポートしたりする必要はありません。

## モジュール `buffer` が外部化された

コンソールに `Module "buffer" has been externalized for browser compatibility` と表示される場合は、アプリでの `buffer` からの直接インポートを、`@vue-solana/vue/buffer-polyfill` または `@vue-solana/nuxt/buffer-polyfill` の `installSolanaBufferPolyfill()` に置き換えてから、開発サーバーを再起動してください。Vite が以前に最適化した依存関係をキャッシュしている可能性があります。

## 残高の読み取りが失敗する

よくある原因:

- アドレス文字列が有効な Solana 公開鍵ではない。
- RPC エンドポイントが利用できない、またはレート制限されている。
- ウォレットのアドレスが、設定された RPC エンドポイントとは別のクラスター上にある。

`useRpc()` または `useSolanaRpc()` で、設定されたクラスターとエンドポイントを確認してください。

## Nuxt の自動インポートが見つからない

`@vue-solana/nuxt` が `modules` に含まれていることを確認し、パッケージのインストール後に Nuxt の開発サーバーを再起動してください。

TypeScript が依然として自動インポートを認識しない場合は、Nuxt の型を再生成してください。

```sh
npx nuxi prepare
```
