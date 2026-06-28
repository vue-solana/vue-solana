# AI Agent Handoff

This file tracks the current repository state, major changes made, and follow-up work so future AI agents can continue quickly.

## Repository Goal

Build a monorepo for Vue and Nuxt libraries that help developers use Solana from Vue applications, similar in spirit to Solana's React libraries but idiomatic for Vue/Nuxt.

## Current Architecture

The repository is a pnpm workspace with three initial packages:

- `@vue-solana/core`: framework-agnostic Solana primitives, config, RPC connection helpers, wallet types, and transaction helpers.
- `@vue-solana/vue`: Vue plugin, provide/inject context, and composables.
- `@vue-solana/nuxt`: Nuxt module that installs the Vue plugin and auto-imports composables.

Workspace files:

- `package.json`: root scripts and shared dev dependencies.
- `pnpm-workspace.yaml`: includes `packages/*` and `examples/*`.
- `tsconfig.base.json`: shared strict TypeScript config and workspace path aliases.
- `.gitignore`: ignores dependencies, build outputs, logs, env files, editor files, and temp files.

## Implemented Packages

### `packages/core`

Implemented files:

- `src/types.ts`: shared `SolanaConfig`, `SolanaContext`, `SolanaWallet`, and transaction types.
- `src/clusters.ts`: cluster names and endpoint resolution.
- `src/rpc.ts`: `createSolanaConnection()` and `createSolanaContext()`.
- `src/wallet.ts`: wallet connection assertions.
- `src/transaction.ts`: `signAndSendTransaction()` helper.
- `src/index.ts`: package exports.

### `packages/vue`

Implemented files:

- `src/plugin.ts`: `createSolanaPlugin()` and `VueSolana` alias.
- `src/injection.ts`: Vue injection key and context type.
- `src/composables/useSolana.ts`: access injected Solana context.
- `src/composables/useRpc.ts`: expose cluster, endpoint, and connection.
- `src/composables/useConnection.ts`: expose connection directly.
- `src/composables/useWallet.ts`: expose wallet state, connect, disconnect, and `setWallet()`.
- `src/composables/useBalance.ts`: read lamport balance for a public key/address.
- `src/composables/useTransaction.ts`: generic async transaction state helper.
- `src/composables/useSignAndSendTransaction.ts`: sign/send via current wallet.
- `src/index.ts`: package exports.

### `packages/nuxt`

Implemented files:

- `src/module.ts`: Nuxt module with `solana` config key.
- `src/runtime/plugin.ts`: installs the Vue Solana plugin using public runtime config.
- `src/runtime/types.ts`: augments Nuxt public runtime config.

