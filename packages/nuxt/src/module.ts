import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { VueSolanaPluginOptions } from "@vue-solana/vue";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { SOLANA_IMPORTS, SOLANA_SETUP_AUTO_IMPORTS } from "./imports";

export type ModuleOptions = Omit<VueSolanaPluginOptions, "wallet" | "payer" | "payerSecretKey"> & {
  /**
   * Set to `false` to auto-import the composables without installing the Solana
   * runtime plugin. Use it when the app installs `createSolanaPlugin` itself,
   * e.g. to attach a client-only `payer` that module options cannot carry.
   */
  clientPlugin?: boolean;
};

type DefinedNuxtModule = ReturnType<ReturnType<typeof defineNuxtModule<ModuleOptions>>["with"]>;

/**
 * Types only, so app code can name the public surface (`SolanaWalletInfo`,
 * `VueSolanaContext`, composable return types) without a direct dependency on
 * `@vue-solana/vue` or `@vue-solana/core`. A value re-export would pull this
 * build-time module into the client bundle.
 */
export type * from "@vue-solana/vue";

const VITE_OPTIMIZE_DEPS = [
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > @solana-mobile/wallet-standard-mobile",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer/",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > bs58",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
];

const VITE_NEEDS_INTEROP = [
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
  "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
];

interface ViteOptimizeDepsTarget {
  optimizeDeps?: {
    include?: string[];
    needsInterop?: string[];
  };
}

const module: DefinedNuxtModule = defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@vue-solana/nuxt",
    configKey: "solana",
    compatibility: {
      nuxt: "^3.0.0 || ^4.0.0",
    },
  },
  defaults: {
    cluster: "devnet",
    autoConnect: false,
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);
    const publicConfig = nuxt.options.runtimeConfig.public;

    // Sanitize after the merge, not before: both inputs are user-controlled and
    // only the module options were being stripped, so a `runtimeConfig.public.solana`
    // carrying a `payerSecretKey` (or a `wallet`) reached the client bundle.
    publicConfig.solana = toPublicSolanaConfig({
      ...(typeof publicConfig.solana === "object" && publicConfig.solana !== null
        ? publicConfig.solana
        : {}),
      ...options,
    });

    mergeViteOptimizeDeps(nuxt.options.vite);

    // An app that installs only `@vue-solana/nuxt` cannot resolve
    // `@vue-solana/vue` from its own `node_modules`, so Nuxt writes the path
    // it found into the app's generated `imports.d.ts` — a path relative to
    // the module, which only resolves while the layout holds. When it does
    // not, the failure lands inside a `.d.ts`, `skipLibCheck` swallows it, and
    // every composable silently degrades to `any` in the app. Declaring the
    // mapping here points the app at the copy this module resolved for
    // itself, the way the bundler already finds it at runtime.
    nuxt.hook("prepare:types", ({ tsConfig }) => {
      const dist = resolveVueDist();
      if (!dist) {
        return;
      }

      const compilerOptions = (tsConfig.compilerOptions ??= {});
      const paths = (compilerOptions.paths ??= {});
      paths["@vue-solana/vue"] ??= [join(dist, "index.d.ts")];
      paths["@vue-solana/vue/*"] ??= [`${dist}/*`];
    });

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
      });

      addImports(SOLANA_IMPORTS);
      return;
    }

    // Opted out of the runtime plugin, so the app installs the context itself
    // and needs the setup values too.
    addImports([...SOLANA_IMPORTS, ...SOLANA_SETUP_AUTO_IMPORTS]);
  },
});

export default module;

/**
 * The two user-controlled sources merged into `runtimeConfig.public.solana`
 * (the module's own options and a hand-written `runtimeConfig.public.solana`).
 * Both can carry signer/secret fields, so both are sanitized.
 */
type SolanaConfigSource = VueSolanaPluginOptions & { clientPlugin?: boolean };

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
 * through the module's own dependency rather than the app's, so the mapping
 * follows the installed version. `undefined` when the resolution fails, which
 * leaves the app's own `paths` untouched instead of writing a broken one.
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
