---
title: Developer Portal
description: Quickstart, machine-readable endpoints, and integration conventions for building against Vue Solana.
ogSection: Project
surroundOrder: 23
---

This portal is the entry point for developers and AI agents integrating with Vue Solana — both the Vue/Nuxt libraries themselves and the machine-readable surface of this documentation site.

## Quickstart: Build A Solana App With Vue

1. Install the package for your stack: `pnpm add @vue-solana/nuxt` for Nuxt, or `pnpm add @vue-solana/vue @vue-solana/core` for plain Vue 3.
2. Register the plugin or module (see [Getting Started](/getting-started)) and point it at a cluster — devnet by default.
3. Read data with composables: `useSolanaClient`, `useBalance`, `useTokenAccounts`.
4. Connect a wallet with `useWallets` and `useWallet` (browser extensions, Mobile Wallet Adapter, and iOS wallet links).
5. Sign and send with `useSignMessage` and `useSignAndSendTransaction`.

There are no API keys for the Solana RPC: composables talk to public devnet/mainnet endpoints, and you can swap in your own RPC provider. The [live demo](/demo) runs the published packages against devnet in your browser — no signup.

## Machine-Readable Surface Of This Site

This documentation site exposes a documented machine surface, no signup or keys required:

- `/llms.txt` — index of every documentation page for agents.
- `/llms-full.txt` — the complete documentation corpus as one markdown document.
- `/openapi.json` — OpenAPI 3.1 spec covering all endpoints, the RFC 9457 error model, the versioning policy, and rate-limit conventions.
- `Accept: text/markdown` negotiation on every documentation page (or append `.md` to the URL).
- `/sitemap.xml` — full URL list.

Errors follow RFC 9457 (`application/problem+json`) with a `recovery` extension object; 404s for unknown paths return a markdown recovery body when requested with `Accept: text/markdown`.

## Sandbox

The Solana [devnet cluster](/concepts/clusters) is the shared sandbox: it is free, it needs no credentials, and airdrops let you test transfers without real funds. The demo page is configured for devnet, and every guide's examples run against it.

## API Keys And Authentication

There are none to manage. The packages are client libraries you run in your own app, and this site's machine endpoints are public. If a future feature requires keys, they will be announced on the [Roadmap](/roadmap) page first.
