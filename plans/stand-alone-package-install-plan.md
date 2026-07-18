# Implementation Plan: Standalone Package Installs

## Overview

Make each published package installable in standalone mode without breaking current behavior. A consumer should be able to install only the package they chose, plus required framework peers such as `vue` or `nuxt`, and not manually install low-level Solana, Wallet Standard, Buffer, or sibling Vue Solana packages unless they intentionally depend on those packages as first-class APIs.

The previous work added `@vue-solana/core/web3`, `@vue-solana/core/buffer-polyfill`, dependency metadata changes, and updated docs/examples. Review found that this reduces some low-level dependency installs, but does not yet fully satisfy standalone package installation for published TypeScript consumers or for Vue/Nuxt examples that still import `@vue-solana/core` directly.

## Goals

- Make `@vue-solana/core` installable by itself for core users, including published TypeScript declarations, without requiring consumers to add local shims for transitive dependencies.
- Make `@vue-solana/vue` installable by itself for Vue users, while preserving existing Vue composable behavior and compatibility with apps that already import `@vue-solana/core` directly.
- Make `@vue-solana/nuxt` installable by itself for Nuxt users, while preserving the existing Nuxt module behavior and compatibility with apps that already import core or Vue package APIs directly.
- Keep low-level Solana, Wallet Standard, Buffer, encoding, and crypto dependencies behind Vue Solana package dependencies where possible.
- Update docs, examples, and the public `vue-solana` skill so the primary setup path matches the standalone install model.
- Add fresh published-consumer smoke tests that prove standalone installs work outside workspace aliases and local repo shims.

## Resolved Architecture Decisions

- `@vue-solana/core` remains a real dependency of `@vue-solana/vue`; `@vue-solana/vue` remains a real dependency of `@vue-solana/nuxt`; `@vue-solana/nuxt` should depend on `@vue-solana/core` only if its implementation imports core directly.
- `@vue-solana/vue` will expose Vue-facing re-export subpaths for raw Solana primitives and Buffer helpers: `@vue-solana/vue/web3` and `@vue-solana/vue/buffer-polyfill`.
- `@vue-solana/nuxt` will expose Nuxt-facing re-export subpaths for raw Solana primitives and Buffer helpers: `@vue-solana/nuxt/web3` and `@vue-solana/nuxt/buffer-polyfill`.
- Nuxt should continue auto-importing composables only; raw Solana primitives should be explicit imports to avoid naming collisions and hidden bundle behavior.
- Current `@vue-solana/core/*` subpaths remain supported and documented as lower-level/framework-agnostic imports, not the primary Vue or Nuxt path.
- The current `@solana/web3-compat` TypeScript metadata issue should be fixed with package-owned published declaration shims first, preserving the public API rather than redesigning declarations around it.
- Standalone install verification should be a committed executable script, exposed through a root package script such as `pnpm smoke:standalone-installs`, with CI wiring left as a later option.
- This follow-up should include a changeset when public export subpaths, export maps, published declarations, dependency metadata, or release-impacting package behavior change. Docs/tests-only edits do not require a changeset.

## Current State

- [x] `packages/core/src/web3.ts` re-exports selected `@solana/web3-compat` types and classes.
- [x] `packages/core/src/buffer-polyfill.ts` exports `installSolanaBufferPolyfill()` and `Buffer` from `buffer/`.
- [x] `packages/core/src/index.ts` exports both modules from the root package entry.
- [x] `packages/core/package.json` exposes `./web3` and `./buffer-polyfill` subpaths.
- [x] Dependency metadata has been reviewed against the desired simplified consumer install commands.
- [x] Docs, examples, and skill guidance still need to consistently use the simplified install/import pattern.
- [x] Final typecheck, tests, and build still need to be run after edits.
- [x] Review found the standalone install goal is not complete: published declarations may still leak the broken `@solana/web3-compat` type metadata.
- [x] Review found Vue/Nuxt examples still import `@vue-solana/core` directly, so `@vue-solana/vue` and `@vue-solana/nuxt` are not demonstrated as standalone package installs for common transaction flows.
- [x] Review found no fresh pack/install/typecheck smoke test proving standalone installs work outside the monorepo workspace.
- [x] Review found `useProgramAccounts` still exposes a `Buffer` generic default without an imported or package-owned public Buffer type.

