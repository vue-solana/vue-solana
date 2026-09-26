---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Compose the official Kit transaction stack by default in `createSolanaClient()`: `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` from `@solana/kit-plugin-rpc`. The old custom transaction-sending fallback is removed. The default client now exposes `planTransaction(s)` and `sendTransaction(s)` through Kit's official planner and RPC executor; the executor handles blockhashes, resource limits, preflight simulation, signing, submission, and send-and-confirm at `confirmed` commitment.

Keep `payer` and `payerSecretKey` as direct core/Vue client configuration. `payer` accepts a Kit `TransactionSigner`; `payerSecretKey` is a base64-encoded 64-byte Ed25519 keypair (secret key first) resolved at client creation. Nuxt `ModuleOptions` intentionally omits both fields and strips them from public runtime config. Never place a raw secret or funded key in browser-visible Nuxt config; use a trusted server/relayer boundary or a client-only ephemeral signer for demos.

Accept `mainnet` as Solana's official mainnet cluster name while retaining `mainnet-beta` as a legacy alias. Both spellings resolve to the same public HTTP and WebSocket endpoints (`https://api.mainnet.solana.com`, `wss://api.mainnet.solana.com`), so Explorer links and endpoint handling treat either spelling as mainnet.
