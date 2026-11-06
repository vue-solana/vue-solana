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
