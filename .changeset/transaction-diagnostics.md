---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add transaction diagnostics: `buildDiagnosticReport()` / `createTransactionDiagnostics()` in core, `useTransactionDiagnostics()` in Vue, and the `useSolanaTransactionDiagnostics()` Nuxt auto-import. They join history, simulation, error, fee-budget, and app-supplied program-label data into one pure, RPC-free report with stable codes and suggestions, without decoding instructions, interpreting memos, categorizing token transfers, or retrying.
