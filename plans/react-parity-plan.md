# React Feature Parity Plan

Tracks closing the feature gap against `@solana/react` (as of its published docs). When a plan item is implemented, strike it through. When every item under a feature is done, remove the items and leave only the checked feature title.

Priority labels, highest first:

- **P0** — Foundational. Unblocks several other plans and is broadly demanded. Implement first.
- **P1** — High value, commonly needed, medium effort.
- **P2** — Nice to have, niche or low-demand, implement after P0/P1.

| Feature                     | Priority | Depends on                       |
| --------------------------- | -------- | -------------------------------- |
| `useAction`                 | P0       | —                                |
| `useRequest`                | P0       | `useAction`                      |
| `useSubscription`           | P0       | —                                |
| `useTrackedData`            | P1       | `useRequest` + `useSubscription` |
| `useClientCapability`       | P2       | —                                |
| `useSignIn` (SIWS)          | P1       | —                                |
| Wallet selection provider   | P1       | `useWallets`                     |
| `usePayer` / `useIdentity`  | P2       | —                                |
| Batch transaction sign/send | P1       | —                                |
| Transaction planning        | P2       | —                                |
| Cache adapters (SWR)        | P2       | `useRequest` + `useSubscription` |

- [x] P0 — `useAction`
- [x] P0 — `useRequest`
- [x] P0 — `useSubscription`
- [x] P1 — `useTrackedData`
- [x] P1 — `useSignIn` (Sign In With Solana)
- [x] P1 — Wallet Selection Provider
- [x] P1 — Batch Transaction Sign/Send
- [x] P2 — `useClientCapability`
- [x] P2 — `usePayer` / `useIdentity`
- [x] P2 — Transaction Planning
- [x] P2 — Cache Adapters (SWR; Vue Query adapter not implemented)
