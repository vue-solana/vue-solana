# Solana Pay QR Implementation Plan

This document tracks the implementation plan for QR code scanning and Solana Pay support. It is separate from the roadmap because Solana Pay can ship independently of the stabilization work.

The goal is to support Solana Pay payment QR flows in `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt` without splitting the existing wallet API. Payment sending should continue to use the unified `useWallets()`, `useWallet()`, and `useSignAndSendTransaction()` flow.

Solana Pay references:

- https://solana.com/docs/payments/accept-payments/solana-pay (Commerce Kit)
- https://solana.com/docs/tools/solana-pay
- Official package: `@solana-commerce/solana-pay` (compatible with `@solana/kit`)
- Legacy spec: https://docs.solanapay.com/spec

The official Commerce Kit already provides `encodeURL`, `parseURL`, `createTransfer`, `createQR`, and `createStyledQRCode`, all Kit-compatible. We should depend on it rather than reimplementing the spec, and expose its capabilities through our packages.

## Scope

Initial scope:

- Generate Solana Pay transfer request URLs for SOL and SPL token payments.
- Render generated payment request URLs as QR codes.
- Scan QR codes in browser-based Vue and Nuxt apps.
- Parse scanned Solana Pay transfer request URLs into safe, typed data.
- Confirm payment settlement on-chain using unique `reference` values.

Deferred scope:

- Solana Pay transaction request URLs, because they require HTTPS GET/POST handling and stricter transaction validation.
- Point-of-sale inventory, order management, receipt generation, refunds, subscriptions, and merchant dashboards.
- Mainnet-specific examples beyond documented opt-in configuration and security notes.

## Design Principles

- Keep Solana Pay URL parsing and validation in `@vue-solana/core` so it is framework-agnostic.
- Keep camera, QR rendering, and browser APIs in `@vue-solana/vue` so core remains DOM-free.
- Keep Nuxt integration as auto-imports and client-only runtime behavior; avoid server-side camera or `window` assumptions.
- Treat scanned QR content, RPC responses, and on-chain data as untrusted input.
- Require an explicit user confirmation step before signing or sending any scanned payment transaction.
- Confirm settlement by querying Solana RPC, not by trusting scanner callbacks or wallet UI state.

## Phase 1: Core Solana Pay Transfer Primitives (completed)

Status: done (via `@solana-commerce/solana-pay` re-export).

Tasks:

- [x] Add Solana Pay transfer request types in `@vue-solana/core` (via official package).
- [x] Add `createSolanaPayTransferUrl(input)` for SOL and SPL token transfer requests (official `encodeURL`/`encodeTransferRequestURL`).
- [x] Add `parseSolanaPayUrl(value)` for validating and parsing transfer request URLs (official `parseURL`).
- [x] Add `isSolanaPayUrl(value)` as a lightweight guard for scanner output (official `parseURL` + guard).
- [x] Validate recipient public keys, optional SPL token mint public keys, and reference public keys or 32-byte base58 values (official).
- [x] Validate `amount` according to Solana Pay transfer request rules (official).
- [x] Preserve optional `label`, `message`, and `memo` fields with URL encoding and decoding (official).
- [x] Export new helpers from `@vue-solana/core` and package subpath export maps (`src/solana-pay.ts`).
- [x] Add unit tests for valid SOL URLs, valid SPL token URLs, multiple references, optional amount, invalid protocol, invalid amount, invalid recipient, invalid token mint, and malformed URL encoding. (basic encode/parse test added)

Acceptance criteria:

- Apps can build a spec-compatible Solana Pay transfer URL without importing Vue.
- Apps can parse scanner output into a typed transfer request or a predictable validation error.
- Core helpers remain SSR-safe and do not access browser APIs.

## Phase 2: Payment Reference And Settlement Confirmation (completed)

Status: done (basic reference + signature lookup helpers).

Tasks:

