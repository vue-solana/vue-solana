---
title: "@vue-solana/core"
description: フレームワークに依存しない Solana の設定、RPC、ウォレットの型、トランザクションヘルパー。
ogSection: パッケージ
surroundOrder: 16
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) には、Vue Solana の各パッケージが使用するフレームワーク非依存の Solana プリミティブが含まれています。

Vue プラグインをインストールせずに、Kit クライアント、エンドポイントヘルパー、共有のウォレット型、Android Mobile Wallet Adapter の登録ヘルパー、iOS ブラウザウォレットのヘルパー、トークンアカウントの読み取り、トランザクションヘルパーを使いたい場合は、このパッケージを直接使用してください。

`@vue-solana/core` はモダンな [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) を基盤にしています。`createSolanaClient()` は `@solana/kit` のすべてを再エクスポートする `@vue-solana/core/kit` サブパスにあります。レガシーな `@solana/web3-compat` API と `web3` サブパスは v2.0.0 で削除されました。変更前後の対応表については [Kit 移行](/ja/guides/migration) を参照してください。

## インストール

```sh
pnpm add @vue-solana/core
```

このパッケージは ESM のみです。CommonJS の `require("@vue-solana/core")` は `No "exports" main defined` で失敗します。インポートするモジュールを ESM にするか、引き続き `.cjs` ビルドを同梱している `@vue-solana/core@^2` に留めてください。詳細は [v2 から v3 へのアップグレード](/ja/guides/migration#移行-v2-から-v3) を参照してください。

## クイックスタート

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

Kit クライアントを直接作成することもできます。

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()` は `{ cluster, endpoint, wsEndpoint, client }` を返します。`client` は `client.rpc` と `client.rpcSubscriptions` を備えています。

ルートエクスポートも引き続きサポートされています。直接のサブパスエクスポートも利用できるため、モジュールが提供するヘルパーだけをインポートできます。

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

直接のサブパスは次のとおりです。

- `@vue-solana/core/address`
- `@vue-solana/core/action`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/mobile-wallet-support`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/token-accounts`
- `@vue-solana/core/solana-pay`
- `@vue-solana/core/solana-pay-confirmation`
- `@vue-solana/core/solana-pay-status`

## 関連ガイド

- [RPC とクラスタ](/ja/guides/rpc-and-clusters): クラスタ名、カスタム RPC エンドポイント、WebSocket エンドポイント、クライアントヘルパーを設定します。
- [ウォレット](/ja/guides/wallets): Wallet Standard ウォレットを検出し、モバイルウォレットのソースを登録し、ウォレットの機能を確認します。
- [トランザクション](/ja/guides/transactions): トランザクションの署名、送信、確認、タイムアウトを安全に処理します。
- [Solana Pay](/ja/guides/solana-pay): 支払いリクエストをエンコードし、QR コードを生成・スキャンし、参照によって決済を確認します。
- [エラー](/ja/guides/errors): 安定した `SolanaError` コードで分岐し、生の cause をユーザー向け UI に出さないようにします。

## 設定

```ts
type SolanaCluster = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  payer?: TransactionSigner;
  payerSecretKey?: string;
}
```

サポートされるクラスタは `mainnet`（レガシーな別名 `mainnet-beta`）、`testnet`、`devnet`、`localnet` です。ウォレットヘルパーは `solana:devnet` のような Wallet Standard のチェーン識別子を使用し、これらは `getSolanaChain()` によってクラスタから導出されます。`endpoint` を省略した場合、パッケージは選択したクラスタの公開 Solana RPC エンドポイントを使用します。`wsEndpoint` を省略した場合、RPC エンドポイントから導出されます。

`autoConnect` のデフォルトは `false` です。Vue プラグインまたは Nuxt モジュールを通じて有効にすると、Vue Solana はユーザーが以前に選択し、クライアント上で再び検出されたウォレットの識別情報のみを再接続します。`localStorage["vue-solana:selected-wallet"]` に保存するのはウォレットの識別メタデータのみで、`name` と、利用可能な場合は `platform`/`source` です。秘密鍵、セッションデータ、トランザクションデータは決して保存せず、任意にインストールされたウォレットに接続することもありません。

`payer` は、クライアントの手数料支払者およびクライアント送信トランザクションの署名者として使用される Kit の `TransactionSigner` です。`payerSecretKey` は、秘密鍵を先頭に持つ base64 エンコードされた 64 バイトの Ed25519 キーペアです。クライアントは作成時にアドレスを導出し、初回使用時に署名鍵をインポートするため、公開半分がシードと一致しないキーペアはクライアント作成時ではなく最初の署名時に拒否されます。アドレスは検証されていない公開半分から取得されるため、最初の署名が成功するまで `payer.address` は未確認として扱ってください。署名は WebCrypto を通じて鍵をインポートしますが、ブラウザが WebCrypto を公開するのはセキュアコンテキスト（`https`、または `localhost` 上の `http`）のみです。セキュアコンテキスト外では、最初の `signTransactions()` 呼び出しは汎用的な無効キーエラーを返すのではなく、例外をスローします。どちらのオプションも、core と Vue のクライアントを直接使う場合にサポートされています。

`createSolanaClient()` はデフォルトで公式の `@solana/kit-plugin-rpc` スタックを構成します。`commitment` が設定されていない場合は `solanaRpc()` に続いて `rpcAirdrop()` を呼びます（`commitment` が設定されている場合は、RPC 層に届くよう同じスタックを明示的に構築します）。`solanaRpc()` 自体が `rpcTransactionPlanner()`、`rpcTransactionPlanSigningExecutor()`、`rpcTransactionPlanSendingExecutor()` をインストールするため、クライアントは追加のプラグインなしで RPC の読み取りとサブスクリプションに加えて `planTransaction(s)`、`signTransaction(s)`、`sendTransaction(s)` を公開します。以前の独自フォールバック送信処理は使用されません。公式の送信エグゼキュータは、新しい blockhash の付与、リソース制限とプリフライトの処理、利用可能なクライアント署名者による署名、トランザクションの送信を行い、send が解決する前に `confirmed` commitment まで待機します。クライアントからの送信には `payer` 署名者が必要です。

Nuxt の公開ランタイム設定に生の秘密鍵や `payerSecretKey` を置かないでください。資金のある署名鍵をエンドユーザーのブラウザに配信しないでください。サーバーやリレイヤーの境界を使用するか、デモ用には未資金の一時的な署名者を使用してください。

Solana メインネットには `mainnet` を使用してください。これは Solana の公式なメインネットクラスタ名です。レガシーな `mainnet-beta` という表記も引き続き受け付けられ、同じ `https://api.mainnet.solana.com` エンドポイントにリダイレクトされます。

