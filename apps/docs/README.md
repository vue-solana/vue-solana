# Vue Solana Docs

Nuxt Content documentation site for the Vue Solana ecosystem.

The source content lives in `apps/docs/content`. Default English pages live at the content root, and translated pages live in `apps/docs/content/locales`. The root `docs/` directory is kept for now as reference material while this site stabilizes.

## Run

From the repository root:

```sh
pnpm install
pnpm dev:docs
```

## Build

```sh
pnpm build:docs
```

## Generate Static Site

```sh
pnpm generate:docs
```

The app uses Nuxt Content and prerenders routes for static deployment.
