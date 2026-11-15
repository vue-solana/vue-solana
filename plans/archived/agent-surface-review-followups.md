# Agent Surface — Review Follow-Ups

Tracks the findings from reviewing branch `fix/error-codes-and-agent-surface` (`b301d65`) against `main`. The error-code half of that branch is correct; everything below is in the docs agent surface — the generator, the negotiation helpers, the OpenAPI spec, and the reader-facing error docs.

Baseline at review time:

- `pnpm test` — 85 files / 1055 tests pass.
- Prettier clean on every changed file; ESLint clean on every changed `.ts`.
- `pnpm --filter docs llms` regenerates with no git diff (generated surface in sync with the content tree).
- Deployed surface probed with `curl` for header/content-type reality (see item 3).

When an item lands, check its box and append a `Resolved:` note naming the test or gate that would fail if it were reverted. Keep closed items in place — they are the record. If a decision is made _not_ to fix an item, write the reason inline instead of deleting it.

Priority labels, highest first:

- **P0** — Fix before this branch merges. Wrong behaviour or a wrong record on the public machine surface.
- **P1** — Close while the agent-surface contract is fresh.
- **P2** — Small follow-ups, safe to land separately.

---

## P0 — Merge blockers

### [x] 1. Make `removeStaleIndexes()` sweep the directory, not the manifest

File: `apps/docs/scripts/generate-llms.mjs:352-373`

```js
async function removeStaleIndexes() {
  const candidates = [
    ...DOC_SECTIONS.map((section) => `${section.key}/llms.txt`),
    ...LOCALES.map((locale) => `${locale.code}/llms.txt`),
  ];
```

Candidates are derived from the **current** manifest, so only two cases are handled:

- section/locale still listed but with zero pages → removed (correct);
- section/locale **removed from `llms-manifest.json`** → never a candidate → `apps/docs/public/<name>/llms.txt` survives, keeps being served, and still passes `pnpm --filter docs llms`.

The second case is exactly what the doc comment above the function promises ("Removing a locale or a section from the manifest must also remove its committed index") and what plan item #6 of the previous review asked for ("remove any `**/llms.txt` under `public/` not in that set"). Only `llms-output.test.ts:89-116` catches it, at `pnpm test` time and with a manual `rm` as the remedy — `build`/`generate` run the generator, not the test.

- [x] Sweep `publicDir` with `readdir({ withFileTypes: true })` and delete `<dir>/llms.txt` for any directory not in `writtenIndexes`, mirroring `apps/docs/llms-output.test.ts:106-111`.
- [x] Keep the sweep failure-tolerant: a read-only or missing directory must not fail the build (`rm({ force: true })` already tolerates `ENOENT`).
- [x] Keep `writtenIndexes` as the single source of truth (do not re-derive from the manifest).
- [x] Update the comment so it states the sweep is directory-driven.
- [x] Regression test: plant `apps/docs/public/ghost/llms.txt` in a temp copy (or write a small generator-level test that seeds the set), run the generator, assert the orphan is gone. Do not add a committed orphan fixture — the existing output test owns the end-state invariant.

Why P0: without this, deleting a locale or section silently ships a stale index that agents keep fetching.

Resolved: the sweep moved to `apps/docs/scripts/llms-indexes.mjs` (`pruneStaleIndexes({ publicDir, keep })`), driven by `readdir({ withFileTypes: true })` over `public/` and pruned against `writtenIndexes`; the generator logs `removed N stale index(es): …`. `ENOENT` on the public directory and on a candidate file are both tolerated. `apps/docs/scripts/llms-indexes.test.ts` covers the removed-from-manifest case, the untouched root files, "no index, no report", and a missing `public/`. Verified by hand too: a planted `public/ghost/llms.txt` was removed by `pnpm --filter docs llms`.

### [x] 2. Honour an explicit markdown preference that also contains `*/*`

Files: `apps/docs/app/utils/agentRecovery.ts:154-174` (`isNegotiablePageRequest`), `:250-254` (`isWildcardishAccept`)

```ts
if (isWildcardishAccept(acceptHeader)) {
  return false;
}
```

`isWildcardishAccept` treats **any** `Accept` containing `*/*` as "no preference", before the format is considered:

