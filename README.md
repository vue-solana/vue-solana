# vue-solana

Vue and Nuxt libraries for building Solana applications.

This project is early-stage. RPC reads, account reads, balance reads, browser extension wallets, Android mobile wallets, iOS browser wallets, and transaction helpers are usable.

## Packages

- [`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core): framework-agnostic Solana configuration, RPC, and wallet primitives.
- [`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue): Vue plugin and composables.
- [`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt): Nuxt module wrapping the Vue package with auto-imported composables.

## Which Package Should I Use?

Use `@solana/web3-compat` directly if you only need raw Solana APIs such as `Connection`, `PublicKey`, and transactions.

Use [`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) if you want shared Solana config, cluster endpoint defaults, wallet types, and transaction helpers without Vue.

Use [`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) in Vue apps.

Use [`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) in Nuxt apps.

`@vue-solana/core` does not replace `@solana/web3-compat`. It builds on top of it and keeps shared Vue Solana behavior in one place.

## Clusters

Supported clusters:

- `mainnet-beta`: Solana mainnet. This is Solana's official mainnet cluster name. Use it for production apps and real SOL.
- `devnet`: developer network with free test SOL.
- `testnet`: validator and protocol testing network.
- `localnet`: local validator, usually `http://127.0.0.1:8899`.

Use `mainnet-beta` rather than `mainnet`. See [Solana Concepts For Vue Developers](./docs/solana-concepts.md) for more background.

## Install

For Vue:

```sh
pnpm add @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

For Nuxt:

```sh
pnpm add @vue-solana/nuxt @vue-solana/vue @vue-solana/core @solana/web3-compat buffer
```

## Wallet Support

Current wallet support:

- Browser extension wallets through Wallet Standard packages: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features`, and Solana signing features from `@solana/wallet-standard-features`.
- Android native mobile wallets through `@solana-mobile/wallet-standard-mobile`, which registers Solana Mobile Wallet Adapter as a Wallet Standard wallet on Android Chrome and Chrome PWAs.
- iOS browser wallets for Phantom, Solflare, and Backpack through wallet-specific universal links.
- Manual/custom wallet objects that implement the `SolanaWallet` interface.

Not supported yet, but planned:

- Desktop native app wallets. These require wallet-specific protocol links or future native Wallet Standard registration.
- A built-in wallet modal. Apps should build their own selection UI with `useWallets()`.

All supported wallet sources use the same public flow: `useWallets()` for discovery and selection, then `useWallet()` for active wallet state, `connect()`, `disconnect()`, and signing.

## Import Paths

Root package exports remain supported for compatibility. New code can use direct subpath exports for narrower imports:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";
import type { SolanaConfig } from "@vue-solana/core/types";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";
import { useRpc } from "@vue-solana/vue/useRpc";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";
import { useWallet } from "@vue-solana/vue/useWallet";
```

The Nuxt module auto-imports composables from these direct Vue subpaths and keeps its runtime plugin client-only. Auto-imported composables are SSR-safe, but real RPC and wallet work should run after hydration.

Use `useProgramAccounts()` carefully on public RPC nodes. Prefer narrow filters, `dataSlice`, and dedicated RPC infrastructure for production account scans.

## Documentation

The dedicated Nuxt Content docs app lives at [`apps/docs`](./apps/docs). It adapts the current root `docs/` material into a navigable documentation site for the full Vue Solana ecosystem.

Live demo: [vue-solana-docs.vercel.app/demo](https://vue-solana-docs.vercel.app/demo)

Run it locally:

```sh
pnpm dev:docs
```

Docs app pages:

- [Docs overview](./apps/docs/content/index.md)
- [Getting Started](./apps/docs/content/getting-started.md)
- [Solana For Vue Developers](./apps/docs/content/concepts/solana-for-vue-developers.md)
- [Clusters](./apps/docs/content/concepts/clusters.md)
- [Wallets](./apps/docs/content/concepts/wallets.md)
- [`@vue-solana/core`](./apps/docs/content/packages/core.md)
- [`@vue-solana/vue`](./apps/docs/content/packages/vue.md)
- [`@vue-solana/nuxt`](./apps/docs/content/packages/nuxt.md)
- [Live demo](https://vue-solana-docs.vercel.app/demo)
- [Vue Vite example docs](./apps/docs/content/examples/vue-vite.md)
- [Nuxt example docs](./apps/docs/content/examples/nuxt.md)
- [Troubleshooting](./apps/docs/content/troubleshooting.md)

Root `docs/` is kept for now as reference material:

- [Getting Started](./docs/getting-started.md)
- [Solana Concepts For Vue Developers](./docs/solana-concepts.md)
- [API Reference](./docs/api.md)
- [Wallet Support](./docs/wallets.md)
- [v1 Roadmap](./docs/plans/v1-roadmap.md)
- [Agent Skill](./docs/agent-skill.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [`@vue-solana/core` README](./packages/core/README.md)
- [`@vue-solana/vue` README](./packages/vue/README.md)
- [`@vue-solana/nuxt` README](./packages/nuxt/README.md)

## Agent Skill

This repository includes an installable Agent Skill for AI coding agents that support the Agent Skills format. The skill gives agents Vue Solana setup patterns, wallet flow guidance, Nuxt SSR caveats, transaction gotchas, and verification commands.

```sh
# Install all skills
npx skills add vue-solana/vue-solana