## Phase 1: Validate Core Public API (complete)

**Description:** Confirm the completed core API is sufficient for downstream docs and examples before changing user-facing guidance.

**Tasks:**

- [x] Review `packages/core/src/web3.ts` and ensure it re-exports every Solana primitive used by docs and examples.
- [x] Review `packages/core/src/buffer-polyfill.ts` and confirm `installSolanaBufferPolyfill()` is the only recommended browser polyfill setup API.
- [x] Review core export map tests and add coverage only if an existing public subpath is untested.

**Acceptance Criteria:**

- [x] All documented raw Solana primitive imports can come from `@vue-solana/core/web3`.
- [x] Browser Buffer setup can be documented as `import { installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill"`.
- [x] No docs or examples require importing `Buffer` directly from `buffer/` for normal setup.

**Verification:**

- [x] Run targeted core tests if changed: `pnpm test packages/core/src/web3.test.ts packages/core/src/buffer-polyfill.test.ts packages/core/src/export-map-docs.test.ts`.
- [x] If no tests are changed, verify via existing final `pnpm test` in Phase 4.

**Dependencies:** None.

**Files Likely Touched:**

- `packages/core/src/web3.ts`
- `packages/core/src/buffer-polyfill.ts`
- `packages/core/src/export-map-docs.test.ts`
- `packages/core/src/buffer-polyfill.test.ts`

**Estimated Scope:** Small.

## Phase 2: Update Package Dependency Metadata (complete)

**Description:** Align package metadata with the intended consumer experience, where Vue/Nuxt users install Vue Solana packages without manually installing low-level Solana or Buffer dependencies unless they intentionally import those packages directly.

**Tasks:**

- [x] Review `packages/core/package.json` dependencies and confirm `@solana/web3-compat` and `buffer` remain direct dependencies because core publicly re-exports and wraps them.
- [x] Review `packages/vue/package.json` and `packages/nuxt/package.json` to confirm their dependencies are sufficient for consumers using `@vue-solana/vue` or `@vue-solana/nuxt`.
- [x] Decide whether docs should ask Vue users to install only `@vue-solana/vue` and Nuxt users to install only `@vue-solana/nuxt`, or whether explicit `@vue-solana/core` install remains useful for direct subpath imports.
- [x] Add a changeset if metadata changes affect published packages.

**Acceptance Criteria:**

- [x] Package metadata supports the documented install commands without hidden peer dependency requirements for `@solana/web3-compat` or `buffer`.
- [x] Published packages retain valid export maps for `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill`.
- [x] Any dependency metadata changes are reflected in a changeset when release-impacting.

**Verification:**

- [x] Run `pnpm install --lockfile-only` if dependency metadata changes.
- [x] Inspect `pnpm-lock.yaml` changes to confirm only intended dependency graph updates occurred.
- [x] Restore `pnpm-lock.yaml` after inspection because the generated lockfile diff contained unrelated dependency re-resolution churn.

**Dependencies:** Phase 1.

**Files Likely Touched:**

- `packages/core/package.json`
- `packages/vue/package.json`
- `packages/nuxt/package.json`
- `pnpm-lock.yaml`
- `.changeset/*.md`

**Estimated Scope:** Small to Medium.

## Checkpoint: API And Metadata (complete)

- [x] Core public import surface is final.
- [x] Dependency metadata matches the desired installation story.
- [x] Lockfile and changeset decisions are complete.

## Phase 3: Update Docs, Examples, And Skill Guidance (complete)