| `Accept`                             | today    | expected |
| ------------------------------------ | -------- | -------- |
| `text/markdown`                      | markdown | markdown |
| `text/markdown, */*`                 | **HTML** | markdown |
| `text/markdown;q=1, text/html;q=0.9` | markdown | markdown |
| `application/json, */*`              | HTML     | HTML     |

`text/markdown, */*` is a normal client preference — many HTTP libraries append `*/*`, and generated clients commonly do. `apps/docs/content/developers.md` and all six locale mirrors now claim "Accept: text/markdown negotiation on every documentation page", and `openapi.json` documents the same contract, so the site is disagreeing with itself.

- [x] Change the short-circuit to only fire when the wildcard is the only signal:

  ```ts
  if (isWildcardishAccept(acceptHeader) && negotiateFormat(acceptHeader) !== "markdown") {
    return false;
  }
  ```

  This stays narrow: a browser's `text/html,…,*/*;q=0.8` still negotiates to `html` and still passes through, and `application/json, */*` is unaffected (no markdown media type present → `negotiateFormat` returns `html`).

- [x] Add `expect(isNegotiablePageRequest("/getting-started", "text/markdown, */*")).toBe(true)` to `apps/docs/app/utils/agentRecovery.test.ts:140-164`.
- [x] Add the middleware counterpart to `apps/docs/server/middleware/markdown-negotiation.test.ts:61+`: `createEvent("/getting-started", "text/markdown, */*")` returns markdown with `Content-Type: text/markdown` and `Link`.
- [x] Leave `isWildcardishAccept` itself unchanged — it is also used by `acceptsHtml()` callers and by the 404 body selection, where "has a wildcard" is still the right question.

Why P0: this is the branch's own documented contract, and the new helper is what encodes it.

Resolved: the short-circuit is now `if (isWildcardishAccept(acceptHeader) && negotiateFormat(acceptHeader) !== "markdown") return false;`, and `isWildcardishAccept` itself is unchanged. Guarded by three new `agentRecovery.test.ts` cases (`text/markdown, */*`, with a trailing `text/html;q=0.9`, and with `*/*;q=0.1`) plus a middleware case in `markdown-negotiation.test.ts` that asserts `Content-Type: text/markdown` and the `Link` header for `text/markdown, */*`.

### [x] 3. Stop documenting headers and a content type the static llms files do not serve

File: `apps/docs/server/routes/openapi.json.ts:222-275` (existing `/llms.txt`, `/llms-full.txt`, plus the new `/guides/llms.txt` entry); helper `standard200Headers` at `:96-99`

Every llms entry declares `headers: standard200Headers` (`X-Api-Version` + `RateLimit-*`) and `content: text/markdown`. The deployment does not:

```
$ curl -sI https://vue-solana-docs.vercel.app/llms.txt
content-type: text/plain; charset=utf-8
# no x-api-version, no ratelimit-*

$ curl -sI https://vue-solana-docs.vercel.app/llms-full.txt
content-type: text/plain; charset=utf-8

$ curl -sI https://vue-solana-docs.vercel.app/openapi.json     # a Nitro route
content-type: application/json; charset=utf-8
x-api-version: 1

$ curl -sI https://vue-solana-docs.vercel.app/getting-started
content-type: text/html;charset=utf-8
x-api-version: 1
ratelimit-limit: 600
```

Cause: files under `apps/docs/public/` are served by Vercel's static layer, which runs before the Nitro middleware in `apps/docs/server/middleware/markdown-negotiation.ts`. Nothing in the repo can add headers to them. The branch multiplies a pre-existing mismatch from two paths to six.

Two valid resolutions; pick one and record the reason:

- [x] **Preferred (zero runtime risk):** correct the spec. Serve-as-`text/plain` is explicitly allowed by llmstxt.org, so declare `text/plain` and drop `standard200Headers` for the static paths, keeping `apiVersionHeaderParam` (a request header, which the platform can honour) and adding a one-line `description` note that these are static assets cached by the CDN.
- ~~**Alternative (only if `text/markdown` is wanted):** serve them through Nitro instead of `public/`.~~ Not taken: it gives up CDN-static caching and moves ~249 KB into the function bundle for a content type llmstxt.org already permits. The preferred option keeps the runtime untouched.
- [x] Whichever option is chosen, update `apps/docs/content/developers.md` and the six locale mirrors only if the served `Content-Type` changes in a user-visible way (it does not for the preferred option). No edit was needed: `developers.md` never claimed a content type for these files.
- Post-deploy re-probe: `curl -sI .../llms.txt | grep -i content-type`. Not a code task — `pnpm smoke:docs-surface` performs this assertion (and the rest of the surface) against whatever deployment it is pointed at.

Why P0: `openapi.json` is the contract agents code against; it currently describes six endpoints that do not behave as documented.

Resolved: `/llms.txt`, `/llms-full.txt`, and `/guides/llms.txt` now declare `content: text/plain` and `headers: staticLlmsHeaders` (a single `Content-Type: text/plain; charset=utf-8` entry) instead of `standard200Headers`, each with a shared `staticLlmsDescription` sentence explaining that they are build-time files served by the CDN before Nitro. `apiVersionHeaderParam` stays. Verified against a local preview build: `curl -sI localhost:4319/llms.txt` returns `text/plain` with no `X-Api-Version`/`RateLimit-*`, and `pnpm smoke:docs-surface --base …` asserts it (item 9).

### [x] 4. Derive the markdown 404 body from `SITE_URL` instead of a hardcoded domain

File: `apps/docs/app/utils/agentRecovery.ts:200-228`

`createAgent404Markdown()` hardcodes `https://vue-solana-docs.vercel.app` in thirteen links. This branch moved `SITE_URL` to `apps/docs/app/utils/llms-manifest.json` and rewrote `createProblemDetails` (`:261-278`), `agentLinkHeader` (`:137-141`) and `openapi.json.ts` to use it, but left the 404 body behind. The site URL now lives in three places:

- `apps/docs/nuxt.config.ts:45-46` (`site.url`)
- `apps/docs/app/utils/llms-manifest.json` (`siteUrl`)
- the literals in `createAgent404Markdown`

- [x] Convert the whole block to a template literal using `${SITE_URL}`.
- [x] Keep the list of links and their order identical (it is asserted by shape in the middleware tests).
- [x] `apps/docs/app/utils/agentRecovery.test.ts:183-189` only asserts the H1 and the echoed path, so no test edit is needed; add one assertion that the body contains `${SITE_URL}/llms.txt` so the hardcoding cannot come back.
- [x] Optional but cheap: add a test that reads `apps/docs/nuxt.config.ts`'s `site.url` and asserts it equals `manifest.siteUrl`, so the two cannot drift.

Why P0: a domain move silently breaks every recovery link handed to an agent on a 404.

Resolved: the whole body is one template literal using `${SITE_URL}`; the link list and order are unchanged. `agentRecovery.test.ts` gained "builds every link from SITE_URL instead of a hardcoded domain" (extracts every `](http…)` target and requires the `SITE_URL` prefix) and the optional drift guard: "keeps nuxt.config.ts site.url in sync with the llms manifest" reads `site.url` out of `apps/docs/nuxt.config.ts` and compares it with the manifest's `siteUrl`.

---

## P1 — Contract completeness

### [x] 5. Align the `Link` header description with when it is actually sent

Files: `apps/docs/server/routes/openapi.json.ts:89-95` (`linkResponseHeader`), `:336-354` (`/{page}` 200); `apps/docs/server/middleware/markdown-negotiation.ts:59-80`

The middleware returns at the `isNegotiablePageRequest` early exit **before** setting `Vary` and `Link`, so a browser navigation (`Accept: text/html,…`) never receives `Link`. The `/{page}` 200 response lists it for both the `text/html` and `text/markdown` media types, and `markdown-negotiation.test.ts:85-93` explicitly asserts `Link` is `undefined` for that request.

Two options; the first is recommended:

