import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { SolanaConfig } from "@vue-solana/core";

export type ModuleOptions = SolanaConfig;

type DefinedNuxtModule = ReturnType<ReturnType<typeof defineNuxtModule<ModuleOptions>>["with"]>;

const VITE_OPTIMIZE_DEPS = ["qrcode", "@solana-mobile/wallet-standard-mobile"];

const module: DefinedNuxtModule = defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@vue-solana/nuxt",
    configKey: "solana",
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
      ...options,
    };

    nuxt.options.vite.optimizeDeps ??= {};
    nuxt.options.vite.optimizeDeps.include = Array.from(
      new Set([...(nuxt.options.vite.optimizeDeps.include ?? []), ...VITE_OPTIMIZE_DEPS]),
    );

    addPlugin({
      src: resolver.resolve("./runtime/plugin"),
      mode: "client",
    });

    addImports([
      { name: "useBalance", as: "useSolanaBalance", from: "@vue-solana/vue/useBalance" },
      { name: "useConnection", as: "useSolanaConnection", from: "@vue-solana/vue/useConnection" },
      { name: "useRpc", as: "useSolanaRpc", from: "@vue-solana/vue/useRpc" },
      {
        name: "useSignAndSendTransaction",
        as: "useSolanaSignAndSendTransaction",
        from: "@vue-solana/vue/useSignAndSendTransaction",
      },
      { name: "useSolana", as: "useSolana", from: "@vue-solana/vue/useSolana" },
      { name: "useWallet", as: "useSolanaWallet", from: "@vue-solana/vue/useWallet" },
      { name: "useWallets", as: "useSolanaWallets", from: "@vue-solana/vue/useWallets" },
    ]);
  },
});

export default module;
