import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import type { VueSolanaPluginOptions } from "@vue-solana/vue";

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
      ...toPublicSolanaConfig(options),
    };

    nuxt.options.vite.optimizeDeps ??= {};
    nuxt.options.vite.optimizeDeps.include = Array.from(
      new Set([...(nuxt.options.vite.optimizeDeps.include ?? []), ...VITE_OPTIMIZE_DEPS]),
    );
    nuxt.options.vite.optimizeDeps.needsInterop = Array.from(
      new Set([
        ...(nuxt.options.vite.optimizeDeps.needsInterop ?? []),
        "tweetnacl",
        "tweetnacl/nacl-fast.js",
      ]),
    );

    addPlugin({
      src: resolver.resolve("./runtime/plugin"),
      mode: "client",
    });

    addImports([
      {
        name: "useAccountInfo",
        as: "useSolanaAccountInfo",
        from: "@vue-solana/vue/useAccountInfo",
      },
      { name: "useBalance", as: "useSolanaBalance", from: "@vue-solana/vue/useBalance" },
      { name: "useConnection", as: "useSolanaConnection", from: "@vue-solana/vue/useConnection" },
      {
        name: "useProgramAccounts",
        as: "useSolanaProgramAccounts",
        from: "@vue-solana/vue/useProgramAccounts",
      },
      { name: "useRpc", as: "useSolanaRpc", from: "@vue-solana/vue/useRpc" },
      {
        name: "useSignMessage",
        as: "useSolanaSignMessage",
        from: "@vue-solana/vue/useSignMessage",
      },
      {
        name: "useSignAndSendTransaction",
        as: "useSolanaSignAndSendTransaction",
        from: "@vue-solana/vue/useSignAndSendTransaction",
      },
      {
        name: "useSignatureStatus",
        as: "useSolanaSignatureStatus",
        from: "@vue-solana/vue/useSignatureStatus",
      },
      { name: "useSolana", as: "useSolana", from: "@vue-solana/vue/useSolana" },
      {
        name: "useTransactionConfirmation",
        as: "useSolanaTransactionConfirmation",
        from: "@vue-solana/vue/useTransactionConfirmation",
      },
      { name: "useWallet", as: "useSolanaWallet", from: "@vue-solana/vue/useWallet" },
      { name: "useWallets", as: "useSolanaWallets", from: "@vue-solana/vue/useWallets" },
    ]);
  },
});

export default module;

function toPublicSolanaConfig(options: ModuleOptions): ModuleOptions {
  const runtimeOptions = { ...options } as VueSolanaPluginOptions;

  delete runtimeOptions.wallet;

  return runtimeOptions;
}
