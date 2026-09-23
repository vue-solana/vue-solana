---
title: About
description: What Vue Solana is, who maintains it, and how the project is run.
ogSection: Project
surroundOrder: 20
---

Vue Solana is an open-source project that publishes Vue and Nuxt libraries for building Solana applications. It wraps the official Solana JavaScript SDK (Solana Kit) in typed, reactive composables so Vue 3 and Nuxt developers can read balances, discover wallets, sign messages, and send transactions without hand-rolling RPC plumbing.

The project is maintained by the Vue Solana team and accepts contributions from the community on GitHub. All source code lives at `https://github.com/vue-solana/vue-solana` under the MIT license, and every package is published to npm under the `@vue-solana` scope.

## What The Packages Do

- `@vue-solana/core`: framework-agnostic Solana config, endpoint helpers, wallet types, and transaction helpers.
- `@vue-solana/vue`: the Vue plugin and composables for RPC reads, wallets, balances, messages, signatures, and transactions.
- `@vue-solana/nuxt`: a Nuxt module that installs the Vue plugin and auto-imports the composables.

## How The Project Is Run

Development happens in the open on GitHub: issues track bugs and feature requests, pull requests go through review, and releases are published to npm. The documentation you are reading is built from the Markdown in this repository and deployed on Vercel.

## Roadmap And Governance

Planned features are tracked publicly on the [Roadmap](/roadmap) page. Breaking changes to the packages follow semver, and machine-readable surfaces of this site (llms.txt, openapi.json) are documented in the [OpenAPI spec](/openapi.json) with an explicit versioning policy.

## Contact

For questions, bug reports, or security issues, see the [Contact](/contact) page.
