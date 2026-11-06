---
title: Nuxt サンプル
description: 実行可能な @vue-solana/nuxt の Nuxt サンプルアプリです。
ogSection: サンプル
surroundOrder: 20
---

Nuxt サンプルは、`@vue-solana/nuxt` のための実行可能な Nuxt アプリです。

ソース: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

ライブデモ: [vue-solana-docs.vercel.app/demo](/ja/demo)

## 何を実演しているか

- `modules: ['@vue-solana/nuxt']` で Nuxt モジュールをインストールします。
- `solana: { cluster: 'devnet' }` でモジュールを設定します。
- 自動 import される `useSolanaRpc()` で RPC のステータスを読み取ります。
- 注入された Kit クライアントを、自動 import される `useSolanaClient()` で使用します。
- `useSolanaBalance()` で lamport 残高を読み取ります。
- `useSolanaWallets()` で、ブラウザ拡張ウォレット、Android Mobile Wallet Adapter のウォレット、対応する iOS ブラウザウォレットのエントリを検出します。
- `useSolanaWallet()` でアクティブなウォレットの状態を管理します。
- ウォレット選択のメタデータを永続化し、リロード時に以前選択していたウォレットの識別情報を復元します。
- 以前選択していたウォレットが再び検出された場合にのみ再接続する、任意の `autoConnect` 動作。
- メッセージやトランザクションに署名できないウォレットについて、未対応機能の状態を表示します。
- 接続中のウォレットが対応している場合、自動 import される `useSolanaSignMessage()` で認証メッセージに署名します。
- `useSolanaSignAndSendTransaction()` で実際の送金を行い、送信済みと確認済みのトランザクションステータスを表示します。サンプルは安全に試せるよう、デフォルトで devnet を使用します。
- 送信した署名に対して、クラスタを考慮した Solana Explorer のリンクを生成します。
- 汎用的な非同期トランザクション状態のために、`@vue-solana/vue/useTransaction` の `useTransaction()` を使用します。
- ライブデータパネルで Kit リアクティブなデータレイヤーを、自動 import されるコンポーザブルを使って試します: 単発リクエスト用の `useSolanaRequest()`、ライブのスロット通知用の `useSolanaSubscription()`、取得結果を起点とするアカウントデータ用の `useSolanaTrackedData()`、Sign In With Solana 用の `useSolanaSignIn()`、devnet フォーセットへのリクエスト用の `useSolanaAirdrop()`、クライアントの手数料支払者署名者を確認する `useSolanaPayer()`、ウォレットのポップアップなしでクライアントから送信する SPL Memo トランザクション用の `useSolanaSendTransaction()` と `useSolanaSendTransactions()`、そして再マウントをまたいで動作する `@vue-solana/vue/swr` のキャッシュアダプタです。
- 自動 import される `useSolanaPay()` と `useSolanaQrCode()` で Solana Pay の送金リクエストを構築・表示し、`useSolanaPayConfirmation()` で reference による決済を検証し、`useSolanaQrScanner()` でスキャンまたは貼り付けた支払い URL をプレビューします。スキャナは `<ClientOnly>` 内に置くため、カメラ API が SSR 中に実行されることはありません。
- クライアント専用の `app/plugins/demo-payer.client.ts` プラグインで、`generateKeyPairSigner()` を使って一時的なデモ用手数料支払者を生成します。支払者は未資金の状態で始まり、`useSolanaPayer` パネルが 1 devnet SOL をエアドロップします。Nuxt モジュールは `payer` と `payerSecretKey` を意図的に省略しており、生のシークレットを公開ランタイム設定に置いてはいけません。

アプリはデフォルトで `devnet` を使用します。devnet の SOL に実際の価値はありません。

## リポジトリルートからの実行

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

ターミナルに表示される Nuxt の URL（通常は `http://localhost:3000`）を開いてください。

## 試してみる内容

