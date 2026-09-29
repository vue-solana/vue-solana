/**
 * The published packages do not re-export this type from a subpath this app can
 * reach — `@vue-solana/nuxt` 2.4.0 has no root type exports, and a direct
 * `@vue-solana/core/types` import does not resolve here because `@vue-solana/core`
 * is not a dependency of the docs app. Deriving it from the auto-imported
 * `useSolanaWallets()` keeps the real type: the composable's own declarations
 * resolve `@vue-solana/core/types` from their sibling in the pnpm store, so the
 * chain is fully typed rather than `any`.
 *
 * Delete this file once `@vue-solana/nuxt` re-exports the public types from its
 * root; both importers then import `SolanaWalletInfo` from `@vue-solana/nuxt`.
 */
export type SolanaWalletInfo = NonNullable<
  ReturnType<typeof useSolanaWallets>["selectedWallet"]["value"]
>;
