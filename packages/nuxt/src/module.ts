import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { NuxtModule } from "@nuxt/schema";
import type { VueSolanaPluginOptions } from "@vue-solana/vue";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { solanaAutoImports, solanaSetupAutoImports } from "./imports";
// Type-only: pulls `nuxt/schema` into the program so the augmentation below
// resolves (TS2664 otherwise — nothing else in this package imports it).
// Erased at build time, so no runtime or bundle impact.
import type {} from "nuxt/schema";
export type ModuleOptions = Omit<VueSolanaPluginOptions, "wallet" | "payer" | "payerSecretKey"> & {
  /**
   * Set to `false` to auto-import the composables without installing the Solana
   * runtime plugin. Use it when the app installs `createSolanaPlugin` itself,
   * e.g. to attach a client-only `payer` that module options cannot carry.
   */
  clientPlugin?: boolean;
};

// Shipped with the module entry (`dist/module.d.ts`), so fresh consumers get
// typed `runtimeConfig.public.solana` with no local shim. A separate
// `src/runtime/types.d.ts` never reached `dist/` (it was no build entry), so
// the augmentation lives here instead.
declare module "nuxt/schema" {
  interface PublicRuntimeConfig {
    solana?: ModuleOptions;
  }
}

/**
 * Types only, so app code can name the public surface (`SolanaWalletInfo`,
 * `VueSolanaContext`, composable return types) without a direct dependency on
 * `@vue-solana/vue` or `@vue-solana/core`. A value re-export would pull this
 * build-time module into the client bundle.
 */
export type * from "@vue-solana/vue";

const VITE_OPTIMIZE_DEPS = [
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer/",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
];

const VITE_NEEDS_INTEROP = ["@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl"];

/**
 * Module defaults, applied by {@link mergeSolanaSources} *after* the merge.
 *
 * They are deliberately not passed to `defineNuxtModule` as `defaults`: Nuxt
 * merges inline options, the `solana` config key, and those defaults with
 * `defu`, so an inline option whose value equals a default (`cluster: "devnet"`)
 * became indistinguishable from an untouched default and lost to
 * `runtimeConfig.public.solana`. Without module-level defaults an absent key
 * means "the user never set it", which is what the merge needs to know.
 */
const MODULE_DEFAULTS = {
  cluster: "devnet",
  autoConnect: false,
} as const satisfies Partial<ModuleOptions>;

interface ViteOptimizeDepsTarget {
  optimizeDeps?: {
    include?: string[];
    needsInterop?: string[];
  };
}

const module: NuxtModule<ModuleOptions> = defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@vue-solana/nuxt",
    configKey: "solana",
    compatibility: {
      nuxt: "^3.0.0 || ^4.0.0",
    },
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const publicConfig = nuxt.options.runtimeConfig.public;

    // Sanitize after the merge, not before: both inputs are user-controlled and
    // only the module options were being stripped, so a `runtimeConfig.public.solana`
    // carrying a `payerSecretKey` (or a `wallet`) reached the client bundle.
    publicConfig.solana = toPublicSolanaConfig(
      mergeSolanaSources({
        publicSolana: isPlainObject(publicConfig.solana) ? publicConfig.solana : {},
        options,
      }),
    );

    // Vite optimize-deps merging is deferred to `vite:extendConfig`, which
    // is client-aware; doing it eagerly here polluted the SSR Vite config.
    // `vueDist` is resolved from the module's own dependency, so the
    // auto-import sources point at the copy the bundler will load, and the app
    // keeps installing just `@vue-solana/nuxt`.
    const vueDist = resolveVueDist();

    nuxt.hook("vite:extendConfig", (config, { isClient }) => {
      if (!isClient) {
        return;
      }

      mergeViteOptimizeDeps(config);
      if (config.environments?.client) {
        mergeViteOptimizeDeps(config.environments.client);
      }
    });

    if (options.clientPlugin !== false) {
      addPlugin({
        src: resolver.resolve("./runtime/plugin"),
        mode: "client",
        order: -10,
      });

      addImports(solanaAutoImports(vueDist));
      return;
    }

    // Opted out of the runtime plugin, so the app installs the context itself
    // and needs the setup values too.
    addImports([...solanaAutoImports(vueDist), ...solanaSetupAutoImports(vueDist)]);
  },
});

export default module;

/**
 * A resolved module-options source: the inline module options merged with the
 * `solana` config key by `defineNuxtModule`, without defaults. Both that source
 * and a hand-written `runtimeConfig.public.solana` can carry signer/secret
 * fields, so the merged result is sanitized before it reaches the client bundle.
 */
type SolanaConfigSource = VueSolanaPluginOptions & { clientPlugin?: boolean };

/**
 * Merges the user sources for `runtimeConfig.public.solana` with per-key
 * precedence, most specific first: an explicit module option (inline options or
 * the `solana` config key, which `defineNuxtModule` already merged), then a
 * hand-written `runtimeConfig.public.solana` value, then the module default.
 *
 * The module intentionally defines no `defaults` in `defineNuxtModule`, so an
 * absent key means the user never set it. Applying `MODULE_DEFAULTS` here — as
 * the last step, only for keys nothing else defined — is what lets an explicit
 * inline option equal to the default (`cluster: "devnet"`) still win over
 * `runtimeConfig.public.solana`.
 */
function mergeSolanaSources({
  publicSolana,
  options,
}: {
  publicSolana: Record<string, unknown>;
  options: SolanaConfigSource;
}): SolanaConfigSource {
  // Start from the public config so keys only it defines are forwarded.
  const merged: Record<string, unknown> = { ...publicSolana };

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) {
      continue;
    }

    merged[key] = value;
  }

  for (const [key, value] of Object.entries(MODULE_DEFAULTS)) {
    if (merged[key] === undefined) {
      merged[key] = value;
    }
  }

  return merged as SolanaConfigSource;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPublicSolanaConfig(options: SolanaConfigSource): VueSolanaPluginOptions {
  const runtimeOptions: SolanaConfigSource = { ...options };

  delete runtimeOptions.wallet;
  delete runtimeOptions.payer;
  delete runtimeOptions.payerSecretKey;
  delete runtimeOptions.clientPlugin;

  return runtimeOptions;
}

function mergeViteOptimizeDeps(target: ViteOptimizeDepsTarget): void {
  target.optimizeDeps ??= {};
  target.optimizeDeps.include = Array.from(
    new Set([...(target.optimizeDeps.include ?? []), ...VITE_OPTIMIZE_DEPS]),
  );
  target.optimizeDeps.needsInterop = Array.from(
    new Set([...(target.optimizeDeps.needsInterop ?? []), ...VITE_NEEDS_INTEROP]),
  );
}

/**
 * The `dist` directory of the `@vue-solana/vue` this module resolves, found
 * through the module's own dependency rather than the app's, so the
 * auto-import sources follow the installed version. `undefined` when the
 * resolution fails, which leaves the bare package subpaths in place.
 */
function resolveVueDist(): string | undefined {
  const require = createRequire(import.meta.url);

  try {
    // Every entry in the `exports` map sits in `dist`, so the entry's own
    // directory is the `dist` directory.
    return dirname(require.resolve("@vue-solana/vue"));
  } catch {
    // Unbuilt or not installed yet, so there is no entry to resolve. The
    // candidate directories are still known, and a not-yet-built `dist` is
    // exactly the state this mapping has to cover.
    for (const dir of require.resolve.paths("@vue-solana/vue") ?? []) {
      if (existsSync(join(dir, "@vue-solana/vue/package.json"))) {
        return join(dir, "@vue-solana/vue/dist");
      }
    }

    return undefined;
  }
}