# Install the Vue Solana skill
npx skills add vue-solana/vue-solana --skill vue-solana

# List available skills
npx skills add vue-solana/vue-solana --list

# Install globally
npx skills add vue-solana/vue-solana --global
```

Skill source: [`skills/vue-solana/SKILL.md`](./skills/vue-solana/SKILL.md)

More details: [Agent Skill docs](./docs/agent-skill.md)

## Development

```sh
pnpm install
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
pnpm dev:docs
```

`pnpm install` runs the root `prepare` script and installs the Husky Git hooks. If hooks are missing after changing package managers or reinstalling dependencies, run `pnpm prepare` from the repository root.

Pre-commit checks run through lint-staged and only lint/format staged files. Run `pnpm lint`, `pnpm format`, `pnpm test`, `pnpm typecheck`, and `pnpm build:packages` before opening larger pull requests.

## CI And Releases

GitHub Actions runs CI on pull requests and pushes to `main`:

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
```

Package releases are managed with Changesets. For package-facing changes, add a changeset before opening a pull request:

```sh
pnpm changeset
```

Add a changeset for changes that affect published packages, including runtime behavior fixes, public API changes, package dependency changes that affect consumers, and package README/docs updates that should appear in published package metadata.

Do not add a changeset for repository-only changes such as CI updates, tests-only changes, formatting, linting, or root documentation that does not affect a published package.

When changes with pending changesets land on `main`, the release workflow opens or updates a version PR. Merging that version PR publishes changed packages to npm using npm Trusted Publishing with GitHub Actions OIDC.

Release flow:

1. Open a pull request with package changes and a changeset.
2. Merge the pull request into `main` after CI passes.
3. Wait for the `Release` workflow to open or update the `chore: version packages` PR.
4. Review and merge the version PR.
5. Confirm the next `Release` workflow run publishes the changed packages.

To verify a release, check GitHub Actions for the latest `Release` workflow run. The version PR run should create or update the release PR, and the version PR merge run should publish packages. You can also verify published versions on npm:

```sh
pnpm view @vue-solana/core version
pnpm view @vue-solana/vue version
pnpm view @vue-solana/nuxt version
```

Before publishing, configure a trusted publisher on npm for each published package:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`

Use these npm trusted publisher settings:

- Publisher: GitHub Actions
- Organization or user: `vue-solana`
- Repository: `vue-solana`
- Workflow filename: `release.yml`
- Allowed action: `npm publish`

The release workflow does not use a long-lived `NPM_TOKEN` secret.

## Example Apps

Small usage snippets are included in the package docs for quick reference. For a complete runnable flow, use the example apps:

- Live demo: [vue-solana-docs.vercel.app/demo](https://vue-solana-docs.vercel.app/demo)
- Vue Vite example: [`examples/vue-vite`](./examples/vue-vite)
- Nuxt example: [`examples/nuxt`](./examples/nuxt)
- Documentation app: [`apps/docs`](./apps/docs)

Run them from the repository root:

```sh
pnpm dev:vue
pnpm dev:nuxt
pnpm dev:docs
```

## Known Issues

### `@solana/web3-compat` Type Metadata

`@solana/web3-compat@0.0.21` currently has broken TypeScript metadata. Its package metadata points to `dist/types/index.d.ts`, but that file is not included in the published package.

This repository includes `types/web3-compat.d.ts` as a temporary shim so TypeScript can resolve the package while runtime imports still use `@solana/web3-compat`.

Consumer workaround:

If your app reports that TypeScript cannot find declarations for `@solana/web3-compat`, add a local declaration file such as `types/web3-compat.d.ts`:

```ts
declare module "@solana/web3-compat" {
  export type {
    AccountInfo,
    Commitment,
    RpcResponseAndContext,
    SendOptions,
    SignatureResult,
    SignatureStatus,
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

Make sure the file is included by your `tsconfig.json`, for example by including `types/**/*.d.ts`.

TODO:

- [ ] Re-check this after each new `@solana/web3-compat` release.
- [ ] Remove `types/web3-compat.d.ts` once the package ships valid root declarations.
- [ ] Re-run `pnpm typecheck` and `pnpm build` after removing the shim.