## コンテキスト

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` は `createSolanaClient()` によって構築された [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) クライアントで、`client.rpc`、`client.rpcSubscriptions`、`planTransaction(s)`、`sendTransaction(s)` を公開します。

## ウォレットインターフェース

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: Signature }>;
}
```

Solana Wallet Standard を通じて検出されたブラウザウォレットと、サポートされている iOS ブラウザウォレットのリンクは、このインターフェースに適合されます。`SolanaWallet` を実装するカスタムオブジェクトを提供することもできます。検出されたウォレットは、ブラウザ拡張が以前に承認したアカウントを公開していても、`connect()` が正常に解決するまでは切断状態のままです。

`publicKey` は接続済みアカウントの base58 エンコードされた Kit の `Address`（文字列）です。`SolanaTransaction` は `Uint8Array` で、ウォレットがそのまま署名する生の wire トランザクションバイトです。先頭のバイトがレガシートランザクションとバージョン付きトランザクションを区別します。

Android Mobile Wallet Adapter は `@solana-mobile/wallet-standard-mobile` を通じて登録され、その後同じ Wallet Standard アダプタを通じて適合されます。

## ウォレットメタデータ

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly SolanaWalletAccountInfo[];
  wallet: unknown;
}
```

現在のメタデータ値は次のとおりです。

- ブラウザ拡張ウォレットは `platform: "browser"` と `source: "wallet-standard"` を使用します。
- Android Mobile Wallet Adapter は `platform: "mobile"` と `source: "mobile-wallet-adapter"` を使用します。
- iOS ブラウザウォレットは `platform: "mobile"` と `source: "deep-link"` を使用します。
- `protocol-link` は、将来のデスクトップネイティブウォレットアダプタ用に予約されています。

## Wallet Standard ヘルパー

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` は、ウォレットの検出、モバイルウォレットの登録、iOS ウォレットのリンク、ウォレットアダプタの署名オプションで使用される Wallet Standard のチェーン識別子です。設定された Solana クラスタから導出する必要がある場合は `getSolanaChain(cluster)` を使用してください。