- 初期のモジュール/RPC ステータスと最新の blockhash を確認します。
- `Load Blockhash` をクリックして、`client.rpc.getLatestBlockhash().send()` を直接呼び出します。
- devnet のウォレットアドレスを貼り付けて、残高を更新します。
- Solana のブラウザウォレットをインストールし、devnet に切り替えます。
- Android Chrome では、対応する Solana モバイルウォレットをインストールし、`Mobile Wallet Adapter` を探します。
- iOS ブラウザでは、Phantom、Solflare、Backpack のいずれかをインストールし、同じリストに表示されるウォレットのエントリを探します。
- 検出されたウォレットを選択して接続します。
- ページをリロードし、任意のインストール済みウォレットが選ばれるのではなく、同じ選択済みウォレットの識別情報が復元されることを確認します。
- ウォレットがメッセージ署名への対応を報告している場合、サンプルの認証メッセージに署名します。
- 選択中のウォレットが `signMessage` に対応していない場合に、メッセージ署名ボタンが無効化されるか、その理由が説明されることを確認します。
- 汎用のモックトランザクションを実行します。
- 受取人のアドレスと金額を入力し、実際の送金を行います。テスト中はサンプルを devnet のままにしておいてください。
- トランザクションが送信済みの署名から確認ステータスへ移る様子を確認します。
- Explorer のリンクを開き、`?cluster=devnet` が含まれていることを確認します。
- ライブデータパネルで、`useSolanaPayer` パネルからデモ支払者に 1 SOL をエアドロップし、`useSolanaSendTransaction()` でクライアント署名の SPL Memo を送信する（ウォレットのポップアップなし）か、`useSolanaSendTransactions()` で 2 件のバッチを送信します。公式のエグゼキュータが `confirmed` コミットメントに到達すると、ステータスが `sending` から `sent` に変わるのを確認できます。
- Solana Pay パネルで、reference 付きの送金リクエストを作成して QR コードを表示し、同じ URL をスキャナパネルに貼り付けて、解析された受取人、金額、トークン、メモを確認します。`Verify settlement` は、その reference に支払いが着地するまで `expired` を報告します。スキャナはウォレットでリクエストを開くだけで、送信は一切行いません。

デモ用の支払者はクライアント専用プラグインで生成され、`nuxt.config.ts` や公開ランタイム設定では設定されません。サンプルは `solana.clientPlugin: false` を設定してモジュール独自のプラグインをスキップします。両方をインストールすると Solana コンテキストが 2 つできてしまいます。モジュールのデフォルトクライアントは引き続き公式の `solanaRpc()` スタックを使用し、これがトランザクションプランナーとプラン署名・プラン送信のエグゼキュータを自身でインストールします。旧来のカスタムフォールバック送信処理は使われません。資金のあるシークレットを Nuxt の公開ランタイム値に置かないでください。

送金のサンプルは、`@vue-solana/nuxt/buffer-polyfill` の `installSolanaBufferPolyfill()` でブラウザの `Buffer` ポリフィルを初期化します。Vite が以前に外部化された Buffer import をキャッシュしていた場合は、Nuxt の開発サーバーを再起動してください。

署名が表示された後に確認がタイムアウトしても、すぐに重複した送金を送信しないでください。サンプルの署名ステータスや Explorer のリンクを使って、そのトランザクションが後から確認されたかを確認してください。

## devnet の SOL

公式フォーセットから無料の devnet SOL をリクエストできます:

```txt
https://faucet.solana.com
```

## ウォレットに関する注意

サンプルは統一的なウォレット検出を使用します。ブラウザ拡張ウォレットのフローを試す前に、Phantom、Solflare、Backpack、またはその他の標準ウォレットをインストールしてください。対応している Android Chrome のランタイムでは、`@solana-mobile/wallet-standard-mobile` がインストール済みのネイティブモバイルウォレットを、同じウォレットリスト内の `Mobile Wallet Adapter` として公開できます。iOS ブラウザでは、Phantom、Solflare、Backpack がウォレット固有のユニバーサルリンクを通じて表示されることがあります。

デスクトップネイティブウォレットのプロトコルリンク対応は、v1 のサンプルフローには意図的に含まれていません。
