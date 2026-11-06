---
title: "移行ガイド"
description: "Vue Solana のバージョン間の移行方法。v3 から v4、v2 から v3 へのアップグレード、および v1.x から v2 への移行について説明します。"
ogSection: ガイド
surroundOrder: 14
---

このガイドでは、Vue Solana のバージョン間の移行について説明します。大きな移行は 3 つあります。v3 から v4（最新）へのアップグレード、v2 から v3、そして v1.x から v2 への移行です。

## 移行: v3 から v4

v4.0.0 は最新リリースです。`@vue-solana/core` のルートバレルから重いモジュールを削除してバンドルサイズを削減し、より小さな tarball を配布します。あわせて一部のコンポーザブル API を変更し、設定された `commitment` を尊重するようになりました。

### 変更点

- **ルートバレルの削減**: `@vue-solana/core` はルートバレルから `Buffer`/`installSolanaBufferPolyfill`、`ios-wallet`、`mobile-wallet` を再エクスポートしなくなりました。代わりに専用のサブパスを使用してください。
- **より小さな tarball**: `.d.mts` 宣言ファイルは同梱されなくなり、すべての `exports` 条件は `.d.ts` を指します。
- **`useSignatureStatus`**: `commitment` オプションを受け取らなくなりました。
- **`commitment` の反映**: `createSolanaClient()` / `createSolanaPlugin()` / Nuxt の `solana.commitment` が RPC 呼び出しに実際に適用されるようになりました。
- **`plugin.dispose()`**: `createSolanaPlugin()` が `dispose()` を返すようになりました。
- **エアドロップ失敗の型付け**: `useAirdrop()` の失敗はコード `RPC_FAILURE` を持つ `SolanaError` になりました。
- **`buffer` は任意のピア**: `buffer-polyfill` を使用するアプリは `buffer` を自分でインストールする必要があります。
- **`bs58` の削除**: `bs58` を直接インポートしているアプリは、自身の依存関係に追加する必要があります。
- **新しい自動インポート（Nuxt）**: `useSolanaClientCapability()`、`tryUseSolana()`、`clearSwrCache()`、`deleteSwrKey()`。
- **`@vue-solana/vue/swr` の新しい `deleteSwrKey()`**。

### 移行手順

#### 1. 依存関係を更新する

```sh
pnpm add @vue-solana/vue@^4.0.0
# or
pnpm add @vue-solana/nuxt@^4.0.0
```

`buffer-polyfill` を使用する場合は、`buffer` を自分でインストールしてください。

```sh
pnpm add buffer
```

`bs58` を直接インポートしている場合は追加してください。

```sh
pnpm add bs58
```

#### 2. Buffer / ウォレットのインポートを更新する

```diff
- import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core";
+ import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill";
- import { getSolanaIosWallets } from "@vue-solana/core";
+ import { getSolanaIosWallets } from "@vue-solana/core/ios-wallet";
- import { registerSolanaMobileWallet } from "@vue-solana/core";
+ import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
```

（`@vue-solana/vue/buffer-polyfill` と `@vue-solana/nuxt/buffer-polyfill` は変更ありません。）

#### 3. `useSignatureStatus` を更新する

```diff
- useSignatureStatus(signature, { commitment: "confirmed" })
+ useSignatureStatus(signature)
```

呼び出しごとの commitment が必要な場合は、`useTransactionConfirmation()` の `confirm(signature, opts)` に `{ commitment }` を渡すか、`@vue-solana/core` から `confirmTransactionSignature()` を直接呼び出してください。

#### 4. 素の Vue でプラグインを破棄する

```ts
const solana = createSolanaPlugin();
createApp(App).use(solana);
// on teardown:
app.unmount();
solana.dispose();
```

（Nuxt ではこの処理が自動的に行われます。）

#### 5. 型付きのエアドロップエラーを処理する

