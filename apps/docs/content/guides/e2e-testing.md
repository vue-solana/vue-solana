---
title: "E2E Testing"
description: Run the Playwright e2e suite and mock Solana RPC, RPC subscriptions, and wallets for UI tests.
ogSection: Guides
surroundOrder: 14
---

The repository's example apps are covered by a Playwright suite in `e2e/`. The suite runs the built Vue Vite and Nuxt example apps against deterministic RPC mocks by default, and against real devnet in a separate integration run.

Use this guide when you add example-app features, change composable behavior that is visible in the examples, or want to mock Solana RPC in your own Playwright tests.

## Running The Suite

```sh
# Build the packages and both example apps, then run Playwright.
pnpm test:e2e

# Integration run against real devnet (no RPC mocks).
pnpm test:e2e:integration

# Install the Chromium browser binary once.
pnpm test:e2e:install
```

The Playwright config starts both example preview servers automatically (`reuseExistingServer` is enabled outside CI, so a server you started manually is reused).

## Mock Modes

| Mode        | Command                     | RPC                       | RPC subscriptions            | Wallets                                    |
| ----------- | --------------------------- | ------------------------- | ---------------------------- | ------------------------------------------ |
| Default     | `pnpm test:e2e`             | Mocked (`e2e/helpers.ts`) | Mocked over a fake websocket | Mock Wallet Standard wallets               |
| Integration | `pnpm test:e2e:integration` | Real devnet               | Real devnet                  | Real installed wallets (wallet specs skip) |

Specs that assert against mock data skip themselves under `E2E_REAL_RPC=true` with `test.skip(isRealRpcRun(), ...)`, so the same spec files run in both modes.

## Mocking The HTTP RPC

`mockSolanaRpc(page)` routes `https://api.devnet.solana.com/**` and answers known methods deterministically:

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

Handled methods: `getLatestBlockhash`, `getBalance`, `getVersion`, `getAccountInfo`, and `getHealth`. Unknown methods return `{ jsonrpc: "2.0", id, result: null }`. CORS preflight (`OPTIONS`) is answered with `204`.

When you add an RPC call to an example app, add the method to `createRpcResponse()` in `e2e/helpers.ts`. Keep numeric values as JSON-safe values (`rentEpoch` is passed as a string because the real `u64::MAX` exceeds JavaScript's safe integer range).

## Mocking RPC Subscriptions Over Websocket

`mockSolanaSubscriptions(page)` extends the HTTP mock with a fake `wss://api.devnet.solana.com/**` endpoint implementing the JSON-RPC subscription protocol that `@solana/kit` speaks:

1. The client sends `{ jsonrpc, id, method: "<method>Subscribe", params }`.
2. The server answers `{ jsonrpc, id, result: <subscriptionId> }`.
3. Updates arrive as `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }`. Kit demultiplexes on `params.subscription` and transforms `params.result`.
4. Kit sends `{ method: "ping" }` keepalives without an `id`; the mock ignores them.

The function resolves to a harness for driving notifications from a test:

```ts
import { mockSolanaSubscriptions } from "./helpers";

test("live data", async ({ page }) => {
  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // Assert the seeded value, then push an update.
  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  subscriptions.pushSlotNotification(24_042, 24_040);

  // How many sockets currently hold at least one subscription.
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);
});
```

- `pushAccountNotification(lamports, slot)` sends an `accountNotification` with a `{ context: { slot }, value: { lamports, data, ... } }` payload (the `accountNotifications` shape) to every open account subscription.
- `pushSlotNotification(slot, root)` sends a `slotNotification` with `{ slot, root, parent }` to every open slot subscription.
- `slotSubscribe` requests also receive one immediate notification so `useSubscription` has data without test-driven pushes.

The wire format is load-bearing: if `@solana/kit` changes its demultiplexing, the subscription-backed specs (slot and account notification updates) fail, which is the intended early-warning signal.

## Mocking Wallet Standard Wallets

The example spec defines a spec-local `registerMockWallets(page)` helper (in `e2e/example-apps.spec.ts`, not exported from `e2e/helpers.ts`) that injects two Wallet Standard wallets via `page.addInitScript` before the app boots:

- **Mock Signer Wallet** — supports `standard:connect`, `standard:disconnect`, `standard:events`, `solana:signMessage`, and `solana:signIn` (SIWS). `signMessage` returns the signature bytes `[1..8]`; `signIn` returns a fixed account, message, and signature.
- **Mock Readonly Wallet** — supports connect/disconnect/events only, for asserting unsupported-capability UI.

The wallets self-register both ways Wallet Standard expects: they listen for `wallet-standard:app-ready` (to register into the app) and dispatch `wallet-standard:register-wallet` (for apps initialized first).

## Assertions To Copy

- Wrap flows in `expectNoPageErrors(page, run)` from `e2e/helpers.ts` to fail on any `pageerror` or `console.error` during the flow.
- Prefer `data-testid` handles (`getByTestId`) over text or role selectors for the example apps' stable surfaces.
- For SWR semantics, assert both phases: the stale cached value appears immediately after remount, then the revalidated value replaces it.
