---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Compose the official Kit transaction stack by default in `createSolanaClient()`: `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` from `@solana/kit-plugin-rpc`. The old custom transaction-sending fallback is removed. The default client now exposes `planTransaction(s)` and `sendTransaction(s)` through Kit's official planner and RPC executor; the executor handles blockhashes, resource limits, preflight simulation, signing, submission, and send-and-confirm at `confirmed` commitment.

Keep `payer` and `payerSecretKey` as direct core/Vue client configuration. `payer` accepts a Kit `TransactionSigner`; `payerSecretKey` is a base64-encoded 64-byte Ed25519 keypair (secret key first) resolved at client creation. Nuxt `ModuleOptions` intentionally omits both fields and strips them from public runtime config. Never place a raw secret or funded key in browser-visible Nuxt config; use a trusted server/relayer boundary or a client-only ephemeral signer for demos.

Accept `mainnet` as Solana's official mainnet cluster name while retaining `mainnet-beta` as a legacy alias. Both spellings resolve to the same public HTTP and WebSocket endpoints (`https://api.mainnet.solana.com`, `wss://api.mainnet.solana.com`), so Explorer links and endpoint handling treat either spelling as mainnet.

`useSendTransaction()`, `useSendTransactions()`, `usePlanTransaction()`, and `usePlanTransactions()` now require a `payer`. Calling one of them with a payer-less client throws a `MissingClientCapabilityError` naming `payer` at setup time, instead of failing deep inside Kit with `Cannot read properties of undefined (reading 'address')` later, when a transaction is sent. A payer-less client no longer exposes a phantom `payer: undefined` own key, so `'payer' in client` reports the truth, and `useClientCapability()` treats a `null` capability as missing.

This is a behavior change for clients that sent a transaction message carrying its own embedded signer without configuring a `payer`: those clients now have to expose a `payer` too. Kit reads `client.payer` to set the fee payer, so there is no way to plan or send without one.

Add the Nuxt module option `solana.clientPlugin` (`false` skips the module's runtime plugin). Use it when the app installs `createSolanaPlugin` itself to attach a client-only `payer`; installing both creates two Solana contexts, two wallet subscriptions, and two connection checks.

The module also strips `payer` and `payerSecretKey` from a hand-written `runtimeConfig.public.solana`, not just from its own options, so a secret can no longer reach the client bundle by that route.