**Description:** Make every user-facing setup path consistently show the simplified install commands and imports from Vue Solana packages.

**Tasks:**

- [x] Update `README.md` install guidance to remove unnecessary direct `@solana/web3-compat` and `buffer` installs when they are no longer required.
- [x] Update `knowledge-bundle/guides/getting-started.md`, package docs, troubleshooting docs, and wallet docs to prefer `@vue-solana/core/web3` for Solana primitives.
- [x] Replace manual `buffer/` snippets with `installSolanaBufferPolyfill()` where browser polyfill setup is needed.
- [x] Update example app README files and source imports to match the new guidance.
- [x] Update `knowledge-bundle/agent-skill.md` and `skills/vue-solana/SKILL.md` so install/import recommendations match the package docs.
- [x] Keep direct `@solana/web3-compat` references only where explaining internals, legacy boundaries, or troubleshooting the upstream metadata issue.

**Acceptance Criteria:**

- [x] Vue install docs show the minimum packages a Vue app must install.
- [x] Nuxt install docs show the minimum packages a Nuxt app must install.
- [x] Examples import Solana primitives from `@vue-solana/core/web3` when they need raw primitives.
- [x] Buffer guidance uses `installSolanaBufferPolyfill()` instead of manual global assignment.
- [x] The public skill guidance does not contradict the repository docs.

**Verification:**

- [x] Search for stale low-level install guidance.
- [x] Search for stale direct Buffer setup.
- [x] Search for raw Solana primitive imports from `@solana/web3-compat` and confirm each remaining occurrence is intentional.

**Dependencies:** Phase 2.

**Files Likely Touched:**

- `README.md`
- `knowledge-bundle/guides/getting-started.md`
- `knowledge-bundle/packages/index.md`
- `knowledge-bundle/packages/core.md`
- `knowledge-bundle/packages/vue.md`
- `knowledge-bundle/packages/nuxt.md`
- `knowledge-bundle/guides/wallets.md`
- `knowledge-bundle/guides/troubleshooting.md`
- `knowledge-bundle/agent-skill.md`
- `examples/vue-vite/README.md`
- `examples/nuxt/README.md`
- `examples/vue-vite/src/**/*.ts`
- `examples/vue-vite/src/**/*.vue`
- `examples/nuxt/**/*.ts`
- `examples/nuxt/**/*.vue`
- `skills/vue-solana/SKILL.md`

**Estimated Scope:** Medium.

## Phase 4: Run Verification And Fix Failures

**Description:** Run the repository checks requested in the todo list and address any failures caused by the preceding changes.

**Tasks:**

- [x] Run `pnpm typecheck`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.
- [x] Fix any failures with the smallest correct change.
- [x] Re-run failed checks until they pass.

**Acceptance Criteria:**

- [x] TypeScript passes across all workspace packages and examples.
- [x] Unit tests pass.
- [x] Package, example, and docs builds pass through the root build script.
- [x] Any verification limitation is documented in the final handoff.

**Verification:**

- [x] `pnpm typecheck`
- [x] `pnpm test`
- [x] `pnpm build`

**Dependencies:** Phase 3.

**Files Likely Touched:** Any file needed to fix failures.

**Estimated Scope:** Small to Medium, depending on failures.

## Final Checkpoint

- [x] The original simplified Web3 import todo list is complete.
- [x] The revised standalone package install goal is complete for `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt`.
- [x] Docs, examples, skill guidance, and package metadata all tell the same standalone installation/import story.
- [x] Vue and Nuxt primary examples use their own package subpaths for raw Solana primitives and Buffer helpers.
- [x] Package-owned declaration shims remove the need for consumer-local shims on current package versions.
- [x] Fresh published-consumer smoke tests pass without workspace aliases or repo-local shims.
- [x] A committed `pnpm smoke:standalone-installs` command validates core-only, Vue-only, and Nuxt-only installs.
- [x] Changesets exist for release-impacting public export, package metadata, or published declaration changes.
- [x] All required checks pass or any environmental blocker is clearly recorded.
- [x] `AGENTS.md` is updated only if the repository state or future-agent handoff materially changes.

