export * from "./action";
export * from "./clusters";
export * from "./address";
export * from "./errors";
export * from "./kit";
export * from "./rpc";
export * from "./token-accounts";
export * from "./transaction";
export * from "./timeout";
export * from "./types";
export * from "./wallet";
export * from "./wallet-standard";
export * from "./solana-pay";
export * from "./solana-pay-confirmation";
export * from "./solana-pay-status";

// `./buffer-polyfill` is deliberately NOT re-exported here. It does
// `export { Buffer } from "buffer/"`, and `buffer/index.js` has module-level
// side effects, so the root barrel pinned the Node Buffer polyfill into the
// initial chunk of every consumer — 27 KB minified of the 145 KB a bare
// `import { createSolanaClient } from "@vue-solana/core"` cost. Only apps that
// serialize transactions in a browser pay it, and they reach it through the
// documented `@vue-solana/core/buffer-polyfill` subpath (mirrored by
// `@vue-solana/vue/buffer-polyfill` and `@vue-solana/nuxt/buffer-polyfill`).

// `./ios-wallet` and `./mobile-wallet` are deliberately NOT re-exported here.
// `ios-wallet/deep-links.ts` pulls `crypto.ts`, whose static `tweetnacl`
// import keeps ~32 KB in the chunk, and `mobile-wallet.ts` statically imports
// `@solana-mobile/wallet-standard-mobile` (~98 KB with its protocol graph).
// Only apps that use those wallets pay for them, through the documented
// `@vue-solana/core/ios-wallet` and `@vue-solana/core/mobile-wallet` subpaths.
// The dependency-free `isSolanaMobileWalletSupported()` gate stays available
// through `@vue-solana/core/mobile-wallet-support`, which core's own exports
// map documents.

// `./kit` mirrors all of `@solana/kit`, and Kit exports these four names too.
// Two `export *` providing the same name is ambiguous, and the name would be
// dropped from this barrel entirely, so resolve it explicitly: an explicit
// export wins over every star export. These are this package's own types —
// the Kit originals are reachable through `@vue-solana/core/kit`.
export { SolanaError, isSolanaError } from "./errors";
export type { SolanaErrorCode } from "./errors";
export type { TransactionStatus } from "./types";

// Colliding-name procedure: when `@solana/kit` gains another export whose name
// also exists in this package's `errors`/`types`, add it to this explicit list
// (so it resolves to our own instead of vanishing) AND to the explicit-reexport
// list guarded by `src/kit-mirror.test.ts`, then run the kit-mirror tests.
// The full resolver logic lives in `src/kit.ts`'s `export * from "@solana/kit"` mirror.

// `./action` defines its own deprecated `isAbortError` alias (core's public
// name), which shadows the `isAbortError` exported by `./kit` via `export *`.
// Resolve it explicitly so the root barrel exposes core's deprecated alias
// rather than Kit's function. Kit's original stays reachable through
// `@vue-solana/core/kit`.
export { isAbortError } from "./action";
