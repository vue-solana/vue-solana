---
"@vue-solana/core": minor
"@vue-solana/vue": minor
"@vue-solana/nuxt": minor
---

Verify `signMessage` and `signIn` wallet results against the account's public key
before resolving.

A Wallet Standard wallet can return a signature over different bytes than the
message it was handed, or a signature made by a different key than the account it
reported. The adapter now checks both before `signMessage()` / `signIn()` resolve
and rejects a mismatch with a new `SolanaError` code, `INVALID_SIGNATURE` (a
malformed signature is reported with the same code).

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";

const { execute, error } = useSignMessage();
await execute(message);

if (error.value?.code === "INVALID_SIGNATURE") {
  // The wallet's signature did not match the account or the signed bytes.
}
```

Details:

- The check uses Kit 8.5's `verifySignature()` and runs against the account's
  **public key bytes**, so it makes no assumption about the address matching the
  key (custom adapters can report whichever address they like).
- It is best-effort and degrades gracefully: where Ed25519 is unavailable in the
  WebCrypto API (older Safari, insecure contexts, non-browser runtimes), the key
  import fails and the result resolves unverified rather than rejecting a wallet
  the user already approved.
- It only covers message signing and SIWS. Transaction signatures are not
  verified client-side; Kit does not verify those either.
- **Server-side verification is still mandatory.** This is a client-side
  defense-in-depth guard against a misbehaving wallet, not an authentication
  boundary.

Nothing changes for wallets and environments that already return a correct
signature, and no new dependency is added.
