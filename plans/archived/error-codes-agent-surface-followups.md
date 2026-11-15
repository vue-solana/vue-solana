# Error Codes & Agent Surface — Review Follow-Ups (archived)

> **Archived.** All 13 items are complete and shipped in `8254fd7` on `fix/error-codes-and-agent-surface`. Kept as the record; no items remain open.

Tracks the findings from reviewing branch `fix/error-codes-and-agent-surface` (single commit `85da5d1`) against `main`.

Everything below is a content, contract, or test-coverage gap — not a build failure. Baseline at review time:

- `pnpm test` — 84 files / 1048 tests pass.
- `pnpm --filter @vue-solana/{core,vue,nuxt} typecheck` and `pnpm --filter docs typecheck` pass.
- Prettier and ESLint clean on changed files.
- `pnpm --filter docs llms` regenerates with no git diff (generated surface is in sync).

Strike an item through when it lands. If a decision is made not to fix an item, record the reason inline instead of deleting it.

**Status: complete (2026-11-14).** All 13 items are implemented and checked below; see the Verification section for the gate results.

Priority labels, highest first:

- **P0** — Fix before this branch merges. Wrong record or broken documentation attached to public API.
- **P1** — Close while the agent-surface contract is fresh; these are real gaps in what ships.
- **P2** — Small follow-ups, safe to land separately.

---

## P0 — Merge blockers

### [x] 1. Drop the stale Nuxt bullet from the changeset

File: `.changeset/consistent-error-codes.md` (bullet at line 9)

- [x] Delete the `@vue-solana/nuxt` option-precedence bullet.

Why: that fix shipped in `0ec42c6` and is an ancestor of `@vue-solana/nuxt@4.1.11`. `packages/nuxt/CHANGELOG.md` (~line 521) already documents it. Leaving the bullet in writes a duplicate, misleading changelog entry for the next release.

- [x] Sanity-check the rest of the changeset against the diff — the remaining four bullets (`parseAddress` depth guard, `useSignatureStatus` `INVALID_INPUT`, wallet-composable `WALLET_FAILURE`, `waitForRedirect` export) all match.

### [x] 2. Re-attach the `parseAddress` JSDoc

File: `packages/core/src/address.ts` (lines 15–27)

Two consecutive doc blocks precede `MAX_ADDRESS_INPUT_DEPTH`:

- Lines 15–20 document `parseAddress()` but are no longer attached to the function, so they render as docs for the constant.
- Lines 21–26 are the actual `MAX_ADDRESS_INPUT_DEPTH` doc.

- [x] Move the `parseAddress` block down to directly above `export function parseAddress(...)` (line 29), leaving only the nesting-budget comment above the constant.

### [x] 3. Refresh stale `AGENTS.md` sections

File: `AGENTS.md`

- [x] **Verification Status** (~line 213): replace "as of the v2.3.0 packages" with the current released versions.
- [x] **Suggested Next Tasks** (~lines 334–335): the pin claim is stale (`apps/docs/package.json` pins `4.1.11`, not `3.0.0`/`3.0.1`), and the `.changeset/bundle-size-trim.md` "pending 4.0.0 release" item is consumed. Remove both, or replace with the real next task.
- [x] Follow the file's own rule: read the pin from `apps/docs/package.json`, do not hardcode a version number in prose that will go stale next release.

---

## P1 — Agent-surface contract gaps

### [x] 4. Document the `Link` response header in the OpenAPI spec

File: `apps/docs/server/routes/openapi.json.ts`

The header is set on every negotiated response (`apps/docs/server/middleware/markdown-negotiation.ts` line 79) and described in the `info.description` prose (lines 136–137), but it is not in the response schema.

- [x] Add a reusable header component next to `apiVersionResponseHeader` (line 83):
  - `rel="describedby"` → most specific `llms.txt` index.
  - `rel="alternate"; type="text/markdown"` → the page's `.md` URL.
  - Example: `<https://vue-solana-docs.vercel.app/guides/llms.txt>; rel="describedby", <https://vue-solana-docs.vercel.app/getting-started.md>; rel="alternate"; type="text/markdown"`.
- [x] Reference it from the `/{page}` 200 response (line 328), where `Vary` is already listed.
- [x] Decide whether the markdown-404 case should also advertise it; if so, add it to `errorResponses.NotFound.headers` (line 99). It is set there because the middleware sets it before page resolution.

### [x] 5. Single source of truth for the locale and section lists

The same two lists were hardcoded in three places:

| Concern              | Location                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Middleware / helpers | `apps/docs/app/utils/agentRecovery.ts` lines 110–111 (`LOCALE_CODES`, `INDEXED_SECTIONS`) |
| Generator            | `apps/docs/scripts/generate-llms.mjs` line 24 (`LOCALES`), line 76 (`DOC_SECTIONS`)       |
| Output test          | `apps/docs/llms-output.test.ts` lines 22–23 (`LOCALES`, `SECTIONS`)                       |

