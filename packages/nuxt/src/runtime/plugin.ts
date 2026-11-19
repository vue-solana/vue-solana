import {
  createSelectedWalletAccountContext,
  createSolanaPlugin,
  selectedWalletAccountInjectionKey,
} from "@vue-solana/vue";
import type { ModuleOptions } from "../module";
import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { toPublicPluginOptions } from "./plugin-options";

export default defineNuxtPlugin((nuxtApp) => {
  // Missing `public.solana` (deleted or never set) must fall back to defaults,
  // not throw a raw `TypeError` on `.cluster` access. The shared helper also
  // strips the client-only/build-time keys; it forwards future fields so an
  // allowlist cannot silently drop them.
  const pluginOptions = toPublicPluginOptions(useRuntimeConfig().public.solana);

  const solanaPlugin = createSolanaPlugin(pluginOptions as ModuleOptions);

  // `app.use` runs `install` synchronously, so the built context is available
  // on the plugin afterwards.
  nuxtApp.vueApp.use(solanaPlugin);

  // `dispose` unsubscribes the Wallet Standard registry subscription, which
  // otherwise leaks on every remount. `onUnmount` is the Vue-level hook;
  // Nuxt has no `app:beforeUnmount`.
  nuxtApp.vueApp.onUnmount(() => solanaPlugin.dispose());

  // Install the app-wide selected wallet account context so
  // `useSelectedWalletAccount` works in every component without an explicit
  // provider component. A custom `stateSync` is not serializable through the
  // public runtime config, so the default (localStorage) applies; apps that
  // need a custom store can mount `SelectedWalletAccountProvider` deeper in
  // the tree to shadow this context.
  const context = createSelectedWalletAccountContext({}, solanaPlugin.context);

  nuxtApp.vueApp.provide(selectedWalletAccountInjectionKey, context);
});
