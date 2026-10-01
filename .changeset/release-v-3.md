---
"@vue-solana/core": major
"@vue-solana/vue": major
"@vue-solana/nuxt": major
---

refactor!: publish ESM only and deduplicate the composable state machines

- **ESM only:** drop `emitCJS` and every `require` export condition. Remove top-level `main`. This is a breaking change for CommonJS consumers; ESM remains the same.
- **State machine dedup:** add private helpers `useAddressRead`, `useExecution`, and `client-action` to extract the duplicated logic across read composables, wallet actions, and client-capability actions.
- **`useRequest` test env constraint:** the shared read helper does not use `useRequest` because Kit's `createReactiveActionStore` touches Node's `AbortSignal` internals and fails in jsdom/happy-dom; the local helper preserves existing behavior and test coverage.
- **swc/swr + useTrackedData:** replace the hand-rolled `ReactiveActionSource` with Kit's `createReactiveActionStore`, collapse `swr` cache wrappers into `useSwrKeyed`, and trim disposables.
- **package size:** 1.61 MB → 980 KB (-43%). Dependencies removed: `@vitest/coverage-v8`, `vue-router` (example), `@nuxt/image`, `@nuxtjs/mdc`.
- **Full Kit mirror:** `@vue-solana/core/kit`, `@vue-solana/vue/kit` and `@vue-solana/nuxt/kit` now `export *` from `@solana/kit` (bumped to `^8.4.0`) instead of a curated list, so every Kit value and type is available without depending on `@solana/kit` yourself. The root barrels keep their own `SolanaError`, `SolanaErrorCode`, `isSolanaError` and `TransactionStatus`; the Kit originals stay reachable through the `kit` subpaths.
