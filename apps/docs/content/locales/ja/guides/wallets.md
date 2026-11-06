---
title: "ウォレット"
description: ウォレットを検出し、アクティブなウォレットを選択し、接続・切断し、機能を確認します。
ogSection: ガイド
surroundOrder: 8
---

Vue Solana は、ブラウザ拡張ウォレット、Android の Mobile Wallet Adapter ウォレット、対応している iOS ブラウザウォレットのリンクを、ひとつのウォレットフローで公開します。

`useWallets()` を使ってウォレットを検出し、選択します。`useWallet()` を使って接続、切断、アクティブな公開鍵の読み取り、ウォレットの機能確認を行います。

現在のウォレット対応は、次のライブラリで構築されています:

- ブラウザ拡張ウォレット: `@wallet-standard/app`、`@wallet-standard/base`、`@wallet-standard/features`、`@solana/wallet-standard-features`。
- Android モバイルネイティブウォレット: `@solana-mobile/wallet-standard-mobile`。対応している Android Chrome のモバイル Web および PWA ランタイムで、Solana Mobile Wallet Adapter を Wallet Standard ウォレットとして登録します。
- iOS ブラウザウォレット: Phantom、Solflare、Backpack 向けのウォレット固有のユニバーサルリンク。
- Solana プリミティブとトランザクションヘルパー: `@solana/kit` の型とメッセージビルダー。`@vue-solana/vue/kit`、`@vue-solana/nuxt/kit`、`@vue-solana/core/kit` を通じて全体が再エクスポートされます。

## ウォレットのソース

現在のウォレットソースは次のとおりです:

- Solana Wallet Standard 経由のブラウザ拡張ウォレット。
- 対応している Android Chrome クライアントでの Wallet Standard 登録による Android Mobile Wallet Adapter。
- Phantom、Solflare、Backpack など対応ウォレット向けの iOS ブラウザウォレットリンク。

すべてのソースは同じ検出済みウォレットリストに表示されます。プラットフォーム固有の UI 文言が必要な場合を除き、アプリはブラウザ、Android、iOS のウォレット向けに別々の公開フローを構築する必要はありません。

## サポートマトリクス

| ウォレット経路                         | ステータス                              | 表示され方                                              | 備考                                                                        |
| -------------------------------------- | --------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| ブラウザ拡張ウォレット                 | サポート                                | `platform: "browser"`、`source: "wallet-standard"`      | Solana Wallet Standard の登録を使用します。                                 |
| Android ネイティブモバイルウォレット   | Android Chrome と Chrome PWA でサポート | `platform: "mobile"`、`source: "mobile-wallet-adapter"` | `@solana-mobile/wallet-standard-mobile` を通じて登録されます。              |
| iOS ブラウザウォレット                 | 設定済みのウォレットリンクでサポート    | `platform: "mobile"`、`source: "deep-link"`             | Phantom、Solflare、Backpack はユニバーサルリンク経由で公開されます。        |
| 手動/カスタムウォレットオブジェクト    | サポート                                | アプリが提供するウォレット                              | `SolanaWallet` インターフェースを実装する必要があります。                   |
| デスクトップネイティブアプリウォレット | まだ未サポート                          | デフォルトでは公開されません                            | 将来のアダプター向けに予約された `protocol-link` メタデータが利用できます。 |

現在できること:

- すべての対応ソースから、ひとつの `wallets` リストでウォレットを検出する。
- アクティブなウォレットを 1 つ選択し、すぐには接続しない。
- 任意の再接続フロー向けに、選択したウォレットの識別メタデータを永続化する。
- 選択したウォレットが対応している場合に、接続、切断、メッセージ署名、トランザクション署名、トランザクションの署名と送信を行う。
- 1 つのウォレットが接続したときに他の検出済みウォレットをすべて切断し、認可されたウォレットを 1 つだけにする。
- `canSignMessage`、`canSignTransaction`、`canSignAllTransactions`、`canSignAndSendTransaction` から、未サポート機能の UI を描画する。

まだ含まれていないもの:

- 組み込みのウォレットモーダルや UI パッケージ。
- デスクトップネイティブの protocol-link アダプター。
- サーバー側のウォレットプロンプト。
- 秘密鍵やシードフレーズの取り扱い。

## Vue のウォレットフロー

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

ウォレットを選択しても接続はされません。`connect()` が正常に解決するまで、ウォレットは切断されたままです。

ウォレットを接続すると、他の検出済みウォレットもすべて切断されます。アプリで認可されるウォレットは常に 1 つだけです。これは重要で、以前にユーザーが認可した拡張機能が署名リクエストに応答し続けることがあり、`signMessage` の確認を誤ったウォレットが求める典型的な原因になります。

## Nuxt のウォレットフロー

Nuxt は `useSolanaWallets()` と `useSolanaWallet()` で同じウォレットフローを自動インポートします。

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

ウォレット関連の処理は、クライアント上のユーザー操作からトリガーしてください。ウォレットのプロンプトを SSR 中に実行しないでください。

## 機能チェック

ウォレットごとに対応する機能が異なる場合があります。アクションを描画する前に機能を確認してください。

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

フレームワークに依存しないコードでは、`@vue-solana/core/wallet` のウォレットアサーションを使用してください。

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey);

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## 自動接続

`autoConnect` は、ユーザーが以前に選択し、クライアント上で再び検出されたウォレットの識別情報だけを再接続します。

