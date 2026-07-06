---
title: "Account Reads"
description: Read balances, account data, program accounts, and signature status safely from Vue or Nuxt.
ogSection: Guides
surroundOrder: 10
---

Vue Solana includes composables for common Solana read paths: balances, account info, program accounts, and signature status.

Use this guide when your app needs to read chain state without signing a transaction.

## Parse Addresses

Framework-agnostic code can normalize a Solana address with `parsePublicKey()`.

```ts
import { parsePublicKey } from "@vue-solana/core/address";

const publicKey = parsePublicKey("11111111111111111111111111111111");

if (publicKey) {
  const balance = await connection.getBalance(publicKey);
}
```

`parsePublicKey()` accepts a `PublicKey`, address string, ref-like object, getter, `null`, or `undefined`. Invalid address strings throw `INVALID_ADDRESS`.

## Read Balance in Vue

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Read Account Info

Use `useAccountInfo()` for a single account. Enable `watch` when you need live account updates.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});
</script>
```

When `watch: true` is enabled, Vue Solana removes the WebSocket listener automatically on component unmount. Call `stopWatching()` to remove the current listener earlier and prevent automatic restarts for that composable instance.

## Read Program Accounts

Use `useProgramAccounts()` for accounts owned by a program id.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> Warning: Program account scans can be expensive. Use narrow filters, `dataSlice`, caching, pagination, indexing, or dedicated RPC infrastructure for production reads.

## Read Signature Status

Use `useSignatureStatus()` to track a known transaction signature.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, confirmationStatus, error, refresh } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

Use polling for short-lived progress UI. Avoid indefinite polling from high-traffic pages.

## Nuxt Auto-Imports

Nuxt exposes the same read helpers as auto-imported composables:

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Nuxt composables can be called during SSR and return inert state until hydration provides the real client context. Trigger network refreshes from client lifecycle hooks or user actions when the data depends on browser-only context.

## Null and Invalid Inputs

Read composables clear state without calling RPC when the address, program id, or signature is `null`.

Invalid address strings clear stale data, set `error`, and do not call the RPC method. Branch on `error.value.code` for user-facing messages.

## RPC Cost Checklist

- Prefer direct single-account reads when possible.
- Use filters for program account scans.
- Use `dataSlice` when you only need part of account data.
- Avoid broad scans from landing pages or every route navigation.
- Avoid aggressive polling intervals on public RPC endpoints.
- Cache or index data that many users will request repeatedly.