- `getSolanaChain(cluster)`: `mainnet-beta` または `mainnet`、`devnet`、`testnet`、`localnet` を Solana Wallet Standard のチェーン ID にマッピングします。
- `isSolanaStandardWallet(wallet)`: Wallet Standard ウォレットが Solana をサポートしているかを確認します。
- `getRegisteredSolanaWallets()`: ブラウザ環境で検出された Solana Wallet Standard ウォレットを返します。サポートされているクライアントでは、登録後の Android Mobile Wallet Adapter も含まれます。
- `subscribeSolanaWallets(listener)`: Wallet Standard の register/unregister イベントを購読します。
- `adaptSolanaStandardWallet(walletInfo, options?)`: 検出された Wallet Standard ウォレットを `SolanaWallet` に適合します。
- `disconnectSolanaStandardWallet(walletInfo)`: 検出された Wallet Standard ウォレットを、適合せずにウォレット自身の `standard:disconnect` 機能を通じて切断します。そのため、アプリが一度も選択しないウォレットが `change` サブスクリプションを持つことはありません。ウォレットが切断機能を公開していない場合は `false` で解決し、ウォレット自身のエラーで拒否します。

## モバイルウォレットヘルパー

- `registerSolanaMobileWallet(options?)`: サポートされている Android Chrome クライアントで、Wallet Standard を通じて Android Mobile Wallet Adapter を登録します。
- `isSolanaMobileWalletSupported()`: 現在のランタイムが Android MWA の Web 登録をサポートしているかを返します。
- `getDefaultMobileWalletAppIdentity()`: 現在のドキュメントからデフォルトの Mobile Wallet Adapter アプリ識別情報を導出します。
- `getSolanaIosWallets(options?)`: iOS ブラウザ上で Phantom、Solflare、Backpack の iOS ブラウザウォレットエントリを返します。
- `adaptSolanaIosWallet(walletInfo, options?)`: iOS のディープリンクウォレットエントリを `SolanaWallet` に適合します。
- `handleSolanaIosWalletCallback(options?)`: iOS ウォレットのリダイレクトコールバックを検証して復号します。
- `isSolanaIosBrowserWalletSupported()`: 現在のランタイムが iOS ブラウザウォレットのリンクを公開すべきかを返します。

これらのヘルパーは SSR セーフです。Android の登録は、`window` が利用できない場合、ページがセキュアコンテキストにない場合、またはブラウザが Android でない場合は、何も登録せずに戻ります。iOS ウォレットの検出は、ブラウザが iOS ブラウザのランタイムでない場合は空のリストを返します。

## ヘルパー

ルートの `@vue-solana/core` エクスポートは、以下の公開ヘルパーを再エクスポートします。バレル全体ではなく 1 つのヘルパーのモジュールだけをインポートしたい場合は、直接のサブパスを使用してください。

