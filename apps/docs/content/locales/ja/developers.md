---
title: 開発者ポータル
description: Vue Solana を使って開発するためのクイックスタート、機械可読エンドポイント、連携の慣習をまとめています。
ogSection: プロジェクト
surroundOrder: 26
---

このポータルは、Vue Solana を統合する開発者や AI エージェントの入口です。対象は Vue/Nuxt ライブラリ自体と、このドキュメントサイトの機械可読なサーフェスの両方です。

## クイックスタート: Vue で Solana アプリを構築する

1. ご利用のスタックに合わせてパッケージをインストールします。Nuxt なら `pnpm add @vue-solana/nuxt`、素の Vue 3 なら `pnpm add @vue-solana/vue @vue-solana/core` です。
2. プラグインまたはモジュールを登録し（[はじめに](/ja/getting-started) を参照）、クラスタを指定します。デフォルトは devnet です。
3. コンポーザブルでデータを読み取ります: `useSolanaClient`、`useBalance`、`useTokenAccounts`。
4. `useWallets` と `useWallet` でウォレットを接続します（ブラウザ拡張、Mobile Wallet Adapter、iOS ウォレットリンク）。
5. `useSignMessage` と `useSignAndSendTransaction` で署名・送信します。

Solana RPC に API キーは不要です。コンポーザブルは公開されている devnet/mainnet のエンドポイントと通信し、独自の RPC プロバイダに差し替えることもできます。[ライブデモ](/ja/demo) では、公開済みパッケージを devnet に対してブラウザ上で実行できます。登録は不要です。

## このサイトの機械可読サーフェス

このドキュメントサイトは、登録やキーを必要としない、文書化された機械可読サーフェスを公開しています:

- `/llms.txt` — セクションごとに整理された小さな英語インデックスで、言語別インデックスへのリンクを含みます。
- `/guides/llms.txt`、`/packages/llms.txt`、`/concepts/llms.txt`、`/examples/llms.txt` — 1 つのセクションだけを対象にした、より絞り込んだインデックスです。
- `/de/llms.txt` … `/zh/llms.txt` — 言語ごとの翻訳ドキュメントのインデックスです。
- `/llms-full.txt` — 英語ドキュメントを 1 つの Markdown ドキュメントにまとめたものです（任意。ページごとの `.md` URL の方が小さくなります）。
- `/openapi.json` — すべてのエンドポイント、RFC 9457 のエラーモデル、バージョニングポリシー、レート制限の慣習を網羅した OpenAPI 3.1 仕様です。
- すべてのドキュメントページで `Accept: text/markdown` によるネゴシエーションが可能です（または URL に `.md` を付加します）。
- `/sitemap.xml` — すべての URL の一覧です。

Markdown レスポンスには、最も具体的な `llms.txt` インデックスとページの `.md` URL を指す `Link` ヘッダーが付きます。

エラーは `recovery` 拡張オブジェクトを伴う RFC 9457（`application/problem+json`）に従います。未知のパスへの 404 は、`Accept: text/markdown` を付けてリクエストした場合に Markdown の復旧用本文を返します。

## サンドボックス

Solana の [devnet クラスタ](/ja/concepts/clusters) が共有サンドボックスです。無料で、認証情報も不要で、エアドロップを使えば実際の資金なしで送金を試せます。デモページは devnet 向けに設定されており、各ガイドのサンプルも devnet に対して動作します。

## API キーと認証

管理すべきものはありません。これらのパッケージはご自身のアプリ内で実行するクライアントライブラリであり、このサイトの機械可読エンドポイントは公開されています。将来の機能でキーが必要になった場合は、まず [ロードマップ](/ja/roadmap) ページで告知します。
