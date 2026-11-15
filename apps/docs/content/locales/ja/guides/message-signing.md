---
title: "メッセージ署名"
description: オンチェーントランザクションを作成せずに、認証や所有権を示すメッセージに署名します。
ogSection: ガイド
surroundOrder: 12
---

メッセージ署名は、オフチェーンのメッセージに対してウォレットの支配権を証明します。オンチェーンの状態変更を承認するものではなく、トランザクションの署名でもありません。

メッセージ署名は、認証チャレンジ、アカウントの所有権確認、アプリがオフチェーンで検証する同意文言などに使用してください。

## Vue でのメッセージ署名

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const canSign = computed(() => connected.value && canSignMessage.value);

async function signIn() {
  const message = new TextEncoder().encode("Sign in to example.com");
  await execute(message);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSign" @click="signIn">Sign message</button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <p v-if="error">Unable to sign message.</p>
  </section>
</template>
```

メッセージ署名を公開していないウォレットでは、`canSignMessage` が false になります。サポートがない状態で `execute()` を呼び出すと、`WALLET_FEATURE_UNSUPPORTED` で reject されます。

## Sign In With Solana（SIWS）

認証には、ウォレットが対応している場合は自由形式のメッセージ署名よりも SIWS を優先してください。SIWS は任意のバイト列ではなく、構造化された同意画面（domain、statement、resources、URI）をユーザーに表示し、ウォレットは型付きの結果を返します:

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signIn } = useSignIn();

const { account, signedMessage, signature } = await signIn({
  statement: "Sign in to example.com",
  nonce: nonceFromYourServer,
});
```

この結果は認証済みのセッションではなく、検証すべきクレームです。サーバー側では次のようにします:

1. `signedMessage` をデコードし、domain があなたのオリジンであること、URI があなたのものであること、nonce がこのログイン試行に対してサーバーが発行したものと一致すること（使い捨てで、有効期限が短いもの）を確認します。
2. `signedMessage` に対する Ed25519 署名を `account.publicKey` で検証します（たとえば `tweetnacl` の `nacl.sign.detached.verify(signedMessage, signature, account.publicKey)` を使用します）。
3. そのうえでのみ、`account.address` をキーとするセッションを作成します。

SIWS に対応していないウォレットは `signIn()` を `WALLET_FEATURE_UNSUPPORTED` で reject します。そのようなウォレットには、独自のチャレンジ文言を渡して `useSignMessage()` にフォールバックしてください。

## Nuxt でのメッセージ署名

Nuxt は `useSolanaSignMessage()` と `useSolanaWallet()` を自動インポートします。

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

メッセージ署名は、クライアント上のユーザー操作からのみ呼び出してください。

## チャレンジ文言

明確でアプリ固有のチャレンジ文言を使用してください。ユーザーは自分が何に署名しているのかを理解できる必要があります。

適切なチャレンジ文言には通常、次の項目が含まれます:

- アプリ名またはドメイン名。
- 署名の目的。
- nonce または使い捨てのチャレンジ値。
- 発行時刻と有効期限。

例:

```txt
Sign in to example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Issued At: 2026-07-02T12:00:00Z
Expires At: 2026-07-02T12:10:00Z
```

## 検証の境界

Vue Solana は、環境が Ed25519（WebCrypto）をサポートしている場合、`signMessage()` / `signIn()` を解決する前に、返された署名をアカウントの公開鍵に対して検証します。これは、ウォレットが誤ったバイト列や別のアカウントに対する署名を返すことに対するベストエフォートの防御であり、サーバー側の検証の代替にはなりません。Ed25519 が利用できない環境ではこの検証はスキップされます。チェックに失敗した署名は `INVALID_SIGNATURE` で reject されます。

アプリは引き続き、サーバー側の検証、nonce の保存、有効期限のチェック、セッションの作成に責任を持ちます。

汎用的なテキストに対する署名を、トークンの送金やオンチェーンの状態変更の許可と見なさないでください。

## エラーハンドリング

メッセージ署名のエラーは、ウォレットやトランザクションのヘルパーと同じ正規化された `SolanaError` モデルを使用します。

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "WALLET_NOT_CONNECTED":
      return "Connect your wallet first.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support message signing.";
    case "USER_REJECTED":
      return "The message signature was rejected.";
    case "WALLET_FAILURE":
      return "The wallet could not sign the message.";
    case "INVALID_SIGNATURE":
      return "The wallet returned an invalid signature.";
    default:
      return null;
  }
});
```

## 安全チェックリスト

- 認証チャレンジには使い捨ての nonce を使用してください。
- チャレンジはすぐに期限切れにしてください。
- セッションを作成する前にサーバーで署名を検証してください。
- 署名するテキストを人間が読める形にしてください。
- メッセージ署名がトランザクションを送信するかのような示唆を決してしないでください。
- 認証用のテキストにトランザクション署名のフローを流用しないでください。