| インポートパス                     | 含まれるもの                                                                                                       | 使用する場面                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/action`          | `createSolanaActionStore()`、`SolanaActionState`、`isSolanaActionAborted()`。                                      | Solana の処理に対して、再ディスパッチ時に中断するフレームワーク非依存の非同期アクション状態マシンが必要なとき。                         |
| `@vue-solana/core/address`         | `parseAddress()` とアドレス入力の型。                                                                              | Solana アドレスを文字列、ref ライクなオブジェクト、または getter として受け取り、検証済みで正規化された `Address` が必要なとき。        |
| `@vue-solana/core/clusters`        | デフォルトのクラスタとエンドポイントのヘルパー。                                                                   | `mainnet`、`mainnet-beta`、`testnet`、`devnet`、`localnet` 向けのパッケージ組み込みの RPC または WebSocket エンドポイントが必要なとき。 |
| `@vue-solana/core/errors`          | `SolanaError`、エラーファクトリ、エラーガード。                                                                    | ウォレット、RPC、アドレス、トランザクション、タイムアウト、ストレージの失敗に対して、ユーザー向けの安定したエラーコードが必要なとき。   |
| `@vue-solana/core/ios-wallet`      | iOS ブラウザウォレットの検出、ディープリンクアダプタ、コールバック処理。                                           | Vue プラグインの統合ウォレットフローを使わずに iOS ウォレットリンクを組み込むとき。                                                     |
| `@vue-solana/core/kit`             | `createSolanaClient()` と `@solana/kit` のサーフェス全体。                                                         | 自分の `package.json` に `@solana/kit` をインストールせずにモダンな Kit API を使いたいとき。                                            |
| `@vue-solana/core/mobile-wallet`   | Android Mobile Wallet Adapter の登録ヘルパー。                                                                     | Wallet Standard のウォレットを読み取る前に Android MWA を登録する必要があるとき。                                                       |
| `@vue-solana/core/rpc`             | `createSolanaContext()`。                                                                                          | Vue プラグインをインストールせずに、設定済みの Kit クライアントと解決済みのクラスタエンドポイントが必要なとき。                         |
| `@vue-solana/core/timeout`         | Solana のタイムアウトエラーを生成する Promise タイムアウトヘルパー。                                               | トランザクション確認ヘルパーと一貫したタイムアウト動作が必要なとき。                                                                    |
| `@vue-solana/core/transaction`     | トランザクションの送信と確認のヘルパー。                                                                           | ウォレットを考慮した送信経路、または既存の署名に対する確認結果が必要なとき。                                                            |
| `@vue-solana/core/token-accounts`  | ステートレスな SPL Token アカウントの読み取り（`getTokenAccountsByOwner`、`getTokenAccount`、`getTokenBalance`）。 | Kit RPC の `jsonParsed` API を通じてトークンアカウントや残高を読み取る必要があるとき。                                                  |
| `@vue-solana/core/types`           | 共有の TypeScript 型。                                                                                             | `SolanaConfig`、`SolanaContext`、`SolanaWallet`、ウォレットメタデータ、トランザクションオプションの型が必要なとき。                     |
| `@vue-solana/core/wallet`          | ウォレット状態のアサーションとウォレット機能のエラー。                                                             | ウォレットのメソッドを呼ぶ前に、選択したウォレットが接続済みか、署名をサポートしているかを検証する必要があるとき。                      |
| `@vue-solana/core/wallet-standard` | Wallet Standard のチェーンマッピング、検出、サブスクリプション、アダプタヘルパー。                                 | Solana Wallet Standard の上に独自のウォレット検出レイヤーを構築するとき。                                                               |

### クラスタと RPC

- `DEFAULT_CLUSTER`: デフォルトのクラスタで、現在は `devnet` です。
- `getClusterEndpoint(cluster?)`: クラスタの HTTP RPC エンドポイントを返します。
- `getClusterWebSocketEndpoint(cluster?)`: クラスタの WebSocket エンドポイントを返します。
- `getWebSocketEndpoint(endpoint)`: `http`/`https` の RPC URL を `ws`/`wss` の URL に変換します。
- `createSolanaClient(config?)`: `rpc` が解決済みのエンドポイントと WebSocket サブスクリプションに接続され、公式のプランナーとトランザクション送信エグゼキュータがデフォルトでインストールされた `@solana/kit` クライアントを作成します。
- `createSolanaContext(config?)`: フレームワーク非依存のアプリ設定用に `{ cluster, endpoint, wsEndpoint, client }` を作成します。

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

`createSolanaContext` に相当するコードは次のとおりです。

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

`@vue-solana/core/kit` サブパスは `@solana/kit` のすべて（公開サーフェス全体、値と型）を再エクスポートするため、自分の `package.json` に `@solana/kit` をインストールする必要はありません。

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)`: 指定された `SolanaConfig` 用の Kit クライアントを構築します。`clusters.ts` のエンドポイント解決を再利用し、解決された WebSocket エンドポイントから `rpcSubscriptionsUrl` を接続し、公式の RPC プランナーとトランザクション送信エグゼキュータをデフォルトでインストールします。
- `client.rpc` は、Solana の読み取り API 全体（`getSlot`、`getBalance`、`getBlockHeight`、`getSignatureStatuses` など）を、`.send()` で呼び出す RPC 関数として公開します。
- `address(value)`: 値を検証して `Address`（base58 文字列のブランド型）を返します。`new PublicKey(...)` に代わる Kit の置き換えです。
- `lamports(value: bigint)`: `Lamports` 値を返します。生の lamport 数値に代わる Kit の置き換えです。
- よく使われる型: `Address`、`Commitment`、`Lamports`、`Rpc`、`Signature`、`SolanaRpcApi`、`SolanaClient`。このサブパスはこれらだけでなく、`@solana/kit` がエクスポートするすべての型を再エクスポートします。
- 4 つの名前は Kit とこのライブラリの両方に存在します。ルートバレル（`@vue-solana/core`）からは**このライブラリの**バージョンに、`/kit` サブパスからは**Kit の**バージョンに解決されます: `SolanaError`、`SolanaErrorCode`、`isSolanaError`、`TransactionStatus`。Kit 自体がスローしたエラーを調べるときは `@vue-solana/core/kit` から `isSolanaError` をインポートしてください。ルートバレルのガードは Kit のエラークラスに一致しないためです。

