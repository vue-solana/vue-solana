# Kit Migration Plan: web3-compat → @solana/kit

Migrate `@vue-solana/*` from `@solana/web3-compat` to `@solana/kit` without breaking developers mid-flight.

## Why

`@solana/web3-compat` is superseded. Solana's official guidance is that new apps build directly on `@solana/kit` and its plugins (`@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-wallet`); `@solana/web3.js` v1 / wallet-adapter / web3-compat are legacy-interop paths only. Vue Solana currently wraps `@solana/web3-compat` at every layer, so it inherits two concrete problems:

- `@solana/web3-compat@0.0.21` ships broken TypeScript package metadata, forcing repo-local and package-owned `.d.ts` shims plus a declaration-prep post-build script.
- The web3-compat `Connection` / `PublicKey` / `Transaction` class API is the legacy shape; developers following Solana's ecosystem move toward `Address`, codecs, plugin clients, and the transaction planner. Staying on web3-compat makes `@vue-solana/*` feel stale and pushes a second migration onto our users.

## Goal

Ship a **transition release (v1.x)** that supports **both** APIs side by side so existing apps compile and run unchanged, then ship **v2.0.0** that removes the web3-compat path entirely and keeps Kit only. The migration guide documents why and step-by-step how.

## Current State (audit)

- `@solana/web3-compat@^0.0.21` is a direct dependency of `packages/core`, `packages/vue`, and `packages/nuxt`.
- All real web3-compat imports live in `packages/core/src/` (11 production files: `web3.ts`, `types.ts`, `address.ts`, `rpc.ts`, `transaction.ts`, `wallet-standard/adapter.ts`, `wallet-standard/transactions.ts`, `ios-wallet/{adapter,callback,storage,transactions}.ts`, plus 5 test files).
- The public surface that leaks web3-compat types:
  - `@vue-solana/core/web3`, `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3` re-export `Connection`, `Keypair`, `PublicKey`, `SystemProgram`, `Transaction`, `TransactionInstruction`, `VersionedTransaction` and types `AccountInfo`, `Commitment`, `RpcResponseAndContext`, `SendOptions`, `SignatureResult`, `SignatureStatus`, `TransactionSignature`.
  - `SolanaContext.connection: Connection` (`packages/core/src/types.ts`).
  - `SolanaWallet.publicKey: PublicKey`, `SolanaTransaction = Transaction | VersionedTransaction` (`packages/core/src/types.ts`).
  - `parsePublicKey()` / `PublicKeyInput` (`packages/core/src/address.ts`).
  - `signAndSendTransaction(connection, …)` / `confirmTransactionSignature(connection, …)` (`packages/core/src/transaction.ts`).
  - SPL helpers `getTokenAccountsByOwner(connection, …)`, `getTokenAccount`, `getMint`, `getTokenBalance` (`packages/core/src/token-accounts.ts`).
  - Nuxt Vite `optimizeDeps`/`needsInterop` entries for the `@solana/web3-compat > @solana/web3.js > …` chain (`packages/nuxt/src/module.ts`, asserted in `packages/nuxt/src/module.test.ts`, plus manual duplicates in `apps/docs/nuxt.config.ts`).
  - Type shims: `types/web3-compat.d.ts` (dev-time), `packages/core/types/web3-compat.d.ts` (published), injected into built declarations by `packages/core/scripts/prepare-declarations.mjs`.
- `@solana/kit@^8.3.0` and `@solana/kit-plugin-rpc@^0.19.0` are **already declared** in `packages/core/package.json` but unused in any source — they were added in anticipation. `@solana/kit@8.3.0`, `@solana/kit-plugin-rpc@0.19.0`, and `@solana-program/system@0.10.0` resolve in the workspace today.
- `@solana/kit-plugin-rpc@0.19.0` exports `solanaRpc`, `solanaRpcConnection`, `solanaDevnetRpc`, `solanaMainnetRpc`, `solanaTestnetRpc`, `solanaLocalRpc`, `solanaRpcSubscriptionsConnection`, `rpcAirdrop`. `solanaRpcConnection({ rpcUrl })` provides a read-only `client.rpc` and is the right building block for the app context (no payer in the browser).
- `@solana/kit` exports `createClient`, `address`, `lamports`, and types including `Address`, `SolanaRpcApi`, `Client<…>`.

