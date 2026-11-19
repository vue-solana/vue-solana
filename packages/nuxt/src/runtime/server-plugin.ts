import { createSolanaContext } from "@vue-solana/core/rpc";
import type { SolanaConfig } from "@vue-solana/core/types";
import {
  createSelectedWalletAccountContext,
  selectedWalletAccountInjectionKey,
  solanaInjectionKey,
  type VueSolanaContext,
} from "@vue-solana/vue";
import { clearSwrCache } from "@vue-solana/vue/swr";
import { ref, shallowRef } from "vue";
import { defineNuxtPlugin, useRuntimeConfig } from "#app";
import { toPublicPluginOptions } from "./plugin-options";

/**
 * Builds the context used while Nuxt renders a page on the server.
 *
 * It is deliberately not the client plugin: there is no Wallet Standard
 * discovery, no persisted selection, no RPC check, and no bootstrap timer.
 * What it does provide is the *configured* cluster/endpoints and a real Kit
 * client, so `useRpc()` no longer reports a hardcoded `devnet` during SSR and
 * explicit server reads can use the same config as the browser.
 *
 * Returns a fresh object (and fresh refs) on every call. Nitro calls the plugin
 * once per request, so concurrent renders cannot share wallet state.
 */
export function createServerSolanaContext(rawConfig: unknown): VueSolanaContext {
  const options = toPublicPluginOptions(rawConfig);
  const solana = createSolanaContext(options as SolanaConfig);

  return {
    ...solana,
    wallet: shallowRef(null),
    status: ref("idle"),
    error: ref(null),
    latestBlockhash: ref(null),
    wallets: shallowRef([]),
    selectedWallet: shallowRef(null),
    // Inert by design: RPC status checks and wallet work belong after hydration.
    async checkConnection() {},
    setWallet() {},
    refreshWallets() {},
    selectWallet() {},
  };
}

export default defineNuxtPlugin((nuxtApp) => {
  // `swr` keeps one module-level Map for the whole server process. Clear it
  // before the page renders so a later request cannot seed its components from
  // an earlier request's cached result. Components within this render still
  // share the cache, which is the point of SWR. Server composables do not fetch
  // (`onMounted` never fires), so a render does not write back to the cache and
  // an interleaved second request cannot clobber in-flight server data.
  clearSwrCache();

  const rawConfig = (useRuntimeConfig().public.solana ?? {}) as Record<string, unknown>;
  const context = createServerSolanaContext(rawConfig);

  nuxtApp.vueApp.provide(solanaInjectionKey, context);

  // The client plugin installs this app-wide too; without it,
  // `useSelectedWalletAccount()` throws during SSR. The default localStorage
  // storage no-ops when `window` is unavailable.
  const selectedWalletAccount = createSelectedWalletAccountContext({}, context);

  nuxtApp.vueApp.provide(selectedWalletAccountInjectionKey, selectedWalletAccount);
});