RPC の数値結果は `bigint` で、アカウントデータは `Buffer` ではなく `Uint8Array` です。詳細は [Kit 移行](/ja/guides/migration) を参照してください。

### アクション

`createSolanaActionStore()` は、呼び出しごとに新しい `AbortSignal` を受け取る任意の非同期関数を、フレームワーク非依存のアクション状態マシンに包みます。UI フレームワークは返されたストアをリアクティブな状態にブリッジします。Vue のコンポーザブル `useAction()` はこのストア上に構築されています。

```ts
import { createSolanaActionStore, isSolanaActionAborted } from "@vue-solana/core/action";

const { dispatch, getState, subscribe, reset, withSignal } = createSolanaActionStore(
  (signal, address: Address) => client.rpc.getBalance(address).send(),
);

await dispatch(address);
```

- 各 `dispatch` は、新しい `AbortSignal` で前の実行中の呼び出しを中断します。置き換えられた呼び出しは中断エラーで拒否され、状態を破壊することはありません。
- `getState()` / `subscribe(listener)`: `SolanaActionState`（`status`、`data`、`error`）のスナップショットとストリーム。
- `withSignal(signal, ...args)`: 単一の dispatch に対して、呼び出し側が提供するキャンセルソース（試行ごとのタイムアウト、共有のキルスイッチ）を組み合わせます。
- `isSolanaActionAborted(error)`: 拒否が中断された呼び出し、または置き換えられた呼び出しに由来するかを確認します。

### アドレス

