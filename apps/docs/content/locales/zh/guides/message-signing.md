---
title: "消息签名"
description: 签署认证或所有权消息，而不创建链上交易。
ogSection: 指南
surroundOrder: 12
---

消息签名用于证明钱包对一段链下消息的控制权。它不会授权链上状态变更，也不是交易签名。

消息签名适用于认证挑战、账户所有权检查，或由你的应用在链下验证的同意文本。

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
    <button type="button" :disabled="!canSign" @click="signIn">签署消息</button>
    <p>状态：{{ status }}</p>
    <p v-if="signature">签名字节数：{{ signature.length }}</p>
    <p v-if="error">无法签署消息。</p>
  </section>
</template>
```

不暴露消息签名的钱包会将 `canSignMessage` 报告为 false。若在不支持的情况下调用 `execute()`，会以 `WALLET_FEATURE_UNSUPPORTED` 拒绝。

## Nuxt 消息签名

Nuxt 会自动导入 `useSolanaSignMessage()` 和 `useSolanaWallet()`。

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

只应在客户端的用户操作中调用消息签名。

## 挑战文本

使用清晰、应用专属的挑战文本。用户应该能理解自己正在签署什么。

良好的挑战文本通常包含：

- 应用或域名。
- 签名用途。
- Nonce 或一次性挑战值。
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

Vue Solana 帮助请求钱包签名。你的应用负责服务端验证、nonce 存储、过期检查和会话创建。

不要把对通用文本的签名视为转移代币或更改链上状态的许可。

## 错误处理

消息签名错误使用与钱包和交易辅助函数相同的标准化 `SolanaError` 模型。

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "请先选择一个钱包。";
    case "WALLET_NOT_CONNECTED":
      return "请先连接钱包。";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "此钱包不支持消息签名。";
    case "USER_REJECTED":
      return "消息签名已被拒绝。";
    default:
      return null;
  }
});
```

## 安全检查清单

- 为认证挑战使用一次性 nonce。
- 让挑战快速过期。
- 创建会话前在服务端验证签名。
- 使待签署文本对人类可读。
- 永远不要暗示消息签名会提交交易。
- 永远不要复用交易签名流程来处理认证文本。