## Strategy

Two overlapping release phases:

**Phase 1 — transition release (v1.x, additive, semver-minor).** The context carries both the legacy `Connection` and a new Kit `client`. Every existing composable, export, and the `web3` subpaths keep working exactly as today. New Kit surface is added alongside: `createSolanaClient()`, `@vue-solana/*/kit` subpaths, `useSolanaClient()`. Legacy connection-based helpers are marked `@deprecated`.

**Phase 2 — v2.0.0 (break).** Remove `@solana/web3-compat` from every package, delete the shims and the declaration-prep logic, drop the `Connection` from the context and the legacy `web3` subpaths, re-point the composables at Kit, migrate the wallet adapter to Kit signer/encoding, and clean the Nuxt `optimizeDeps`. Docs and the migration guide ship with Phase 1 so devs have time to move before v2 lands.

A developer never has a hard cut: in v1.x both APIs work; in v2 only the documented Kit-flavored API remains, with every renamed/removed symbol covered by the migration guide.

## Design Decisions

1. **Context shape (v1.x):** `SolanaContext` gains `client` (a Kit client built from `solanaRpcConnection({ rpcUrl, wsEndpoint })`, providing `client.rpc`). `connection` stays. SSR fallback in `useSolana()` serves the same throwing proxy for both.
2. **New `@vue-solana/core/kit` subpath** re-exports `createSolanaClient(config?)` plus the Kit helpers/types the Vue package needs (`Address`, `lamports`, `address`, the client/rpc types). `web3` subpaths remain untouched in v1.x.
3. **New `useSolanaClient()` composable** returns `{ client, rpc }` from context. Added to `@vue-solana/vue` exports and Nuxt auto-imports. Existing `useRpc()` / `useConnection()` stay on the legacy path during v1.x.
4. **Wallet stays legacy in v1.x.** The `SolanaWallet` adapter already talks Wallet Standard; do not re-architect it during the transition. Add `address?: Address` (string form of `publicKey`) to `SolanaWallet` in v1.x so Kit code can consume the connected account.
5. **v2 wallet:** adapt the connected Wallet Standard account into a Kit `Signer` (`address` + a `signTransaction`-feature-backed signing function), reusing the existing discovery/selection machinery. `SolanaWallet.publicKey` becomes `Address | null`. Transaction send becomes Kit-planner-based; the legacy sign-then-serialize raw path is deleted.
6. **Versioning:** transition lands as a minor bump (1.2.0) with changesets for `core`, `vue`, `nuxt`. v2 is a coordinated breaking major (2.0.0). Pin Kit plugin majors (`@solana/kit` 8.x, `@solana/kit-plugin-rpc` 0.19.x, `@solana/kit-plugin-signer`, `@solana/kit-plugin-instruction-plan`, and `@solana/kit-plugin-wallet` if adopted, all 0.x) — these APIs still churn between majors. The Kit client quickstart installs `@solana/kit` + `@solana/kit-plugin-rpc` + `@solana/kit-plugin-signer`; the v2 send path needs those three. `solanaDevnetRpc()`/`airdropSigner()` also unlock `client.airdrop` for devnet funding.
7. **Keep the `buffer/` shim.** `buffer.d.ts` and the `/buffer-polyfill` exports are independent of web3-compat and stay. Only web3-compat shims are deleted in v2.

## Phase 1 — Transition Release (v1.x)

### Core: Kit client factory