Adding a locale or section today needs all three edited coherently, and nothing fails loudly if one is missed (the test only checks what the generator produced).

- [x] Extract the canonical lists into one module the generator, middleware/helpers, and test all import. The generator's entries carry extra metadata (name, key), so export the ordered keys/codes and derive the rest. Canonical file: `apps/docs/app/utils/llms-manifest.json`, whose consumers are `agentRecovery.ts` (derives `LOCALE_CODES` / `INDEXED_SECTIONS`), `scripts/generate-llms.mjs` (Node JSON import with `{ type: "json" }`), and `llms-output.test.ts`.
- [x] Confirm `DOC_SECTIONS[].key` and `INDEXED_SECTIONS` cannot drift (same ordering and spelling) — the latter is derived from the former.
- [x] Verify the test still runs from the root vitest config with the new import path, and that `generate-llms.mjs` (plain Node ESM) can import it without a bundler (keep it dependency-free or use a `.mjs`/JSON module). Both consumers import the same `.json`; `pnpm --filter docs llms` produced no diff. Note: the shared file must be JSON, not `.mjs` — Nitro externalized the `.mjs` import during prerender and resolved it against the wrong root (`Cannot find module '/Users/.../apps/docs/shared/llms-manifest.mjs'`), which failed `pnpm --filter docs build`. JSON is inlined by Vite and builds cleanly.

### [x] 6. Prune stale generated `llms.txt` indexes

File: `apps/docs/scripts/generate-llms.mjs`

`writePublic()` used to only write. The loops over sections/locales skip entries with no pages but never deleted an existing file, so removing a section or locale left an orphaned `{section,locale}/llms.txt` in `apps/docs/public/` that still passed `llms-output.test.ts` (presence + budget checks, no absence check).

- [x] Have the generator compute the full set of expected paths and remove any `**/llms.txt` under `public/` not in that set (limit the sweep to the known section/locale directories and the two root files). Implemented as `removeStaleIndexes()` fed by a `writtenIndexes` set in `writePublic()`.
- [x] Alternatively/additionally, assert the exact generated file set in `llms-output.test.ts` so an orphan fails CI. Added the "contains no stale llms.txt indexes" test.
- [x] Regenerate with `pnpm --filter docs llms` and confirm no unexpected deletions in a clean tree. No diff produced.

### [x] 7. Test that the middleware actually sets the header

`apps/docs/app/utils/agentRecovery.test.ts` covers `llmsIndexForPath`, `agentLinkHeader`, and `isNegotiablePageRequest` as pure helpers. Nothing exercised `apps/docs/server/middleware/markdown-negotiation.ts`, so a regression in the default export (early return, wrong branch, dropped header, `.md` fallthrough) would be invisible.

- [x] Add a middleware-level test that invokes the default `defineEventHandler` with a mock event (and a stubbed `queryCollection`, or a route fixture), asserting:
  - `.md` suffix → 200 markdown + `Content-Type: text/markdown` + `Link`.
  - `Accept: text/markdown` → markdown + `Link` + `Vary`.
  - wildcard `Accept` → pass-through (no body returned).
  - unmatched path with markdown accept → 404 markdown recovery body + `Link`.
  - unmatched path with a non-HTML, non-markdown accept → 404 `application/problem+json`.
- [x] If a unit-level mock is too brittle for Nitro internals, add one Playwright assertion against the running docs app instead and note the tradeoff here. Not needed: stubbing the Nitro auto-imports on `globalThis` before importing the handler was sufficient. The test lives at `apps/docs/server/middleware/markdown-negotiation.test.ts` and mocks `minimark/stringify`; the root `vitest.config.ts` gained an exact `~/utils/agentRecovery` alias.

---

## P2 — Smaller follow-ups

### [x] 8. Complete the public-API docs for new exports

- [x] `waitForRedirect` / `WaitForRedirectOptions`: add a row to the iOS helper table in `packages/core/README.md`, matching the wording already in `apps/docs/content/packages/core.md` and `knowledge-bundle/packages/core.md`.
- [x] Add `MISSING_CLIENT_CAPABILITY` to the package READMEs. The READMEs have no standalone error-code list (the canonical list is `apps/docs/content/packages/core.md`), so the code was added to the `MissingClientCapabilityError` row in `packages/vue/README.md`, which is where that error is documented.
- [x] Check the Vue and Nuxt READMEs for the same omissions. Found and fixed an actual stale statement: `packages/vue/README.md` said invalid `pollIntervalMs` returns `RPC_FAILURE`, contradicting this branch's `INVALID_INPUT` change. The Nuxt README needed nothing.

### [x] 9. Pin the depth guard at its boundary

File: `packages/core/src/address.test.ts` (test "unwraps legitimate nesting up to the depth limit")

