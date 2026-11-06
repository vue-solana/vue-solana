---
title: Vue Solana ドキュメント
description: Vue と Nuxt で Solana を使うためのライブラリのドキュメントです。
ogSection: 概要
surroundOrder: 1
---

Vue Solana は、Solana アプリケーションを構築するための Vue および Nuxt パッケージの小さなエコシステムです。

Vue Solana は、Vue と Nuxt のコンポーザブルを通じて、RPC のセットアップ、リアクティブなアカウント読み取り、残高の読み取り、ブラウザ拡張ウォレットの検出、Android Mobile Wallet Adapter の検出、iOS ブラウザウォレットへのリンク、ウォレットの接続・切断、トランザクション送金フローを提供します。サンプルは安全に試せるよう、デフォルトで devnet を使用します。

## パッケージ

- [`@vue-solana/core`](/ja/packages/core): フレームワークに依存しない Solana の設定、エンドポイントヘルパー、ウォレットの型、トランザクションヘルパーです。
- [`@vue-solana/vue`](/ja/packages/vue): Vue プラグインとコンポーザブルです。
- [`@vue-solana/nuxt`](/ja/packages/nuxt): Vue プラグインをインストールし、コンポーザブルを自動 import する Nuxt モジュールです。

`@vue-solana/core` は [Solana Kit](https://solana.com/docs/kit) を基盤にしています。`@vue-solana/core/kit` から `@solana/kit` の全体と `createSolanaClient()` ファクトリを再エクスポートするため、`@solana/kit` を自分でインストールする必要はありません。また、フレームワークパッケージは `useSolanaClient()` のような Kit ファーストのコンポーザブルを公開しています。レガシーな `@solana/web3-compat` のサーフェスと `web3` サブパスは v2.0.0 で削除されました。変更前後の対応表については [Kit 移行ガイド](/ja/guides/migration) を参照してください。

## まずはここから

- [はじめに](/ja/getting-started)
- [Kit 移行](/ja/guides/migration)
- [ウォレットガイド](/ja/guides/wallets)
- [トランザクションガイド](/ja/guides/transactions)
- [Vue 開発者のための Solana](/ja/concepts/solana-for-vue-developers)
- [クラスタ](/ja/concepts/clusters)
- [ロードマップ](/ja/roadmap)
- [エージェントスキル](/ja/agent-skill)
- [トラブルシューティング](/ja/troubleshooting)

## API リファレンス

- [`@vue-solana/core`](/ja/packages/core): 設定、エンドポイント、ウォレットインターフェース、Wallet Standard ヘルパー、モバイル/iOS ヘルパー、トランザクションヘルパー、正規化されたエラーです。
- [`@vue-solana/vue`](/ja/packages/vue): RPC、アカウント読み取り、ウォレット、メッセージ、署名、トランザクションのための Vue プラグインとコンポーザブルです。
- [`@vue-solana/nuxt`](/ja/packages/nuxt): Nuxt モジュールのオプション、ランタイムの動作、自動 import されるコンポーザブルです。

## サンプル

- [ライブデモ](/ja/demo)
- [Vue Vite サンプル](/ja/examples/vue-vite)
- [Nuxt サンプル](/ja/examples/nuxt)

## パッケージ利用者の方へ

ご自身のアプリに Vue または Nuxt パッケージをインストールするには、まず [はじめに](/ja/getting-started) をお読みください。コンポーザブルをプロジェクトに組み込む前に、[ライブデモ](/ja/demo) で devnet の RPC 読み取り、ウォレット接続、メッセージ署名、送金フローを試せます。

公式の Solana リファレンス:

- [Solana ドキュメント](https://solana.com/docs)
- [Solana RPC メソッド](https://solana.com/docs/rpc)
- [Solana クラスター](https://solana.com/docs/references/clusters)
- [Solana フォーセット](https://faucet.solana.com)
