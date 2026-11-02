---
"@vue-solana/core": patch
"@vue-solana/vue": patch
"@vue-solana/nuxt": patch
---

Bump `@solana/kit` to `^8.6.0` (the workspace override moves with it, so the
workspace still resolves a single copy — two copies mean two `SolanaError`
classes, and `isSolanaError()` from one rejects errors thrown by the other).

8.6.0 is additive for this package: the new
`SOLANA_ERROR__WALLET__FEATURE_VERSION_UNSUPPORTED` error code (raised when an
app requires a newer version of a wallet feature than the connected wallet
supports, carrying `featureName`, `requiredVersion`, `actualVersion` and
`walletName`) reaches consumers through the `kit` subpaths, as do
`getSignersFromInstructionPlan()`, `decompileTransactionConfig()`,
`getTransactionConfigMask()` / `getTransactionConfigValues()`, and the
`LEGACY_TRANSACTION_SIZE_LIMIT` (1232) / `V1_TRANSACTION_SIZE_LIMIT` (4096)
constants. `decodeTransactionFromRpcResponse()` now also decodes the
`transactionConfig` of a version 1 `json` RPC response, and the codec sentinel
and RPC-subscription channel-pool fixes land through the re-exported surface.

No code change is needed here; `@solana/kit-plugin-rpc` stays on `^0.19.0`,
whose `^8.5.0` peer range already accepts 8.6.0. Upgrading that plugin to
`^0.23.0` is tracked separately because it changes the default planner to
version 1 transaction messages.