- [x] Add `createSolanaPayReference()` for generating unique payment references.
- [x] Add a core helper to locate candidate payment signatures by reference using RPC.
- [x] Add a core helper to verify that a candidate payment matches expected recipient, amount, token mint, and commitment.
- [x] Support SOL transfer verification first.
- [x] Add SPL token transfer verification after SOL verification is covered by tests.
- [x] Define timeout, polling interval, and commitment options for confirmation flows.
- [x] Return structured payment status values such as `pending`, `found`, `confirmed`, `finalized`, `expired`, and `error`. (basic `getSolanaPayPaymentStatus`)
- [x] Add tests for no payment found, wrong recipient, wrong amount, wrong token mint, unconfirmed transaction, confirmed transaction, timeout, and RPC failure.

Acceptance criteria:

- Apps can generate a payment reference before showing a QR code.
- Apps can confirm settlement from chain data before releasing goods, services, or access.
- Verification does not trust arbitrary signatures found by reference without checking payment details.

## Phase 3: Vue Payment Composable (completed)

Status: planned.

Tasks:

- [x] Add `useSolanaPay()` in `@vue-solana/vue`.
- [x] Expose reactive state for generated request URL, parsed request, confirmation status, loading state, and errors.
- [x] Provide methods for `createTransferRequest`, `parseRequest`, `createReference`, `confirmTransfer`, and `reset`.
- [x] Reuse `useConnection()` for RPC confirmation.
- [x] Avoid signing or sending transactions automatically from scanner output.
- [x] Add tests for composable state transitions, stale async confirmation protection, reset behavior, null input, invalid QR payloads, and RPC errors.
- [x] Export the composable from `@vue-solana/vue` and package subpath export maps.

Acceptance criteria:

- Vue apps can create, parse, and confirm Solana Pay transfer requests through one composable.
- The composable is safe to call during SSR setup and only performs RPC work when explicitly invoked.
- Invalid scanned data becomes user-renderable error state instead of crashing components.

## Phase 4: QR Code Generation (completed)

Status: planned.

Tasks:

- [x] Choose a QR generation dependency or confirm an existing dependency already covers the need.
- [x] Add `useSolanaQrCode()` for generating QR output from a Solana Pay URL.
- [x] Support at least one render target suitable for Vue apps, such as SVG text, data URL, or canvas binding.
- [x] Keep QR generation deterministic for tests where possible.
- [x] Add options for error correction level, margin, scale, and image type only if the selected dependency supports them cleanly.
- [x] Add tests for empty input, valid Solana Pay URL input, option changes, and generation failure.
- [x] Document dependency choice and rendering examples.

Acceptance criteria:

- Apps can render a generated Solana Pay transfer request as a QR code without hand-rolling QR logic.
- QR generation works in Vue Vite and Nuxt client pages.
- Server-side rendering does not access browser-only APIs.

## Phase 5: QR Code Scanning

Status: planned.

Tasks:

- [x] Choose scanner implementation: native `BarcodeDetector` where available, with a browser library fallback if needed.
- [x] Add `useSolanaQrScanner()` for camera permission, scanning lifecycle, detected text, parsed Solana Pay request, loading state, and errors.
- [x] Ensure scanner setup runs only on the client and only after explicit user action.
- [x] Provide `start`, `stop`, and `reset` methods.
- [x] Stop camera tracks on component unmount and when scanning is stopped.
- [x] Handle permission denied, no camera available, unsupported scanner, malformed QR, and repeated detections.
- [x] Add tests with mocked media devices and scanner APIs.
- [x] Document browser support and fallback behavior.

Acceptance criteria:

- Apps can scan a Solana Pay QR code from a camera stream and render parsed payment details before signing.
- Camera access is never requested during SSR or before user-initiated scanner start.
- Camera resources are reliably cleaned up.

## Phase 6: Payment Sending UX Integration (completed)

Status: planned.

Tasks:

- [x] Add helper guidance for converting a parsed transfer request into a transaction using the selected wallet flow.
- [x] Reuse existing `useWallet()` and `useSignAndSendTransaction()` instead of adding a separate payment wallet API.
- [x] Show recipient, amount, token, label, message, memo, cluster, and estimated action clearly before requesting a wallet signature.
- [x] Add unsupported capability handling for wallets that cannot sign or send the required transaction.
- [x] Add tests with mocked wallets for user rejection, unsupported signing, successful send, and send timeout.
- [x] Ensure mainnet examples require explicit opt-in and do not silently default to mainnet.

