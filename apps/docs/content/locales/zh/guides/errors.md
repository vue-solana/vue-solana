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
- `WALLET_FAILURE`：钱包侧操作失败且没有更具体的 code，包括连接/断开、已保存钱包的自动连接、移动钱包注册、iOS 回调处理、消息签名、登录或批量交易签名。
- `USER_REJECTED`：用户拒绝了钱包请求。
- `INVALID_SIGNATURE`：钱包返回的消息签名或登录签名与其账户密钥不匹配。
- `INVALID_ADDRESS`：地址字符串无法解析为 Solana 地址。
- `INVALID_INPUT`：辅助函数收到了格式错误的端点、超时或选项值。
- `TRANSACTION_TIMEOUT`：与交易相关的操作超时。
- `TRANSACTION_NOT_FOUND`：签名在确认截止前从未出现在 RPC 状态结果中。
- `TRANSACTION_FAILED`：已提交的交易在达到请求的确认级别之前失败。
- `REDIRECT_TIMEOUT`：iOS 钱包未能及时重定向回应用。
- `DECRYPTION_FAILED`：无法解密或解码 iOS 钱包回调。
- `MISSING_CLIENT_CAPABILITY`：Kit 客户端缺少组合式函数所需的能力（例如 `planTransaction`、`sendTransaction` 或 `payer`）。通常是手动构建客户端时跳过了 `createSolanaClient()` 或相应的 Kit 插件。
- `RPC_FAILURE`：RPC 发送、读取或确认失败。
- `STORAGE_FAILURE`：无法读取或写入浏览器存储。

## 核心错误处理

捕获未知失败时使用 `isSolanaError()`。

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
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
    return await client.rpc.getLatestBlockhash().send();
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

## 诊断失败的交易

如果你已经有失败的交易历史项、模拟结果或标准化错误，`@vue-solana/core/diagnostics` 中的 `buildDiagnosticReport()` 会将它们合并为一个可解释的对象。该构建函数是纯函数，不会调用 RPC：它不会获取交易、解码指令、解释 memo、分类代币转账或自动重试。

```ts
import { buildDiagnosticReport } from "@vue-solana/core/diagnostics";

const report = buildDiagnosticReport({
  historyItem: failedItem,
  simulationResult: preview,
  error,
  feeBudget,
  labels: { [programAddress]: "My program" },
});

console.log(report.summary, report.code, report.suggestions);
```

`report` 始终包含 `summary`、`code`、`outcome`、`signature`、`slot`、`logs`、`balanceChanges`、`unitsConsumed`、`feeBudget`、`programs`、`sources` 和 `suggestions`。已知的 `SolanaError` 代码和原始 RPC 错误键会生成稳定建议，未知代码会原样保留。`programs` 来自模拟日志中的 `Program <address>` 行，只使用你的应用提供的标签；库本身不包含程序注册表。

在 Vue 中，`useTransactionDiagnostics()` 接受响应式的签名或历史项，并暴露 `report`、`status`、`error` 和 `refresh()`：

```vue
<script setup lang="ts">
import { useTransactionDiagnostics } from "@vue-solana/vue/useTransactionDiagnostics";

const { report, status, error, refresh } = useTransactionDiagnostics(failedItemRef, {
  simulationResult: simulationResultRef,
  error: errorRef,
  feeBudget: budgetRef,
  labels: { [programAddress]: "My program" },
});
await refresh();
</script>
```

在 Nuxt 中无需导入即可调用 `useSolanaTransactionDiagnostics()`。格式错误的输入会报告为 `INVALID_INPUT`，构建函数本身不会访问网络。交易历史和模拟输入请参阅[交易](/zh/guides/transactions)。