- [x] **Recommended:** correct the description. State that `Link` is sent on content-negotiated page responses (markdown bodies and markdown/problem+json 404s) and not on browser HTML navigations. Do **not** move `setResponseHeader(..., "Link", ...)` above the early return: renderer-only routes such as `/demo` (`apps/docs/nuxt.config.ts`) would then advertise a `<path>.md` alternate that 404s, and `/demo` is deliberately non-canonical.
- ~~Alternative, if the header is wanted on HTML too: restructure the handler so `isMachineReadablePath(pagePath)` returns first, then set `Vary` + `Link` for every remaining page request, then keep the `isNegotiablePageRequest` guard around `queryCollection`.~~ Not taken: it would advertise a dead `.md` for `/demo`, and the current `Link`-absent assertion is the contract.
- [x] Mention `Vary` in the same description: on HTML navigations the value observed in production comes from the framework, not from this middleware.

Resolved: `linkResponseHeader.description` now says the header is sent on content-negotiated page responses (markdown bodies and markdown/problem+json 404 recovery responses), not on browser HTML navigations, and that the `rel="alternate"` link is advisory on a 404. The `/{page}` operation description repeats the negotiated-only rule, and `Vary` keeps its entry on the 200 response. The middleware is unchanged, so `markdown-negotiation.test.ts`'s "passes browser navigations through without negotiating" (`Link` undefined) still holds.

### [x] 6. Make `waitForRedirect()` reject — not throw — for an already-aborted signal

File: `packages/core/src/ios-wallet/browser.ts:105-115`

```ts
signal?.throwIfAborted();   // sync throw, before the Promise exists
return new Promise<T>((_, reject) => { … });
```

The `signal` option is documented at `:88-93` as "**Rejects** without further waiting when the caller's own `AbortSignal` fires. An aborted wait rejects with the signal's reason". For a signal that is already aborted, `waitForRedirect(...).catch(...)` never runs. (`timeoutMs` validation throwing synchronously is a separate, intentional contract, tested at `browser.test.ts:93-102`.)

- [x] Move the check into the executor so both entry points behave the same way:

  ```ts
  return new Promise<T>((_, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    …
  });
  ```

  Do not simply delete `throwIfAborted()`: `addEventListener("abort", …)` never fires on an already-aborted signal, so the wait would hang until `timeoutMs`.

- [x] Add the missing test to `packages/core/src/ios-wallet/browser.test.ts:46-102`: pre-abort a controller, `await expect(waitForRedirect({ signal })).rejects.toMatchObject({ name: "AbortError" })`, disguised as the existing fired-abort case.
- [x] Decide the wording in the JSDoc: either "rejects with the signal's reason, including when the signal is already aborted" or a separate sentence for the pre-aborted case.
- [x] Semver: this is a public helper already documented in the 4.0.0 changelog and exported since this branch. Fold the fix into `.changeset/consistent-error-codes.md` while the branch is unreleased; if it lands after a release, add a new `patch` changeset naming the behaviour change.

Resolved: the check moved inside the executor (`if (signal?.aborted) { reject(signal.reason); return; }`), the `signal` JSDoc says "including when the signal is already aborted", and the function JSDoc separates the synchronous `INVALID_INPUT` contract from the always-reject abort contract. `browser.test.ts` has "rejects, rather than throwing, when the signal is already aborted". The changeset bullet for `waitForRedirect()` now names the pre-aborted behaviour, so it ships as `patch` with the rest of the branch.

### [x] 7. Add the new cases to the `WALLET_FAILURE` documentation

Files: `packages/core/src/errors.ts:7-10`, `apps/docs/content/guides/errors.md:32`, and the same line in `de`, `es`, `fr`, `ja`, `ko`, `zh`

The enumerations still read "connect/disconnect, persisted-wallet auto-connect, mobile-wallet registration, or iOS callback handling". This branch makes `useSignMessage()`, `useSignIn()` and `useSignTransactions()` report `WALLET_FAILURE`; `AGENTS.md` and `.changeset/consistent-error-codes.md` say so, so the branch is internally inconsistent.

- [x] Extend the `errors.ts` comment to include message signing, sign-in and batch signing.
- [x] Extend the `guides/errors.md:32` bullet with the same three cases.
- [x] Mirror the sentence in all six locale files. Keep heading structure identical — `packages/core/src/locale-docs.test.ts` gates it. Use accented French/Spanish, keep code identifiers in Latin script, prefix internal links per locale.
- [x] No test covers prose; the gate is `pnpm test` (locale structure) plus a read-through.

