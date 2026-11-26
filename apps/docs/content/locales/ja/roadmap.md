---
title: ロードマップ
description: Vue Solana で予定されている機能と改善点です。
ogSection: ロードマップ
surroundOrder: 22
---

これらのパッケージは、RPC 読み取り、ウォレットの検出と接続、残高の取得、トランザクション、アカウント読み取り、メッセージ署名、正規化されたエラー処理、Sign In With Solana、トランザクションの一括署名と送信、トランザクションプランニング、SWR キャッシュアダプタ、SPL トークンヘルパーといった機能を備え、本番利用できる安定性に達しています。このロードマップは今後の予定を示すもので、特定のリリースには紐付けておらず、インパクトの大きさ順に並べています。

## 監査結果と次のステップ

2026 年 11 月 18 日の監査では、ここに挙げた機能は当時どれも完全な公開機能としてはリリースされていませんでした。ただし、一部には既に基盤となる実装がありました。シミュレーション、Nuxt のサーバー側 RPC、トランザクション履歴はリリース済みで、トランザクション診断の統合は実装済みかつリリース待ちです。ユーザーからの要望で優先順位が変わらない限り、残りの項目をこの順番で進めます。

| 優先度  | 項目                                                                                                                                                                                            | 状況                                                                                                              | 次のステップ                                                                                                                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | 手数料・コンピュート予算のポリシー                                                                                                                                                              | 計画中                                                                                                            | [機能キューの計画](https://github.com/vue-solana/vue-solana/blob/main/plans/feature-queue-phases.md) のフェーズ 1 を実装します。Kit のセッターの上にポリシーを置き、送信や動的な手数料オラクルは行いません。 |
| 2       | トランザクション診断の統合                                                                                                                                                                      | 実装済み；リリース待ち                                                                                            | フェーズ 2：`@vue-solana/core/diagnostics`、`useTransactionDiagnostics()`、`useSolanaTransactionDiagnostics()` を通じて提供します。[エラー](/ja/guides/errors)も参照してください。                           |
| 3       | トークン／ポートフォリオの読み取り                                                                                                                                                              | 計画中                                                                                                            | フェーズ 3：まず古典的な SPL の読み取りを行い、Token-2022 はオプトインのサブパスに置きます。                                                                                                                 |
| 4       | プログラムクライアントのリアクティブ対応                                                                                                                                                        | 計画中                                                                                                            | フェーズ 4：Codama が生成したクライアントを囲むリアクティブアダプターを追加します。コード生成やレジストリは行いません。                                                                                      |
| 5       | バンドルと SSR の仕上げ                                                                                                                                                                         | 並行トラック                                                                                                      | フェーズ 5：[バンドル改善のフォローアップ](https://github.com/vue-solana/vue-solana/blob/main/plans/deferred/bundle-performance-followups.md) による iOS 遅延読み込み、SSR 監査、サイズガードを進めます。    |
| Shipped | トランザクションシミュレーションのヘルパー                                                                                                                                                      | 4.3.0 で `simulateTransaction()`、`useSimulateTransaction()`、`useSolanaSimulateTransaction()` によりリリース済み | 記録は [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md) にアーカイブ済みです。                                  |
| Shipped | Nuxt サーバー RPC ユーティリティ                                                                                                                                                                | 4.4.0 で `@vue-solana/nuxt/server`（`createServerSolanaClient()`、`useServerSolanaClient()`）として実装済み。     | 詳細は Nuxt パッケージのドキュメント「SSR 中のサーバー側 RPC」を参照してください。                                                                                                                           |
| Shipped | トランザクション履歴                                                                                                                                                                            | 4.5.0 で `getTransactionHistory()`、`useTransactionHistory()`、`useSolanaTransactionHistory()` によりリリース済み | 記録は [`plans/archived/transaction-history.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/transaction-history.md) にアーカイブ済みです。                                            |
| 後回し  | バージョン管理されたドキュメント、iOS ウォレットプロバイダの追加、Anchor ヘルパー、ウォレットモーダル／UI、デスクトップネイティブウォレット、RPC フェイルオーバー、高度なアカウントインデックス | 未実装または延期。API やアーキテクチャの大きなコミットメントが必要です                                            | それぞれ専用の計画ができるまでここに残します。UI の判断は [UI ライブラリのレポート](https://github.com/vue-solana/vue-solana/blob/main/reports/Vue%20Solana%20UI%20library.md) を参照してください。          |

古い項目のうち 2 つは既に対応済みです。リアルタイムサブスクリプションは `useSubscription()`、`useTrackedData()`、SWR アダプタで実装されています。`plans/deferred/native-wallet-plan.md` でチェック済みの「デスクトップネイティブウォレット」は、実装ではなく延期の決定を記録したものです。

## トランザクション

### トランザクションシミュレーションのヘルパー

リリース済み：core の `simulateTransaction()`、Vue の `useSimulateTransaction()`、Nuxt の `useSolanaSimulateTransaction()` が送信前にトランザクションをシミュレーションし、SOL を消費せずに手数料、アカウントの変化、失敗の可能性をアプリ側でプレビューできます。

## エコシステムとの連携

### デスクトップネイティブウォレットのサポート

統一されたウォレットフローを通じた、プロトコルリンクによるデスクトップネイティブウォレットのサポート。

### iOS ウォレットプロバイダの追加

現在の Phantom、Solflare、Backpack のユニバーサルリンクに加えて、より多くの iOS ブラウザウォレットをサポートします。

### Anchor プロバイダとプログラム用ヘルパー

Anchor プロバイダと、Anchor プログラムのアカウントおよび命令のためのヘルパー。

### ウォレットモーダルまたは UI パッケージ

接続と署名のフローをあらかじめ組み込んだ、専用のウォレットモーダルまたは UI パッケージ。

### Nuxt サーバー RPC ユーティリティ

4.4.0 で実装：`@vue-solana/nuxt/server` の `createServerSolanaClient()` と `useServerSolanaClient()` が、秘密情報を公開せずに Nitro サーバールートから Solana データを読み取ります。

### バージョン管理されたドキュメント

バージョン管理されたドキュメント: Kit の道筋へまだ移行していない利用者向けに、`/v1/` 以下にアーカイブされたレガシードキュメントのビルド、`v1 | latest` のドロップダウン、旧 URL からのリダイレクトを用意します。

## 耐障害性と高度なパターン

### RPC プロバイダのフェイルオーバー

RPC プロバイダのフェイルオーバーとレート制限の処理。

### 高度なアカウントインデックス

プログラムアカウントの高度なインデックスパターンとキャッシュ。
