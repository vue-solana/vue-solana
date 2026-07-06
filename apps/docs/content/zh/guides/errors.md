---
title: "错误"
description: 处理 core helper 和 Vue/Nuxt composable 返回的规范化 Solana 错误。
ogSection: 指南
surroundOrder: 13
---

Vue Solana 会把常见的钱包、RPC、地址、交易、超时和存储失败规范化为 `SolanaError`。

使用稳定的 `error.code` 值做 UI 决策。保留 `error.cause` 用于调试和日志。

## 错误形状

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` 包含：

- `code`：稳定的机器可读错误 code。
- `message`：人类可读的开发者消息。
- `cause`：可选的原始错误，可能来自钱包、RPC 调用、解析器、超时或存储操作。
- `feature`：不支持能力错误中可选的钱包功能名称。

## 稳定错误 Code

- `NO_WALLET_SELECTED`：没有选择活跃钱包。
- `WALLET_NOT_CONNECTED`：活跃钱包未连接，或没有 public key。
- `WALLET_FEATURE_UNSUPPORTED`：活跃钱包不支持请求的功能。
- `USER_REJECTED`：用户拒绝了钱包请求。
- `INVALID_ADDRESS`：地址字符串无法解析为 Solana public key。
- `TRANSACTION_TIMEOUT`：交易相关操作超时。
- `RPC_FAILURE`：RPC 发送、读取或确认失败。
- `STORAGE_FAILURE`：浏览器存储无法读取或写入。

## Core 错误处理

捕获未知失败时使用 `isSolanaError()`。

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(connection, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    console.log(error.code);
    console.debug(error.cause);
  }
}
```

编写自己的框架无关 helper，并且希望遵循 Vue Solana 错误模型时，请使用 `normalizeSolanaError()`。

```ts
import { normalizeSolanaError } from "@vue-solana/core/errors";

async function loadData() {
  try {
    return await connection.getLatestBlockhash();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE", "Unable to load blockhash");
  }
}
```

`normalizeSolanaError()` 会把常见的钱包拒绝形状映射为 `USER_REJECTED`。

## Vue Error Refs

Vue composable 暴露 `error` ref。

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load data from RPC.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
</script>
```

## Nuxt Error Refs

Nuxt 自动导入 composable 暴露相同错误模型。

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

## 面向用户的消息

除非你的应用明确信任该来源，否则不要直接向最终用户展示原始 `cause` 详情。钱包和 RPC 错误消息可能包含 provider 特定文本，对 UI 来说可能令人困惑或不安全。

请把稳定错误 code 映射为简短、特定于应用的消息。

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "Request canceled.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support that action.";
    case "RPC_FAILURE":
      return "Network request failed. Try again.";
    default:
      return "Something went wrong.";
  }
}
```

## 重试指导

- 只在操作可安全重复时重试 `RPC_FAILURE`。
- `TRANSACTION_TIMEOUT` 后，重试前检查签名状态。
- 不要自动重试 `USER_REJECTED`。
- 不要重试 `INVALID_ADDRESS`；请让用户修正输入。
- 隐藏或禁用会产生 `WALLET_FEATURE_UNSUPPORTED` 的操作。