ユーザーが接続したままにしたウォレットは、`autoConnect` が無効でもページの再読み込み後に復元されます。復元はサイレント接続（`connect({ silent: true })`）です。Wallet Standard の `silent` フラグに従うウォレットは、すでに付与した認可を返すだけで、確認ダイアログの表示やウォレットアプリの起動は行いません。`silent` はヒントであり保証ではないため、これを無視するウォレットはページ読み込み時に接続ダイアログを表示することがあります。ウォレットがサイトを認可していない場合は未接続のままです。明示的に `disconnect()` を呼ぶとセッションは破棄されます。

Vue Solana が `localStorage["vue-solana:selected-wallet"]` に保存するのはウォレットの識別メタデータのみです: `name`、利用可能な場合は `platform`/`source`、そしてウォレットが接続中の間は `connected: true`。秘密鍵、セッションデータ、トランザクションデータは決して保存しません。

ユーザーが明示的にウォレット選択をクリアしたときは `selectWallet(null)` を呼び出してください。アプリがカスタムウォレットオブジェクトを所有している場合に限り、`useWallet()` の `setWallet(customWallet)` を呼び出してください。通常のアプリ UI では `useWallets()` から選択するべきです。

ローカルストレージが利用できない場合でも、ウォレット選択は現在のページセッションでは機能しますが、永続化された復元は正規化された `STORAGE_FAILURE` エラーで失敗することがあります。

## 認証のためのメッセージ署名

メッセージ署名は、オフチェーン認証のためにウォレットの制御を証明します。オンチェーンのトランザクションを認可するものではありません。明確なチャレンジ文言を使い、バックエンドで検証してください。

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

ナンスは使い捨てにし、有効期限を短くしてください。ウォレットや RPC の生のエラーメッセージを、ユーザー向けの認証エラーとして使わないでください。

## モバイルウォレット

Android Mobile Wallet Adapter の登録は、対応している Android Chrome クライアントでは、Vue プラグインと Nuxt モジュールでデフォルトで有効になっています。

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

`mobileWallet: false` を渡すと、Android Mobile Wallet Adapter の登録を無効にできます。

iOS ウォレットリンクは iOS ブラウザでデフォルトで有効です。アプリの識別情報、リダイレクト URL、チェーン、クラスタをカスタマイズするには `iosWallet` オプションを渡します。iOS ウォレットリンクの検出を無効にするには `iosWallet: false` を渡します。

Android の注意点:

- Android MWA の登録はクライアント専用で、SSR 中は何も行いません。
- モバイルウォレットアダプターのブリッジをサポートする、セキュアコンテキストで配信される Android ブラウザでのみ動作することが想定されています。
- ウォレットへのハンドオフでブラウザを離れ、アプリに戻ることがあります。リダイレクト後にユーザーが送信された署名を確認できるよう、UI の状態を保持してください。
- Vue Solana は MWA ウォレットを、拡張ウォレットと同じ `SolanaWallet` インターフェースに適合させます。
- モバイルウォレットパッケージは、デフォルトのウォレット未検出ハンドラーを通じて、ウォレット未インストール時のフォールバック UI を処理します。
- MWA がインストール済みのウォレットアプリに接続する前に、ブラウザが 1 回限りの Local Network Access プロンプトを表示することがあります。
- Android MWA でのトランザクション送信では、ウォレットが `signTransaction` をサポートしている場合、Vue Solana はモバイルウォレットに署名を依頼し、署名済みトランザクションをアプリの RPC 接続経由で送信します。これにより返される署名がアプリの制御下に保たれ、ウォレットは送信に成功したのにブラウザページがウォレットアダプターの応答を受け取らないというモバイルハンドオフのエッジケースを回避できます。

iOS の注意点:

| 機能                                 | 現在の動作                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 検出                                 | Phantom、Solflare、Backpack のエントリが iOS ブラウザに表示されることがあります。                    |
| 接続                                 | ウォレット固有のユニバーサルリンクとリダイレクトコールバックを使用します。                           |
| セッション処理                       | リダイレクト後にウォレットが接続済みとみなす前に、アプリがコールバック状態を処理する必要があります。 |
| トランザクション                     | 機能はウォレットリンクと返されるセッションデータに依存します。                                       |
| デスクトップ Safari ネイティブアプリ | 未実装。                                                                                             |

iOS の core ヘルパーを直接使用する場合は、アプリがウォレット状態を読む前にリダイレクトデータが検証・復号されるよう、クライアント起動の早い段階で `handleSolanaIosWalletCallback()` を呼び出してください。

## 手動ウォレットインターフェース

カスタムウォレット連携では、Vue プラグインまたは `setWallet()` を通じて `SolanaWallet` オブジェクトを直接提供できます。

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

手動ウォレットオブジェクトは、Vue Solana に秘密鍵を決して公開しないでください。鍵の管理はウォレットプロバイダー内に保ってください。

## 直接 core ヘルパーを利用する

独自のウォレット連携レイヤーを構築する場合にのみ、core のヘルパーを直接使用してください。

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

iOS の core ヘルパーを直接使用する場合は、リダイレクト後に返される iOS ウォレット接続に依存する前に `handleSolanaIosWalletCallback()` を呼び出してください。

## セキュリティの注意点

- ユーザーに秘密鍵を求めてはいけません。
- ウォレットセッションやトランザクションデータをローカルストレージに保存しないでください。
- ウォレット名、アイコン、メタデータは信頼できない表示データとして扱ってください。
- メッセージやトランザクションに署名する前に、明示的なユーザー操作を求めてください。
- 未サポートの機能では、盲目的にウォレット呼び出しを試みるのではなく、無効化した UI や説明用の UI を表示してください。
- サンプルとチュートリアルでは devnet をデフォルトに保ち、実際の資金を使う意図がある場合にのみ `mainnet` を使用してください。

公式リファレンス:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Solana ドキュメント](https://solana.com/docs)
