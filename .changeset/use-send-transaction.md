---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add `useSendTransaction()` / `useSendTransactions()` for sending transactions through the client's transaction-sending capability (`ClientWithTransactionSending`), with no wallet popup: flexible input (instructions, plans, or transaction messages), abort-aware cancellation, and supersede handling — starting a new `execute()` aborts the previous call and discards its state.

Both composables surface `status` (idle, sending, sent, error), `loading`, `error`, and `data`. `useSendTransactions()` sends one or more transactions, executed in parallel or sequentially as the plan dictates.

`usePlanTransaction()` / `usePlanTransactions()` now also abort in-flight planner calls when superseded or when the owning component unmounts.

Expose `useSolanaSendTransaction()` and `useSolanaSendTransactions()` via the Nuxt module, and export the underlying sending plan types (`SingleTransactionPlan`, `TransactionPlanInput`, `TransactionPlanResult`, `SuccessfulSingleTransactionPlanResult`, `ClientWithTransactionSending`) from `@vue-solana/core`.