- `parseAddress(value)`: アドレス文字列、ref ライクな値、または getter を解析し、nullish な入力には `null` を返します。無効な base58 文字列には `INVALID_ADDRESS` をスローします。`Address` の値はそのまま受け付けます。

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
```

### ウォレット

- `isWalletConnected(wallet)`: ウォレットが接続済みで公開鍵を持っているかを確認します。
- `assertWalletConnected(wallet)`: ウォレットが接続されていない場合に `WALLET_NOT_CONNECTED` をスローします。
- `assertWalletCanSign(wallet)`: ウォレットが切断されているか、`signTransaction` をサポートしていない場合にスローします。
- `assertWalletCanSignMessage(wallet)`: ウォレットが切断されているか、`signMessage` をサポートしていない場合にスローします。

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### トランザクション

- `signAndSendTransaction(client, wallet, transaction, options?)`: 設定されたウォレットを使用して生の wire トランザクションバイトに署名して送信し、RPC の署名を返します。`signAndSendTransaction` を公開しているウォレットには委譲します。そうでない場合、トランザクションは `wallet.signTransaction` で署名され、`client.rpc.sendTransaction(...).send()` で送信されます。Android Mobile Wallet Adapter のウォレットは、アプリが送信を所有し、ウォレットへのハンドオフ後に RPC 署名を確実に返せるよう、署名とアプリ側の RPC 送信を優先します。
- `confirmTransactionSignature(client, signature, options?)`: 送信された署名が要求された commitment に到達するまで待機します。デフォルトは `confirmed` commitment、60 秒のタイムアウト、1500 ミリ秒のポーリング間隔で、`client.rpc.getSignatureStatuses([signature]).send()` をポーリングします。`pollIntervalMs`（`0` より大きい必要があります）、`abortSignal`、`searchTransactionHistory` を受け付けます。失敗したトランザクションは `TRANSACTION_FAILED` をスローし、決して現れない署名は `TRANSACTION_NOT_FOUND` をスローし、待機時間を使い切ると `TRANSACTION_TIMEOUT` をスローします。署名が最近のステータスキャッシュから外れている可能性がある場合は `searchTransactionHistory: true` を渡してください。これがないと古い署名は結果に現れず、タイムアウト後に `TRANSACTION_NOT_FOUND` になります。

クライアント送信フローは、このウォレット対応ヘルパーとは別のものです。クライアントは、`createSolanaClient()` 内で `solanaRpc()` がインストールする公式の `rpcTransactionPlanSendingExecutor()` を通じて `sendTransaction()` と `sendTransactions()` を公開し、Vue のコンポーザブルはそれらのメソッドをラップします。これらはプラン作成、署名、送信を行い、`confirmed` commitment まで待機します。`sent` ステータスは、この送信と確認の処理が完了した後にのみ設定されます。単一の結果は送信された署名を `data.context.signature` で公開し、バッチの結果はプラン結果のツリー全体を含みます。公式の送信処理はウォレットのポップアップを表示しません。

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL トークン

トークンの読み取りは Kit RPC の `jsonParsed` API を使用します。`@solana/spl-token` への依存はありません。

- `getTokenAccountsByOwner(client, owner, options?)`: 所有者のすべての SPL Token および Token-2022 アカウントを `TokenAccountInfo[]`（`{ address, mint, owner, amount: bigint, decimals, state, isNative }`）として返します。単一のプログラムに限定する場合は `programId` を渡します。
- `getTokenAccount(client, address, commitment?)`: 解析済みの単一のトークンアカウント（`TokenAccountInfo | null`）を返します。アカウントが存在しない場合、またはトークンアカウントでない場合は `null` を返します。
- `getTokenBalance(client, mint, owner, commitment?)`: 指定された mint について所有者のトークンアカウントを読み取り、`{ amount, decimals }` を返します。トークンアカウントが存在しない場合は `null` を返します。

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### Solana Pay

Solana Pay のヘルパーは `@solana/kit` 上に直接実装されています。追加の Solana Pay パッケージや `gill` パッケージは不要です。

- `encodeURL(fields)` / `encodeTransferRequestURL(fields)` / `encodeTransactionRequestURL(fields)`: `solana:` の送金リクエスト URL またはトランザクションリクエスト URL を構築します。`amount` は lamports 単位の `bigint` で、10 進数の SOL 文字列としてエンコードされます。
- `parseURL(value)`: 送金リクエストを検証して解析し、型付きの `recipient`、`amount`、`splToken`、`reference`、`label`、`message`、`memo` フィールドに変換します。無効なプロトコル、受取人、トークン mint、参照、金額、または不正な形式の URL には `ParseURLError` をスローします。
- `createQR(url, size?, background?, color?)`: QR コードを SVG 文字列としてレンダリングします。`createQRDataURL()` と `createQRCanvas()` は別のレンダリング先を提供します。`qrcode` エンコーダは遅延読み込みされるため、URL だけを使う利用者のバンドルには含まれません。
- `createRecipient(address)`、`createSPLToken(address)`、`isValidSolanaAddress(value)`: アドレス検証のヘルパー。
- `createSolanaPayReference()` と `verifySolanaPayPayment()` は `@vue-solana/core/solana-pay-confirmation` に、`getSolanaPayPaymentStatus()` は `@vue-solana/core/solana-pay-status` にあります。

```ts
import { createQR, encodeURL, parseURL } from "@vue-solana/core/solana-pay";
import { address } from "@vue-solana/core/kit";

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  label: "Example store",
});