- [x] Create `packages/core/src/kit.ts`:
  - `createSolanaClient(config: SolanaConfig = {})` → Kit client via `solanaRpcConnection({ rpcUrl: <resolved endpoint>, rpcSubscriptionsUrl: <resolved ws> })` from `@solana/kit-plugin-rpc`, reusing `clusters.ts` endpoint resolution. Return type includes `rpc`. (Note: the plugin's config key is `rpcSubscriptionsUrl`, not `wsEndpoint`.)
  - Re-export from `@solana/kit` the public helpers/types the Vue package and consumers need (`Address`, `address`, `lamports`, `SolanaRpcApi`, client type). Make the re-export list explicit and reviewed against `@solana/kit@8.3.0` before implementation.
- [x] Add `./kit` subpath to `packages/core/package.json` exports.
- [x] Export `createSolanaClient` and the kit re-exports from `packages/core/src/index.ts`.
- [x] Update `SolanaContext` (`packages/core/src/types.ts`) to add `client` (Kit client) alongside `connection`.
- [x] `createSolanaContext()` (`packages/core/src/rpc.ts`) builds and attaches the Kit client.
- [x] Add `address?: Address` to `SolanaWallet` (`packages/core/src/types.ts`). The wallet-standard adapter (`packages/core/src/wallet-standard/adapter.ts`) sets it from the account address. Keep `publicKey: PublicKey` unchanged.

### Core: type notes

- [x] Mark legacy helpers (`createSolanaConnection`, `signAndSendTransaction`, `confirmTransactionSignature`, token helpers, `parsePublicKey`, `web3` subpath) with `@deprecated` JSDoc pointing to the Kit equivalents; do not change behavior.
- [x] No removal of web3-compat imports or the two shims in Phase 1.

### Vue: composables and context

- [x] `packages/vue/src/plugin.ts`: keep building the legacy context; the context now carries `client` (from `createSolanaContext`). No change to plugin options.
- [x] Create `packages/vue/src/composables/useSolanaClient.ts` → returns `{ client, rpc }` via `useSolana()`; SSR-safe fallback (throwing proxy like `useSolana`’s).
- [x] Add `./useSolanaClient` subpath export and export from `packages/vue/src/index.ts`.
- [x] Create `packages/vue/src/kit.ts` re-exporting from `@vue-solana/core/kit` (mirror of the existing `web3.ts` pattern) and add `./kit` subpath.
- [x] Tests: `useSolanaClient` returns context client/rpc, and SSR fallback throws a clear “plugin not installed” error (follow `useSolana.test.ts`/mock-context pattern).
- [x] Keep `useRpc()`, `useConnection()`, `useBalance()`, wallet composables, and all others unchanged in v1.x.

### Nuxt: module and auto-imports

- [x] Add `["useSolanaClient", "useSolanaClient"]` to the auto-imports map in `packages/nuxt/src/imports.ts`.
- [x] Add Kit `optimizeDeps.include` entries for `@solana/kit`, `@solana/kit-plugin-rpc`, `@solana/kit-plugin-instruction-plan`, and `@solana-program/system` to `packages/nuxt/src/module.ts`. Keep the existing web3-compat entries.
- [x] Update `packages/nuxt/src/runtime/plugin.ts` `web3` shim path if the runtime re-export file changes; add `runtime/kit.ts` mirroring `runtime/web3.ts` re-exporting from `@vue-solana/core/kit`, with `./kit` subpath in `packages/nuxt/package.json`.
- [x] Update `packages/nuxt/src/module.test.ts` arrays to include the new entries (additive assertions).

### Verification for Phase 1

- [x] `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm build:packages` all pass.
- [x] `pnpm smoke:standalone-installs` passes (each consumer installs and typechecks against the packed tarballs).
- [x] A dev using only legacy composables/`web3` imports sees zero changes.
- [x] A dev using `useSolanaClient().rpc.getSlot().send()` against devnet works with no additional setup.

## Phase 2 — v2.0.0 (Kit Only)

### Core: remove web3-compat

- [x] Remove `@solana/web3-compat` from `packages/core/package.json` dependencies.
- [x] Rewrite `packages/core/src/web3.ts`: either delete it or re-point exports to Kit equivalents under new names. Delete the `./web3` subpath; add `./kit` (already present) as the supported path.
- [x] `packages/core/src/types.ts`: `SolanaContext.connection` removed (keep `client`); `SolanaWallet.publicKey: Address | null` (breaking), `SolanaTransaction` replaced by Kit transaction message types; `Commitment`/`SendOptions`/`TransactionSignature` etc. sourced from Kit’s `@solana` packages.
- [x] `packages/core/src/address.ts`: replace `PublicKey` parsing with Kit `address()` / `isStringAddress()`. Keep `parsePublicKey` as a thin deprecated convenience if desired; document migration.
- [x] `packages/core/src/rpc.ts`: `createSolanaConnection` deleted; `createSolanaContext` returns the Kit-client context only.
- [x] `packages/core/src/transaction.ts`: reimplement on Kit — a `sendTransaction(client, wallet, instructions, options)` built on the planner (or wallet bridging per Design Decision 5); confirmation via Kit’s transaction-confirmation/`getSignatureStatuses` instead of `connection.confirmTransaction`.
- [x] Add `@solana/kit-plugin-signer` to core dependencies for the v2 send path: `signer()`/`payer()`/`identity()` with their `generated*`/`*FromFile`/`airdrop*` variants (agent/script contexts without a browser wallet), and `client.airdrop` (enabled by `solanaDevnetRpc()`/`airdropSigner`) for devnet funding. Batch sends spanning several transactions use `client.sendTransactions` (mirrors the legacy `signAllTransactions` wallet capability). _Resolved by design: Vue Solana targets browser wallet flows and does not bundle the signer/instruction-plan/system plugins. The migration guide documents the mapping to `signer()`/`payer()`/`identity()` (with `generated*`/`*FromFile`/`airdrop*` variants) and `client.airdrop`/`client.sendTransactions` as drop-in plugins consumers install directly from the `@solana` ecosystem when they need agent/script signing._
- [x] `packages/core/src/wallet-standard/transactions.ts`: replace `Transaction.from`/`VersionedTransaction.deserialize` with Kit transaction/message codecs (`getTransactionEncoder` family); `serializeTransaction`/`deserializeTransaction` operate on Kit message types.
- [x] `packages/core/src/wallet-standard/adapter.ts`, `ios-wallet/*`: replace `new PublicKey(account.publicKey)` with account address strings (`bs58` decoding stays for wallet-standard feature bytes).
- [x] `packages/core/src/token-accounts.ts` (+ SPL helpers): switch `connection` parameter to Kit `client.rpc` reads (`getTokenAccountsByOwner`, `getAccountInfo` with `@solana/spl-token` unpacking unchanged). Prefer the Kit-native `@solana-program/token`/`@solana-program/token-2022` program plugins (`client.token`) as the documented path — per the official web3.js `@solana/spl-token` → `@solana-program/token` companion migration guide — and keep `@solana/spl-token` unpacking only if the swap is disproportionately large.
- [x] Delete `packages/core/types/web3-compat.d.ts`; trim `packages/core/scripts/prepare-declarations.mjs` to the `buffer.d.ts` shim only (or delete if no longer needed).
- [x] Delete dev-time shim `types/web3-compat.d.ts`. Remove `@solana/web3-compat` from `build.config.ts`/rollup externals in `packages/nuxt`.

### Vue: kit-first composables

- [x] `packages/vue/src/plugin.ts`: context has no `connection`; plugin denied if a consumer still asks for it.
- [x] Delete `packages/vue/src/composables/useConnection.ts`; `useRpc()` becomes the Kit-RPC composable (`useSolana().client.rpc`).
- [x] Migrate `useBalance` (accept `Address | string | null`, use `client.rpc.getBalance().send()` → `lamports`), `useAccountInfo`, `useProgramAccounts`, `useTokenAccounts`, `useTokenBalance`, `useSignatureStatus`, `useSignMessage`, `useSignAndSendTransaction`, `useTransactionConfirmation` to Kit reads/send paths. Keep composable names and return shapes as close to today as possible.
- [x] Wallet composables (`useWallet`, `useWallets`, `useSignAndSendTransaction`) read `publicKey: Address`.
- [x] Delete `packages/vue/src/web3.ts`; keep `kit.ts`. Remove `web3`/`buffer-polyfill` subpaths only if the buffer polyfill is truly web3-compat-scoped — otherwise keep `buffer-polyfill`.
- [x] Remove `@solana/web3-compat` from `packages/vue/package.json`.

### Nuxt: cleanup

- [x] Delete web3-compat `optimizeDeps.include`/`needsInterop` entries in `packages/nuxt/src/module.ts` (web3.js transitive chain: `qrcode`, `bn.js`, `borsh`, `eventemitter3`, `rpc-websockets`, `@solana/buffer-layout`, …), keep/add Kit entries for the v2 dependencies (`@solana/kit`, `@solana/kit-plugin-rpc`, `@solana/kit-plugin-signer`, `@solana/kit-plugin-instruction-plan`, `@solana-program/system`, and `@solana-program/token{,2022}` if adopted).
- [x] Remove `./web3` runtime subpath; update `packages/nuxt/src/runtime/plugin.ts` and `runtime/web3.ts`. Update module auto-import list to the kit-first composable set.
- [x] Update `packages/nuxt/src/module.test.ts` to the new arrays; add a Kit sanity test (`useSolanaClient` auto-import resolves).
- [x] Remove `@solana/web3-compat` from `packages/nuxt/package.json`.
- [x] Remove the manual web3-compat `optimizeDeps` entries from `apps/docs/nuxt.config.ts`; switch `solana` config/usage in the docs app to the Kit path.

## Docs

### Migration guide page (new)

- [x] Create `apps/docs/content/guides/kit-migration.md` (English root). Content:
  - **Why:** web3-compat is superseded; broken TS metadata shims disappear in v2; Kit is Solana’s current + future API.
  - **Timeline:** v1.x dual support (what still works, what’s deprecated), v2.0.0 (what disappears).
  - **Migration map (before → after) table:** `Connection` → `client.rpc`/`useSolanaClient()`; `new Connection(url)` → `createSolanaRpc(url)` or `client.rpc`; `PublicKey` → `Address` (`address("...")`); `new PublicKey(s)` and `.toBase58()` → `address(s)` (base58 strings are already Kit `Address`-shaped); `Keypair`/`Keypair.generate()` → `generateKeyPairSigner()` (from `@solana/kit`) or the `@solana/kit-plugin-signer` variants (`signer`/`payer`/`identity`, `*FromFile`, `generated*`, `generated*WithSol`, `airdrop*`); `keypair.publicKey` → signer `.address`; `SystemProgram.transfer` → `getTransferSolInstruction` from `@solana-program/system`; `LAMPORTS_PER_SOL` math → `lamports()` from `@solana/kit`; `sendAndConfirmTransaction` → `client.sendTransaction([...])` (batch → `client.sendTransactions`) with `{ context: { signature } }`; devnet airdrop → `client.airdrop` (from `solanaDevnetRpc()`/`airdropSigner`); `Transaction`/`VersionedTransaction` → Kit instruction/message builders; `connection.getBalance` → `client.rpc.getBalance(...).send()` (returns lamports as `bigint`); `@solana/spl-token` helpers → `@solana-program/token` plugin reads; confirmation/status → `getSignatureStatuses`; wallet standard flows → Kit signer bridging. Note for readers: RPC numerics are `bigint` and account data is `Uint8Array` — no `Buffer`, and `JSON.stringify` on `bigint` throws.<br> Also add a **bridge note**: devs who want the classic class API during migration can run `@solana/web3.js@rc` (v3) — `PublicKey` is a deprecated alias of `Address` and a v3 `Keypair` structurally satisfies Kit’s `KeyPairSigner` — and point to the official [web3.js v1 → v3 migration guide](https://github.com/solana-foundation/solana-web3.js/blob/v3.x/docs/web3js-v1-to-v3-migration.md).
  - **Step-by-step upgrade for a Vue app** and a **Nuxt app** (both from v1.x legacy → v1.x kit → v2 API), with runnable snippets.
  - **Composable rename/change table** (e.g. `useConnection()` → `useSolanaClient()`; `useRpc()` meaning change in v2).
  - **Cleaning up after v2:** remove shims, remove web3-compat imports from consumer code, remove `buffer-polyfill` if only needed for web3-compat paths.
- [x] Mirror to `apps/docs/content/locales/{es,ko,zh}/guides/` (ko and zh updated during the v2 migration; es mirrors updated to the v2 content as well, including the `kit-migration` guide and the rewritten `getting-started`/`troubleshooting`/`roadmap` pages).
- [x] Add `/guides/kit-migration` (+ locale variants) to the sitemap in `apps/docs/nuxt.config.ts` and set `surroundOrder` in frontmatter consistent with the other guides.
- [x] Link the guide from Getting Started, Roadmap, and the F.A.Q./Troubleshooting page once v2 lands.

### Update existing docs

- [x] `apps/docs/content/getting-started.md`: remove the `@solana/web3-compat` broken-metadata note and the local-shim guidance once v2 ships (add a “not supported after v2 / see migration guide” pointer in the transition period).
- [x] `apps/docs/content/troubleshooting.md`: remove the “TypeScript Cannot Resolve `@solana/web3-compat`” and web3-compat Buffer sections; replace with Kit troubleshooting entries learned during implementation.
- [x] `apps/docs/content/index.md`, `concepts/solana-for-vue-developers.md`, `concepts/clusters.md`, `packages/{core,vue,nuxt}.md`: swap `Connection`/`PublicKey`/`web3` subpath language for `client.rpc`/`Address`/`kit` subpaths and document `useSolanaClient()`.
- [x] `apps/docs/content/roadmap.md`: add the Kit migration to “Post-v1 Plan” status once shipped. (No change needed — roadmap has no web3-compat references; the SPL line already says “built on the Kit client”.)

### Knowledge bundle and repo docs

- [x] Add a `knowledge-bundle/guides/kit-migration.md` entry (OKF format with `type`, `title`, `description`, `tags`, `timestamp`) summarizing the map above for AI agents; update `knowledge-bundle/index.md`.
- [x] Update `knowledge-bundle/packages/{core,vue,nuxt}.md` for new exports (`createSolanaClient`, `useSolanaClient`, `kit` subpaths, removal of `web3`/`connection`).
- [x] Update `AGENTS.md`: replace the web3-compat/shims section with the Kit-first state and reference this plan; note that leftover shims are gone.
- [x] Update `README.md` known-limitations if it still references the web3-compat metadata workaround.

## Rollout / Releases

- [x] Changesets per package per phase (`core`, `vue`, `nuxt`). Phase 1: minors. Phase 2: breaking majors coordinated in one release.
- [x] Phase 1 and Phase 2 land as separate PRs so the transition window is a real released version, giving docs/guide time to guide users before v2.
- [x] Before cutting v2, run a full standalone-consumer smoke (`pnpm smoke:standalone-installs`) and re-run the manual devnet testing steps from `knowledge-bundle/guides/getting-started.md` on the Kit path.
- [ ] Add versioned docs at v2: ship an archived v1 docs build under `/v1/` (branch-based static build) and keep `latest` at `/`, with a `v1 | latest` dropdown in the header and old-URL redirects. This is the first point where v1 (legacy) and v2 (Kit-only) docs genuinely diverge, so v1 users who haven't migrated can still read v1 docs. Do not build a full per-release versioning framework — two entries, two static builds.

## Acceptance Criteria

- v1.x: every v1.1.0 public API and the `web3` subpaths work unchanged (no breaking changes in the transition release).
- v1.x: `useSolanaClient().rpc.getSlot().send()` returns a slot against devnet with no shim and no config beyond context creation.
- v2: zero imports of `@solana/web3-compat` remain in `packages/*` (including tests, `module.ts`, package.json, build config).
- v2: `types/web3-compat.d.ts` and `packages/core/types/web3-compat.d.ts` are deleted; `prepare-declarations.mjs` no longer injects web3-compat references (buffer shim allowed).
- v2: no `@solana/web3.js` transitive `optimizeDeps` entries remain in the Nuxt module, its tests, or the docs app.
- After v2: `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm format`, `pnpm build:packages`, `pnpm smoke:standalone-installs` pass; Nuxt and Vue example apps run read/balance and a mock transaction flow end to end on the Kit path.
- Migration guide covers every renamed/removed legacy symbol with a working Kit replacement snippet.

## Open Questions

- **`useRpc()` semantics in v2:** keep the name but return Kit `client.rpc`, or introduce `useSolanaRpcApi()`/`useSolanaClient().rpc` and delete `useRpc()`? (Recommend: keep `useRpc()` returning Kit rpc; delete `useConnection()` only.)
- **Transaction sending in v1.x:** do we bridge Kit instructions into the legacy send flow (build with Kit, sign/send via legacy wallet) in the transition release, or defer all Kit sends to v2? (Recommend: defer; document the pattern in the guide.)
- **`@solana/kit-plugin-wallet`:** adopt it in v2 for wallet discovery/signing, or keep the custom Wallet Standard adapter and only adapt its output into a Kit `Signer`? (Recommend: keep the custom adapter in v2; it already handles iOS/deep-link sources that the plugin does not.)
- **`buffer-polyfill`:** keep or delete in v2 — only web3-compat transaction paths required it. (Recommend: delete if nothing else uses it, and remove the `buffer.d.ts` shim + `prepare-declarations.mjs` accordingly.)