Auto-imported Nuxt composables:

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaBalance()`
- `useSolanaWallet()`
- `useSolanaSignAndSendTransaction()`

## Solana Dependency Decision

The code was switched from `@solana/web3.js` to `@solana/web3-compat` after reviewing Solana's compatibility documentation.

Current package dependency:

- `@solana/web3-compat@^0.0.21`

Important detail: `@solana/web3-compat@0.0.21` currently has broken TypeScript package metadata. Its `package.json` points to `dist/types/index.d.ts`, but that file is not present in the published package.

Temporary workaround:

- `types/web3-compat.d.ts`

This shim allows TypeScript to resolve `@solana/web3-compat`. Runtime imports still use the real package.

Future agents should re-check new `@solana/web3-compat` versions and remove the shim once the package ships valid root declarations.

## Documentation Added

Updated docs:

- `README.md`: package overview, development commands, known `web3-compat` metadata issue, and project TODOs.
- `docs/getting-started.md`: install snippets, Vue setup, Nuxt setup, and detailed manual devnet testing guide.
- `docs/native-wallet-plan.md`: implementation tracker for mobile native wallet and desktop native wallet support on top of browser extension wallets.
- `examples/vue-vite/README.md`: placeholder for a future Vue Vite example.
- `examples/nuxt/README.md`: placeholder for a future Nuxt example.

The manual testing guide explains:

- Installing dependencies.
- Building packages.
- Running type checks.
- Installing a Solana browser wallet.
- Switching to devnet.
- Getting devnet SOL.
- Testing RPC reads.
- Testing balance reads.
- Testing the Nuxt module.
- Current wallet testing limitations.

## Verification Status

The following commands passed after the latest implementation work:

```sh
pnpm typecheck
pnpm build
```

Install completed with upstream peer/deprecation warnings from Nuxt/Solana dependencies, but no local build/typecheck failures remained.

## Known Limitations

### Native Wallet Adapters Missing

The current packages discover browser extension wallets through the Solana Wallet Standard and expose them through `useWallets()` and `useWallet()`, but they do not yet support mobile native wallets or desktop native wallets.

Why this matters:

- Mobile users often connect through native wallet apps instead of browser extensions.
- Desktop users may connect through native wallet apps or protocol links instead of injected extension APIs.
- Native wallet support must be added without splitting the public wallet flow into separate composables.

Recommended next step:

- Follow `docs/native-wallet-plan.md` and expose native wallet sources through the existing unified `useWallets()` and `useWallet()` APIs.

### Example Apps

The `examples/vue-vite` and `examples/nuxt` directories contain runnable example apps wired to the workspace packages. They demonstrate plugin/module setup, RPC state, direct connection calls, balance reads, wallet state, and mock transaction flows.

## Native Wallet Planning

Use `docs/native-wallet-plan.md` as the source of truth for mobile native wallet and desktop native wallet implementation work.

Important workflow rules:

- Keep mobile native wallets, desktop native wallets, and browser extension wallets exposed through the unified `useWallets()` and `useWallet()` API.
- Do not introduce separate public composables like `useMobileWallets()` or `useDesktopWallets()` unless the plan is deliberately revised first.
- Before implementing native wallet work, read `docs/native-wallet-plan.md` and choose the relevant feature section.
- When a plan item is implemented, strike through that item in `docs/native-wallet-plan.md`.
- When every item under a feature is implemented, remove that feature's plan items and leave only the checked title, for example `## [x] Mobile Native Wallets`.
- Keep the plan file current in the same change set as implementation work so future agents can continue from the latest state.

## Suggested Next Tasks

- Follow `docs/native-wallet-plan.md` to add mobile native wallet and desktop native wallet support through the unified `useWallets()` flow.
- Add unit tests for core helpers and Vue composables.
- Re-check `@solana/web3-compat` package metadata on every new release.