`useAirdrop()` の失敗は、コード `RPC_FAILURE` を持つ `SolanaError` になりました。元のエラーは `cause` として保持されます。

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await airdrop();
} catch (error) {
  if (isSolanaError(error, "RPC_FAILURE")) {
    // handle
  }
}
```

## 移行: v2 から v3

v3.0.0 は最新リリースです。モジュール形式を ESM のみに変更し、`kit` サブパスを `@solana/kit` の完全なミラーにしました。Kit への移行自体は v2 で完了しているため、v3 はパッケージングと小さな挙動の変更に焦点を当てています。

### 変更点

- **ESM のみ**: すべての `@vue-solana/*` パッケージは ESM のみを配布します。`require` エクスポート条件とトップレベルの `main` フィールドは削除されました。
- **完全な Kit ミラー**: `@vue-solana/core/kit`、`@vue-solana/vue/kit`、`@vue-solana/nuxt/kit` は（厳選されたサブセットではなく）`@solana/kit` から `export *` するようになりました。
- **読み取り系コンポーザブルの挙動**: `useBalance()`、`useAccountInfo()`、`useProgramAccounts()`、`useTokenAccounts()`、`useTokenBalance()`（および対応する Nuxt の `useSolana*`）は、エラー処理が改善された統一ステートマシンを共有します。
- **依存関係の範囲**: パッケージの `kit` サブパスを使用する場合、自身の `package.json` に `@solana/kit` を追加する必要はなくなりました。

### 移行手順

#### 1. 依存関係を更新する

```sh
# For Vue apps
pnpm add @vue-solana/vue@^3.0.0

# For Nuxt apps
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. ESM のみのパッケージに対応する

アプリやスクリプトがまだ CommonJS（`require()`）を使用している場合は、ESM に変換してください。`package.json` に `"type": "module"` を追加するか、ファイル名を `.mjs` に変更します。

```ts
// Instead of require()
import { createSolanaClient } from "@vue-solana/core/kit";
```

ESM に切り替えられない場合は、`.cjs` ビルドを同梱している `@vue-solana/*@^2.x` に留まってください。

#### 3. Kit のインポートを更新する

完全なミラーにより、すべてをパッケージの `kit` サブパスからインポートします。以前に `@solana/kit` を依存関係に追加していた場合は削除できます。

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt (auto-imported composables still work)
import { address, lamports } from "@vue-solana/nuxt/kit";
```

注: 4 つの名前（`SolanaError`、`SolanaErrorCode`、`isSolanaError`、`TransactionStatus`）は、ルートバレルと `/kit` サブパスで解決方法が異なります。Kit がスローするエラーを捕捉する場合は、`isSolanaError` を `kit` サブパスからインポートしてください。

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. 読み取り系コンポーザブルのエラー処理を更新する

`refresh()` は失敗時に reject するようになりました（resolve ではなく）。await しているコードを更新してください。

```ts
await refresh().catch(() => undefined);
```

テンプレートの `@click="refresh"` は影響を受けません。

読み取りが失敗すると、データは空の値にリセットされます。`error` を明示的に確認してください。

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="Could not load the balance." />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`useTokenBalance()` の `balance` と `decimals` は読み取り専用の computed ref です。それらへの代入は削除してください。

#### 5. レガシーな Web3 インポートを削除する

残っている `@vue-solana/*/web3` のインポートと `@solana/web3-compat` の依存関係を削除してください（v3 には存在しません）。

## 移行: v1.x から v2.0.0

Vue Solana v2.0.0 では、コア API サーフェスが `@solana/web3-compat` から `@solana/kit` に移行しました。これは v1.x のアプリにとって破壊的な変更です。

### 変更点

- **Kit のみの API**: `@solana/web3-compat` はすべてのパッケージから削除されました。コンテキストは `connection` を保持しなくなり、`web3` サブパスは削除されました。
- **型の変更**: `SolanaWallet.publicKey` は（`PublicKey` クラスではなく）base58 の `Address` 文字列になりました。
- **コンポーザブルの変更**: `useConnection()` は `useSolanaClient()` に置き換えられました。`useRpc()` はクラスタ状態に加えて、注入された Kit クライアントを返すようになりました。
- **数値型**: lamports、slot、ブロック高などの RPC 結果は `bigint` です。正規化されたコンポーザブルの出力では、アカウントデータは `Buffer` ではなく `Uint8Array` です。
- **トランザクションサーフェス**: `signAndSendTransaction` や `confirmTransactionSignature` などのヘルパーは `Connection` ではなく Kit クライアントを受け取るようになり、トランザクションの入力には Kit の型を使用します。

### 移行手順

#### 1. 依存関係を更新する

```sh
pnpm add @vue-solana/vue@^2.0.0
# or
pnpm add @vue-solana/nuxt@^2.0.0
```

存在する場合は、依存関係から `@solana/web3-compat` を削除してください。

#### 2. API 呼び出しを更新する

| レガシー                                                 | 置き換え                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Connection`, `new Connection(url)`                      | `client.rpc` from `createSolanaClient({ endpoint })` / `useSolanaClient()`                      |
| `PublicKey`, `new PublicKey(s)`, `.toBase58()`           | `Address` via `address(s)`                                                                      |
| `Keypair`, `keypair.publicKey`                           | `generateKeyPairSigner()` from `@vue-solana/*/kit`; signer `.address`                           |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` from `@solana-program/system`                                       |
| `LAMPORTS_PER_SOL` math                                  | `lamports()` from `@vue-solana/*/kit`                                                           |
| `sendAndConfirmTransaction`                              | Use Kit transaction planning; for wallet-signed flows use `signAndSendTransaction(client, ...)` |
| `requestAirdrop` (devnet)                                | `client.airdrop()`                                                                              |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()` (returns `bigint`)                                          |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                                      |
| `useConnection()`                                        | `useSolanaClient()`                                                                             |
| `parsePublicKey(value)`                                  | `parseAddress(value)` from `@vue-solana/core/address`                                           |

#### 3. コード例を更新する

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. クリーンアップ

`@vue-solana/*/web3` からのインポートをすべて削除し、`package.json` から `@solana/web3-compat` を削除し、web3-compat 用に追加したローカルの `.d.ts` シムを削除してください。レガシーな web3-compat のトランザクション経路にのみ必要だった場合は、`buffer-polyfill` も削除してください。

### 注記

- Kit の `client.rpc` は、設定値ではなく呼び出しごとのデフォルトを `commitment` に使用します。必要に応じて `commitment` を明示的に渡してください: `rpc.getBalance(account, { commitment: "confirmed" }).send()`。
- フレームワークに依存しないコードでは、`@vue-solana/core/kit` の `createSolanaClient()` を使用してください。