## Review Findings To Fix In Later Sessions

1. **Published declarations may still require extra consumer setup.** `packages/core/src/web3.ts` and existing public core types re-export/import from `@solana/web3-compat`. Because `@solana/web3-compat@0.0.21` has broken TypeScript metadata and the repo-local `types/web3-compat.d.ts` shim is not published, consumers may still hit TS resolution failures after installing only `@vue-solana/core`.
2. ~~**Vue/Nuxt standalone examples are incomplete.** The example app source imports `@vue-solana/core/web3` and `@vue-solana/core/buffer-polyfill`, and the example manifests still include direct `@vue-solana/core`. That may be valid for users intentionally using core, but it does not prove `npm i @vue-solana/vue` or `npm i @vue-solana/nuxt` is enough for common transaction examples.~~ Fixed in Phase 6.
3. ~~**Packaged-consumer verification is missing.** Existing tests run inside the workspace, with path aliases and local type shims available. They do not prove the published package tarballs work in a fresh project with only the standalone package installed.~~ Fixed in Phase 7.
4. ~~**A public Vue type still depends on ambient `Buffer`.** `packages/vue/src/composables/useProgramAccounts.ts` exposes `ProgramAccount<TData extends Buffer = Buffer>` without importing a stable public Buffer type from Vue Solana.~~ Fixed in Phase 6.

## Phase 5: Fix Published Type Declarations For Core (complete)

**Description:** Ensure a fresh consumer can install only `@vue-solana/core` and typecheck code that imports the package root, `@vue-solana/core/web3`, and `@vue-solana/core/buffer-polyfill` without adding local `@solana/web3-compat` or `buffer/` declaration shims.

**Tasks:**

- [x] Inspect generated `packages/core/dist/**/*.d.ts` after build and identify every public declaration that references `@solana/web3-compat`, `buffer/`, or any dependency with broken published declarations.
- [x] Publish package-owned declaration shims for the broken `@solana/web3-compat` metadata and any required `buffer/` subpath declarations so consumers do not need repo-local shims.
- [x] Keep the shims internal to Vue Solana's published type surface and document them as temporary until upstream metadata is fixed.
- [x] Keep runtime behavior unchanged for existing imports from `@vue-solana/core`, `@vue-solana/core/web3`, and `@vue-solana/core/buffer-polyfill`.
- [x] Update troubleshooting docs to remove local-shim instructions when no longer needed, or clearly scope them to old package versions.
- [x] Add a changeset if the shim or package file/export metadata changes published package contents.

**Acceptance Criteria:**

- [x] `@vue-solana/core` published declarations resolve in a fresh TypeScript project without repo-local `types/web3-compat.d.ts`.
- [x] Existing core public imports remain source-compatible.
- [x] Docs no longer instruct current-version users to add local shims for the default install path.
- [x] The plan for removing the shim after an upstream `@solana/web3-compat` fix is documented in troubleshooting or handoff docs.

**Verification:**

- [x] Run `pnpm build --filter @vue-solana/core` or the repository equivalent.
- [x] Run a fresh packed-package smoke test for `@vue-solana/core` outside the workspace.
- [x] Run `pnpm typecheck`.

**Dependencies:** Phase 4.

**Files Likely Touched:**

- `packages/core/src/web3.ts`
- `packages/core/src/types.ts`
- `packages/core/src/buffer-polyfill.ts`
- `packages/core/package.json`
- `packages/core/types/**/*`
- `.changeset/*.md`
- `types/web3-compat.d.ts`
- `types/buffer.d.ts`
- `README.md`
- `knowledge-bundle/guides/getting-started.md`
- `knowledge-bundle/guides/troubleshooting.md`