Resolved: the enumeration in `packages/core/src/errors.ts` and `apps/docs/content/guides/errors.md` now includes "message signing, sign-in, or batch signing", and all six locale files carry the same three cases in their own language (accented Spanish/French, identifiers in Latin script). `pnpm --filter docs llms` regenerated `apps/docs/public/llms-full.txt` from the English source, and `packages/core/src/locale-docs.test.ts` still passes in `pnpm test`.

---

## P2 — Smaller follow-ups

### [x] 8. Fail loudly when a top-level content directory is not in the manifest

File: `apps/docs/scripts/generate-llms.mjs:108-112` (`sectionFromPath`), `:137-152` (`groupEnglishPages`)

`sectionFromPath("/recipes/x")` returns `"recipes"`, which is neither `"root"` nor a manifest section, so the page lands in no group: no root-index entry and no section index. Only `apps/docs/llms-output.test.ts:121-125` ("lists every English page exactly once") catches it, i.e. at `pnpm test`, not in the generator that just built the wrong file.

- [x] After collecting `pages`, throw a named error listing any top-level segment that is neither `"root"` nor a `DOC_SECTIONS` key. Three lines, and the failure moves from a later CI run to the generator run.
- [x] Keep the test as the end-state invariant — it also catches a page missing for other reasons.

Resolved: `assertKnownSections(pages)` runs right after `pages.sort(sortPages)` and throws `Unknown top-level content directory "recipes". Add an entry for each to the \`sections\` list in apps/docs/app/utils/llms-manifest.json …`(plural-aware). Verified by planting`apps/docs/content/recipes/probe.md`: `pnpm --filter docs llms`now fails instead of writing an index without the page.`llms-output.test.ts` keeps the end-state invariant.

### [x] 9. Close the remaining test gaps

- [x] `apps/docs/server/middleware/markdown-negotiation.test.ts`: add a `/.md` (homepage) case. `agentLinkHeader()` special-cases `"/"` → `/.md` (`agentRecovery.ts:138`), and nothing exercises the suffix-strip-then-`"/"` path.
- [x] Add a docs smoke check that asserts the live surface, because nothing currently does: `pnpm test:e2e` serves only `examples/vue-vite` and `examples/nuxt`, so the docs app's headers and content types are never exercised in CI. A tiny `promisify(curl)`-style assertion in `apps/docs/llms-output.test.ts` is _not_ acceptable (network in unit tests); a separate opt-in script (`pnpm smoke:docs-surface`) or a Vitest file tagged `skipUnless` an env var is. This is the gap that let item 3 hide.
- [x] Leave the Playwright suite alone: it does not serve the docs app.

Resolved: `markdown-negotiation.test.ts` has a `/.md` case that asserts a 200 markdown body, `Link` equal to `agentLinkHeader("/")`, and the `/.md` + `/llms.txt` targets in it. The opt-in smoke check is `apps/docs/scripts/check-agent-surface.mjs`, run as `pnpm smoke:docs-surface` (base URL from `--base`, then `DOCS_SURFACE_BASE_URL`, then production). It is a plain `.mjs` script, so `pnpm test` (which only collects `*.test.ts`) never runs it; it asserts status, `Content-Type`, `X-Api-Version`, absent `RateLimit-*` on the static llms files, present `Link` on markdown, and absent `Link` on HTML. Verified against a local preview build (8/8 pass) and against the current production deployment, where it correctly fails on the not-yet-deployed `/guides/llms.txt`, `/.md`, and `Link` surface.

### [x] 10. Add `deleteSwrKey()` to the `AGENTS.md` auto-import list

File: `AGENTS.md:123`

```
- `tryUseSolana()`, `clearSwrCache()`
```

`deleteSwrKey()` is auto-imported (`packages/nuxt/src/imports.ts:94`) and documented in `apps/docs/content/packages/nuxt.md` plus `knowledge-bundle/packages/nuxt.md:80`.

- [x] Change the line to list `deleteSwrKey()` alongside `tryUseSolana()` and `clearSwrCache()`.

Resolved: `AGENTS.md` now reads `` - `tryUseSolana()`, `clearSwrCache()`, `deleteSwrKey()` ``. No test — it is documentation, and `packages/nuxt/src/imports.ts` remains the source of truth for the auto-import list.

