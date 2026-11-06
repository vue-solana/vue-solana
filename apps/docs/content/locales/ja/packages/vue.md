---
title: "@vue-solana/vue"
description: Solana アプリケーション向けの Vue プラグインとコンポーザブルです。
ogSection: パッケージ
surroundOrder: 17
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) は、Solana の RPC アクセス、残高読み取り、ウォレット状態、トランザクションヘルパー状態のための Vue プラグインとコンポーザブルを提供します。

## インストール

```sh
pnpm add @vue-solana/vue
```

このパッケージは ESM 専用です。Vite アプリはすでに ESM をバンドルしているため変更は不要です。CommonJS の `require("@vue-solana/vue")` は `No "exports" main defined` で失敗するので、import するモジュールを ESM にするか、`.cjs` ビルドを同梱している `@vue-solana/vue@^2` に留めてください。詳しくは [v2 から v3 へのアップグレード](/ja/guides/migration#移行-v2-から-v3) を参照してください。

トランザクションを作成またはシリアライズするブラウザアプリは、`@vue-solana/vue/buffer-polyfill` から Buffer ポリフィルを初期化できます。

## プラグインのセットアップ

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

Android の Mobile Wallet Adapter 登録は、対応している Android Chrome クライアントではデフォルトで有効です。`mobileWallet` オプションを渡して MWA のアプリ識別情報をカスタマイズするか、`mobileWallet: false` を渡して Android モバイルウォレット登録を無効にします。

iOS ブラウザウォレットのリンクは、iOS ブラウザで Phantom、Solflare、Backpack に対してデフォルトで有効です。`iosWallet` オプションを渡してアプリ識別情報、リダイレクト URL、チェーン、クラスタをカスタマイズするか、`iosWallet: false` を渡して iOS ウォレットリンクの検出を無効にします。

カスタム RPC エンドポイントを渡すこともできます:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

対応しているクラスタは `mainnet`（レガシーな別名 `mainnet-beta`）、`devnet`、`testnet`、`localnet` です。Solana メインネットには `mainnet` を使用してください。これは Solana の公式なメインネットクラスタ名です。

### プラグインのオプション

| オプション       | 型                             | デフォルト               | 説明                                                                                                                                 |
| ---------------- | ------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `cluster`        | Solana クラスタ                | `devnet`                 | `endpoint` を省略したときに使用するクラスタです。`mainnet-beta` は `mainnet` のレガシーな別名として受け付けられます。                |
| `endpoint`       | `string`                       | クラスタのエンドポイント | HTTP RPC エンドポイントです。                                                                                                        |
| `wsEndpoint`     | `string`                       | 派生エンドポイント       | WebSocket RPC エンドポイントです。                                                                                                   |
| `commitment`     | Commitment                     | Kit のデフォルト         | RPC 呼び出しのデフォルトコミットメントです。                                                                                         |
| `autoConnect`    | `boolean`                      | `false`                  | 以前に選択された検出済みウォレットのみを再接続します。                                                                               |
| `payer`          | `TransactionSigner`            | なし                     | クライアント送信トランザクション用の、クライアント側の手数料支払者兼署名者です。                                                     |
| `payerSecretKey` | `string`                       | なし                     | Base64 の 64 バイト Ed25519 キーペア（先頭が秘密鍵）。アドレスはクライアント作成時に導出され、署名鍵は初回使用時に import されます。 |
| `wallet`         | `SolanaWallet`                 | 無効                     | カスタムウォレットアダプターです。                                                                                                   |
| `mobileWallet`   | `MobileWalletOptions \| false` | Android で有効           | Android Mobile Wallet Adapter のオプションです。                                                                                     |
| `iosWallet`      | `iOSWalletOptions \| false`    | iOS で有効               | iOS ウォレットのユニバーサルリンクオプションです。                                                                                   |

`payer` と `payerSecretKey` は、Vue プラグイン／core のクライアントを直接使う場合にサポートされます。クライアント送信トランザクションには `payer` が必要です。`payerSecretKey` は検証前の公開鍵半分からクライアント作成時にアドレスを導出するため、最初の署名が成功するまで `payer.address` は未確認のものとして扱ってください。また、キーペアが一致しない場合は作成時ではなく最初の署名時に拒否されます。署名では WebCrypto を介して鍵を import しますが、ブラウザはこれをセキュアコンテキスト（`https`、または `localhost` 上の `http`）でのみ公開します。Nuxt の public ランタイム設定に生の秘密鍵や `payerSecretKey` を入れたり、資金のある署名鍵をエンドユーザーのブラウザに配布したりしないでください。

`createSolanaPlugin()` が作成するデフォルトクライアントは、`commitment` が設定されていない場合に公式の `solanaRpc()` + `rpcAirdrop()` の組み合わせを使用します。`solanaRpc()` 自体がプランナー、プラン署名エグゼキューター、プラン送信エグゼキューターをインストールします。`commitment` が設定されている場合は同じスタックを明示的に構築するため、コミットメントが RPC 層まで届きます。以前のカスタムフォールバック送信は使用されません。公式の送信エグゼキューターは、`execute()` が解決して `status` を `sent` に設定する前に、`confirmed` コミットメントを待機します。

### クライアントとプラグインのライフサイクル

`createSolanaPlugin()` は `install()` の間に一度だけ Kit クライアントを構築します。プラグインはモジュールスコープで作成し、インスタンスを再利用してください:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

`createSolanaPlugin()` を再度呼び出すと新しいクライアントとコンテキストが構築され、既存のウォレット選択と RPC 状態は破棄されます。設定がリアクティブな場合（たとえばクラスタの切り替え）は、レンダリングのたびではなく、値が実際に変わったときだけ新しいプラグイン（およびクライアント）が構築されるように設定側でメモ化してください:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

アプリを破棄するときはプラグインを dispose してください。`createSolanaPlugin()` は Wallet Standard の検出購読と遅延ブートストラップを開始します。`dispose()` はその両方を停止するので、アプリより長く生存することはありません:

```ts
export const solana = createSolanaPlugin({ cluster: "devnet" });
const app = createApp(App).use(solana);

app.unmount();
solana.dispose();
```

複数回呼び出しても、`use()` より前に呼び出しても安全です。Nuxt アプリではコードは不要です。モジュールのランタイムプラグインが `vueApp.onUnmount()` に接続します。

Kit クライアントは構築時に `createClient().use(...)` のプラグインを実行します。そのうちのひとつが非同期の場合、クライアント（およびそこから構築されたコンテキスト）はその promise が解決してからでないと有効になりません。実際の RPC やウォレットの処理は、セットアップ中や SSR 中に実行するのではなく、ハイドレーション後のクライアントライフサイクルフックまたはユーザー操作に遅延させてください。

## コンポーザブル

ルートエクスポートも引き続きサポートされています。コンポーザブルについては、新しいコードでは直接サブパスを import することを推奨します。バンドラーが無関係なパッケージエントリのコードを評価せずに済みます:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

直接使えるパッケージサブパス:

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/useSendTransaction`
- `@vue-solana/vue/useSendTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
- `@vue-solana/vue/useSolanaPay`
- `@vue-solana/vue/useSolanaPayConfirmation`
- `@vue-solana/vue/useSolanaQrCode`
- `@vue-solana/vue/useSolanaQrScanner`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/kit`

Buffer ポリフィルを必要とするブラウザ向けトランザクションコードには `@vue-solana/vue/buffer-polyfill` を使用してください。`installSolanaBufferPolyfill()` を名前付き import で取り込んで呼び出します。`import "@vue-solana/vue/buffer-polyfill"` のような副作用だけの import では何もインストールされません。すべての `@vue-solana/*` パッケージは `"sideEffects": false` とマークされており、このサブパスは関数だけをエクスポートしているためです。Kit API には `@vue-solana/vue/kit` を使用してください。`@solana/kit` 全体を再エクスポートするので、そのパッケージを自分でインストールする必要はありません。低レベルの core 用途では、`@vue-solana/core/*` を直接 import することも引き続きサポートされています。

- `useSolana()`: 注入された Solana コンテキスト全体を返します。
- `useSolanaClient()`: コンテキストから Kit の `{ client, rpc }` を返します。新しいコードに推奨されます。
- `useRpc()`: クラスタ、エンドポイント、接続状態、最新のブロックハッシュ、注入された Kit の `client`、`checkConnection()` を返します。
- `useConnection()`: 注入された Kit クライアントを返します（`useSolanaClient()` の利用を推奨するため非推奨です）。
- `useAccountInfo(address, options?)`: 正規化されたアカウントデータ（executable、lamports、owner、space、データバイト）を読み込みます。
- `useProgramAccounts(programId, options?)`: プログラム ID が所有するアカウントを、任意のフィルターとデータスライス付きで読み込みます。
- `useWallet()`: アクティブなウォレットの ref、算出された接続状態、ウォレットのアクションを返します。
- `useWallets()`: 検出されたブラウザ拡張ウォレット、Android Mobile Wallet Adapter ウォレット、対応している iOS ブラウザウォレットのエントリ、ウォレット選択アクションを返します。
- `useBalance(address, commitment?)`: アドレス文字列の lamport 残高を読み込みます。
- `useAirdrop()`: テストネットワークとローカルバリデータのアカウントに SOL をエアドロップします。
- `useTokenAccounts(owner, options?)`: owner のすべての SPL トークンアカウントを読み込みます。デフォルトでは Token プログラムと Token-2022 プログラムの両方を問い合わせます。
- `useTokenBalance(mint, owner)`: 関連付けられたトークンアカウント経由で、mint/owner ペアの SPL トークン残高と decimals を読み込みます。
- `useTransaction(handler, options?)`: 任意のタイムアウト設定を備えた、汎用的な非同期トランザクション状態ヘルパーです。
- `useTransactionConfirmation(options?)`: 送信済みの署名を、リアクティブな状態とタイムアウト／エラー状態で確認します。
- `useSignatureStatus(signature, options?)`: 署名ステータスの更新を読み取り、ポーリングし、または購読します。
- `useSignMessage()`: 設定済みのウォレットが対応している場合に、任意の認証メッセージへ署名します。
- `useSignAndSendTransaction()`: 設定済みのウォレットを介してトランザクションに署名して送信します。確認待機は任意です。
- `useAction(handler)`: 再ディスパッチ時の中断を備えた、汎用的な非同期アクション状態マシンです。データ系コンポーザブルの土台です。
- `useRequest(source, options?)`: ソースが変わると再実行される単発の非同期リクエストで、stale-while-revalidate を備えています。
- `useSubscription(source, options?)`: RPC 購読やその他のリアクティブなストリームソースからのライブデータです。
- `useTrackedData(source, options?)`: 単発のフェッチで初期化し、スロットで重複排除する RPC 購読です。
- `useSignIn()`: ウォレットの Sign In With Solana（SIWS）機能をトリガーします。
- `useSolanaPay()`: Solana Pay の送金リクエスト URL を構築・解析し、reference ごとに確認状態を追跡します。
- `useSolanaPayConfirmation()`: Solana Pay の reference に対する支払い状態をポーリングします。
- `useSolanaQrCode()`: Solana Pay の URL を SVG の QR コードとして描画します。
- `useSolanaQrScanner()`: カメラと `BarcodeDetector` を使って Solana Pay の QR コードをスキャンします。
- `useSelectedWalletAccount()`: アプリ全体で選択中のウォレットアカウントを `SelectedWalletAccountProvider`（または `provideSelectedWalletAccount()`）から読み取ります。
- `useSignTransactions()`: 複数のシリアライズ済みトランザクションを 1 回のウォレットリクエストで署名します。
- `useSignAndSendTransactions()`: 複数のトランザクションを 1 回のウォレットリクエストで署名して送信します。
- `useClientCapability(capability)`: Kit クライアントにケイパビリティがインストールされていることを検証し、なければ明確なエラーで即座に失敗します。
- `usePayer()` / `useIdentity()`: Kit クライアントから手数料支払者／操作主体の署名者をリアクティブに追跡します。
- `usePlanTransaction()` / `usePlanTransactions()`: 命令の入力からトランザクションメッセージをプランニングします（送信はしません）。
- `useSendTransaction()` / `useSendTransactions()`: `createSolanaClient()` がインストールした公式の Kit プランナーと RPC プラン送信エグゼキューターを使用します。ウォレットのポップアップなしで、プランニング、署名、送信を行い、`confirmed` コミットメントを待機します。`payer` を設定してください。

## 関連ガイド

- [RPC とクラスタ](/ja/guides/rpc-and-clusters): 接続状態を読み取り、エンドポイントを設定します。
- [ウォレット](/ja/guides/wallets): ウォレットを検出、選択、接続、切断し、ケイパビリティを確認します。
- [アカウント読み取り](/ja/guides/account-reads): 残高、アカウント情報、プログラムアカウント、署名ステータスを読み取ります。
- [トランザクション](/ja/guides/transactions): 署名、送信、確認、トランザクション進捗の表示を行います。
- [メッセージ署名](/ja/guides/message-signing): オフチェーンの認証や所有権チャレンジに署名します。
- [Solana Pay](/ja/guides/solana-pay): `useSolanaPay()` で支払いリクエストを構築し、QR コードを描画またはスキャンします。
- [E2E テスト](/ja/guides/e2e-testing): Playwright テストで RPC、RPC 購読、ウォレットをモックします。
- [エラー](/ja/guides/errors): コンポーザブルの `error` ref を安全な UI メッセージに変換します。

## RPC の状態を読み取る

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

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

## Kit クライアントを使う

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Check Slot</button>
  </section>
</template>
```

`useSolanaClient()` は `useSolana()` と同じコンテキストを返しますが、Kit の読み取り向けに整形されています。`client` は `@solana/kit` のクライアント全体で、`rpc` はその読み取り API です。RPC の結果は `bigint` で、アカウントデータは `Uint8Array` です。詳しくは [Kit 移行](/ja/guides/migration) を参照してください。

## 残高を読み取る

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

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
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

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

`useTokenAccounts()` は、owner が null の場合は RPC を呼び出さずに状態をクリアします。オプションで `programId` を渡すと、結果を単一のトークンプログラムに限定できます。

## トークン残高を読み取る

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

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

`useTokenBalance()` は、関連付けられたトークンアカウントが存在しない場合に、残高と decimals として `null` を返し、それをエラーとして扱いません。`balance` と `decimals` は 1 回の読み取りから導出される読み取り専用の computed ref です。読み取るだけにして、代入しないでください。

## 読み取りコンポーザブルのセマンティクス

`useBalance()`、`useAccountInfo()`、`useProgramAccounts()`、`useTokenAccounts()`、`useTokenBalance()` は 1 つの状態マシンを共有しています。そのルールのうち 2 つは、v2 から来た人が戸惑うものです:

- **`refresh()` は失敗時に reject します**（解決しません）。また、入力が空の場合は `null` で解決します。`try`/`catch` なしで `await refresh()` すると例外が投げられます。`@click` に直接接続するのは問題ありません（Vue が reject を握りつぶします）が、手書きの呼び出し側は処理する必要があります。`useRequest()` は例外で、試行結果で解決します。
- **読み取りが失敗すると、データは空の値に戻ります。** 最後に成功した残高が新しい `error` と並んで残ることはありません。エラーと並んだ古い値は、実際には現在のデータではないのにそう見えるためです。何を描画するかは `error` で分岐して選んでください。

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="balanceErrorMessage" />
  <p v-else-if="loading">Loading…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

解析できないアドレスは `error` に `INVALID_ADDRESS` を報告し、RPC には到達しません。詳しくは [アカウント読み取り](/ja/guides/account-reads#更新とエラーのセマンティクス) を参照してください。

## エラーハンドリング

コンポーザブルの `error` ref は、`@vue-solana/core/errors` の `SolanaError | null` を使用します。ユーザー向け UI には `error.value.code` で分岐し、ウォレット、RPC、アドレス解析、タイムアウト、ストレージの元の失敗をデバッグするために `error.value.cause` を保持してください。

```ts
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

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
```

`useSolana()` と `useRpc()` の背後にある注入コンテキストの `error` ref は、ウォレットの起動処理と共有されています。モバイルウォレットの登録、永続化されたウォレットの自動接続、iOS のコールバック処理が、そこに `WALLET_FAILURE`（ウォレットが拒否を報告した場合は `USER_REJECTED`）を書き込みます。次の `checkConnection()` または成功した `connect()` がそれをクリアします。これらのウォレット経路は、開発時のみ `[Vue Solana]` プレフィックス付きで `console.error` にログを出力します。

## アカウント情報を読み取る

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load account data from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()` は、アドレスが null の場合は RPC を呼び出さずに状態をクリアします。不正なアドレス文字列は古い `accountInfo` をクリアし、`error` を設定し、`getAccountInfo()` を呼び出しません。`watch: true` が有効な場合、コンポーネントのアンマウント時に websocket リスナーが自動的に削除されます。`stopWatching()` を呼び出すと現在のリスナーが削除され、そのコンポーザブルインスタンスの自動再開が行われなくなります。

## プログラムアカウントを読み取る

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana program id.";
    case "RPC_FAILURE":
      return "Unable to load program accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()` は、プログラム ID が null の場合は RPC を呼び出さずに状態をクリアします。不正なプログラム ID 文字列は古い `accounts` をクリアし、`error` を設定し、`getProgramAccounts()` を呼び出しません。

> 警告: `useProgramAccounts()` は高コストになる可能性があります。更新のたびに、プログラムが所有する大量のアカウントを走査したり、多くの RPC クレジットを消費したり、プロバイダーのレート制限に達したり、タイムアウトしたりすることがあります。トラフィックの多い UI 経路から広範な走査を実行しないでください。本番の読み取りには、絞り込んだフィルター、`dataSlice`、キャッシュ、インデックス作成、ページネーション戦略、または専用の RPC インフラストラクチャを使用してください。

## ウォレットの状態

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
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
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

ブラウザ拡張ウォレットは Solana Wallet Standard を通じて検出されます。Android の Mobile Wallet Adapter ウォレットは `@solana-mobile/wallet-standard-mobile` を通じて登録され、対応している Android Chrome クライアントでは同じ `useWallets()` リストに公開されます。iOS の Phantom、Solflare、Backpack のエントリは、iOS ブラウザでウォレット固有のユニバーサルリンクを通じて公開されます。`refreshWallets()` は検出済みウォレットリストを更新するだけで、`selectWallet()` はアクティブなウォレットを設定するだけです。ページを再読み込みした後に拡張機能が以前認可されたアカウントを公開していても、`connect()` が成功するまで `connected` は false のままです。`connect()` が成功すると、`standard:disconnect` 機能を通じて他の検出済みウォレットもすべて切断されるため、アプリで認可されたままになるウォレットは 1 つだけです。

デスクトップネイティブアプリのウォレットアダプターはまだ実装されていません。デスクトップネイティブ対応には、ウォレット固有のプロトコルリンクか、将来のネイティブ Wallet Standard 登録が必要です。

プラグインのコンテキストが利用できない場合、コンポーザブルは SSR セーフな不活性状態を返します。実際の RPC とウォレットの操作には、プラグインが提供するクライアントコンテキストが引き続き必要です。

## メッセージ署名

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
```

メッセージ署名は、ウォレットの所有権や認証チャレンジのためのものです。トランザクション署名ではなく、オンチェーンの状態変更を承認するものでもありません。メッセージ署名を公開していないウォレットでは `canSignMessage` が false になり、`execute()` はウォレット未対応のエラーで reject します。

## Sign In With Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Sign in to My App",
    // Generate the nonce server-side and verify it on the server.
    nonce: await fetchNonceFromBackend(),
  });

  // Send { account.address, signature, signedMessage } to your backend for
  // verification before creating a session.
}
```

ウォレットは SIWS 機能をサポートしている必要があります（サポートしていない場合 `canSignIn` は false になり、`signIn()` は `WALLET_FEATURE_UNSUPPORTED` エラーで reject します）。サインインにはウォレットの現在選択中のアカウントが使われます。ウォレットが接続されていない場合、`signIn()` は `WALLET_NOT_CONNECTED` エラーで reject します。先に接続してください。コンポーザブルが代わりに接続することはありません。

### サーバー側で署名を検証する

ウォレットは `signedMessage` に対する署名を返します。これはユーザーが同意した SIWS メッセージです。検証せずに結果を信頼すると、悪意あるクライアントが身元を偽造できてしまうため、セッションを発行する前にサーバー側で検証してください:

1. **メッセージを確認する**: `signedMessage` をデコードし、ドメインがあなたのオリジンと一致すること、`uri` があなたのものであること、`nonce` がこのセッション用にサーバーが発行したものと一致すること、statement と resources が期待どおりであることを確認します。
2. **署名を検証する**: 署名は SIWS メッセージのバイト列に対する Ed25519 署名です。サインイン結果のアカウントの `publicKey` に対して、`tweetnacl`（`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`）または任意の Ed25519 ライブラリで検証します。
3. **セッションを紐付ける**: メッセージの確認と署名の検証が済んでから初めて、`account.address` をキーにしてセッションを作成してください。

サーバーは、発行した nonce から期待されるメッセージを再導出する（または受信したメッセージのすべてのフィールドを検証する）ことで、期限切れやリプレイされた nonce を拒否する必要があります。

`signMessage()` と `signIn()` のどちらも解決する前に、アダプターは Ed25519（WebCrypto）が利用可能な場合、返された署名をアカウントの `publicKey` に対して照合し、一致しない場合は `INVALID_SIGNATURE` で reject します。これは誤動作するウォレットに対するベストエフォートのクライアント側ガードであり、Ed25519 が利用できない場合はスキップされるため、実際にユーザーを認証するのは上記のサーバー側チェックです。

## データ取得コンポーザブル

`useRequest`、`useSubscription`、`useTrackedData` は SWR スタイルのデータ層で、Kit のリアクティブストアのプリミティブ上に構築されています:

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value is a SolanaRpcResponse envelope: data.value.value and
// data.value.context.slot.
```

- `useRequest` は ref/computed のソースが同一性を変えると再実行されます。`null` を渡すと無効になります（status は `disabled`）。
- `useSubscription` は再接続中も古い値を保持し、`reconnect()` がストリームを開き直します。
- `useTrackedData` はフェッチと購読をスロットで重複排除するため、順序が入れ替わって到着しても値が後退しません。

`rpcValueMapper` と `rpcSubscriptionValueMapper` のコールバックは**アンラップされた**レスポンス値（残高なら `value.lamports`）を受け取りますが、返される `data` ref は `SolanaRpcResponse` エンベロープ全体を保持するので、`data.value?.context.slot` を読むことができます。

### `useRequest` による単発リクエスト

`useRequest` は汎用の SWR リクエストです。リクエスト関数、Kit のリクエストオブジェクト（`send()` を持つもの）、またはそのいずれかの `ref`/`computed`、あるいは無効化するための `null` を受け取ります:

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // Optional per-attempt cancellation composed with the internal signal.
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value is the raw response value; status is
// "fetching" | "success" | "error" | "disabled".
```

再検証が実行されている間も、直前の `data` と `error` は保持されるため、UI は描画を続けられます。`refresh()` は手動で再実行し、試行結果で解決します。

### `useSubscription` によるストリーム

`useSubscription` は任意の Kit リアクティブストリームソース（`reactiveStore()` でダックタイピング）を消費し、アンマウント時に接続を破棄し、stale-while-revalidate を伴う手動の再接続をサポートします:

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// Status is "loading" | "loaded" | "error" | "disabled".
// reconnect() re-opens the stream while data keeps the last known value.
```

エラー時も最後に判明している `data` は保持されます。ソースが `null` の場合は購読が無効になり、状態がクリアされます。

### マウントをまたぐキャッシュキー

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

同じキーでマウントされたコンポーネントは、自身のリクエストで再検証しつつ、最後に判明している値から初期化されます。`useAction` 用のアダプターはありません。アクションは変更であり、キャッシュ可能な読み取りではないためです。データ層のミューテーション API（または `useAction` 自体）を使用してください。

キャッシュの動作の詳細:

- キーはアダプターごとに名前空間化される（`request:`、`subscription:`、`tracked:`）ため、同じキーをアダプター間で安全に使えます。
- ソースが `null`/`undefined` の場合はコンポーザブルが無効になり、そのキーのキャッシュエントリが**クリア**されます。コンポーネントがソースを無効にした状態でマウントされた場合も同様です。
- `useTrackedDataSwr` は `SolanaRpcResponse` エンベロープ全体をキャッシュするため、再マウントしたコンポーネントは値とそのスロットコンテキストの両方を復元できます。
- キャッシュはモジュールレベルの `Map` です。サーバー上では、リクエストをまたぐ漏えいを避けるため、リクエストごとにキーを名前空間化するか、リクエスト間に `clearSwrCache()` を呼び出してください。

5 つのコンポーザブルすべて（SWR の再マウント挙動を含む）を devnet に対して実行できるデモについては、[Vue Vite のサンプル](/ja/examples/vue-vite) の Live Data Panels を参照してください。

## トランザクションの状態

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

現在のウォレットは接続済みで、`signAndSendTransaction` または `signTransaction` をサポートしている必要があります。Android Mobile Wallet Adapter ウォレットは、利用可能な場合に `signTransaction` とアプリ側の RPC 送信を優先します。これにより、ウォレットの送信は成功したのにブラウザページがウォレットアダプターの返す署名を受け取れない、モバイルのハンドオフのエッジケースを回避できます。

`confirm: true` がない場合、`execute()` は送信後に戻り、`status` を `sent` に設定します。確認が有効な場合、status は `sending`、`confirming` と進み、その後要求したコミットメントに合わせて `processed`、`confirmed`、`finalized` のいずれかになります。確認がタイムアウトまたは失敗した場合でも、送信済みの `signature` は利用可能なままなので、アプリはエクスプローラーへのリンクを表示できます。

`useSignAndSendTransaction()` は、ウォレットアダプターが結果を返さない場合に `loading` をクリアします。このような古い状態では `error` が設定され、チェーンの状態は不明な可能性があるため、再試行する前に接続中のウォレットまたはエクスプローラーを確認してください。

### ウォレットリクエストの入力と戻り値

ウォレット署名フローは、Solana のトランザクションスキーマに準拠した生の `Uint8Array` のワイヤバイト列をトランザクション入力として受け取ります。`@vue-solana/vue/kit` の Kit ヘルパーで構築する（または base64/base58 の RPC レスポンスからデコードする）してください。ここでは base64 文字列、トランザクションオブジェクト、命令リストは受け付けられません。

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` は署名対象の生のメッセージバイト列を受け取ります。すべてのウォレット送信リクエストは Kit の `SendTransactionOptions` も受け付けます:

| オプション            | 説明                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | 送信前のプリフライトシミュレーションをスキップします。                                                                |
| `maxRetries`          | RPC ノードの再試行回数（`bigint`）です。                                                                              |
| `minContextSlot`      | トランザクション内のブロックハッシュや nonce が存在することが判明しているスロット。これより前の送信は拒否され得ます。 |
| `preflightCommitment` | プリフライトシミュレーションに使用するコミットメントです。                                                            |

戻り値の形:

- `useSignMessage().execute(bytes)` は `{ signedMessage, signature }`（いずれも `Uint8Array`）で解決します。
- `useSignTransactions().execute(transactions)` は署名済みの `Uint8Array[]`（`signedTransactions` としても公開）で解決します。1 つのトランザクションには要素 1 つの配列を渡してください。
- `useSignAndSendTransaction().execute(transaction)` は送信済みの `signature` 文字列で解決します。`confirm: true` の場合は `confirmation` も埋まります。
- `useSignAndSendTransactions().execute(transactions)` は署名の `string[]`（`signatures` としても公開）で解決します。

ウォレットは署名前にメッセージやトランザクションを変更することがあります。たとえば独自の命令を追加したり、手数料支払者を変更したりする場合で、Wallet Standard はこれを明示的に許可しています。入力とバイト単位で一致すると仮定せず、返された `signedMessage` や署名済みトランザクションのバイト列を読み直してください。

### クライアント送信トランザクション

`useSendTransaction()` と `useSendTransactions()` は、接続中のウォレットではなくクライアントのトランザクション送信ケイパビリティを使用します。`createSolanaClient()` と `createSolanaPlugin()` はデフォルトで公式の `solanaRpc()` スタックをインストールし、`solanaRpc()` 自体がプランナーとプラン署名・プラン送信エグゼキューターをインストールするため、これらのコンポーザブルにはカスタムフォールバックや 2 つ目の手動プラグインインストールは不要です。

エグゼキューターは、新しいブロックハッシュを読み取り、リソース制限を見積もるか尊重し、設定がなければプリフライトシミュレーションを実行し、クライアントの署名者で署名し、RPC 経由で送信し、`confirmed` コミットメントを待機します。`status` は、この送信と確認の処理が完了してから `sending` から `sent` に変わります。単一の結果は `data.context.signature` を公開し、バッチの結果はプラン結果のツリーを含みます。ウォレットのポップアップは表示されないため、クライアントが適切な署名者を保持している場合にのみこの経路を使用してください。

Vue/core のクライアントでは `payer` または `payerSecretKey` で `payer` を直接設定します。payer のないクライアントはプランニングも送信もできません。本番で資金のある鍵は、サーバーまたはリレイヤーが所有すべきです。Nuxt の public ランタイム設定に生の秘密鍵や `payerSecretKey` を入れず、資金のあるキーペアをエンドユーザーのブラウザに配布しないでください。

ウォレット系コンポーザブルは引き続き別物です。`useSignAndSendTransaction()` は RPC 送信後に戻ることも、`confirm: true` が渡された場合は選択したコミットメントを待機することもできます。クライアント送信トランザクションは常に、公式エグゼキューターの `confirmed` での送信と確認の挙動を使用します。

## バッチトランザクション

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// One wallet request for N transactions.
const signed = await signMany([transactionA, transactionB]);

// One wallet request for N signatures.
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

どちらもウォレットのバッチ機能を優先します。`useSignTransactions` はレガシーなバッチ `signAllTransactions` 機能にフォールバックし、`useSignAndSendTransactions` は単数のリクエストを順番に送信する方式にフォールバックします。バッチ署名はオール・オア・ナッシング（拒否された場合は何も署名されません）ですが、署名と送信のフォールバックでは先行するトランザクションが送信済みのまま残ることがあります。その場合、`PartialSignAndSendError` で reject し、その `signatures` にすでに送信されたトランザクションが列挙されるので、再試行時にそれらをスキップできます:

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures: the ones that already landed — resend only the rest.
  }
}
```

## 選択中のウォレットアカウント

永続化とフィルタリングを伴うアプリ全体の選択アカウント状態が必要な場合は、プロバイダーをルート付近で 1 回マウントし、どこからでも読み取ります:

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

選択内容はデフォルトで `localStorage` に `${walletName}:${accountAddress}` として永続化され（カスタマイズするには `stateSync` を渡し、無効にするには `null` を渡します）、次回の訪問時にウォレットとアカウントが利用可能であれば復元されます。`filterWallet` は提示するウォレットアカウントを制限します。Nuxt では、モジュールのランタイムプラグインがこのコンテキストを自動的にインストールします。

## クライアントのケイパビリティとプランニング

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// Reactive signers from the Kit client (requires a signer plugin).
const payer = usePayer();
const identity = useIdentity();

// Plan transaction messages from instructions without sending.
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")` はクライアントにケイパビリティがインストールされていることを検証し、不足している場合はセットアップ中に説明的なエラー（フック名とインストール方法を示す）を投げます。デフォルトの Vue クライアントは `solanaRpc()` からプランナーとプラン署名・プラン送信エグゼキューターをすでに取得しています。カスタムクライアントは `rpcTransactionPlanner()` と `rpcTransactionPlanSendingExecutor()` を自分でインストールする必要があります。

## 既存の署名を確認する

アプリにすでに送信済みの署名があり、署名と送信とは別に特定のコミットメントを待機したい場合は `useTransactionConfirmation()` を使用します:

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

このコンポーザブルは、確認がタイムアウトした場合や RPC 呼び出しが失敗した場合でも送信済みの `signature` を保持するため、ユーザーに `error` を提示しながらエクスプローラーへのリンクを表示できます。オプションは `confirmTransactionSignature()` にそのまま渡されます: `commitment`、`timeoutMs`、`pollIntervalMs`、`abortSignal`、`searchTransactionHistory`。失敗したトランザクションは `TRANSACTION_FAILED`、まったく現れない署名は `TRANSACTION_NOT_FOUND`、待機を尽くした場合は `TRANSACTION_TIMEOUT` になります。このコンポーザブルの `error` ref は常に `SolanaError` であるため、確認を中断すると中断理由が `RPC_FAILURE` に正規化され、元の理由は `error.cause` に入ります。生の中断理由が必要な場合は `confirmTransactionSignature()` を直接呼び出してください。

## 署名ステータスを追跡する

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
  },
);
```

呼び出しごとの `commitment` オプションはありません。`getSignatureStatuses()` はそれを受け付けないため、読み取りにはエンドポイントに埋め込まれたコミットメントが使われます。エンドポイントまたは `createSolanaPlugin()` で設定してください。呼び出しごとのコミットメントが必要な場合は `useTransactionConfirmation()` を使用します。

ポーリングは連鎖した `setTimeout` で `getSignatureStatuses()` を使用するため、RPC が遅いと次のティックが遅れるだけで、重なることはありません。`stopPolling()` を呼び出すと現在のタイマーがクリアされ、以降の自動ティックが停止します。ただし、監視対象の署名が変わると、新しい署名に対してポーリングが再開されます。不正な署名は古い `status` をクリアし、`error` を設定し、RPC の呼び出しやポーリングの開始を行いません。`0` 以下の `pollIntervalMs` は `RPC_FAILURE` の `SolanaError` を設定し、ポーリングを開始しません。

## サンプルアプリ

Vue と Vite の完全な実行可能なフローについては、[Vue Vite のサンプル](/ja/examples/vue-vite) を参照してください。