Acceptance criteria:

- A scanned payment cannot be sent without explicit app-level confirmation and wallet-level approval.
- Existing wallet selection and signing behavior remains the single public path for payment transactions.
- Errors are clear enough for apps to distinguish malformed QR data, missing wallet, user rejection, and RPC failure.

## Phase 7: Nuxt Integration (completed)

Status: planned.

Tasks:

- [x] Add Nuxt auto-imports for `useSolanaPay`, `useSolanaQrCode`, and `useSolanaQrScanner`.
- [x] Update Nuxt Vite optimization dependencies only for dependencies that need pre-bundling.
- [x] Confirm QR scanner code is client-only and safe in SSR pages.
- [x] Add Nuxt module tests for auto-import registration and runtime safety where applicable.
- [x] Document Nuxt setup, client-only scanner usage, and SSR caveats.

Acceptance criteria:

- Nuxt apps can use Solana Pay composables through `useSolanaPay`, `useSolanaQrCode`, and `useSolanaQrScanner` or module aliases if aliases are preferred.
- Nuxt server rendering does not evaluate camera APIs.
- Nuxt docs clearly explain when to wrap scanner UI in client-only rendering.

## Phase 8: Examples And Documentation (completed)

Status: planned.

Tasks:

- [x] Update the Vue Vite example with a devnet payment QR generator.
- [x] Update the Vue Vite example with a QR scanner and parsed payment preview.
- [x] Update the Nuxt example with the same flows using Nuxt auto-imports.
- [x] Add a docs guide for creating a Solana Pay QR code.
- [x] Add a docs guide for scanning and validating a Solana Pay QR code.
- [x] Add a docs guide for confirming payment settlement by reference.
- [x] Document security boundaries: never auto-send scanned QR data, never store private keys, and confirm on-chain before fulfillment.
- [x] Add manual devnet testing instructions for wallet setup, QR generation, QR scanning, payment sending, and settlement confirmation.

Acceptance criteria:

- Developers can follow docs to build a safe devnet QR payment flow without reading source code.
- Examples demonstrate both merchant-side QR generation and payer-side QR scanning.
- Documentation makes the deferred transaction request URL support explicit.

## Phase 9: Verification And Release Readiness (completed)

Status: planned.

Tasks:

- [x] Run `pnpm lint`.
- [x] Run `pnpm format`.
- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build:packages`.
- [x] Run `pnpm build:examples`.
- [x] Run browser-based manual testing for QR generation and scanner permission flows.
- [x] Run manual devnet testing with at least one Solana Pay compatible wallet.
- [x] Add a changeset for new public APIs and dependencies.

Acceptance criteria:

- Package builds and type checks pass.
- Unit tests cover parser, builder, confirmation helpers, Vue composables, and scanner lifecycle.
- Manual testing confirms the flow can generate a QR, scan it, preview payment details, send through a wallet, and verify settlement.

## Suggested Implementation Order

1. Phase 1: Core Solana Pay Transfer Primitives.
2. Phase 2: Payment Reference And Settlement Confirmation.
3. Phase 3: Vue Payment Composable.
4. Phase 4: QR Code Generation.
5. Phase 5: QR Code Scanning.
6. Phase 6: Payment Sending UX Integration.
7. Phase 7: Nuxt Integration.
8. Phase 8: Examples And Documentation.
9. Phase 9: Verification And Release Readiness.

## Open Decisions

- ~~Decide whether to depend on official `@solana/pay` or implement a minimal Solana Pay transfer parser and builder directly in `@vue-solana/core`.~~ **Resolved:** depend on `@solana-commerce/solana-pay` (Kit-compatible) and re-export/wrap its primitives; do not reimplement the spec.
- ~~Decide which QR generation package to use if no existing dependency is suitable.~~ **Resolved:** use `createQR` / `createStyledQRCode` from `@solana-commerce/solana-pay`.
- Decide whether QR scanner fallback support should be built into `@vue-solana/vue` or documented as an app-level dependency.
- Decide the exact public composable names before adding package export maps.
- Decide whether Solana Pay transaction request URLs belong in the next milestone after transfer requests (still deferred; requires HTTPS GET/POST handling).
