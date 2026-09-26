# AI Agent Handoff

This file tracks the current repository state, major changes made, and follow-up work so future AI agents can continue quickly.

## Repository Goal

Build a monorepo for Vue and Nuxt libraries that help developers use Solana from Vue applications, similar in spirit to Solana's React libraries but idiomatic for Vue/Nuxt.

## Current Architecture

The repository is a pnpm workspace with three initial packages:

- `@vue-solana/core`: framework-agnostic Solana primitives, config, RPC connection helpers, wallet types, and transaction helpers.
- `@vue-solana/vue`: Vue plugin, provide/inject context, and composables.
- `@vue-solana/nuxt`: Nuxt module that installs the Vue plugin and auto-imports composables.

Workspace files:

- `package.json`: root scripts and shared dev dependencies.
- `pnpm-workspace.yaml`: includes `packages/*`, `apps/*`, and `examples/*`.
- `tsconfig.base.json`: shared strict TypeScript config and workspace path aliases.
- `.gitignore`: ignores dependencies, build outputs, logs, env files, editor files, and temp files.
- `e2e/`: Playwright suite that drives both example apps.

## Implemented Packages

### `packages/core`

Implemented files:

- `src/types.ts`: shared `SolanaConfig`, `SolanaContext`, `SolanaWallet`, and transaction types.
- `src/clusters.ts`: cluster names and endpoint resolution (`mainnet` with a `mainnet-beta` alias).
- `src/kit.ts`: `createSolanaClient()` — the official Kit stack (`solanaRpc`, `rpcTransactionPlanner`, `rpcTransactionPlanSendingExecutor`, `rpcAirdrop`) plus `payer` / `payerSecretKey` resolution.
- `src/rpc.ts`: `createSolanaContext()`.
- `src/wallet.ts`: wallet connection assertions.
- `src/transaction.ts`: `signAndSendTransaction()` and `confirmTransactionSignature()` helpers.
- `src/action.ts`: reactive async action store shared by the Vue composables.
- `src/address.ts`: address input parsing helpers.
- `src/errors.ts`: `SolanaError` codes shared by the packages.
- `src/timeout.ts`: `withTimeout()` helper.
- `src/token-accounts.ts`: token account info types.
- `src/buffer-polyfill.ts`: `installSolanaBufferPolyfill()`.
- `src/wallet-standard.ts` + `src/wallet-standard/*`: Wallet Standard discovery, chain support, and adapter.
- `src/mobile-wallet.ts`: Android MWA registration via `@solana-mobile/wallet-standard-mobile`.
- `src/ios-wallet.ts` + `src/ios-wallet/*`: iOS browser wallet adapter, deep links, and callback handling.
- `src/index.ts`: package exports.

### `packages/vue`

Implemented files:

- `src/plugin.ts`: `createSolanaPlugin()` and `VueSolana` alias.
- `src/injection.ts`: Vue injection key and context type.
- `src/kit.ts`: re-export of the core Kit helpers.
- `src/composables/useSolana.ts`: access injected Solana context.
- `src/composables/useSolanaClient.ts`: the active Kit client and its `rpc` surface.
- `src/composables/useRpc.ts`: expose cluster, endpoint, and client.
- `src/composables/useConnection.ts`: deprecated alias returning the Kit client.
- `src/composables/useWallet.ts`: expose wallet state, connect, disconnect, and `setWallet()`.
- `src/composables/useWallets.ts`: wallet discovery list, selection, and refresh.
- `src/composables/useBalance.ts`: read lamport balance for a public key/address.
- `src/composables/useAccountInfo.ts`: read account data through the context RPC.
- `src/composables/useProgramAccounts.ts`: read program-owned accounts.
- `src/composables/useTokenAccounts.ts` / `useTokenBalance.ts`: SPL token account reads.
- `src/composables/useSignatureStatus.ts`: poll a signature's confirmation status.
- `src/composables/useTransactionConfirmation.ts`: map a Kit confirmation to a display status.
- `src/composables/useAirdrop.ts`: devnet airdrop action.
- `src/composables/useTransaction.ts`: generic async transaction state helper (built on `createSolanaActionStore`).
- `src/composables/useSignAndSendTransaction.ts`: sign/send via current wallet.
- `src/composables/useSignMessage.ts`: sign an arbitrary message via the current wallet.
- `src/composables/useAction.ts`: generic async action state machine over `@vue-solana/core/action`.
- `src/composables/useRequest.ts`: one-shot request with stale-while-revalidate and source watching.
- `src/composables/useSubscription.ts`: live data over Kit reactive stream stores.
- `src/composables/useTrackedData.ts`: slot-deduplicated fetch + subscription over Kit's slot-tracking store.
- `src/composables/useSignIn.ts`: wallet Sign In With Solana (SIWS) trigger.
- `src/composables/useSelectedWalletAccount.ts`: app-wide selected wallet account context (persistence via `src/plugin/selected-wallet-account-storage.ts`, component in `src/components/SelectedWalletAccountProvider.ts`).
- `src/composables/useSignTransactions.ts` / `useSignAndSendTransactions.ts`: batch wallet requests with singular fallbacks.
- `src/composables/useClientCapability.ts`: fail-fast client capability assertions.
- `src/composables/usePayer.ts`: `usePayer()` / `useIdentity()` reactive Kit client signers.
- `src/composables/usePlanTransaction.ts`: `usePlanTransaction()` / `usePlanTransactions()` over the client planning capability.
- `src/composables/useSendTransaction.ts`: `useSendTransaction()` / `useSendTransactions()` over the official Kit RPC plan-sending executor.
- `src/composables/decode-base64.ts`: shared base64 decoding helper.
- `src/swr.ts`: SWR cache-keyed adapters over `useRequest` / `useSubscription` / `useTrackedData`.
- `src/index.ts`: package exports.

