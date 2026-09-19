import {
  createSelectedWalletAccountContext,
  createSolanaPlugin,
  selectedWalletAccountInjectionKey,
} from "@vue-solana/vue";
import type { ModuleOptions } from "../module";
import { defineNuxtPlugin, useRuntimeConfig } from "#app";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public.solana as ModuleOptions;

  const solanaPlugin = createSolanaPlugin({
    cluster: config.cluster,
    endpoint: config.endpoint,
    wsEndpoint: config.wsEndpoint,
    commitment: config.commitment,
    autoConnect: config.autoConnect,
    mobileWallet: config.mobileWallet,
    iosWallet: config.iosWallet,
  });

  // `app.use` runs `install` synchronously, so the built context is available
  // on the plugin afterwards.
  nuxtApp.vueApp.use(solanaPlugin);

  // Install the app-wide selected wallet account context so
  // `useSelectedWalletAccount` works in every component without an explicit
  // provider component. A custom `stateSync` is not serializable through the
  // public runtime config, so the default (localStorage) applies; apps that
  // need a custom store can mount `SelectedWalletAccountProvider` deeper in
  // the tree to shadow this context.
  const vueApp = nuxtApp.vueApp as unknown as {
    provide: (key: unknown, value: unknown) => void;
  };
  const context = createSelectedWalletAccountContext({}, solanaPlugin.context);

  vueApp.provide(selectedWalletAccountInjectionKey, context);
});
