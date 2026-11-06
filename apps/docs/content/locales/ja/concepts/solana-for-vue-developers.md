---
title: Vue 開発者のための Solana
description: Vue と Nuxt の開発者に向けた、実践的な Solana の概念。
ogSection: 概念
surroundOrder: 5
---

このページでは、Vue Solana パッケージを使うときに目にする Solana の用語を説明します。網羅的ではなく、実践的な内容です。

公式リファレンス:

- [Solana ドキュメント](https://solana.com/docs)
- [Solana RPC メソッド](https://solana.com/docs/rpc)
- [Solana クラスター](https://solana.com/docs/references/clusters)
- [Solana トランザクション](https://solana.com/docs/core/transactions)
- [Solana のコアコンセプト](https://solana.com/docs/core) — アカウント、プログラム、トランザクションといった Solana の中核となる概念

## 接続と RPC

フロントエンドアプリは RPC エンドポイントを通じて Solana のデータを読み取ります。Kit の経路では、`useSolanaClient()`（または `@vue-solana/core/kit` の `createSolanaClient()`）を介して読み取り専用の `client.rpc` を利用できます。

Vue Solana パッケージは Vue と Nuxt のコード向けに Kit クライアントを生成して provide するため、コンポーザブルは同じクラスター、エンドポイント、コミットメント、ウォレットの状態を共有できます。

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## 公開鍵とアドレス

公開鍵は Solana アカウントのアドレスです。公開鍵はフロントエンドアプリで安全に表示できます。

Kit の経路では、アドレスは `@vue-solana/vue/kit` の `address()` で生成される `Address` 型の文字列です:

```ts
import { address } from "@vue-solana/vue/kit";

const publicKey = address("PASTE_A_SOLANA_ADDRESS");
```

アドレスは base58 の `Address` 文字列です。レガシーの `PublicKey` クラスと `web3` サブパスは v2.0.0 で削除されました。

両者の対応関係の全体像については、[Kit 移行](/ja/guides/migration)ガイドを参照してください。

秘密鍵、シードフレーズ、秘密鍵の配列をフロントエンドのコードに露出させないでください。

## ランポートと SOL

SOL は Solana のネイティブトークンです。ランポートは SOL の最小単位です。

```txt
1 SOL = 1,000,000,000 lamports
```

RPC の残高取得メソッドはランポートを返します。ランポートを SOL に換算するのは表示のためだけにしてください。

Kit の RPC メソッドはランポートを `bigint` として返します:

```ts
const { value: lamports } = await rpc.getBalance(address("YOUR_ADDRESS")).send();
const sol = Number(lamports) / 1_000_000_000;
```

Kit の RPC 呼び出しは、数値フィールドには `bigint` を、アカウントデータには `Uint8Array` を返します。

## ウォレット

ウォレットは鍵を保管し、トランザクションに署名します。ブラウザ拡張ウォレットには Phantom、Solflare、Backpack があります。Android のネイティブモバイルウォレットは、対応する Android Chrome ランタイム上で Solana Mobile Wallet Adapter を通じて接続できます。Phantom、Solflare、Backpack は、ウォレット固有のユニバーサルリンクを通じて iOS ブラウザからも接続できます。

Vue Solana は、Solana Wallet Standard のブラウザ拡張ウォレット、Android Mobile Wallet Adapter のウォレット、対応する iOS ブラウザウォレットのリンクを、統一された `useWallets()` フローで検出します。RPC の読み取りと残高の読み取りはウォレットなしで動作します。接続、署名、トランザクションの送信には、検出されたウォレット、または `SolanaWallet` インターフェースを実装したカスタムオブジェクトが必要です。

現在のサポート状況とデスクトップネイティブウォレットの状況については、[ウォレット](/ja/guides/wallets)を参照してください。

## トランザクションと署名

トランザクションは Solana の状態を変更する命令の集合です。たとえば、SOL の送金、アカウントの作成、プログラムとのやり取りなどがあります。

署名は、ウォレットの所有者がそのトランザクションを承認したことを証明します。フロントエンドアプリはユーザーのウォレットに署名を依頼すべきです。秘密鍵を保持すべきではありません。

デフォルトの `createSolanaClient()` は、Solana Kit 公式の RPC プランナーとトランザクション送信エグゼキューターも組み合わせるため、信頼できるクライアントのコンテキストではウォレットのポップアップなしにプランと送信を行えます。この経路には `payer` 署名者が必須です。資金を持つ署名者はサーバーやリレイヤーに置いてください。Nuxt の public runtime config に生の `payerSecretKey` やその他の秘密情報を含めてはいけません。

## コミットメントレベル

コミットメントは、返されるデータをどこまでファイナライズされたものとして扱うかを制御します。

- `processed`: 最も速いが、最もファイナリティが低い。
- `confirmed`: ほとんどのアプリ UI の読み取りに適したデフォルト。
- `finalized`: 最も遅いが、最もファイナリティが高い。

例:

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

公式リファレンス: [コミットメントステータス](https://solana.com/docs/rpc#configuring-state-commitment)

## 安全上の注意

- ビルドとテストの間は `devnet` を使用してください。
- 開発には実際の資金が入ったウォレットを使用しないでください。
- フロントエンドアプリに秘密鍵をハードコードしないでください。
- 実際の SOL や本番プログラムとやり取りする準備ができてから `mainnet` を使用してください。
