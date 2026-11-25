---
title: クラスター
description: Solana のクラスター名、RPC エンドポイント、フォーセットの手順。
ogSection: 概念
surroundOrder: 6
---

Solana クラスターはバリデータのネットワークです。アプリは接続するクラスターを選択します。

## 対応クラスター

Vue Solana は次のクラスター名をサポートしています:

- `mainnet`: Solana の本番クラスターです。これは Solana の公式な mainnet クラスター名です。本番アプリと実際の SOL にはこれを使用してください。
- `mainnet-beta`: `mainnet` のレガシーな表記です。引き続き受け付けられ、同じ `https://api.mainnet.solana.com` エンドポイントに解決されます。
- `devnet`: 開発者向けネットワークです。アプリを構築する間はこれを使用してください。Devnet の SOL に実際の価値はありません。
- `testnet`: バリデータとプロトコルのテスト用ネットワークです。アプリ開発では devnet ほど一般的ではありません。
- `localnet`: お使いのマシン上で動作するローカルバリデータで、通常は `http://127.0.0.1:8899` にあります。

Vue Solana のコードでは `mainnet` を使用してください。Solana のドキュメントは本番クラスターを Mainnet と呼んでおり、`mainnet` は Solana のツールが想定するクラスター名です。レガシーな `mainnet-beta` 表記も引き続き受け付けられます。どちらの名前も公式の `https://api.mainnet.solana.com` エンドポイントに解決されます。

公式リファレンス: [Solana クラスター](https://solana.com/docs/references/clusters)

## RPC エンドポイント

RPC エンドポイントは、アプリが Solana からの読み取りや Solana への書き込みに使用する HTTP URL です。

例:

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

RPC リクエストは `useSolanaClient()` や `useSolanaRpc()` の `client.rpc`、または `@vue-solana/core` の `createSolanaClient()` / `createSolanaContext()` を経由します。レガシーの `Connection` クラスと `web3` サブパスは v2.0.0 で削除されました。パブリックなエンドポイントは入門には便利ですが、本番アプリでは通常、信頼性とレート制限のために専用の RPC プロバイダーを使用します。

公式リファレンス: [Solana RPC](https://solana.com/docs/rpc)

## ホスト型 RPC プロバイダー

Solana の公開エンドポイントは誰でも共有できます。最初に `getLatestBlockhash()` や `getBalance()` を呼び出すには最も手軽ですが、他の人が使うアプリの基盤としては適していません。エンドポイントが混雑するとリクエストがレート制限され、レイテンシーも読みにくくなり、利用量ダッシュボードやサポート契約はありません。ホスト型 RPC プロバイダーは、専用キー付きの HTTP / WebSocket エンドポイント、公開されたクォータ、メトリクス、トラフィック増加時の明確なアップグレード経路を提供します。

Vue Solana は特定のプロバイダーに依存しません。すべての RPC 呼び出しは `endpoint`（必要に応じて `wsEndpoint`）から構築した Kit クライアントを通るため、プロバイダーの変更はコンポーザブルの書き換えではなく設定の変更です。コードは [カスタム RPC エンドポイント](/ja/guides/rpc-and-clusters#カスタム-rpc-エンドポイント) を参照してください。

### 利用する理由

- **予測可能な上限。** 公開エンドポイントは全ユーザーでひとつの予算を共有します。プロバイダーを使うと、キーごとにクォータがあり、超過時の動作も明示されています。
- **サブスクリプション。** `useSubscription()` と `useTrackedData()` には WebSocket 接続が必要です。プロバイダーは対応する `wss://` URL を公開し、通常はより多くの同時サブスクリプションを許可します。
- **可観測性。** ダッシュボードにリクエスト数、エラー、レイテンシーが表示されるため、障害がアプリ起因か RPC 層起因かを判断できます。
- **本番への道筋。** チュートリアルが実際のアプリになったとき、コンポーネントのコードを変えずに上限を引き上げられます。

### 選択前に確認すること

- **そのプランが対応するメソッド。** 利用可否はクラスターとプロバイダーによって異なります。Chainstack は Solana の重いスキャンメソッドの一部を mainnet では有料として記載し、devnet にはアーカイブノードがありません。
- **利用量の数え方。** Chainstack は Request Units（フルノード 1 リクエストにつき 1 RU）を使い、Alchemy はメソッドによって変わる Compute Units を使います。「1 秒あたりのリクエスト数」だけの比較は誤解を招きます。
- **WebSocket、webhook、gRPC が無料プランに含まれるか。** 単純な HTTP 読み取りが動いても、アプリはそのうちのひとつを必要とする場合があります。
- **API キーをどこに置くか。** ブラウザバンドル内のエンドポイント URL はユーザーに見えます。プロバイダーのダッシュボードでキーを制限するか、サーバールートの背後に置いてください。

### 無料で始められる選択肢

| プロバイダー                                  | 無料プラン                                                                           | 向いている用途                                                                                                               | 確認点                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Chainstack](https://chainstack.com/pricing/) | Developer：月額 0 ドル、月 3,000,000 RU、全体で 25 RPS、1 プロジェクト、WebSockets。 | Request Units による分かりやすい課金と、ネットワークごとの明示的な上限。共有公開エンドポイントからの次の一手に適しています。 | [スループットのガイドライン](https://docs.chainstack.com/docs/limits) では、Developer は Solana devnet で 25 RPS ですが、Solana mainnet では 5 RPS です。`getProgramAccounts`、`getSupply`、`getTokenAccountsByOwner` は mainnet では有料で、devnet にアーカイブノードはありません。超過分は追加 100 万 RU ごとに 20 ドルです。 |
| [Alchemy](https://www.alchemy.com/pricing)    | Free：月 3,000 万 CU、15 RPS、5 アプリ、5 webhook、すべての mainnet と testnet。     | そのまま貼り付けられる devnet の HTTP / WSS URL、利用量ダッシュボード、学習やデモ向けの webhook。                            | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) にエンドポイントと devnet で利用できない API（Token、NFT、Prices、Debug、Trace など）が記載されています。課金は生リクエスト数ではなく Compute Units で、gRPC は有料です。                                                                                        |

クォータと価格は変更されます。リンク先のプロバイダーページを公式情報として扱ってください。上記の数字は出発点であり、Vue Solana の保証ではありません。

プロバイダーは RPC アクセスを提供するもので、テスト用 SOL は提供しません。トランザクションを送るには、引き続き下記の faucet から devnet SOL を取得してください。

## WebSocket エンドポイント

WebSocket エンドポイントは、サブスクリプションとリアルタイム更新に使用されます。Vue Solana は、`wsEndpoint` を明示的に渡さない限り、RPC エンドポイントから WebSocket エンドポイントを導出します。

例:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
- `ws://127.0.0.1:8900`

## クラスターを設定する

Vue の場合:

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Nuxt の場合:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

カスタムエンドポイントを渡すこともできます:

```ts
createSolanaPlugin({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## Devnet または Testnet の SOL を取得する

公式のフォーセットを使用してください:

```txt
https://faucet.solana.com
```

`Devnet` または `Testnet` を選び、ウォレットアドレスを貼り付けて SOL をリクエストしてください。

Solana CLI がインストールされている場合は、エアドロップをリクエストすることもできます:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Devnet と testnet の SOL に実際の価値はありません。テスト中は実際の資金が入ったウォレットを決して使用しないでください。