The test nested 30 levels while the guard trips at `depth > 32` (`packages/core/src/address.ts` line 52). It proved nesting works but not where it stops.

- [x] Add cases at 32 (accepted) and 33 (throws `INVALID_ADDRESS` with "possible cycle" in the message).
- [x] Keep the cyclic-input test; the two cover different failure modes.

### [x] 10. Tighten `Link` header semantics (minor)

File: `apps/docs/server/middleware/markdown-negotiation.ts` (line 79)

- [x] The header is set before page resolution, so it also rides on the 404 markdown recovery response and on problem+json 404s. Advertised `.md` alternates for paths that do not exist will themselves 404. Either scope the header to found pages, or document the behavior in the middleware comment + OpenAPI description. Chose to document it: the `Link` schema says it is sent on 404s too, and `ErrorResponses.NotFound` lists it.
- [x] On a negotiable non-markdown request that ends up HTML, the header still advertises a markdown alternate. That is arguably correct (the `.md` URL exists), but the OpenAPI prose should say "every content-negotiated page response" rather than "every negotiated markdown response". Updated in `openapi.json.ts`.

### [x] 11. `failureCode` placement in `useExecution`

File: `packages/vue/src/composables/use-execution.ts`

`failureCode` sat inside the `statuses` options object even though it configures failure classification, not a status value.

- [x] Move it to a sibling option (`{ statuses, failureCode }`), or rename the container to something neutral, and update the three call sites (`useSignMessage`, `useSignIn`, `useSignTransactions`). Renamed the container to `options`; call sites are unchanged because they pass an object literal.
- [x] Keep the public composable signatures unchanged; this is an internal option shape.

### [x] 12. Localized docs polish

- [x] `apps/docs/content/locales/es/packages/nuxt.md` line 133: "accessor seguro y no lanzador" is awkward Spanish. Replaced with "accessor seguro que no lanza excepciones del contexto Solana inyectado"; no other locale copy-pasted the phrase.
- [x] Confirm de/fr/ja/ko `message-signing.md` keeping code-adjacent strings in English is intentional (it matches the pre-existing style); noted as intentional, no change.

### [x] 13. Record the semver decision

- [x] `waitForRedirect` / `WaitForRedirectOptions` are newly exported public API while the changeset marks `patch`. Decision: keep `patch`. The 4.0.0 changelog already documented the helper and its options, so this release restores a promised export rather than introducing a feature; the changeset describes it as such. No version bump required.

---

## Confirmed correct — no action

Recording these so a future reader does not re-litigate them:

- `useSignatureStatus()` throwing `INVALID_INPUT` for `pollIntervalMs <= 0` matches the documented policy that malformed options are input errors, not transport failures.
- `WALLET_FAILURE` for `useSignMessage` / `useSignIn` / `useSignTransactions`, with the sign-and-send pair keeping the `RPC_FAILURE` default, is the right split — only the latter reaches the network.
- `clusters.test.ts` moving its expectation to `INVALID_INPUT` is correct; the source already threw that code and the test was the stale side.
- Docs were mirrored across all six locales, and `knowledge-bundle/packages/vue.md` plus `apps/docs/content/packages/core.md` were updated for `waitForRedirect`.
- `plans/archived/package-improvements-phase-9.md` correctly records the phase and its single open item.

---

## Verification

Run the full gate after the P0/P1 work, since #4–#7 touch the docs build and generated output:

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm --filter docs llms        # expect no diff except intentional changes
pnpm --filter docs build
pnpm test:e2e                  # only if #7 adds a Playwright assertion
```

Item-specific checks:

- #1: `git diff` on `.changeset/` shows only the bullet removal.
- #3: re-read the pin from `apps/docs/package.json` before writing the new text.
- #5: remove a locale from the shared list temporarily and confirm the generator, middleware, and test all follow it.
- #6: delete one generated `{section}/llms.txt`, run `pnpm --filter docs llms`, confirm it is not recreated when the section is empty and that the test fails on a hand-planted orphan.
- #7: the new test must fail when line 79 (`setResponseHeader(event, "Link", ...)`) is commented out.

Result (2026-11-14):

- `pnpm test` — 85 files / 1055 tests pass, including the new middleware test and the two new `parseAddress` assertions.
- `pnpm --filter @vue-solana/{core,vue,nuxt} typecheck` and `pnpm --filter docs typecheck` pass.
- `pnpm lint` and Prettier on every changed file pass.
- `pnpm --filter docs llms` leaves `apps/docs/public/` unchanged.
- `pnpm --filter docs build` succeeds. It caught the first attempt at #5: Nitro externalized the `.mjs` manifest during prerender and resolved it against the wrong root, which is why the manifest is JSON.
- `pnpm test:e2e` was not run: #7 used a Vitest middleware test, so the Playwright suite is unaffected.

Owner: next maintainer touching the agent surface or the branch itself.