### [x] 11. Tighten `llmsIndexForPath()` for section roots and 404 alternates

File: `apps/docs/app/utils/agentRecovery.ts:115-124` (`llmsIndexForPath`), `:137-141` (`agentLinkHeader`)

- `llmsIndexForPath("/guides")` and `llmsIndexForPath("/examples")` require `segments.length > 1`, so a section root falls back to the **root** index instead of the section index.
- `agentLinkHeader()` is set before page resolution, so a markdown 404 advertises `<missing path>.md`, which also 404s.

Both are only reachable through a 404 today (`/guides` and `/examples` have no `index.md`), so the impact is limited to the recovery path.

- [x] Change the condition to `INDEXED_SECTIONS.includes(segments[0] ?? "")` without the length guard, and add the two section-root cases to `agentRecovery.test.ts` (`llmsIndexForPath` describe block).
- [x] For 404s, either drop `rel="alternate"` from the header when the page was not found, or leave it and document that the alternate is advisory on 404 responses. Pick one and note it next to `agentLinkHeader`.

Resolved: the `segments.length > 1` guard is gone, so `/guides` and `/examples` resolve to their section index. `agentRecovery.test.ts` has "uses the section index for a section root with no page". The alternate was **kept** on 404s (dropping it would mean deciding after page resolution, which is the point where the response is already built) and `agentLinkHeader`'s JSDoc now says the `rel="alternate"` link is advisory on a 404 because the header is set before the page resolves. The same sentence is in `openapi.json`'s `linkResponseHeader` description.

---

## Confirmed correct — no action

Recorded so a future reader does not re-litigate them:

- The `WALLET_FAILURE` / `RPC_FAILURE` split: wallet-only hooks (`useSignMessage`, `useSignIn`, `useSignTransactions`) report `WALLET_FAILURE`; the sign-and-send pair keeps the RPC default because it reaches the network. `useExecution()` is not exported from `packages/vue/src/index.ts`, so the `{ failureCode }` option shape is internal and not breaking.
- `parseAddress()` depth guard: 32 accepted / 33 rejected, cyclic getters and cyclic refs both covered with `INVALID_ADDRESS`, message contains "possible cycle".
- `useSignatureStatus()` reporting `INVALID_INPUT` for `pollIntervalMs <= 0`; the docs and `packages/vue/README.md` were updated consistently.
- `clusters.test.ts` moving to `INVALID_INPUT` — the source already threw that code; the test was the stale side.
- `waitForRedirect` / `WaitForRedirectOptions` shipping as `patch`: the 4.0.0 changelog already documented the helper, so the export restores a promise rather than adding a feature.
- `Taskfile.yml` `${{.RC_TAG}}` → `{{.RC_TAG}}` is a real go-task templating fix; the two `rc:finalize` preconditions fail before any file is touched.
- `vitest.config.ts`'s `~/utils/agentRecovery` alias is an exact match and is declared before the spread aliases, per the repo's prefix-match rule.
- No header or markdown injection: `new URL(request.url).pathname` percent-encodes `` ` `` `<` `>` `"` and leaves `%0d%0a` encoded, so neither the `Link` header nor the 404 code span can be broken out of.
- Locale mirroring in this branch is structurally correct; only the `WALLET_FAILURE` sentence (item 7) is missing.

## Pre-existing, explicitly out of scope

Not introduced by this branch; do not fold them into this work unless a fix is requested separately:

- **Rate limiting is advisory only.** `RateLimit-*` always report `600`, no code path emits `429`, yet `openapi.json` documents `TooManyRequests` with `Retry-After`.
- `/problems/not-found` (the RFC 9457 `type`) is not a route. Allowed by RFC 9457 — type URIs need not be dereferenceable.
- Site URL duplicated between `apps/docs/nuxt.config.ts` and `apps/docs/app/utils/llms-manifest.json` (item 4 adds a cheap guard but does not remove the duplication).

---

## Verification

Run the full gate, because items 1, 3 and 5 touch the docs build and the generated surface:

