export * from "./action";
export * from "./clusters";
export * from "./address";
export * from "./errors";
export * from "./ios-wallet";
export * from "./kit";
export * from "./mobile-wallet";
export * from "./rpc";
export * from "./token-accounts";
export * from "./transaction";
export * from "./timeout";
export * from "./types";
export * from "./wallet";
export * from "./wallet-standard";

// `./buffer-polyfill` is deliberately NOT re-exported here. It does
// `export { Buffer } from "buffer/"`, and `buffer/index.js` has module-level
// side effects, so the root barrel pinned the Node Buffer polyfill into the
// initial chunk of every consumer — 27 KB minified of the 145 KB a bare
// `import { createSolanaClient } from "@vue-solana/core"` cost. Only apps that
// serialize transactions in a browser pay it, and they reach it through the
// documented `@vue-solana/core/buffer-polyfill` subpath (mirrored by
// `@vue-solana/vue/buffer-polyfill` and `@vue-solana/nuxt/buffer-polyfill`).

// `./kit` mirrors all of `@solana/kit`, and Kit exports these four names too.
// Two `export *` providing the same name is ambiguous, and the name would be
// dropped from this barrel entirely, so resolve it explicitly: an explicit
// export wins over every star export. These are this package's own types —
// the Kit originals are reachable through `@vue-solana/core/kit`.
export { SolanaError, isSolanaError } from "./errors";
export type { SolanaErrorCode } from "./errors";
export type { TransactionStatus } from "./types";