**Estimated Scope:** Medium.

## Phase 6: Make Vue And Nuxt Standalone Usage Paths Complete (complete)

**Description:** Ensure users can follow primary Vue and Nuxt examples after installing only `@vue-solana/vue` or `@vue-solana/nuxt`, while preserving current behavior for users who already install and import `@vue-solana/core` directly.

**Tasks:**

- [x] Add `@vue-solana/vue/web3` as a public subpath that re-exports the same raw Solana primitives already exposed by `@vue-solana/core/web3`, including `PublicKey`, `Transaction`, `TransactionInstruction`, `VersionedTransaction`, `SystemProgram`, and related documented primitives.
- [x] Add `@vue-solana/vue/buffer-polyfill` as a public subpath that re-exports `Buffer` and `installSolanaBufferPolyfill()` from the core Buffer helper.
- [x] Add `@vue-solana/nuxt/web3` as a public subpath that re-exports the same documented primitives through the Nuxt package.
- [x] Add `@vue-solana/nuxt/buffer-polyfill` as a public subpath that re-exports `Buffer` and `installSolanaBufferPolyfill()` through the Nuxt package.
- [x] Keep Nuxt auto-imports limited to composables; do not auto-import raw Solana primitives by default.
- [x] Confirm `@vue-solana/core` stays a dependency of `@vue-solana/vue`, and `@vue-solana/vue` stays a dependency of `@vue-solana/nuxt`; keep a direct Nuxt dependency on core only if Nuxt source imports core directly.
- [x] Keep existing `@vue-solana/core` subpath imports working as a supported lower-level option.
- [x] Fix `ProgramAccount<TData extends Buffer = Buffer>` to use an imported/package-owned type instead of an ambient `Buffer` type.
- [x] Update Vue/Nuxt examples and package manifests so at least one primary example for each package uses only that package as its Vue Solana dependency.
- [x] Update docs and the public skill so primary Vue examples import primitives from `@vue-solana/vue/web3` and Buffer helpers from `@vue-solana/vue/buffer-polyfill`.
- [x] Update docs and the public skill so primary Nuxt examples import primitives from `@vue-solana/nuxt/web3` and Buffer helpers from `@vue-solana/nuxt/buffer-polyfill`.
- [x] Add a changeset for the new public export subpaths and any package metadata changes.

**Acceptance Criteria:**

- [x] A Vue app can install `@vue-solana/vue` and use the documented primary Vue transaction/example flow without directly depending on `@vue-solana/core`, `@solana/web3-compat`, or `buffer`.
- [x] A Nuxt app can install `@vue-solana/nuxt` and use the documented primary Nuxt transaction/example flow without directly depending on `@vue-solana/core`, `@vue-solana/vue`, `@solana/web3-compat`, or `buffer`.
- [x] Existing direct core imports remain documented as optional advanced usage, not required for the primary path.
- [x] No public Vue declarations rely on ambient Node globals for browser-facing types.
- [x] Nuxt module behavior is unchanged except for the new documented explicit import subpaths.
- [x] Changeset coverage exists for all release-impacting package changes.

**Verification:**

- [x] Run Vue package tests and typecheck.
- [x] Run Nuxt package tests and typecheck.
- [x] Run example app typechecks after removing unnecessary direct sibling or low-level dependencies from the primary example manifests.
- [x] Search docs, examples, and skill guidance for primary-path imports from `@vue-solana/core/web3` or `@vue-solana/core/buffer-polyfill` and confirm remaining occurrences are advanced/core-specific guidance.

**Dependencies:** Phase 5.

**Files Likely Touched:**

