---
type: Concept
title: @solana/web3-compat TypeScript Workaround
description: How to resolve the broken @solana/web3-compat TypeScript metadata issue with temporary declaration shims.
tags:
  - typescript
  - web3-compat
  - workaround
  - troubleshooting
resource: https://github.com/vue-solana/vue-solana
timestamp: 2025-07-17T00:00:00Z
---

# @solana/web3-compat TypeScript Workaround

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Runtime imports still use the real package. Current Vue Solana packages publish temporary package-owned declaration shims, so the documented imports from `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt` should typecheck without a consumer-local shim.

If TypeScript still reports missing declarations, first confirm that you are using a current Vue Solana package version and are not importing `@solana/web3-compat` directly from app code. For older Vue Solana versions or direct `@solana/web3-compat` imports, add `types/web3-compat.d.ts` to your app:

```ts
declare module "@solana/web3-compat" {
  export type {
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    TransactionSignature,
  } from "@solana/web3.js";
  export {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
    VersionedTransaction,
  } from "@solana/web3.js";
}
```

Make sure your `tsconfig.json` includes the file:

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "types/**/*.d.ts"]
}
```

Re-check new `@solana/web3-compat` versions before keeping this workaround. The package-owned shim should be removed once upstream ships valid root declarations.

## Related

- [Troubleshooting](../guides/troubleshooting.md)
