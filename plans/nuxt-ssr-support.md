# Nuxt SSR Support Plan

Tracks improving SSR support for `@vue-solana/nuxt`. This implements roadmap item 3, "Nuxt server RPC utilities" (`apps/docs/content/roadmap.md:18,51`), together with the smaller SSR correctness gaps found while auditing the module.

When a step is implemented, strike it through. When every step under a phase is done, leave only the checked phase title.

## Recommendation

Do **not** make the existing runtime plugin universal. The client-only plugin (`packages/nuxt/src/module.ts:109-114`) and the per-call inert fallback in `useSolana()` (`packages/vue/src/composables/useSolana.ts:15`) are correct: wallet state, discovery, prompts, and MWA/iOS deep links cannot be server-rendered.

Instead:

1. Keep wallet/composable semantics as they are, but give the server a context with the **configured** cluster and endpoints.
2. Add a server-only RPC utility so apps can fetch Solana data during SSR through a private runtime config, then hand it to the page with `useAsyncData`.
3. Close the SWR cross-request leak and add a real SSR render test.

## Context

- The module registers `runtime/plugin` with `mode: "client"` only. On the server `useSolana()` finds no provider and calls `createSsrContext()`, which hardcodes `cluster: "devnet"`, `endpoint: ""`, and `wsEndpoint: ""`. A mainnet-configured app therefore renders "devnet" on the server and flips after hydration.
- All data composables fetch from `onMounted()` (`packages/vue/src/composables/use-address-read.ts:87`, `useRequest.ts:208`), which never fires during SSR, so no RPC happens during server render today. That is why "inert SSR state" is accurate today except for the cluster fields.
- The SWR cache is a module-level `Map` (`packages/vue/src/swr.ts:51`). The source documents per-request namespacing as the caller's job; Nuxt ships no such integration, so one SSR request can seed another's cached result.
- `apps/docs` `/demo` and `examples/nuxt` are both `ssr: false`, and the docs app's only Solana composable usage is on `/demo`. Nothing in CI currently renders a Solana-using page on the server.
- The module already sanitizes `runtimeConfig.public.solana` (`module.ts:179-188`) and omits `payer` / `payerSecretKey` / `wallet` from `ModuleOptions`. Preserve that boundary; the new server utility reads a separate **private** config key.

## [x] Phase 1 — Accurate SSR state and coverage

Implemented:

- `packages/nuxt/src/runtime/server-plugin.ts` — registered by `module.ts` with `mode: "server"` for both plugin modes. Builds a fresh, request-scoped context with the configured cluster/endpoints and a real Kit client, inert wallet refs, no discovery/RPC check/bootstrap, plus the selected-wallet-account context so `useSelectedWalletAccount()` no longer throws on the server.
- `packages/nuxt/src/runtime/plugin-options.ts` — shared runtime sanitizer used by both plugins, replacing the client plugin's inline strip.
- SWR cache cleared once per request from the server plugin. No residual leak: server composables do not fetch (`onMounted` never fires), so renders do not write back to the cache.
- SSR coverage in `packages/nuxt/src/runtime/server-plugin.test.ts` (real `createSSRApp` + `renderToString`, config cluster, inert wallet state, fresh refs, cache clearing) and `packages/vue/src/composables/ssr-inert.test.ts` (no request/stream/polling during component SSR).
- Module unit + real-`loadNuxt` integration tests assert the server plugin is installed regardless of `clientPlugin`.
- Audit found all ten live-data/browser composables already inert during component SSR; no source guard was needed. Outside-component `!getCurrentInstance()` fallbacks still fetch immediately by design — that is a Node-script path, not Nuxt SSR.

Build entries: `src/runtime/server-plugin` was added to `packages/nuxt/build.config.ts`, `scripts/check-export-map.ts`, and `packages/core/src/export-map-docs.test.ts` (runtime plugins are registered by path string, so they need a build entry but no `exports` subpath).

## [ ] Phase 2 — `@vue-solana/nuxt/server` RPC utilities

The actual roadmap feature. Reads only; no wallet, no signing, no payer.

