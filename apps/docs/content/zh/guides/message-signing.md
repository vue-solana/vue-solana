---
title: "消息签名"
description: 签署认证或所有权消息，而不创建链上交易。
ogSection: 指南
surroundOrder: 12
---

消息签名可以证明钱包控制了某条链下消息。它不会授权链上状态变更，也不是交易签名。

请将消息签名用于认证 challenge、账户所有权检查，或由你的应用在链下验证的同意文本。

## Vue 消息签名

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

不暴露消息签名的钱包会让 `canSignMessage` 为 false。不支持时调用 `execute()` 会以 `WALLET_FEATURE_UNSUPPORTED` 拒绝。

## Nuxt 消息签名

Nuxt 自动导入 `useSolanaSignMessage()` 和 `useSolanaWallet()`。

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

只能从客户端用户操作调用消息签名。

## Challenge 文本

使用清晰、特定于应用的 challenge 文本。用户应能理解他们正在签署什么。

好的 challenge 文本通常包含：

- 应用或域名。
- 签名目的。
- Nonce 或一次性 challenge 值。
- 签发时间和过期时间。

示例：

```txt
Sign in to example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Issued At: 2026-07-02T12:00:00Z
Expires At: 2026-07-02T12:10:00Z
```

## 验证边界

Vue Solana 帮助请求钱包签名。你的应用负责服务端验证、nonce 存储、过期检查和 session 创建。

不要把通用文本上的签名当作转移 token 或更改链上状态的许可。

## 错误处理

消息签名错误使用与钱包和交易 helper 相同的规范化 `SolanaError` 模型。

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
    default:
      return null;
  }
});
```

## 安全检查清单

- 对认证 challenge 使用一次性 nonce。
- 让 challenge 快速过期。
- 创建 session 前在服务端验证签名。
- 让签名文本可被人类阅读。
- 不要暗示消息签名会提交交易。
- 不要把交易签名流程复用于认证文本。