- `packages/vue/src/index.ts`
- `packages/vue/src/web3.ts`
- `packages/vue/src/buffer-polyfill.ts`
- `packages/vue/src/composables/useProgramAccounts.ts`
- `packages/vue/package.json`
- `packages/nuxt/src/runtime/web3.ts`
- `packages/nuxt/src/runtime/buffer-polyfill.ts`
- `packages/nuxt/src/runtime/plugin.ts`
- `packages/nuxt/src/module.ts`
- `packages/nuxt/package.json`
- `examples/vue-vite/package.json`
- `examples/vue-vite/src/App.vue`
- `examples/nuxt/package.json`
- `examples/nuxt/app/app.vue`
- `README.md`
- `knowledge-bundle/guides/getting-started.md`
- `knowledge-bundle/packages/vue.md`
- `knowledge-bundle/packages/nuxt.md`
- `skills/vue-solana/SKILL.md`
- `.changeset/*.md`

**Estimated Scope:** Medium.

## Phase 7: Add Fresh Standalone Install Smoke Tests (complete)

**Description:** Add verification that builds or packs the packages, installs each package into a temporary consumer project, and typechecks representative usage without workspace aliases, local repo shims, or undeclared direct dependencies.

**Tasks:**

- [x] Add `scripts/smoke-standalone-installs.mjs` to pack `@vue-solana/core`, `@vue-solana/vue`, and `@vue-solana/nuxt` from the current workspace.
- [x] Add a root package script such as `"smoke:standalone-installs": "node scripts/smoke-standalone-installs.mjs"`.
- [x] Create minimal temporary consumers for core-only, Vue-only, and Nuxt-only installs.
- [x] Typecheck imports from each package using only that package plus required framework peers.
- [x] Include a transaction/raw-primitive usage case for `@vue-solana/core/web3`, `@vue-solana/vue/web3`, and `@vue-solana/nuxt/web3`.
- [x] Include a Buffer helper usage case for `@vue-solana/core/buffer-polyfill`, `@vue-solana/vue/buffer-polyfill`, and `@vue-solana/nuxt/buffer-polyfill`.
- [x] Ensure the smoke test fails if a consumer accidentally relies on workspace aliases, repo-local shims, or undeclared sibling package installs.
- [x] Document the smoke command in `README.md` or `knowledge-bundle/guides/getting-started.md` as the release-facing standalone install check.

**Acceptance Criteria:**

- [x] Core smoke test passes with only `@vue-solana/core` installed as the Vue Solana dependency.
- [x] Vue smoke test passes with only `@vue-solana/vue` installed as the Vue Solana dependency.
- [x] Nuxt smoke test passes with only `@vue-solana/nuxt` installed as the Vue Solana dependency.
- [x] The smoke test is documented in the plan and easy for future agents to run before release.
- [x] The smoke test is executable outside Vitest and produces package-manager/typecheck output that is easy to debug.

**Verification:**