- [ ] New build entry `src/runtime/server.ts` and `exports["./server"]` in `packages/nuxt/package.json` (`types` → `./dist/runtime/server.d.ts`, `import` → `./dist/runtime/server.mjs`). `scripts/check-export-map.ts` derives the entry from the exports map, so no script change is needed; keep the existing `!dist/**/*.d.mts` tarball exclusion.
- [ ] Pure factory `createServerSolanaClient(config)` built on core `createSolanaClient()` / `createSolanaContext()`. Accept cluster/endpoint/wsEndpoint/commitment only; omit `payer`, `payerSecretKey`, and `wallet` from the option type and strip them at runtime if a plain object is passed.
- [ ] Nuxt-aware `useServerSolanaClient()` that reads a **private** `runtimeConfig.solanaServer` key. Declare that augmentation in the shipped module entry (same pattern as `module.ts:25-29`), with `import type {} from "nuxt/schema"` so it reaches `dist/module.d.ts`.
  - Do not merge `solanaServer` into `public.solana`.
  - Add a build-time check that fails fast if `payer`, `payerSecretKey`, or `wallet` appear in `runtimeConfig.public.solana` or on the module options, rather than relying on the current silent strip.
- [ ] Add unit tests for the factory (config resolution, field stripping) and for private/public config separation. Keep the test in `node` vitest environment if it touches Kit client construction.
- [ ] Do not add a dependency. Reuse `@vue-solana/core` subpaths through the existing `@vue-solana/vue` dependency; never add a granular `@solana/*` package.

## [ ] Phase 3 — Docs and adoption pattern

- [ ] English docs: add a "Server-side RPC / SSR" section to `apps/docs/content/packages/nuxt.md` and `apps/docs/content/guides/rpc-and-clusters.md`; update `getting-started.md` and `troubleshooting.md` where they currently say only "trigger RPC after hydration." Show the `useAsyncData` + `$fetch('/api/...')` + `useServerSolanaClient()` pattern and state clearly that wallet work stays client-side.
- [ ] Mirror every heading and code-fence change into `de`, `es`, `fr`, `ja`, `ko`, `zh` in the same change set. `packages/core/src/locale-docs.test.ts` gates heading levels/order; follow the existing locale style rules in `AGENTS.md` (accented Spanish/French, `/fr` and `/ja` link prefixes, no translated identifiers).
- [ ] Update the Nuxt package README export list and the agent skill's SSR guidance if it names the supported subpaths.
- [ ] Do not add a runnable `/demo` panel in `apps/docs` yet: that app is pinned to the published package version. Revisit after the next release pin bump.

## Acceptance Criteria

- A Nuxt page using `useRpc()` renders the configured cluster during SSR, not hardcoded `devnet`, and hydrates without a mismatch.
- Server-rendered Solana data can be produced through `@vue-solana/nuxt/server` with only private runtime config; no secret, payer, or wallet can reach the client bundle.
- The client runtime plugin remains client-only; no wallet discovery, prompt, deep-link callback, or RPC check runs on the server.
- Two sequential SSR renders do not share wallet state or SWR cache entries.
- `clientPlugin: false` apps still work and install one context per environment.
- The new subpath exists in the build config, `exports` map, and docs lists; all three packages keep identical ESM-only/`.d.ts` export conventions.
- Locale heading levels, order, and code-fence counts match English for every touched doc.

## Verification

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm build:examples
pnpm --filter docs build
pnpm check:entries
pnpm check:esm-map
pnpm check:buffer-polyfill-declarations
pnpm size:packages
pnpm smoke:standalone-installs
```

`pnpm test:e2e` is not required for the package/docs-only slices. Run it if an example server route or panel is added later.

## Rejected Alternatives

- **Make the runtime plugin universal** so all composables work identically on both sides. This would invite wallet prompts during SSR, reintroduce shared-state risks the current fallback was written to avoid, and provide little value because wallets are inherently client-side.
- **Make `useBalance()` / `useAccountInfo()` fetch during SSR** by replacing `onMounted()` with setup-time calls. Server data already has a correct path through the server utility and `useAsyncData`; changing composable timing adds hydration risk and a per-request client lifecycle problem for subscriptions.
- **Put a server RPC URL or API key in `runtimeConfig.public.solana`** and reuse the client client on the server. Public config is bundled to the browser; use the private `solanaServer` key instead.

## Out Of Scope

- No server-side signing, relayer, or `payerSecretKey` support in this plan. A future relayer feature gets its own plan with explicit security rules.
- No wallet state hydration, no server-rendered "connect wallet" UI, and no changes to `useWallet()` / `useWallets()` semantics.
- No example-app panel or e2e flow in the first slice.
- No changes to versioned docs, RPC failover, or advanced indexing.