```sh
pnpm format
pnpm lint
pnpm test
pnpm typecheck
pnpm build:packages
pnpm --filter docs llms          # expect no diff in a clean tree
pnpm --filter docs build
pnpm smoke:docs-surface          # opt-in; against a preview or production deployment
```

All of the above pass on this change set (`pnpm test`: 86 files / 1065 tests; `pnpm --filter docs llms` leaves the tree unchanged; `pnpm smoke:docs-surface --base http://localhost:4319` passes 8/8 against a local `node .output/server/index.mjs` preview).

Item-specific checks:

- **1:** temporarily rename `guides` to `recipes` in `apps/docs/app/utils/llms-manifest.json` and run `pnpm --filter docs llms`; `apps/docs/public/guides/` … `public/recipes/` must not both exist. Restore the manifest afterwards. Then run `pnpm --filter docs llms` again and confirm the tree is clean.
- **2:** `node -e` a `negotiateFormat`/`isNegotiablePageRequest` probe, or rely on the new unit case. The middleware test must fail if the `!== "markdown"` guard is reverted.
- **3:** `pnpm --filter docs build && pnpm --filter docs preview` then `curl -sI localhost:3000/llms.txt` and `curl -sI localhost:3000/guides/llms.txt`; headers must match the spec for the option chosen. Re-probe production after deploy.
- **4:** grep for the literal domain in `apps/docs/app/`: only `nuxt.config.ts` and the manifest may contain it.
- **5:** the assertion in `markdown-negotiation.test.ts:85-93` is the contract; if it is not inverted, the description must say "negotiated responses only".
- **6:** the new pre-aborted case must fail if `throwIfAborted()` is restored or the in-executor check removed.
- **7:** `pnpm test` runs `packages/core/src/locale-docs.test.ts`; a heading-structure drift fails it. Read the seven files once.
- **8:** add a temporary `apps/docs/content/recipes/x.md`, run `pnpm --filter docs llms`, confirm the generator errors instead of silently dropping the page. Remove the file.
- **9:** `pnpm exec vitest run apps/docs/server/middleware/markdown-negotiation.test.ts` must include the `/.md` case; the smoke script stays opt-in and must not run in `pnpm test`.
- **10:** `grep -n deleteSwrKey AGENTS.md` returns the line.
- **11:** `llmsIndexForPath("/guides")` must return `${SITE_URL}/guides/llms.txt`.

Generated files (`apps/docs/public/llms.txt`, `llms-full.txt`, `<section>/llms.txt`, `<locale>/llms.txt`) are tracked and must be committed with any content change that alters them. `llms-full.txt` must stay English-only (the `llms-output.test.ts` size budget depends on it).

## Files this plan touches

| Item | Primary files                                                                                                                |
| ---- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | `apps/docs/scripts/generate-llms.mjs`                                                                                        |
| 2    | `apps/docs/app/utils/agentRecovery.ts`, `agentRecovery.test.ts`, `markdown-negotiation.test.ts`                              |
| 3    | `apps/docs/server/routes/openapi.json.ts` (+ optional Nitro routes / asset move)                                             |
| 4    | `apps/docs/app/utils/agentRecovery.ts`, `agentRecovery.test.ts`                                                              |
| 5    | `apps/docs/server/routes/openapi.json.ts` (+ `markdown-negotiation.ts` if the alternative is taken)                          |
| 6    | `packages/core/src/ios-wallet/browser.ts`, `browser.test.ts`                                                                 |
| 7    | `packages/core/src/errors.ts`, `apps/docs/content/guides/errors.md`, six locale mirrors                                      |
| 8    | `apps/docs/scripts/generate-llms.mjs`                                                                                        |
| 9    | `apps/docs/server/middleware/markdown-negotiation.test.ts`, `apps/docs/scripts/check-agent-surface.mjs`, root `package.json` |
| 10   | `AGENTS.md`                                                                                                                  |
| 11   | `apps/docs/app/utils/agentRecovery.ts`, `agentRecovery.test.ts`                                                              |

Status: **closed and archived** (2026-11-15). Every item is resolved; the only remaining step is the post-deploy re-probe recorded under item 3, which `pnpm smoke:docs-surface` performs. Kept as the record of the review, matching how `plans/archived/error-codes-agent-surface-followups.md` was closed.