- [x] Run the standalone install smoke test.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm test`.
- [x] Run `pnpm build`.

**Dependencies:** Phase 6.

**Files Likely Touched:**

- `package.json`
- `scripts/smoke-standalone-installs.mjs`
- `test/**/*`
- `knowledge-bundle/guides/getting-started.md`
- `README.md`

**Estimated Scope:** Medium.

## Risks And Mitigations

| Risk                                                                                                       | Impact | Mitigation                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Docs imply consumers do not need `@vue-solana/core`, but examples import `@vue-solana/core/web3` directly. | High   | Add standalone Vue/Nuxt exports or examples that do not require direct core installs; keep core imports as optional advanced usage. |
| Removing explicit low-level install guidance hides peer/dependency issues in package managers.             | Medium | Validate package dependencies and lockfile after metadata changes, then add fresh packed-consumer smoke tests.                      |
| `@solana/web3-compat` metadata issue still affects published consumers.                                    | High   | Fix published declaration output or package-owned shims so current users do not need local shims for standalone installs.           |
| Buffer polyfill guidance differs between Vite and Nuxt examples.                                           | Low    | Use the same helper API in both examples and only mention framework-specific placement.                                             |
| Standalone fixes could break existing users who directly import `@vue-solana/core` subpaths.               | High   | Treat existing core root and subpath exports as compatibility constraints and verify them in tests.                                 |

## Resolved Questions And Answers

- Should `@vue-solana/vue` re-export raw Solana primitives and Buffer helpers directly, or should primary Vue examples avoid raw primitives entirely?

**Answer:** @vue-solana/vue should re-export the raw Solana primitives and Buffer helpers directly.
Reasoning:
It best matches the standalone install goal: Vue users can install only @vue-solana/vue and follow examples without learning that @vue-solana/core exists.
It preserves current behavior because @vue-solana/core/web3 and @vue-solana/core/buffer-polyfill can remain supported lower-level imports.
Transaction examples naturally need PublicKey, Transaction, TransactionInstruction, and sometimes Buffer setup. Avoiding raw primitives entirely would make examples less realistic.
This makes @vue-solana/vue feel like the complete Vue-facing package, while @vue-solana/core remains available for advanced/framework-agnostic users.
Recommended shape:
Re-export from @vue-solana/vue/web3:
PublicKey
Transaction
TransactionInstruction
VersionedTransaction
SystemProgram
other primitives already exposed by core
Re-export from @vue-solana/vue/buffer-polyfill:
Buffer
installSolanaBufferPolyfill
Optionally also export from the root @vue-solana/vue if you want maximal convenience, but I’d prefer subpaths to avoid cluttering the composable/plugin API.
So the primary Vue example becomes:
import { PublicKey, Transaction } from "@vue-solana/vue/web3"
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill"
And @vue-solana/core/\* stays documented as the lower-level equivalent, not the primary Vue path.

so @vue-solana/core/\* stays a dependency for vue and nuxt package?

Yes. @vue-solana/core should stay a real dependency of both @vue-solana/vue and @vue-solana/nuxt.
Suggested dependency chain:

- @vue-solana/core depends on low-level Solana/Wallet/Buffer packages.
- @vue-solana/vue depends on @vue-solana/core.
- @vue-solana/nuxt depends on @vue-solana/vue and probably @vue-solana/core only if it imports core directly.
  The standalone goal means users should not have to install those dependencies manually. It does not mean each package must duplicate core internally.
  So for a Vue user:
  npm i @vue-solana/vue
  @vue-solana/core is installed transitively, and @vue-solana/vue/web3 can re-export from core.
  For a Nuxt user:
  npm i @vue-solana/nuxt
  @vue-solana/vue and @vue-solana/core are installed transitively.
  The key rule: app code should not need to import from a transitive dependency for the primary path. So Vue docs should prefer @vue-solana/vue/_, Nuxt docs should prefer @vue-solana/nuxt/_ or Nuxt auto-imports, while @vue-solana/core/\* remains available for users who intentionally install/use the framework-agnostic package.

- Should `@vue-solana/nuxt` re-export raw Solana primitives and Buffer helpers directly, or rely on Nuxt auto-import/runtime integration only?

**Answer:** @vue-solana/nuxt should re-export raw Solana primitives and Buffer helpers directly too, but keep auto-imports/composables as the primary Nuxt ergonomics.
Reasoning:
It keeps the standalone promise clean: Nuxt users can install only @vue-solana/nuxt and import everything documented from that package.
Nuxt auto-imports are great for composables, but raw classes like PublicKey, Transaction, and TransactionInstruction are better as explicit imports. Auto-importing these can create naming collisions and make bundle behavior less obvious.
Buffer setup is usually a runtime concern, so the Nuxt module should still handle the common case automatically if possible. But exposing @vue-solana/nuxt/buffer-polyfill gives users an escape hatch for manual setup and examples.
It preserves layering: Nuxt re-exports from Vue/core, Vue re-exports from core, and core owns the actual low-level dependencies.
Recommended shape:
@vue-solana/nuxt/web3 re-exports the same primitives as @vue-solana/vue/web3.
@vue-solana/nuxt/buffer-polyfill re-exports Buffer and installSolanaBufferPolyfill.
Nuxt module continues auto-importing composables only, not raw Solana primitives.
Docs use explicit imports for primitives:
import { PublicKey, Transaction } from "@vue-solana/nuxt/web3"
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill"
Advanced docs can still mention @vue-solana/core/\* for framework-agnostic usage.
So: yes to direct Nuxt re-export subpaths, no to auto-importing raw web3 primitives by default.

- Should the package publish an internal declaration shim for `@solana/web3-compat`, or should public declarations be redesigned to avoid depending on its broken metadata?

**Answer:** I suggest publishing a package-owned declaration shim first, not redesigning the public API yet.
Reasoning:

- It is the smallest fix that preserves current behavior.
- @vue-solana/core/web3 intentionally exposes web3-compat classes like PublicKey, Transaction, and Connection; redesigning around those would be a larger API change.
- The problem is upstream package metadata, not the conceptual API. A shim is a compatibility workaround until @solana/web3-compat fixes its published declarations.
- It avoids breaking users who already rely on the current exported types/classes.
- It supports the standalone install goal immediately: users install @vue-solana/core, @vue-solana/vue, or @vue-solana/nuxt without adding their own local shim.
  Recommended approach:
- Include a declaration shim in the published package output.
- Keep it internal to Vue Solana’s published types, not something users copy into their app.
- Add a packaging smoke test proving a fresh consumer typechecks without types/web3-compat.d.ts.
- Track removal later once a future @solana/web3-compat version ships valid root declarations.
  I would avoid redesigning public declarations unless:
- the shim cannot reliably be made visible to consumers, or
- @solana/web3-compat remains broken long-term, or
- you want to move away from exposing compat classes as public API.
  So the plan should be: shim now, preserve API, add smoke tests, remove shim later when upstream is fixed.

- Should the standalone smoke test live as a committed script, a Vitest integration test, or release-only documentation?

**Answer:** I suggest a committed script, with a thin test/CI wrapper later if needed.
Best option:

- Add something like scripts/smoke-standalone-installs.mjs.
- Wire it to a package script, for example pnpm smoke:standalone-installs.
- Have it build/pack the packages, create temp consumer projects, install only the target package plus required peers, and run tsc --noEmit.
  Why not Vitest first:
- This is more of a package-manager/published-artifact test than a unit/integration test.
- It needs temp directories, package packing, installs, and TypeScript project setup.
- Vitest can do it, but it tends to make filesystem/package-manager smoke tests harder to debug.
  Why not release-only docs:
- Too easy to skip.
- The whole risk is that workspace tests give false confidence, so it should be executable and eventually CI-able.
  Recommended structure:
- scripts/smoke-standalone-installs.mjs
- Root script: "smoke:standalone-installs": "node scripts/smoke-standalone-installs.mjs"
- Initial manual/run-on-demand check.
- CI should run it on release PRs or package metadata changes.
  Test cases:
- Core consumer installs only @vue-solana/core.
- Vue consumer installs only @vue-solana/vue plus vue.
- Nuxt consumer installs only @vue-solana/nuxt plus Nuxt-required peers if needed.
- Each consumer typechecks imports from the documented package paths.
- The script must not rely on workspace aliases or repo-local shims.

- Should this follow-up include a changeset if only docs/tests change, or only when package metadata/public exports change?

**Answer:** For the standalone-install plan, I expect a changeset because likely changes include:

- Adding public export subpaths like @vue-solana/vue/web3.
- Adding public export subpaths like @vue-solana/vue/buffer-polyfill.
- Adding public export subpaths like @vue-solana/nuxt/web3.
- Adding public export subpaths like @vue-solana/nuxt/buffer-polyfill.
- Possibly changing package.json exports, files, or dependency metadata.
- Possibly changing published declaration contents/shims.
