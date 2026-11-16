# Bundle Performance Follow-Ups

Tracks Phase 4 items intentionally left out of the 2026-10-06 audit plan (now archived at [`plans/archived/package-improvements-phases-1-8.md`](./archived/package-improvements-phases-1-8.md)), grouped so they are revisited when bundle evidence or a prerequisite change justifies the risk.

## Recommendation

- **Prioritize as a focused follow-up:** [iOS wallet adapter lazy-loading](#ios-wallet-adapter-lazy-loading). It is the only item here with a strong, measured user-facing payoff (~58% of the eager `createSolanaPlugin` chunk) and a feasible non-breaking path.
- **Do not implement now:** [Bare package names in Nuxt optimize-deps](#bare-package-names-in-nuxt-optimize-deps) and [Further OOM investigation on Vue build](#further-oom-investigation-on-vue-build) have no current correctness/user-value justification.
- **Treat as subsumed/low priority:** [Async tweetnacl ECDH](#async-tweetnacl-ecdh-329-kb-in-initial-chunk) is mostly covered by the iOS lazy-loading work; [Standalone dynamic size threshold](#standalone-dynamic-size-threshold) is already largely guarded and only has a small hygiene follow-up.

## Deferred items

### iOS wallet adapter lazy-loading

Status: **recommended / prioritized** (re-measured 2026-10-21; blocker narrowed to one function). Still deferred from drive-by work, but this is the only item in this plan with a clear, measured bundle-size payoff worth scheduling as a focused change.

Measured cost (esbuild, built `exports` map, splitting on, `vue` external):

- Eager chunk for `import { createSolanaPlugin } from "@vue-solana/vue"`: 67.4 KB minified.
- `tweetnacl/nacl-fast.js`: 32.9 KB (49%), `ios-wallet/*` glue: 12.2 KB — ~38.9 KB removable (58%).
- The 99.8 KB mobile-wallet/qrcode chunk is already split, so the Phase 4 lazy fix holds.

Why worth implementing:

- Directly reduces initial bundle/startup cost for the common `createSolanaPlugin` path, including apps that never use the iOS deep-link callback flow.
- A non-breaking implementation path exists (no core major required), and the remaining constraint is isolated to one public synchronous function.

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

- Implement as a **dedicated, well-tested change set** (not a drive-by). The blocker is understood and the win is large (~58% of the eager chunk), but the change touches bootstrap ordering and deep-link return handling, so it needs targeted coverage for plugin bootstrap and iOS callback/deep-link flows. `pnpm size:packages` walks every `packages/vue/dist/*.mjs` static graph and reports the iOS weight, so this cannot regress unnoticed while waiting.

### Async tweetnacl ECDH (32.9 KB in initial chunk)

Status: **deferred / mostly subsumed** by [iOS wallet adapter lazy-loading](#ios-wallet-adapter-lazy-loading). Not worth implementing as a standalone item now.

Rationale:

- Only `handleSolanaIosWalletCallback` genuinely requires synchronous `tweetnacl`; the rest of `crypto.ts` can move behind async loading as part of the lazy-loading design above.
- Pursuing async ECDH independently would add complexity/cascade risk without delivering more value than the focused lazy-loading refactor.

Trigger for revisit:

- A new Kit/Wallet Standard API provides asynchronous equivalents of `box.before/after/open`, or
- The iOS wallet flow can be moved entirely to Wallet Standard and crypto helpers removed.

### Bare package names in Nuxt optimize-deps

Status: **deferred / not worth implementing now** (preference, not a correctness gap).

Rationale:

- Current `a > b > c` chains intentionally target the exact transitive copy to avoid duplicate Kit/dependency versions (important given the repo’s strict single-`@solana/kit` copy discipline).
- Switching to bare specifiers is churn without a demonstrated correctness or user-facing benefit.

Trigger for revisit:

- Vite/Nuxt changes in how pnpm peer dependencies are optimized, or
- A test proving bare specifiers resolve the same copy as the current chains.

### Further OOM investigation on Vue build

Status: **deferred / not worth implementing now** (pin retained after reproduction).

Rationale:

- There is no current actionable pressure (no need to remove the Node memory pin and no evidence the declaration graph is exceeding headroom).
- Investigation work is speculative until CI constraints or build-graph growth create a concrete problem.

Trigger for revisit:

- CI has pressure to remove the Node memory pin, or
- The declaration graph grows enough to exceed 8 GB.

Candidate experiments (if triggered):

- lower declaration concurrency,
- reduce unbuild entry count,
- verify whether the Kit mirror declarations are the dominant heap consumer.

### Standalone dynamic size threshold

Status: **partially implemented / low-priority follow-up**.

Implemented:

- `pnpm size:packages` guards lean core entries (`address`, `errors`, `timeout`, `clusters`, `types`) against heavy edges.
- It also walks every `packages/vue/dist/*.mjs` static import graph: `@vue-solana/core/mobile-wallet`, `qrcode`, `@solana-mobile/*`, `buffer`, and `@vue-solana/core/buffer-polyfill` must stay behind dynamic imports or the dedicated subpath, no composable subpath may reach `@vue-solana/core/ios-wallet`/`tweetnacl`, and the root entry's known iOS debt is measured and printed. Dynamic `import()` edges are ignored on purpose.

Open next step (optional hygiene):

- Decide whether Nuxt runtime entries need the same graph walk. This is low urgency because Nuxt runtime entries import the Vue plugin and the current Vue check already covers the client surface today; do it opportunistically when touching Nuxt/runtime bundle checks, not as a standalone perf task.

## Verification ownership

- `pnpm format`, `pnpm lint`, `pnpm test`, `pnpm typecheck`
- `pnpm build:packages`, `pnpm build:examples`, `pnpm --filter docs build`
- `pnpm smoke:standalone-installs`
- `pnpm size:packages`
- `pnpm test:e2e` (mocks)

Owner: next maintainer touching bundle/perf work.
