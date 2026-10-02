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
- **Full Kit mirror:** `@vue-solana/core/kit`, `@vue-solana/vue/kit` and `@vue-solana/nuxt/kit` now `export *` from `@solana/kit` (bumped to `^8.4.0`) instead of a curated list, so every Kit value and type is available without depending on `@solana/kit` yourself. The root barrels of `@vue-solana/core` and `@vue-solana/vue` keep `@vue-solana/core`'s own `SolanaError`, `SolanaErrorCode`, `isSolanaError` and `TransactionStatus`, so `instanceof SolanaError` still matches every error these composables throw; the Kit originals stay reachable through the `kit` subpaths.
- **Read composables (`useBalance`, `useAccountInfo`, `useProgramAccounts`, `useTokenAccounts`, `useTokenBalance`):** now share `useAddressRead`, which changes three things:
  - `refresh()` returns `null` on an empty input instead of an empty value (`[]` for the list hooks), and **rethrows** a normalized `SolanaError` instead of resolving.
  - `data` resets to its empty value when a read fails. Previously the last successful value stayed visible after an error.
  - `useTokenBalance`'s `balance` and `decimals` are now `ComputedRef`s, so they are read-only. Read them; do not assign.
  - A malformed address passed to `useAccountInfo` now surfaces as an `INVALID_ADDRESS` `SolanaError` in `error` instead of resolving silently to `null`.
- **`useSubscription` / `useTrackedData` teardown:** re-opening a connection (including a same-source `reconnect()` and a `useTrackedData` `refresh()`) now tears the previous one down first. Subscriptions are no longer orphaned, and `useTrackedData` no longer leaves an abandoned subscription window open.
