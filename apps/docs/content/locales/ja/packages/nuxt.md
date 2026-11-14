---
title: "@vue-solana/nuxt"
description: Solana アプリケーションのための Nuxt モジュールです。
ogSection: パッケージ
surroundOrder: 18
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) は、Nuxt アプリに Vue Solana プラグインをインストールし、コンポーザブルを自動 import します。

## インストール

```sh
npx nuxt module add @vue-solana/nuxt
```

このコマンドはパッケージをインストールし、`nuxt.config.ts` の `modules` 配列に `@vue-solana/nuxt` を追加します。

このパッケージは ESM 専用です。Nuxt はすでに ESM をバンドルしているため変更は不要です。CommonJS の `require("@vue-solana/nuxt")` は `No "exports" main defined` で失敗します。そのため、import する側のモジュールを ESM にするか、`.cjs` ビルドを同梱している `@vue-solana/nuxt@^2` を使い続けてください。詳しくは [v2 から v3 へのアップグレード](/ja/guides/migration#移行-v2-から-v3) を参照してください。

トランザクションを作成またはシリアライズするブラウザアプリは、`@vue-solana/nuxt/buffer-polyfill` から Buffer ポリフィルを初期化できます。Kit API には `@vue-solana/nuxt/kit`（`@solana/kit` 全体を再エクスポートします）を使うか、自動 import される `useSolanaClient()` を使用してください。

## モジュールのセットアップ

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

カスタムの RPC エンドポイントも設定できます:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

サポートされるクラスターは `mainnet`（レガシーなエイリアス `mainnet-beta`）、`devnet`、`testnet`、`localnet` です。Solana メインネットには `mainnet` を使用してください。これが Solana の公式なメインネットクラスター名です。

Nuxt モジュールのオプションは public runtime config に保存されるため、JSON でシリアライズ可能でなければなりません。カスタムの `wallet` アダプターオブジェクトは意図的に Nuxt の設定から除外されています。カスタムのウォレットオブジェクトを注入する必要がある場合は、クライアント専用の Vue コードで Vue プラグインを直接使用してください。

`ModuleOptions` も意図的に `payer` と `payerSecretKey` を省略しています。これらは直接 `@vue-solana/core` と `@vue-solana/vue` のクライアントでは引き続きサポートされますが、Nuxt モジュールはどちらのフィールドも転送せず、public runtime config から削除します。生のシークレット、シードフレーズ、`payerSecretKey` を `nuxt.config.ts` や `runtimeConfig.public` に絶対に置かないでください。それらの値はブラウザから見えてしまいます。クライアントが所有するデモやリレイヤーの署名者が必要な場合は、クライアント専用プラグインで `generateKeyPairSigner()` を使って作成し、そこで Vue プラグインをインストールし、モジュールが自身のプラグインをスキップするように `clientPlugin: false` を設定してください。両方をインストールすると 2 つの Solana コンテキスト、2 つのウォレット購読、2 つの接続チェックが作成され、最後の `provide` だけが有効になります。

モジュールのクライアントランタイムプラグインは、アプリ全体の選択中ウォレットアカウントコンテキストも自動的にインストールするため、`useSolanaSelectedWalletAccount()` はプロバイダをマウントしなくてもすべてのコンポーネントで動作します。永続化（`stateSync`）やフィルタリング（`filterWallet`）をカスタマイズするには、ツリーのより深い位置で `@vue-solana/vue/useSelectedWalletAccount` から `SelectedWalletAccountProvider` をマウントし、デフォルトのコンテキストを上書きしてください。

モバイルウォレットのオプションは、JSON でシリアライズ可能なアプリ識別情報とリダイレクト設定のみを含む場合、`nuxt.config.ts` で安全に設定できます:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

`mobileWallet: false` または `iosWallet: false` を渡すと、いずれかのモバイルウォレットソースを無効化できます。モジュールは一般的な Solana、Wallet Adapter、モバイルウォレットの依存関係も事前に最適化するため、Vite はブラウザのトランザクションコードとウォレットコードを正しくバンドルできます。

## 自動 import されるコンポーザブル

モジュールはこれらのコンポーザブルを、Vue パッケージのルートバレルではなく、直接 `@vue-solana/vue/*` サブパスから自動 import します。これにより、ページが 1 つのコンポーザブルを使うだけで Nuxt の SSR バンドルが無関係な Solana ランタイムコードを読み込んでしまうことを防ぎます。

- `useSolana()`: 注入された Solana コンテキスト全体を返します。
- `useSolanaClient()`: コンテキストから Kit の `{ client, rpc }` を返します。新しいコードに推奨されます。
- `useSolanaRpc()`: クラスター、エンドポイント、RPC ステータス、最新ブロックハッシュ、注入された Kit の `client`、`checkConnection()` を返します。
- `useSolanaConnection()`: 注入された Kit の `client` を返します（`useSolanaClient()` の使用を推奨するため非推奨）。
- `useSolanaAccountInfo(address, options?)`: アカウント情報を読み取り、アカウントの変更を購読できます。
- `useSolanaAirdrop()`: テストネットワークとローカルバリデータでアカウントに SOL をエアドロップします。
- `useSolanaWallet()`: 選択中のウォレット状態、接続状態、ケイパビリティ、ウォレットのアクションを返します。
- `useSolanaWallets()`: 検出されたウォレットと、ウォレットの選択・更新アクションを返します。
- `useSolanaBalance(address, commitment?)`: 公開鍵またはアドレスの lamport 残高を読み取ります。
- `useSolanaTokenAccounts(owner, options?)`: オーナーのすべての SPL トークンアカウントを読み取り、デフォルトで Token と Token-2022 の両方のプログラムに問い合わせます。
- `useSolanaTokenBalance(mint, owner)`: 関連付けられたトークンアカウントを通じて、mint とオーナーのペアの SPL トークン残高と decimals を読み取ります。
- `useSolanaProgramAccounts(programId, options?)`: フィルタとデータスライスを使って、プログラムが所有するアカウントを読み取ります。
- `useSolanaTransactionConfirmation(options?)`: 既存のトランザクション署名を確認します。
- `useSolanaSignatureStatus(signature, options?)`: 署名ステータスを読み取り、ポーリング、または購読します。
- `useSolanaSignMessage()`: オフチェーンの認証や所有権チャレンジのメッセージに署名します。
- `useSolanaSignAndSendTransaction()`: トランザクションに署名し、送信し、任意で確認します。
- `useSolanaAction(handler)`: 再ディスパッチ時に中断する汎用的な非同期アクションのステートマシンです。
- `useSolanaRequest(source, options?)`: ソースが変わると再実行されるワンショットリクエストで、stale-while-revalidate を備えています。
- `useSolanaSubscription(source, options?)`: RPC 購読やその他のリアクティブなストリームソースからのライブデータです。
- `useSolanaTrackedData(source, options?)`: ワンショットの取得で初期化され、スロット単位で重複排除された RPC 購読です。
- `useSolanaSignIn()`: ウォレットの Sign In With Solana（SIWS）機能をトリガーします。
- `useSolanaPay()`: Solana Pay の送金リクエスト URL を構築・解析し、リファレンスによる確認ステータスを追跡します。
- `useSolanaPayConfirmation()`: Solana Pay リファレンスの支払いステータスをポーリングします。
- `useSolanaQrCode()`: Solana Pay URL を SVG の QR コードとして描画します。
- `useSolanaQrScanner()`: カメラと `BarcodeDetector` を通じて Solana Pay の QR コードをスキャンします。

マウントをまたいだキャッシュキーには、SWR アダプタとそのキャッシュヘルパーが、ラップするコンポーザブルと一緒に自動 import されます: `useSolanaRequestSwr()`、`useSolanaSubscriptionSwr()`、`useSolanaTrackedDataSwr()`、`clearSwrCache()`、`deleteSwrKey()`。これらは `@vue-solana/vue/swr` の export のエイリアスです:

```ts
const balance = useSolanaRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Vue パッケージのサブパスから明示的に import することもできます:

```ts
import { useRequestSwr } from "@vue-solana/vue/swr";
```

リクエスト、購読、追跡データ、SWR キャッシュの各コンポーザブルの完全なセマンティクスについては、[データ取得コンポーザブル](/ja/packages/vue#データ取得コンポーザブル) を参照してください。

- `useSolanaSelectedWalletAccount()`: ランタイムプラグインがインストールしたアプリ全体の選択中ウォレットアカウントコンテキストを読み取ります。
- `useSolanaSignTransactions()`: 1 回のウォレットリクエストで複数のトランザクションに署名します。
- `useSolanaSignAndSendTransactions()`: 1 回のウォレットリクエストで複数のトランザクションに署名して送信します。
- `useSolanaPayer()` / `useSolanaIdentity()`: リアクティブな Kit クライアント署名者です（署名者プラグインが必要です）。
- `useSolanaPlanTransaction()` / `useSolanaPlanTransactions()`: 命令の入力からトランザクションメッセージを計画します。
- `useSolanaSendTransaction()` / `useSolanaSendTransactions()`: デフォルトクライアントがインストールする公式の Kit プランナーと RPC プラン送信エグゼキュータを使用します。ウォレットのポップアップなしで、計画、署名、送信を行い、`confirmed` コミットメントまで待機します。クライアント専用の Vue プラグインで `payer` を設定してください。接続中のウォレットが各トランザクションを承認する必要がある場合は `useSolanaSignAndSendTransaction(s)` を使用してください。

これらは Vue コンポーザブルの Nuxt エイリアスです。

- `useSolanaClientCapability()`: インストールされた Kit クライアントに必要なケイパビリティがない場合に即座に失敗します。
- `tryUseSolana()`: 注入された Solana コンテキストへの、例外を投げない安全なアクセサです。
- `clearSwrCache()`: モジュールレベルの SWR キャッシュをクリアします（[データ取得コンポーザブル](/ja/packages/vue#データ取得コンポーザブル) を参照）。
- `deleteSwrKey()`: アダプターのプレフィックスを含む完全なキーで、キャッシュされた SWR エントリを 1 件削除します（[データ取得コンポーザブル](/ja/packages/vue#データ取得コンポーザブル) を参照）。

Nuxt モジュールが作成するデフォルトクライアントは、`commitment` が設定されていない場合に公式の `solanaRpc()` と `rpcAirdrop()` プラグインを組み合わせます（`commitment` を設定した場合は同じスタックを明示的に構築するため、RPC レイヤーまで確実に届きます）。`solanaRpc()` はトランザクションプランナーと、プラン署名・プラン送信のエグゼキュータを自身でインストールします。以前のカスタムフォールバック送信者は使用されません。そのため `useSolanaSendTransaction()` と `useSolanaSendTransactions()` は公式のクライアント送信ケイパビリティを公開しますが、`payer` と `payerSecretKey` が意図的に `ModuleOptions` から省略されているため、モジュールは payer を設定しません。したがって、クライアントから送信するトランザクションには [モジュールのセットアップ](#モジュールのセットアップ) で説明しているように、`clientPlugin: false` を設定したクライアント専用プラグインでインストールした `payer` が必要です。`sent` ステータスは、公式エグゼキュータが `confirmed` コミットメントで送信と確認の処理を完了した後に到達します。

Vue パッケージは `useRpc()` のような短い名前を使用します。呼び出し側が `@vue-solana/vue/useRpc` から明示的に import するためです。

Nuxt モジュールは `useSolanaRpc()` のようなプレフィックス付きの名前を公開します。自動 import されるコンポーザブルはアプリ全体の Nuxt 名前空間を共有するため、アプリのコードや他のモジュールとの衝突を避ける必要があるからです。

`useSolana()` は例外です。すでに名前空間で区切られており、Vue と Nuxt の両方で正規のコンテキストアクセサとして機能するためです。

Nuxt アプリ内では `useSolana*` の名前を使用してください。そうすれば明示的な import なしで自動 import が機能します。

生のトランザクションバイトとブラウザ用 Buffer ヘルパーは自動 import ではなく、明示的な import です:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
```

Kit API は自動 import と明示的な import の両方で利用できます:

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";

const { client, rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
const owner = address("PASTE_A_SOLANA_ADDRESS");
```

より低レベルな core の用途に限り、直接 `@vue-solana/core/*` の import を使用してください。

直接利用できるパッケージのサブパス:

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/kit`

ランタイムプラグインはクライアント専用です。自動 import されるコンポーザブルは SSR 中にも呼び出せ、ハイドレーションによって実際のクライアントコンテキストが提供されるまでは不活性な状態を返します。RPC とウォレットの処理は、クライアントのライフサイクルフックまたはユーザー操作からトリガーしてください。

Android Mobile Wallet Adapter の登録もクライアントでのみ実行されます。Android Chrome と Chrome の PWA では、`Mobile Wallet Adapter` がブラウザ拡張ウォレットと同じ `useSolanaWallets()` のリストに表示されることがあります。iOS ブラウザでは、Phantom、Solflare、Backpack がウォレット固有のユニバーサルリンクを通じて同じリストに表示されることがあります。デスクトップのネイティブアプリウォレットアダプタは計画中ですが、まだ実装されていません。

## 関連ガイド

- [RPC とクラスター](/ja/guides/rpc-and-clusters): Nuxt モジュールを設定し、RPC の状態を読み取ります。
- [ウォレット](/ja/guides/wallets): クライアントのフローで `useSolanaWallets()` と `useSolanaWallet()` を安全に使用します。
- [アカウント読み取り](/ja/guides/account-reads): 残高、アカウントデータ、プログラムアカウント、署名ステータスを読み取ります。
- [トランザクション](/ja/guides/transactions): Nuxt からトランザクションの署名、送信、確認、ステータス処理を行います。
- [メッセージ署名](/ja/guides/message-signing): オフチェーンメッセージに対するウォレット署名を要求します。
- [Solana Pay](/ja/guides/solana-pay): 支払いと QR コードのために、自動 import される Solana Pay コンポーザブルを使用します。
- [E2E テスト](/ja/guides/e2e-testing): Playwright テストで RPC、RPC 購読、ウォレットをモックします。
- [エラー](/ja/guides/errors): 自動 import されるコンポーザブルのエラーを安全な UI メッセージに対応付けます。

## RPC の状態を読み取る

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "Unable to reach the configured Solana RPC endpoint."
    : "Unable to check the Solana connection.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## 残高を読み取る

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## トークンアカウントを読み取る

```vue
<script setup lang="ts">
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useSolanaTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load token accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Token accounts: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useSolanaTokenAccounts()` は、オーナーが null のときに RPC を呼び出さずに状態をクリアします。結果を単一のトークンプログラムに限定するには、オプションで `programId` を渡してください。

## トークン残高を読み取る

```vue
<script setup lang="ts">
const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useSolanaTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter valid mint and owner addresses.";
    case "RPC_FAILURE":
      return "Unable to load token balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimals)</p>
    <p v-else>No token account found.</p>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useSolanaTokenBalance()` は、関連付けられたトークンアカウントが存在しない場合に `null` の残高と decimals を返し、それをエラーとして扱いません。`balance` と `decimals` は 1 回の読み取りから導出された読み取り専用の computed ref です。参照するだけにし、代入しないでください。

## 読み取り系コンポーザブルのセマンティクス

`useSolanaBalance()`、`useSolanaAccountInfo()`、`useSolanaProgramAccounts()`、`useSolanaTokenAccounts()`、`useSolanaTokenBalance()` は、Vue のコンポーザブルと同一の単一のステートマシンを共有します:

- **`refresh()` は失敗時に reject します**（resolve ではなく）。入力が空の場合は `null` で resolve します。`try`/`catch` なしの `await refresh()` は例外を投げます。`@click` に直接配線するのは問題ありません（Vue が reject を握りつぶします）が、手書きの呼び出し側は処理する必要があります。`useSolanaRequest()` は例外で、試行結果で resolve します。
- **読み取りが失敗すると、データは空の値に戻ります。** 最後に成功した残高が新しい `error` と並んで残り続けることはありません。何を描画するかを選ぶには `error` で分岐してください。

解析できないアドレスは `error` に `INVALID_ADDRESS` を報告し、RPC には到達しません。詳しくは [アカウント読み取り](/ja/guides/account-reads#更新とエラーのセマンティクス) を参照してください。

## エラー処理

Nuxt の自動 import コンポーザブルは、`@vue-solana/vue` と同じ正規化された `SolanaError | null` ref を公開します。UI の分岐には安定した `error.value.code` の値を使い、元のウォレット、RPC、解析、タイムアウト、ストレージの失敗をログに残すために `error.value.cause` を保持してください。

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## アカウントデータを読み取る

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

公開 RPC ノードでは `useSolanaProgramAccounts()` を慎重に使用してください。狭いフィルタを優先し、部分的な読み取りには `dataSlice` を使い、広範なスキャンのポーリングは避けてください。

## ウォレットの状態

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey }}</p>
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

ブラウザ拡張ウォレットは Solana Wallet Standard を通じて検出されます。Android Mobile Wallet Adapter のウォレットは、サポートされている Android Chrome クライアントで `@solana-mobile/wallet-standard-mobile` を通じて登録され、同じウォレットリストに公開されます。iOS の Phantom、Solflare、Backpack のエントリは、iOS ブラウザでウォレット固有のユニバーサルリンクを通じて公開されます。`refreshWallets()` は検出されたウォレットリストのみを更新し、`selectWallet()` はアクティブなウォレットを設定するだけです。ページを再読み込みした後に拡張機能が以前に承認されたアカウントを公開していても、`connect()` が成功するまで `connected` は false のままです。

## メッセージ署名

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
</script>
```

メッセージ署名はウォレットの所有権や認証チャレンジのためのものです。トランザクション署名ではなく、オンチェーンの状態変更を承認するものではありません。メッセージ署名を公開しないウォレットは `canSignMessage` を false として報告し、`execute()` は未サポートのウォレットエラーで reject します。

## トランザクションの署名、送信、確認

接続中のウォレットにトランザクションへ署名して送信させる場合は、クライアント側のユーザー操作から `useSolanaSignAndSendTransaction()` を使用します。署名の送信で止まらず UI が確認を待つ必要がある場合は、`confirm: true` を渡してください。

```vue
<script setup lang="ts">
import type { SolanaTransaction } from "@vue-solana/nuxt/kit";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction(transaction: SolanaTransaction) {
  // Build the transaction message with @vue-solana/nuxt/kit and serialize it to wire bytes first.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Submitted: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to complete the transaction.</p>
  </section>
</template>
```

ステータスは RPC への送信後、`sending` から `sent` に移ります。確認が有効な場合は `confirming` を経て、到達したコミットメント（`confirmed` や `finalized` など）で終了します。送信後に確認がタイムアウトした場合でも `signature` は利用可能なままなので、アプリは再試行の前にエクスプローラのリンクを表示したり、署名ステータスをポーリングしたりできます。

クライアントから送信するトランザクションは異なります。`useSolanaSendTransaction()` と `useSolanaSendTransactions()` は公式の RPC プラン送信エグゼキュータを使用します。エグゼキュータは `execute()` が resolve する前に `confirmed` コミットメントまで待機するため、これらの `sent` ステータスはクライアント側の送信と確認の処理が完了したことを意味します。ウォレットのポップアップは表示されません。クライアント専用の Vue プラグインで `payer` をインストールしてください。Nuxt の public runtime config に生の `payerSecretKey` を設定しようとしないでください。

ウォレットのプロンプトは、ハイドレーション後のユーザー操作によってトリガーする必要があります。SSR 中、サーバールート内、またはページ読み込み時に自動で `execute()` を呼び出さないでください。

## 既存の署名を確認する

すでに署名を持っていて、リアクティブな確認状態が必要な場合は `useSolanaTransactionConfirmation()` を使用します。

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirm signature</button>
    <p>Status: {{ status }}</p>
    <p v-if="confirmation">Reached {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to confirm the signature.</p>
  </section>
</template>
```

## 署名ステータスを追跡する

送信済みの署名について継続的なステータス確認が必要な場合は `useSolanaSignatureStatus()` を使用します。これはタイムアウト後に便利です。UI が待機をやめた後でもトランザクションが着地する可能性があるためです。

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling } = useSolanaSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>
```

エクスプローラのリンクには、設定済みのクラスターを使用してください。Devnet のリンクには `?cluster=devnet` を含める必要があります。`mainnet` とレガシーなエイリアス `mainnet-beta` はどちらもクラスターのクエリを省略してください。

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## サンプルアプリ

完全に動作する Nuxt のフローについては、[Nuxt サンプル](/ja/examples/nuxt) を参照してください。
