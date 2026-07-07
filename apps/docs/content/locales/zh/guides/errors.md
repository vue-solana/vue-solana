---
title: "错误"
description: 处理来自核心辅助函数和 Vue/Nuxt 组合式函数的标准化 Solana 错误。
ogSection: 指南
surroundOrder: 13
---

Vue Solana 会将常见的钱包、RPC、地址、交易、超时和存储失败标准化为 `SolanaError`。

使用稳定的 `error.code` 值来决定 UI 行为。保留 `error.cause` 用于调试和日志。

## 错误形状

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` 包含：

- `code`：稳定、机器可读的错误代码。
- `message`：面向开发者的可读消息。
- `cause`：可选的原始错误，可能来自钱包、RPC 调用、解析器、超时或存储操作。
- `feature`：可选的钱包功能名称，用于不支持能力的错误。

## 稳定错误代码

- `NO_WALLET_SELECTED`：没有选中的活跃钱包。
- `WALLET_NOT_CONNECTED`：活跃钱包未连接，或没有公钥。
- `WALLET_FEATURE_UNSUPPORTED`：活跃钱包不支持请求的功能。
- `USER_REJECTED`：用户拒绝了钱包请求。
- `INVALID_ADDRESS`：地址字符串无法解析为 Solana 公钥。
- `TRANSACTION_TIMEOUT`：与交易相关的操作超时。
- `RPC_FAILURE`：RPC 发送、读取或确认失败。
- `STORAGE_FAILURE`：无法读取或写入浏览器存储。

## 核心错误处理

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

编写自己的框架无关辅助函数，并希望遵循 Vue Solana 错误模型时，使用 `normalizeSolanaError()`。

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

## Vue 错误 Ref

Vue 组合式函数会暴露 `error` ref。

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "请输入有效的 Solana 地址。";
    case "RPC_FAILURE":
      return "无法从 RPC 加载数据。";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("原始 Solana 错误", error.value.cause);
  }
});
</script>
```

## Nuxt 错误 Ref

Nuxt 自动导入的组合式函数暴露相同的错误模型。

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "请先选择一个钱包。";
    case "USER_REJECTED":
      return "钱包请求已被拒绝。";
    case "TRANSACTION_TIMEOUT":
      return "交易耗时超过预期。";
    case "RPC_FAILURE":
      return "Solana RPC 请求失败。";
    default:
      return null;
  }
});
</script>
```

## 面向用户的消息

不要直接向最终用户显示原始 `cause` 详情，除非你的应用明确信任该来源。钱包和 RPC 错误消息可能包含提供商特定文本，对 UI 来说可能令人困惑或不安全。

请将稳定错误代码映射为简短、应用专属的消息。

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "请求已取消。";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "此钱包不支持该操作。";
    case "RPC_FAILURE":
      return "网络请求失败。请重试。";
    default:
      return "发生了一些错误。";
  }
}
```

## 重试指南

- 仅在操作可以安全重复时重试 `RPC_FAILURE`。
- 遇到 `TRANSACTION_TIMEOUT` 后，请先检查签名状态再重试。
- 不要自动重试 `USER_REJECTED`。
- 不要重试 `INVALID_ADDRESS`；请让用户更正输入。
- 隐藏或禁用会产生 `WALLET_FEATURE_UNSUPPORTED` 的操作。
