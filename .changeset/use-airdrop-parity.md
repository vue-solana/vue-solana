---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Add `useAirdrop()` for test-network funding: dispatch an airdrop to an address with abort-aware cancellation, resolve `data` to the transaction `Signature` (or `undefined` when the network applies the airdrop without a transaction), and translate common faucet rate-limit errors (HTTP 429 / generic internal JSON-RPC error) into an actionable message.

Add per-attempt/per-connection cancellation to the reactive data composables:

- `getAbortSignal` option on `useRequest`, `useSubscription`, and `useTrackedData`, invoked per attempt/connection and reset between attempts to reflect latest state.
- `refresh({ abortSignal })` / `reconnect({ abortSignal })` per-call overrides that take precedence over the factory; passing no arguments keeps the factory behavior.

Install the `rpcAirdrop()` capability on the core Solana client so airdrops work out of the box on devnet and local validators, and expose `useSolanaAirdrop()` via the Nuxt module.
