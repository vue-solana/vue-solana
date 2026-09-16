---
type: Concept
title: "@solana/web3-compat TypeScript Workaround (v1)"
description: "Historical v1.x guidance for the broken @solana/web3-compat TypeScript metadata. Superseded by v2.0.0, which removes web3-compat entirely."
tags:
  - typescript
  - web3-compat
  - workaround
  - troubleshooting
  - archived
resource: https://github.com/vue-solana/vue-solana
timestamp: 2025-07-17T00:00:00Z
---

# @solana/web3-compat TypeScript Workaround

> **Archived.** Vue Solana v2.0.0 removed `@solana/web3-compat` everywhere and deleted the `web3` subpaths. This page only applies to apps on the v1.x package line. Upgrade to `@vue-solana/*@^2` and remove any local shim — see [Kit Migration](../guides/kit-migration.md).

`@solana/web3-compat@0.0.21` had broken TypeScript metadata. Runtime imports still used the real package. v1.x Vue Solana packages published temporary package-owned declaration shims, so the documented imports from `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt` typechecked without a consumer-local shim.

For older v1 Vue Solana versions or direct `@solana/web3-compat` imports, apps could add `types/web3-compat.d.ts`:

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

Upgrading to `@vue-solana/*@^2` removes the need for any shim.

## Related

- [Troubleshooting](../guides/troubleshooting.md)
- [Kit Migration](../guides/kit-migration.md)
