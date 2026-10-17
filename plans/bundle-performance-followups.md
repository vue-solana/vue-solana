# Bundle Performance Follow-Ups

Tracks Phase 4 items intentionally left out of `package-improvements-plan.md`, grouped so they are revisited when bundle evidence or a prerequisite change justifies the risk.

## Deferred items

### iOS wallet adapter lazy-loading

Status: deferred (blocked on the async `tweetnacl` decision above).

Trigger for revisit:

- A release candidate shows the iOS wallet code path regressing the vue initial chunk, or
- An accepted change makes `getSharedSecret` / `encryptPayload` / `decryptPayload` / `createRequestId` async.

Scope if attempted:

- Convert the static `@vue-solana/core/ios-wallet` import in `packages/vue/src/plugin/wallet-registry.ts` into a cached dynamic import.
- Split sync-only work (`handleSolanaIosWalletCallback` for deep-link intake) from the async pieces so bootstrap callback handling does not race.
- Keep `options.iosWallet === false` and non-iOS user agents on a zero-cost path.

Current decision:

- Stay static; ~24 KB is not worth the async cascade until the tweetnacl deferral is lifted.

### Async tweetnacl ECDH (32 KB in initial chunk)

Status: deferred (open in AGENTS.md / package-improvements-plan.md deferred scope).

Trigger for revisit:

- A new Kit/Wallet Standard API provides asynchronous equivalents of `box.before/after/open`, or
- The iOS wallet flow can be moved entirely to Wallet Standard and crypto helpers removed.

Why deferred:

- `crypto.ts` is imported synchronously by `getSolanaIosWallets`, `handleSolanaIosWalletCallback`, `createPendingRequest`, and `launchConnect`; making it async cascades into plugin bootstrap.

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

Open next step:

- Add per-file byte budgets and decide whether vue/nuxt lean subpaths also need guards.

## Verification ownership

- `pnpm format`, `pnpm lint`, `pnpm test`, `pnpm typecheck`
- `pnpm build:packages`, `pnpm build:examples`, `pnpm --filter docs build`
- `pnpm smoke:standalone-installs`
- `pnpm size:packages`
- `pnpm test:e2e` (mocks)

Owner: next maintainer touching bundle/perf work.