const parsed = parseURL(url.toString());
const svg = await createQR(url);
```

参照値は Kit の `Address` 文字列です。スキャナの出力は `parseURL()` で解析し、何かに署名する前に受取人、金額、トークン、ラベル、メッセージをユーザーに表示してください。

### エラーとタイムアウト

- `SolanaError`: 安定した `code` と任意の元の `cause` を持つ、正規化されたエラークラス。
- `createSolanaError(code, message, options?)`: 正規化された Solana エラーを作成します。
- `isSolanaError(error)`: 不明なエラーを `SolanaError` に絞り込みます。
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: 不明な失敗を `SolanaError` に変換し、一般的なウォレットの拒否を `USER_REJECTED` にマッピングします。
- `withTimeout(promise, timeoutMs, createError?, options?)`: 呼び出し側が提供するタイムアウトエラーと Promise を競合させます。`NaN` や負のタイムアウトには `INVALID_INPUT` で拒否します。`{ signal }` はシグナルの理由で待機を中断し、`{ code, message }` はデフォルトのタイムアウトエラーを設定します。
- `withSolanaTimeout(promise, timeoutMs, message)`: `TRANSACTION_TIMEOUT` エラーと Promise を競合させます。

## エラーモデル

Vue Solana は、一般的なウォレット、RPC、アドレス、トランザクション、ストレージの失敗を `SolanaError` に正規化します。アプリはアダプタや RPC のメッセージを解析するのではなく、安定した `error.code` の値で分岐してください。

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // The user declined a wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // The operation timed out; check signature state before retrying.
        break;
      case "TRANSACTION_NOT_FOUND":
        // The signature never landed; safe to retry.
        break;
      case "TRANSACTION_FAILED":
        // The transaction errored on-chain; see error.cause.
        break;
      case "RPC_FAILURE":
        // RPC or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

安定したエラーコードは次のとおりです。

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `WALLET_FAILURE`
- `USER_REJECTED`
- `INVALID_SIGNATURE`
- `INVALID_ADDRESS`
- `INVALID_INPUT`
- `TRANSACTION_TIMEOUT`
- `TRANSACTION_NOT_FOUND`
- `TRANSACTION_FAILED`
- `REDIRECT_TIMEOUT`
- `DECRYPTION_FAILED`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` は、デバッグのために元のウォレットアダプタ、RPC、パース、ストレージのエラーを保持します。アプリがそのソースを明示的に信頼している場合を除き、生の `cause` の詳細をエンドユーザーに表示しないでください。

## Buffer ポリフィル

Solana トランザクションをシリアライズするブラウザコードは、Node 互換の `Buffer` グローバルを必要とする場合があります。トランザクションのコードより前に、`@vue-solana/core/buffer-polyfill` の `installSolanaBufferPolyfill()` で初期化してください。パッケージが所有する唯一の残りの型シムは、このポリフィルがインポートするブラウザの `buffer/` サブパスを対象にしています。

3 つのパッケージはすべて `"sideEffects": false` とマークされているため、バンドラはバインディングが使われていないインポートを削除できます。上のスニペットのように、ポリフィルを名前付きインポートとしてインポートして呼び出してください。`import "@vue-solana/core/buffer-polyfill"` のような副作用だけのインポートでは何もインストールされません。このサブパスは関数のみをエクスポートするためです。
