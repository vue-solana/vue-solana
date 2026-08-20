# SPL Token Account Helpers And Token Balance Composables

This plan adds SPL token support to `@vue-solana/core` and `@vue-solana/vue`, with Nuxt auto-imports. It follows the existing composable patterns (reactive addresses, `shallowRef` state, stale-response protection, `normalizeSolanaError`) and adds `@solana/spl-token` as a new dependency.

## [ ] Core: Add `@solana/spl-token` dependency and type re-exports

- Add `@solana/spl-token@^0.4.15` to `packages/core/package.json` dependencies.
- Create `packages/core/src/spl-token.ts`:
  - Re-export `TOKEN_PROGRAM_ID`, `TOKEN_2022_PROGRAM_ID` from `@solana/spl-token`.
  - Re-export the `Account` type as `TokenAccount` (alias for clarity).
  - Re-export the `Mint` type.
  - Re-export `AccountState` enum.
- Add `./spl-token` subpath export to `packages/core/package.json` exports map.
- Export from `packages/core/src/index.ts`.

## [ ] Core: Add SPL token helper functions

Create `packages/core/src/token-accounts.ts` with stateless helpers:

- `getTokenAccountsByOwner(connection, owner, options?)` — calls `connection.getTokenAccountsByOwner()` with `programId` filter (default: both TOKEN_PROGRAM_ID and TOKEN_2022_PROGRAM_ID), unpacks each result via `unpackAccount()`. Returns `TokenAccount[]`.
- `getTokenAccount(connection, address)` — fetches and unpacks a single token account via `getAccount()`. Returns `TokenAccount`.
- `getMint(connection, address)` — fetches and unpacks mint metadata via `getMint()`. Returns `Mint`.
- `getTokenBalance(connection, mint, owner)` — derives ATA via `getAssociatedTokenAddressSync()`, fetches the account, returns `{ amount: bigint, decimals: number }` by combining token account amount with mint decimals. Returns `null` if the ATA doesn't exist.
- All helpers use `normalizeSolanaError` for error paths.

Add `./token-accounts` subpath export to `packages/core/package.json`.

## [ ] Vue: Add `useTokenAccounts` composable

Create `packages/vue/src/composables/useTokenAccounts.ts`:

- **Parameters:** `owner: MaybeRefOrGetter<PublicKeyInput>`, `options?: UseTokenAccountsOptions`
- **Options:** `{ commitment?: Commitment; programId?: PublicKey; }` — optional filter by token program.
- **Return:** `{ tokenAccounts: ShallowRef<TokenAccount[]>; loading: ShallowRef<boolean>; error: ShallowRef<SolanaError | null>; refresh: () => Promise<TokenAccount[]> }`
- **Pattern:** Same as `useBalance` — `tryUseSolana()` fallback to `useConnection()`, `parsePublicKey()`, stale-response via `refreshId`, `normalizeSolanaError`, `onMounted` fetch, `watch` re-fetch on owner change.
- Add subpath export `./useTokenAccounts` to `packages/vue/package.json`.
- Export from `packages/vue/src/index.ts`.

## [ ] Vue: Add `useTokenBalance` composable

Create `packages/vue/src/composables/useTokenBalance.ts`:

- **Parameters:** `mint: MaybeRefOrGetter<PublicKeyInput>`, `owner: MaybeRefOrGetter<PublicKeyInput>`, `options?: UseTokenBalanceOptions`
- **Options:** `{ commitment?: Commitment; }`
- **Return:** `{ balance: ShallowRef<bigint | null>; decimals: ShallowRef<number | null>; loading: ShallowRef<boolean>; error: ShallowRef<SolanaError | null>; refresh: () => Promise<TokenBalanceResult | null> }`
- **Pattern:** Same stale-response and error patterns. Calls core `getTokenBalance()`. Returns `null` balance/decimals when ATA doesn't exist (not an error).
- Add subpath export `./useTokenBalance` to `packages/vue/package.json`.
- Export from `packages/vue/src/index.ts`.

## [ ] Nuxt: Add auto-imports

Add to `packages/nuxt/src/imports.ts`:

```ts
["useTokenAccounts", "useSolanaTokenAccounts"],
["useTokenBalance", "useSolanaTokenBalance"],
```

## [ ] Tests: Core token account helpers

Create `packages/core/src/token-accounts.test.ts`:

- Mock `connection.getTokenAccountsByOwner()`, `connection.getAccount()`, `connection.getMint()`.
- Test `getTokenAccountsByOwner` with valid owner, empty results, RPC failure.
- Test `getTokenAccount` with valid address, missing account, RPC failure.
- Test `getMint` with valid address, RPC failure.
- Test `getTokenBalance` with existing ATA, missing ATA (returns null), RPC failure.

## [ ] Tests: Vue composables

Create `packages/vue/src/composables/useTokenAccounts.test.ts`:

- Follow `useBalance.test.ts` pattern: `createMockSolanaContext`, `mountWithSolana`, `flushPromises`.
- Test: loads token accounts for owner, clears on null owner, stores and rethrows errors, stale response protection.

Create `packages/vue/src/composables/useTokenBalance.test.ts`:

- Test: loads balance for mint+owner, returns null for missing ATA, stores and rethrows errors, stale response protection, reactive mint/owner changes.

## [ ] Documentation

- Update `knowledge-bundle/packages/core.md` or create `knowledge-bundle/packages/spl-token.md` with API reference for core helpers.
- Update `knowledge-bundle/packages/vue.md` with composable docs.
- Update `knowledge-bundle/guides/getting-started.md` if token usage should be mentioned.
- Add changeset for `@vue-solana/core` (minor: new spl-token and token-accounts exports) and `@vue-solana/vue` (minor: new composables).

## Acceptance Criteria

- `pnpm typecheck` passes across all packages.
- `pnpm test` passes with new test files.
- `pnpm lint` and `pnpm format` pass.
- `pnpm build:packages` produces correct dist with new subpath exports.
- Both composables work with string addresses, `PublicKey` instances, refs, and getters.
- Null/invalid input fails predictably without spamming RPC.
- Nuxt auto-imports resolve as `useSolanaTokenAccounts()` and `useSolanaTokenBalance()`.