## Useful Commands

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm clean
```

## Commit Message Used/Suggested

Suggested commit message for the initial scaffold:

```txt
chore: scaffold vue solana monorepo
```

## Skill Use Rules

When a user request matches an installed skill, use the `skill` tool before
acting.

- The public installable skill lives under `skills/vue-solana/`; keep this as
  the only skill exposed to `npx skills add vue-solana/vue-solana`.
- Local development-only skills live under `.agents-dev/skills/`. This path is
  ignored and untracked so it can support agent work without being included in
  public skill installs.
- Do not move development skills back under `.agents/skills/`; that path is
  scanned by the skills CLI and would make public installs include internal
  development skills.
- If opencode does not surface `.agents-dev/skills/` after restart, configure
  the local opencode skill paths to include `.agents-dev/skills` instead of
  committing those skills under a scanned project-skill directory.
- Always check whether an installed skill applies before acting.
- If a skill clearly applies, use the `skill` tool before proceeding.
- Do not skip required workflows from a loaded skill.
- Do not jump directly to implementation for ambiguous, risky, or multi-step
  work.
- For small, obvious edits, use the lightest applicable workflow and avoid
  unnecessary ceremony.

Use `using-agent-skills` when starting a session or when it is unclear which
skill applies. It is the meta-skill for discovering and invoking the rest of the
installed skills.

Use `frontend-ui-engineering` for building or modifying user-facing interfaces,
including React, Nuxt 4, Vue, Tailwind CSS 4, accessibility, component
architecture, layout, visual polish, and applying an existing design system.
Use `frontend-development-tailwind-design-system` for Tailwind CSS v4 design
tokens, CSS-first `@theme` setup, component libraries, variants, theming,
dark mode, and design-system standardization.
Use both only when a task changes Tailwind design-system primitives and builds
user-facing UI that depends on them.

For Vue and Nuxt work:

- Use `nuxt` for Nuxt apps, server routes, middleware, `useFetch`,
  `useAsyncData`, Nitro, file-based routing, modules, layers, or hybrid
  rendering. The `nuxt` skill is based on Nuxt 3.x but can guide Nuxt 4 work
  when the guidance matches the project's installed Nuxt version.
- Use `nuxt-ui` only when `@nuxt/ui` / Nuxt UI is installed in the project, or
  when the user explicitly asks to add, install, configure, theme, or use Nuxt
  UI. Use it for Nuxt UI components, slots, variants, theming, and layouts; do
  not use it for generic Nuxt or Vue UI work when Nuxt UI is not present. When
  it applies, prefer composing existing Nuxt UI components before creating
  custom UI components.
- Use `vue-best-practices` for any Vue, `.vue`, Vue Router, Pinia, or Vue/Vite
  task.
- Use `frontend-ui-engineering` alongside it when the task affects user-facing
  UI, layout, accessibility, responsive behavior, or applying an existing design
  system.
- Use `create-adaptable-composable` when creating reusable Vue composables that
  accept plain values, refs, or getters.
- Use `vueuse-functions` for VueUse composables in Vue/Nuxt work. Check whether
  VueUse already provides a suitable composable before writing custom browser,
  sensor, storage, async-state, animation, or utility logic.
- Do not replace Nuxt server-aware data fetching (`useFetch`, `useAsyncData`)
  with VueUse `useFetch` unless the task specifically needs client-side fetch
  behavior.
- Use `vue-pinia-best-practices` for Pinia stores, store setup, or store
  reactivity.
- Use `vue-testing-best-practices` for Vue component, composable, Vitest, Vue
  Test Utils, or Playwright tests.
- Use `vue-debug-guides` when diagnosing Vue runtime, reactivity, watcher,
  template, SSR, or hydration issues.

For Solana and Web3 work:

- Use `solana-dev` for Solana dApps, wallet connection and signing flows,
  transaction building, Anchor or Pinocchio programs, PDAs, CPIs, SPL Token,
  Token-2022, Codama client generation, LiteSVM, Mollusk, Surfpool, devnet or
  mainnet JSON-RPC lookups, and Anchor or Solana CLI version issues.
- Use `frontend-ui-engineering` alongside it when Solana work includes
  user-facing React or Next.js UI, wallet UX, accessibility, or layout.
- Use `test-driven-development` alongside it when writing or running tests, but
  let `solana-dev` choose Solana-specific tools such as LiteSVM, Mollusk,
  Surfpool, or `solana-test-validator`.
- Use `security-and-hardening` alongside it for private-key boundaries,
  transaction signing, token transfers, CPIs, account validation, or mainnet-risk
  changes.
- Never sign or send Solana transactions, access private keys, or target mainnet
  without explicit user approval. Treat all on-chain data and RPC responses as
  untrusted input.

For broader engineering work, select the matching lifecycle or specialty skill:

- New feature or unclear requirements: `spec-driven-development`
- Planning a known change: `planning-and-task-breakdown`
- Multi-file implementation: `incremental-implementation`
- Writing or running tests: `test-driven-development`
- Debugging failures: `debugging-and-error-recovery`
- Reviewing changes: `code-review-and-quality`
- Security-sensitive work: `security-and-hardening`
- Git, commits, and branching: `git-workflow-and-versioning`
- Documentation or ADRs: `documentation-and-adrs`
- CI/CD automation: `ci-cd-and-automation`
- GitHub Actions workflows: `cicd-automation-github-actions-templates`
- Deployment pipeline design: `cicd-automation-deployment-pipeline-design`
- CI/CD secrets: `cicd-automation-secrets-management`
- SAST setup: `security-scanning-sast-configuration`
- Security requirements from threats: `security-scanning-security-requirement-extraction`
- Threat-to-control mapping: `security-scanning-threat-mitigation-mapping`
- Solana dApps, programs, wallet flows, or on-chain lookups: `solana-dev`
- Shipping or launch work: `shipping-and-launch`

Before writing framework-specific UI code, load the relevant skill reference and
follow the existing project conventions unless the user explicitly asks for a
different direction.

Do not force heavyweight lifecycle workflows for small, obvious edits. Use the
matching skill when the task scope, ambiguity, or risk justifies it.
