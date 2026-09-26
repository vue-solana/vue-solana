import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { VueSolanaPluginOptions } from "@vue-solana/vue";
import { SOLANA_IMPORTS } from "./imports";

export type ModuleOptions = Omit<VueSolanaPluginOptions, "wallet" | "payer" | "payerSecretKey"> & {
  /**
   * Set to `false` to auto-import the composables without installing the Solana
   * runtime plugin. Use it when the app installs `createSolanaPlugin` itself,
   * e.g. to attach a client-only `payer` that module options cannot carry.
   */
  clientPlugin?: boolean;
};

type DefinedNuxtModule = ReturnType<ReturnType<typeof defineNuxtModule<ModuleOptions>>["with"]>;

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

    publicConfig.solana = {
      ...(typeof publicConfig.solana === "object" && publicConfig.solana !== null
        ? publicConfig.solana
        : {}),
      ...toPublicSolanaConfig(options),
    };

    mergeViteOptimizeDeps(nuxt.options.vite);

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
    }

    addImports(SOLANA_IMPORTS);
  },
});

export default module;

function toPublicSolanaConfig(options: ModuleOptions): ModuleOptions {
  const runtimeOptions = { ...options } as VueSolanaPluginOptions;

  delete runtimeOptions.wallet;
  delete runtimeOptions.payer;
  delete runtimeOptions.payerSecretKey;
  delete (runtimeOptions as { clientPlugin?: boolean }).clientPlugin;

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
