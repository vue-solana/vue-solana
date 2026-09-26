# @vue-solana/core

## 2.4.0

### Minor Changes

- 150cf15: Compose the official Kit transaction stack by default in `createSolanaClient()`: `solanaRpc()`, `rpcTransactionPlanner()`, and `rpcTransactionPlanSendingExecutor()` from `@solana/kit-plugin-rpc`. The old custom transaction-sending fallback is removed. The default client now exposes `planTransaction(s)` and `sendTransaction(s)` through Kit's official planner and RPC executor; the executor handles blockhashes, resource limits, preflight simulation, signing, submission, and send-and-confirm at `confirmed` commitment.

  Keep `payer` and `payerSecretKey` as direct core/Vue client configuration. `payer` accepts a Kit `TransactionSigner`; `payerSecretKey` is a base64-encoded 64-byte Ed25519 keypair (secret key first) resolved at client creation. Nuxt `ModuleOptions` intentionally omits both fields and strips them from public runtime config. Never place a raw secret or funded key in browser-visible Nuxt config; use a trusted server/relayer boundary or a client-only ephemeral signer for demos.

  Accept `mainnet` as Solana's official mainnet cluster name while retaining `mainnet-beta` as a legacy alias. Both spellings resolve to the same public HTTP and WebSocket endpoints (`https://api.mainnet.solana.com`, `wss://api.mainnet.solana.com`), so Explorer links and endpoint handling treat either spelling as mainnet.

  `useSendTransaction()`, `useSendTransactions()`, `usePlanTransaction()`, and `usePlanTransactions()` now require a `payer`. Calling one of them with a payer-less client throws a `MissingClientCapabilityError` naming `payer` at setup time, instead of failing deep inside Kit with `Cannot read properties of undefined (reading 'address')` later, when a transaction is sent. A payer-less client no longer exposes a phantom `payer: undefined` own key, so `'payer' in client` reports the truth, and `useClientCapability()` treats a `null` capability as missing.

  This is a behavior change for clients that sent a transaction message carrying its own embedded signer without configuring a `payer`: those clients now have to expose a `payer` too. Kit reads `client.payer` to set the fee payer, so there is no way to plan or send without one.

  Add the Nuxt module option `solana.clientPlugin` (`false` skips the module's runtime plugin). Use it when the app installs `createSolanaPlugin` itself to attach a client-only `payer`; installing both creates two Solana contexts, two wallet subscriptions, and two connection checks.

  The module also strips `payer` and `payerSecretKey` from a hand-written `runtimeConfig.public.solana`, not just from its own options, so a secret can no longer reach the client bundle by that route.

## 2.3.0

### Minor Changes

- 556600d: Add `useSendTransaction()` / `useSendTransactions()` for sending transactions through the client's transaction-sending capability (`ClientWithTransactionSending`), with no wallet popup: flexible input (instructions, plans, or transaction messages), abort-aware cancellation, and supersede handling — starting a new `execute()` aborts the previous call and discards its state.

  Both composables surface `status` (idle, sending, sent, error), `loading`, `error`, and `data`. `useSendTransactions()` sends one or more transactions, executed in parallel or sequentially as the plan dictates.

  `usePlanTransaction()` / `usePlanTransactions()` now also abort in-flight planner calls when superseded or when the owning component unmounts.

  Expose `useSolanaSendTransaction()` and `useSolanaSendTransactions()` via the Nuxt module, and export the underlying sending plan types (`SingleTransactionPlan`, `TransactionPlanInput`, `TransactionPlanResult`, `SuccessfulSingleTransactionPlanResult`, `ClientWithTransactionSending`) from `@vue-solana/core`.

## 2.2.0

### Minor Changes

- c09065f: Add `useAirdrop()` for test-network funding: dispatch an airdrop to an address with abort-aware cancellation, resolve `data` to the transaction `Signature` (or `undefined` when the network applies the airdrop without a transaction), and translate common faucet rate-limit errors (HTTP 429 / generic internal JSON-RPC error) into an actionable message.

  Add per-attempt/per-connection cancellation to the reactive data composables:
  - `getAbortSignal` option on `useRequest`, `useSubscription`, and `useTrackedData`, invoked per attempt/connection and reset between attempts to reflect latest state.
  - `refresh({ abortSignal })` / `reconnect({ abortSignal })` per-call overrides that take precedence over the factory; passing no arguments keeps the factory behavior.

  Install the `rpcAirdrop()` capability on the core Solana client so airdrops work out of the box on devnet and local validators, and expose `useSolanaAirdrop()` via the Nuxt module.

## 2.1.0

### Minor Changes

- c8e883c: Add React-parity data, wallet, and transaction composables.
  - `useAction()` / `createSolanaActionStore()` (`@vue-solana/core/action`) with abortable, reactive action state, plus `useRequest()`, `useSubscription()`, and `useTrackedData()` for SWR reads, live streams, and slot-deduplicated RPC data.
  - Sign In With Solana: `useSignIn()` composable and wallet-standard `signIn` support (`SolanaSignInFeature`, adapter `signIn`).
  - Wallet selection: `useSelectedWalletAccount()` plus the `SelectedWalletAccountProvider` component, with localStorage persistence, cross-tab sync, and a Nuxt runtime plugin that installs the context app-wide.
  - Batch transactions: `useSignTransactions()` and `useSignAndSendTransactions()` with the wallet's batch capability and fallbacks; a partial batch send rejects with `PartialSignAndSendError` carrying the signatures that were already submitted.
  - `useClientCapability()`, `usePayer()` / `useIdentity()`, and `usePlanTransaction()` / `usePlanTransactions()`.
  - SWR cache adapters (`@vue-solana/vue/swr`): `useRequestSwr()`, `useSubscriptionSwr()`, `useTrackedDataSwr()`, `clearSwrCache()`.
  - Nuxt: all composables auto-imported as `useSolana*` (see the Nuxt docs for the full list).

## 2.0.0

### Major Changes

- 99ee109: v2.0.0: Kit-only — remove the `@solana/web3-compat` bridge and the `web3` subpaths.

  `SolanaContext.connection` is gone; the context exposes `client` (`createSolanaClient`) only. `SolanaWallet.publicKey` is now `Address | null`. `SolanaTransaction` is raw serialized wire bytes (`Uint8Array`). RPC reads return `bigint` lamports and `Uint8Array` account data. `useConnection()` is kept as a deprecated alias returning the Kit client. The Nuxt module no longer injects web3-compat `optimizeDeps` entries. See the `guides/kit-migration` page for the full migration map, including how to install `@solana/kit-plugin-signer` signer/airdrop helpers directly for agent/script contexts.

## 1.2.0

### Minor Changes

- 93aee6d: Add `@solana/kit` client support as the first step of the Kit migration (transition release).
  - `createSolanaClient()` from `@vue-solana/core/kit`, building a read-only Kit client (`rpc`, `rpcSubscriptions`) from the same `SolanaConfig`.
  - New `@vue-solana/*/kit` subpaths re-exporting Kit primitives: `address`, `lamports`, and `Address`, `Rpc`, `SolanaRpcApi`, `SolanaClient` types.
  - `useSolanaClient()` composable (returns `{ client, rpc }`), available from `@vue-solana/vue/useSolanaClient` and auto-imported by the Nuxt module.
  - `SolanaContext` now carries the Kit `client` alongside the legacy `connection`; `SolanaWallet` now exposes an optional Kit `address`.
  - Legacy helpers (`createSolanaConnection`, `signAndSendTransaction`, `confirmTransactionSignature`, token helpers, `parsePublicKey`, `web3` subpaths) are marked `@deprecated` but remain fully functional.
  - Nuxt module adds Vite `optimizeDeps.include` entries for the Kit packages.

## 1.1.0

### Minor Changes

- e04ae33: Add SPL token account helpers and composables: `useTokenAccounts`, `useTokenBalance`, token account query functions, and `@solana/spl-token` re-exports.

## 1.0.0

### Major Changes

- 5564b3c: Release v1.0.0 of the vue-solana monorepo. Stabilized public API, wallet UX foundations, transaction lifecycle, reactive account data, message signing, and comprehensive error handling for Vue and Nuxt Solana integrations.

## 0.7.2

### Patch Changes

- 25d5475: Simplify consumer installs by keeping low-level Solana and Buffer dependencies behind Vue Solana packages. `@vue-solana/core` owns the public `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill` surfaces, while `@vue-solana/vue` and `@vue-solana/nuxt` now expose their own `web3` and `buffer-polyfill` subpaths so framework consumers do not need direct `@vue-solana/core`, `@solana/web3-compat`, or `buffer` installs for primary transaction examples.

  `@vue-solana/core` also publishes package-owned declaration shims for `@solana/web3-compat` and the `buffer/` subpath so fresh TypeScript consumers can import the core package, `@vue-solana/core/web3`, and `@vue-solana/core/buffer-polyfill` without adding local shims.

  Point the Nuxt package root declaration metadata at the generated ESM declaration so standalone TypeScript consumers can default-import the module from the package root.

## 0.7.1

### Patch Changes

- 16fd954: Improve package README structure for npm with badges, feature summaries, compatibility details, option tables, API tables, and caveats.

## 0.7.0

### Minor Changes

- e77115b: Add normalized Solana errors with stable error codes and use them across core helpers and Vue composables.

## 0.6.0

### Minor Changes

- c060c45: Add wallet message signing support and expose wallet capability flags for Vue and Nuxt applications.

## 0.5.1

### Patch Changes

- 739a418: Harden reactive account and signature composables, document new public account-data APIs, and keep package export/build metadata aligned.

## 0.5.0

### Minor Changes

- ed16ec2: Add transaction confirmation helpers, Vue confirmation state, and Nuxt auto-import support.

## 0.4.2

### Patch Changes

- 6e1f094: Harden native wallet callback handling and transaction signing result validation.

  Validate iOS wallet callback payloads, expire stale pending callback requests, clear consumed callback state on failures, and reject mismatched `signAllTransactions` results from iOS and Wallet Standard adapters. Also prevent stale balance refreshes from overwriting newer state and keep non-serializable Nuxt wallet instances out of public runtime config.

## 0.4.1

### Patch Changes

- f099ba0: Fix Nuxt docs demo loading with tweetnacl by improving Vite dependency interop handling and resolving tweetnacl safely in iOS wallet code.

## 0.4.0

### Minor Changes

- 04a4626: Add iOS mobile wallet support through the unified wallet flow.

  The core package now exports iOS wallet helpers and related wallet metadata, while the Vue plugin and Nuxt module can configure and expose the mobile wallet flow alongside existing browser wallet support.

## 0.3.3

### Patch Changes

- 337b99f: Document the installable Vue Solana Agent Skill in the published package READMEs.

## 0.3.2

### Patch Changes

- 5244d3b: Improve mobile wallet transaction completion handling across core transaction helpers and Vue transaction composables.

  Replace the dynamic `@solana/web3-compat` import in `useBalance()` with a static `PublicKey` import to avoid ineffective dynamic import warnings in consuming Vite/Rollup apps.

## 0.3.1

### Patch Changes

- e22b88f: Fix Nuxt dev-mode wallet discovery by optimizing Solana mobile wallet dependencies and lazy-loading mobile wallet registration.

## 0.3.0

### Minor Changes

- b2bd905: Add Solana Mobile Wallet Adapter registration and expose wallet metadata for unified browser and mobile wallet discovery.

## 0.2.1

### Patch Changes

- b0b6ed2: Update package README example links and documentation GitHub links to open in a new tab.

## 0.2.0

### Minor Changes

- f3d4e80: add wallet adapter support

## 0.1.2

### Patch Changes

- c0446cc: Update package README files and homepage links.
