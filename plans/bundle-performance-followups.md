# Bundle Performance Follow-Ups

Tracks Phase 4 items intentionally left out of `package-improvements-plan.md`, grouped so they are revisited when bundle evidence or a prerequisite change justifies the risk.

## Deferred items

### iOS wallet adapter lazy-loading

Status: deferred (re-measured 2026-10-21; blocker narrowed to one function).

Measured cost (esbuild, built `exports` map, splitting on, `vue` external):

- Eager chunk for `import { createSolanaPlugin } from "@vue-solana/vue"`: 67.4 KB minified.
- `tweetnacl/nacl-fast.js`: 32.9 KB (49%), `ios-wallet/*` glue: 12.2 KB — ~38.9 KB removable (58%).
- The 99.8 KB mobile-wallet/qrcode chunk is already split, so the Phase 4 lazy fix holds.

Blockers, corrected (the earlier "four sync entry points" list was wrong):

- `getSolanaIosWallets` / `createPendingRequest` — only reach crypto through `createRequestId()`'s `nacl.randomBytes(16)`; `crypto.getRandomValues` removes the edge and discovery stays synchronous.
- `launchConnect` — internal only, single caller inside `async connect()`; safe to `await`.
- `handleSolanaIosWalletCallback` — public, documented as synchronous, genuinely needs `box.before`/`box.open.after`. This is the only real constraint, and it does not block a non-breaking design.

Scope if attempted (non-breaking, no core major):

- WebCrypto request ids, so the discovery path stops importing `crypto.ts`.
- `await import("./deep-links")` / `import("./callback")` inside the adapter's async `connect`/sign methods.
- New crypto-free core entry (e.g. `@vue-solana/core/ios-wallet-discovery`) = adapter + browser + definitions + storage + types, imported by `wallet-registry.ts`.
- Gated dynamic import of the full entry for deep-link intake (`hasIosWalletCallbackParams`) plus a generation-guarded second `refreshWallets()` pass; keep `options.iosWallet === false` and non-iOS agents on the zero-cost path.
- Removing the `IOS_DEBT_*` exemptions in `scripts/check-lean-imports.mjs` is the definition of done; the check then forbids the edge.

Current decision:

- Stay static for now. The blocker is understood and the win is large (~58% of the eager chunk), but the change touches bootstrap ordering, so it wants its own change set with deep-link-return tests rather than a drive-by. `pnpm size:packages` now walks every `packages/vue/dist/*.mjs` static graph and reports the iOS weight, so this cannot regress unnoticed.

### Async tweetnacl ECDH (32.9 KB in initial chunk)

Status: deferred, and now mostly unnecessary — see the iOS lazy-loading entry above. Only `handleSolanaIosWalletCallback` actually needs a synchronous `tweetnacl`; the rest of `crypto.ts` can load on demand through the adapter's async methods.

Trigger for revisit:

- A new Kit/Wallet Standard API provides asynchronous equivalents of `box.before/after/open`, or
- The iOS wallet flow can be moved entirely to Wallet Standard and crypto helpers removed.

Why deferred:

- `crypto.ts` is imported synchronously by the public `handleSolanaIosWalletCallback`, which the plugin runs during bootstrap. Making it async cascades into `refreshWallets()`; the thin-entry + gated-import design above avoids that cascade without changing the public signature.

### Bare package names in Nuxt optimize-deps

Status: deferred (preference, not a correctness gap).

Trigger for revisit:

- Vite/Nuxt changes in how pnpm peer dependencies are optimized, or
- A test proving bare specifiers resolve the same copy as the current chains.

Current decision:

- Keep `a > b > c` chains to target the exact transitive copy and avoid duplicate Kit/dependency versions.

### Further OOM investigation on Vue build

Status: deferred (pin retained after reproduction).

Trigger for revisit:

- CI has pressure to remove Node memory pin, or
- The declaration graph grows enough to exceed 8 GB.

Candidate experiments:

- lower declaration concurrency,
- reduce unbuild entry count,
- verify whether the Kit mirror declarations are the dominant heap consumer.

### Standalone dynamic size threshold

Status: partially implemented.

Implemented:

- `pnpm size:packages` guards lean core entries (`address`, `errors`, `timeout`, `clusters`, `types`) against heavy edges.
- It also walks every `packages/vue/dist/*.mjs` static import graph: `@vue-solana/core/mobile-wallet`, `qrcode`, `@solana-mobile/*`, `buffer`, and `@vue-solana/core/buffer-polyfill` must stay behind dynamic imports or the dedicated subpath, no composable subpath may reach `@vue-solana/core/ios-wallet`/`tweetnacl`, and the root entry's known iOS debt is measured and printed. Dynamic `import()` edges are ignored on purpose.

Open next step:

- Decide whether nuxt runtime entries need the same graph walk (they import the vue plugin, so the vue check covers the client surface today).

## Verification ownership

- `pnpm format`, `pnpm lint`, `pnpm test`, `pnpm typecheck`
- `pnpm build:packages`, `pnpm build:examples`, `pnpm --filter docs build`
- `pnpm smoke:standalone-installs`
- `pnpm size:packages`
- `pnpm test:e2e` (mocks)

Owner: next maintainer touching bundle/perf work.
