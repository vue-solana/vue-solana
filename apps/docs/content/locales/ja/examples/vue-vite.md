---
title: Vue Vite サンプル
description: 実行可能な @vue-solana/vue の Vue 3 + Vite サンプルアプリです。
ogSection: サンプル
surroundOrder: 19
---

Vue Vite サンプルは、`@vue-solana/vue` のための実行可能な Vue 3 アプリです。

ソース: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

ライブデモ: [vue-solana-docs.vercel.app/demo](/ja/demo)

## 何を実演しているか

- `createSolanaPlugin()` で Vue Solana プラグインをインストールします。
- `useRpc()` で RPC のステータスを読み取ります。
- 注入された Kit クライアントを `useSolanaClient()` で使用します。
- `useBalance()` で lamport 残高を読み取ります。
- `useWallets()` で、ブラウザ拡張ウォレット、Android Mobile Wallet Adapter のウォレット、対応する iOS ブラウザウォレットのエントリを検出します。
- `useWallet()` でアクティブなウォレットの状態を管理します。
- ウォレット選択のメタデータを永続化し、リロード時に以前選択していたウォレットの識別情報を復元します。
- 以前選択していたウォレットが再び検出された場合にのみ再接続する、任意の `autoConnect` 動作。
- メッセージやトランザクションに署名できないウォレットについて、未対応機能の状態を表示します。
- `useTransaction()` で非同期トランザクションの状態を追跡します。
- 接続中のウォレットが対応している場合、`useSignMessage()` で認証メッセージに署名します。
- `useSignAndSendTransaction()` で実際の送金を行い、送信済みと確認済みのトランザクションステータスを表示します。サンプルは安全に試せるよう、デフォルトで devnet を使用します。
- 送信した署名に対して、クラスタを考慮した Solana Explorer のリンクを生成します。
- ライブデータパネルで Kit リアクティブなデータレイヤーを試します: 単発リクエスト用の `useRequest()`、websocket 経由のライブスロット通知用の `useSubscription()`、取得結果を起点としてアカウント通知で更新されるアカウントデータ用の `useTrackedData()`、Sign In With Solana 用の `useSignIn()`、devnet フォーセットへのリクエスト用の `useAirdrop()`、クライアントの手数料支払者署名者を確認する `usePayer()`、ウォレットのポップアップなしでクライアントから送信する SPL Memo トランザクション用の `useSendTransaction()` と `useSendTransactions()`、そして再マウントをまたいだキャッシュキー付き stale-while-revalidate のための `@vue-solana/vue/swr` の `useRequestSwr()` です。
- `useSolanaPay()` と `useSolanaQrCode()` で Solana Pay の送金リクエストを構築・表示し、`useSolanaPayConfirmation()` で reference による決済を検証し、`useSolanaQrScanner()` でスキャンまたは貼り付けた支払い URL を、自動送信は一切行わずにプレビューします。
- `main.ts` でデモ用の `payer` 署名者（`@vue-solana/vue/kit` の `generateKeyPairSigner()`）を設定し、クライアントから送信するトランザクションが手数料を支払えるようにします。支払者は未資金の状態で始まり、`usePayer` パネルが 1 devnet SOL をエアドロップします。
- デフォルトの公式 `solanaRpc()` クライアント構成を使用します。これはトランザクションプランナーとプラン署名・プラン送信のエグゼキュータを自身でインストールします。クライアント送信のデモは `sent` を表示する前に `confirmed` コミットメントを待ち、カスタムのフォールバック送信処理は使用しません。

アプリはデフォルトで `devnet` を使用します。devnet の SOL に実際の価値はありません。

## リポジトリルートからの実行

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

ターミナルに表示される Vite の URL（通常は `http://localhost:5173`）を開いてください。

## 試してみる内容

- 初期の RPC ステータスと最新の blockhash を確認します。
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
- ライブデータパネルで追跡対象のアドレスを変更し、リクエスト、サブスクリプション、追跡データの各パネルが再実行されるのを確認します。
- ライブデータパネルで、`usePayer` パネルからデモ支払者に 1 SOL をエアドロップし、`useSendTransaction()` でクライアント署名の SPL Memo を送信する（ウォレットのポップアップなし）か、`useSendTransactions()` で 2 件のバッチを送信します。公式のエグゼキュータが `confirmed` コミットメントに到達すると、ステータスが `sending` から `sent` に変わるのを確認できます。
- SWR カードをオフにしてからオンに戻し、キャッシュされた値が即座に（stale の状態で）表示され、その後に再検証されたリクエストの結果で置き換えられるのを観察します。
- Solana Pay パネルで、reference 付きの送金リクエストを作成して QR コードを表示し、同じ URL をスキャナパネルに貼り付けて、解析された受取人、金額、トークン、メモを確認します。`Verify settlement` は、その reference に支払いが着地するまで `expired` を報告します。スキャナはウォレットでリクエストを開くだけで、送信は一切行いません。

生成されるデモ用の支払者はブラウザセッション内にのみ存在し、`nuxt.config.ts` や公開ランタイム設定では設定されません。本番のリレイヤーにはサーバー側で保持する署名者を使用し、資金のあるキーペアをエンドユーザーのブラウザに出荷しないでください。

送金のサンプルは、`@vue-solana/vue/buffer-polyfill` の `installSolanaBufferPolyfill()` でブラウザの `Buffer` ポリフィルを初期化します。Vite が以前に外部化された Buffer import をキャッシュしていた場合は、Vite の開発サーバーを再起動してください。

署名が表示された後に確認がタイムアウトしても、すぐに重複した送金を送信しないでください。サンプルの署名ステータスや Explorer のリンクを使って、そのトランザクションが後から確認されたかを確認してください。

## devnet の SOL

公式フォーセットから無料の devnet SOL をリクエストできます:

```txt
https://faucet.solana.com
```

## ウォレットに関する注意

サンプルは統一的なウォレット検出を使用します。ブラウザ拡張ウォレットのフローを試す前に、Phantom、Solflare、Backpack、またはその他の標準ウォレットをインストールしてください。対応している Android Chrome のランタイムでは、`@solana-mobile/wallet-standard-mobile` がインストール済みのネイティブモバイルウォレットを、同じウォレットリスト内の `Mobile Wallet Adapter` として公開できます。iOS ブラウザでは、Phantom、Solflare、Backpack がウォレット固有のユニバーサルリンクを通じて表示されることがあります。

デスクトップネイティブウォレットのプロトコルリンク対応は、v1 のサンプルフローには意図的に含まれていません。
