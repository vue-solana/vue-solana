# Knowledge Bundle Change Log

All notable changes to the knowledge bundle are documented here.

## 2026-09-12

### Updated

- Documented the v2.0.0 Kit migration across the bundle: `concepts/web3-compat.md` archived as v1-only, `guides/kit-migration.md` rewritten to the shipped v2 state, packages/index.md / packages/core.md / packages/vue.md / packages/nuxt.md updated to the Kit-only API (no `connection`, no `web3` subpaths, `publicKey: Address`), and guides (getting-started, wallets, message-signing, troubleshooting) aligned to raw-byte transactions and `client.rpc`.

## 2025-07-17

### Restructured

- Renamed `docs/` to `knowledge-bundle/` with OKF frontmatter format.
- Moved plan files to top-level `plans/` directory.
- Split `wallets.md` into `guides/wallets.md`, `guides/wallet-android.md`, `guides/wallet-ios.md`, and `guides/message-signing.md`.
- Split `solana-concepts.md` into `concepts/solana-for-vue-developers.md` and `concepts/clusters.md`.
- Moved API docs to `packages/` directory with `packages/index.md` listing page.
- Extracted web3-compat workaround from `troubleshooting.md` into `concepts/web3-compat.md`.
- Added OKF frontmatter (type, title, description, tags, timestamp) to all knowledge files.
- Created `index.md` directory listing and `log.md` change log.
- Fixed cross-references in README.md, AGENTS.md, docs app files, locale roadmap files, and plan files.