Every composable in `src/composables/` also has a top-level subpath re-export in `src/` (for example `src/useSendTransactions.ts`) so Nuxt can auto-import it by name.

Kit 8 reactive-store note: the stores from `@solana/subscribable` call Node's `setMaxListeners` on `AbortSignal`, so tests exercising them (or composables built on them) must run under the `node` vitest environment — tag those files with `// @vitest-environment node`.

### `packages/nuxt`

Implemented files:

- `src/module.ts`: Nuxt module with `solana` config key. It deliberately omits `wallet`, `payer`, and `payerSecretKey` from `ModuleOptions` and strips them from public runtime config. `solana.clientPlugin: false` skips the module's runtime plugin so the app can install `createSolanaPlugin` itself (for example to attach a client-only `payer`); installing both would create two contexts and two wallet subscriptions.
- `src/imports.ts`: maps every composable to its `useSolana*` auto-import alias.
- `src/runtime/plugin.ts`: installs the Vue Solana plugin using public runtime config.
- `src/runtime/kit.ts`: re-export of the core Kit helpers.
- `src/runtime/types.ts`: augments Nuxt public runtime config.

Auto-imported Nuxt composables (source of truth: `packages/nuxt/src/imports.ts`):

- `useSolana()`, `useSolanaClient()`, `useSolanaRpc()`, `useSolanaConnection()`
- `useSolanaBalance()`, `useSolanaAccountInfo()`, `useSolanaProgramAccounts()`
- `useSolanaTokenAccounts()`, `useSolanaTokenBalance()`, `useSolanaSignatureStatus()`, `useSolanaTransactionConfirmation()`
- `useSolanaWallet()`, `useSolanaWallets()`, `useSolanaSignMessage()`, `useSolanaSignIn()`
- `useSolanaAirdrop()`, `useSolanaAction()`, `useSolanaRequest()`, `useSolanaSubscription()`, `useSolanaTrackedData()`
- `useSolanaSelectedWalletAccount()`
- `useSolanaSignTransactions()`, `useSolanaSignAndSendTransaction()`, `useSolanaSignAndSendTransactions()`
- `useSolanaPayer()`, `useSolanaIdentity()`
- `useSolanaPlanTransaction()`, `useSolanaPlanTransactions()`
- `useSolanaSendTransaction()`, `useSolanaSendTransactions()`

The runtime plugin also installs the selected wallet account context app-wide (`createSelectedWalletAccountContext` + `selectedWalletAccountInjectionKey`).

## Solana Dependency Decision

The code switched from `@solana/web3.js` to `@solana/web3-compat` in v1, then to `@solana/kit` in v2.0.0. `@solana/web3-compat` is fully removed from every package; the context has no `connection`, the legacy `web3` subpaths are deleted, and the wallet exposes `publicKey: Address`.

Current package dependency:

- `@solana/kit@^8.3.0` (with `@solana/kit-plugin-rpc` in `packages/core`)

Client transaction stack:

- `createSolanaClient()` composes `solanaRpc()`, `rpcTransactionPlanner()`, `rpcTransactionPlanSendingExecutor()`, and `rpcAirdrop()` from `@solana/kit-plugin-rpc`. The default client therefore already exposes `planTransaction(s)` and `sendTransaction(s)`; the send-and-confirm path settles at `confirmed` commitment.
- Clients built by hand (for example inside `apps/docs/app/plugins/`) do not get those capabilities for free. `useClientCapability()` fails fast when a composable is called against a client missing `planTransaction`, `sendTransaction`, and friends.
- The plan and send hooks also assert `payer` (`["sendTransaction", "payer"]`, `["planTransactions", "payer"]`, …), because Kit reads `client.payer` to set the fee payer. Without a payer they used to die inside Kit with `Cannot read properties of undefined (reading 'address')`; now the hook throws `MissingClientCapabilityError` at setup time. The hooks no longer accept a transaction message that carries its own embedded signer in place of a `payer`.

Signer configuration and security:

- `payer` (a Kit `TransactionSigner`) and `payerSecretKey` (base64-encoded 64-byte Ed25519 keypair, secret key first) stay available on direct core/Vue `createSolanaClient()` calls. `resolvePayerFromSecretKey()` validates the length, derives the public half, and throws when the pair is inconsistent.
- Nuxt never accepts or forwards `payer` or `payerSecretKey`: they are omitted from `ModuleOptions` and stripped from public runtime config. Never put a raw secret or a funded key in browser-visible Nuxt config; use a trusted server/relayer boundary, or a client-only ephemeral signer for demos (`examples/nuxt/app/plugins/demo-payer.client.ts`).

Development-time type shim:

- `types/buffer.d.ts`

This repo-local shim allows TypeScript to resolve the browser `buffer/` subpath used by `@vue-solana/core/buffer-polyfill`. Runtime imports still use the real `buffer` package.

Published package workaround:

- `packages/core/types/buffer.d.ts`
- `packages/core/scripts/prepare-declarations.mjs`

The core build runs `prepare-declarations.mjs` after `unbuild` to add triple-slash references from generated declarations that mention `buffer/`, so fresh consumers do not need a local `buffer/` shim for `@vue-solana/core/buffer-polyfill`.

## Documentation Added

Updated docs:

- `README.md`: package overview, development commands, v2 Kit migration note, and project TODOs.
- `knowledge-bundle/`: OKF-formatted knowledge files for AI agents (concepts, guides, package references).
- `knowledge-bundle/guides/getting-started.md`: install snippets, Vue setup, Nuxt setup, and detailed manual devnet testing guide.
- `plans/native-wallet-plan.md`: implementation tracker for mobile native wallet and desktop native wallet support on top of browser extension wallets.
- `examples/vue-vite/README.md` and `examples/nuxt/README.md`: runnable example app walkthroughs.

The manual testing guide explains:

- Installing dependencies.
- Building packages.
- Running type checks.
- Installing a Solana browser wallet.
- Switching to devnet.
- Getting devnet SOL.
- Testing RPC reads.
- Testing balance reads.
- Testing the Nuxt module.
- Current wallet testing limitations.

## Verification Status

