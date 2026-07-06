---
title: "Errors"
description: Handle normalized Solana errors from core helpers and Vue/Nuxt composables.
ogSection: Guides
surroundOrder: 13
---

Vue Solana normalizes common wallet, RPC, address, transaction, timeout, and storage failures into `SolanaError`.

Use stable `error.code` values for UI decisions. Keep `error.cause` for debugging and logs.

## Error Shape

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` includes:

- `code`: stable machine-readable error code.
- `message`: human-readable developer message.
- `cause`: optional original error from a wallet, RPC call, parser, timeout, or storage operation.
- `feature`: optional wallet feature name for unsupported capability errors.

## Stable Error Codes

- `NO_WALLET_SELECTED`: no active wallet is selected.
- `WALLET_NOT_CONNECTED`: the active wallet is not connected or has no public key.
- `WALLET_FEATURE_UNSUPPORTED`: the active wallet does not support the requested feature.
- `USER_REJECTED`: the user rejected a wallet request.
- `INVALID_ADDRESS`: an address string could not be parsed as a Solana public key.
- `TRANSACTION_TIMEOUT`: a transaction-related operation timed out.
- `RPC_FAILURE`: an RPC send, read, or confirmation failed.
- `STORAGE_FAILURE`: browser storage could not be read or written.

## Core Error Handling

Use `isSolanaError()` when catching unknown failures.

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

Use `normalizeSolanaError()` when writing your own framework-agnostic helper that should follow Vue Solana's error model.

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

`normalizeSolanaError()` maps common wallet rejection shapes to `USER_REJECTED`.

## Vue Error Refs

Vue composables expose `error` refs.

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

Nuxt auto-imported composables expose the same error model.

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

## User-Facing Messages

Do not show raw `cause` details directly to end users unless your app explicitly trusts that source. Wallet and RPC error messages may contain provider-specific text that is confusing or unsafe for UI.

Map stable error codes to short app-specific messages instead.

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

## Retry Guidance

- Retry `RPC_FAILURE` only when the operation is safe to repeat.
- After `TRANSACTION_TIMEOUT`, check signature status before retrying.
- Do not retry `USER_REJECTED` automatically.
- Do not retry `INVALID_ADDRESS`; ask the user to correct input.
- Hide or disable actions that produce `WALLET_FEATURE_UNSUPPORTED`.
