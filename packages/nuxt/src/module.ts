import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { VueSolanaPluginOptions } from "@vue-solana/vue";
import { SOLANA_IMPORTS } from "./imports";

export type ModuleOptions = Omit<VueSolanaPluginOptions, "wallet">;

type DefinedNuxtModule = ReturnType<ReturnType<typeof defineNuxtModule<ModuleOptions>>["with"]>;

const VITE_OPTIMIZE_DEPS = [
  "@solana/web3-compat",
  "@solana/web3.js",
  "qrcode",
  "buffer",
  "bn.js",
  "bs58",
  "borsh",
  "@solana/buffer-layout",
  "jayson/lib/client/browser",
  "eventemitter3",
  "rpc-websockets",
  "@solana-mobile/wallet-standard-mobile",
  "tweetnacl",
  "tweetnacl/nacl-fast.js",
];

const VITE_NEEDS_INTEROP = ["eventemitter3", "tweetnacl", "tweetnacl/nacl-fast.js"];

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

    addPlugin({
      src: resolver.resolve("./runtime/plugin"),
      mode: "client",
    });

    addImports(SOLANA_IMPORTS);
  },
});

export default module;

function toPublicSolanaConfig(options: ModuleOptions): ModuleOptions {
  const runtimeOptions = { ...options } as VueSolanaPluginOptions;

  delete runtimeOptions.wallet;

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