All CI gates pass as of the v2.3.0 packages:

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm build:examples
pnpm smoke:standalone-installs
pnpm test:e2e
```

## Known Limitations

### Desktop Native Wallets Deferred

Browser extension wallets, Android native wallets (MWA), and iOS browser wallets are all implemented in core and surfaced through the unified `useWallets()` / `useWallet()` API. Desktop native wallets are deliberately deferred: no desktop app protocols, install flows, or native adapter coverage ship yet.

Known limitations:

- iOS browser wallet support has a narrower tested wallet set than Android; Trust Wallet research is still open.
- Desktop native wallet support is a post-v1 follow-up; keep any new work inside the unified wallet flow.

Recommended next step:

- Follow `plans/native-wallet-plan.md` and expose native wallet sources through the existing unified `useWallets()` and `useWallet()` APIs.

### Example Apps

The `examples/vue-vite` and `examples/nuxt` directories contain runnable example apps wired to the workspace packages. They demonstrate plugin/module setup, RPC state, direct connection calls, balance reads, wallet state, mock transaction flows, and the client-sent flow (`usePayer()` plus `usePlanTransaction()` / `useSendTransaction()`). The Nuxt example installs a client-only ephemeral payer in `app/plugins/demo-payer.client.ts` because Nuxt never accepts `payer` / `payerSecretKey`, and sets `solana.clientPlugin: false` in `nuxt.config.ts` so the module does not install a second plugin.

Both apps also mount Live Data Panels exercising the Kit-reactive composables (`useRequest`, `useSubscription`, `useTrackedData`, `useSignIn`, and the `swr` cache adapters) against devnet.

The Playwright e2e suite in `e2e/` covers the example apps. `e2e/helpers.ts` mocks the HTTP RPC (getLatestBlockhash, getBalance, getVersion, getAccountInfo), fakes the Kit RPC-subscriptions websocket protocol (subscribe, id-correlated result, then `<method>Notification` frames keyed on `params.subscription`), and registers two mock Wallet Standard wallets including one with `solana:signIn`. Run with `pnpm test:e2e` (mocks) or `pnpm test:e2e:integration` (real devnet, `E2E_REAL_RPC=true`). Specs that assert against mock data skip in the integration run.

### Locale Docs Structure

The locale docs in `apps/docs/content/locales/{es,ko,zh}/` mirror the English docs tree. `packages/core/src/locale-docs.test.ts` (runs with `pnpm test`, so it gates CI) fails when a locale file is missing, has no English counterpart anymore, or its heading structure (levels and order, ignoring text) drifts from the English source.

When you add, remove, or restructure sections in an English doc, translate the same change into all three locale files in the same change set. Spanish files follow their existing no-accent style; Korean freely mixes English technical terms; do not translate code, identifiers, or API names. If a structural difference is genuinely intentional, add the file to `STRUCTURE_EXEMPT_FILES` in the test with a comment explaining why.

### Workspace App Dependency Policy

- `apps/docs` is the live documentation/demo app for the published package. It intentionally depends on the published `@vue-solana/nuxt` version, not `workspace:*`, so it reflects what external users get from npm.
- `examples/vue-vite` and `examples/nuxt` are the local development example apps. They should use workspace packages so they exercise unreleased package changes during development.
- Do not treat `apps/docs/package.json` using a pinned published `@vue-solana/nuxt` version as a bug unless the release/demo policy changes.
- When testing unreleased package changes, use the example apps and package tests, not `apps/docs`.

## Native Wallet Planning

Use `plans/native-wallet-plan.md` as the source of truth for mobile native wallet and desktop native wallet implementation work.

Important workflow rules:

- Keep mobile native wallets, desktop native wallets, and browser extension wallets exposed through the unified `useWallets()` and `useWallet()` API.
- Do not introduce separate public composables like `useMobileWallets()` or `useDesktopWallets()` unless the plan is deliberately revised first.
- Before implementing native wallet work, read `plans/native-wallet-plan.md` and choose the relevant feature section.
- When a plan item is implemented, strike through that item in `plans/native-wallet-plan.md`.
- When every item under a feature is implemented, remove that feature's plan items and leave only the checked title, for example `## [x] Mobile Native Wallets`.
- Keep the plan file current in the same change set as implementation work so future agents can continue from the latest state.

## Knowledge Bundle

The `knowledge-bundle/` directory contains OKF-formatted knowledge files for AI agents. Each file has YAML frontmatter with `type`, `title`, `description`, `tags`, and `timestamp` fields.

Agent entry point: [`knowledge-bundle/index.md`](./knowledge-bundle/index.md)

The knowledge bundle covers:

- Solana concepts, clusters, and the Kit migration from the legacy web3-compat surface.
- Getting started guide, wallet support (browser, Android, iOS), message signing, and troubleshooting.
- Package API references for core, vue, and nuxt.

Plans live in the top-level `plans/` directory, separate from the knowledge bundle.

## Suggested Next Tasks

- Follow `apps/docs/content/roadmap.md` for upcoming features (core composables, wallet features, Ecosystem integrations, etc.).
- Follow `plans/native-wallet-plan.md` to add mobile native wallet and desktop native wallet support through the unified `useWallets()` flow.
- Re-check the `@solana/kit` and `@solana/kit-plugin-rpc` peer versions on every new release.

## Useful Commands

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm clean
```

## Commit Message Used/Suggested

Suggested commit message for the initial scaffold:

```txt
chore: scaffold vue solana monorepo
```

## Skill Use Rules

Load the `using-agent-skills` skill when starting a session or when it is
unclear which installed skill applies. It covers skill discovery, choosing the
right skill for a task, project-specific skill mappings, and lifecycle guidance.
