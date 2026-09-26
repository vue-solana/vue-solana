import { generateKeyPairSigner } from "@solana/kit";
import {
  createSelectedWalletAccountContext,
  createSolanaPlugin,
  selectedWalletAccountInjectionKey,
} from "@vue-solana/vue";
import { defineNuxtPlugin } from "#app";

// `solana.clientPlugin: false` in `nuxt.config.ts` keeps the module from
// installing its own plugin, so this is the app's single Solana install. A
// module-installed client could not carry this ephemeral `payer` — module
// options are stripped down to public runtime config.
export default defineNuxtPlugin({
  name: "example-demo-payer",
  async setup(nuxtApp) {
    // Read the cluster from the same public runtime config the module uses, so
    // `nuxt.config.ts` stays the single source of truth for it.
    const { cluster } = useRuntimeConfig().public.solana;
    const payer = await generateKeyPairSigner();
    const plugin = createSolanaPlugin({ cluster, payer });

    nuxtApp.vueApp.use(plugin);

    // The module's runtime plugin normally provides this app-wide; with
    // `clientPlugin: false` the example has to do it itself.
    const vueApp = nuxtApp.vueApp as unknown as {
      provide: (key: unknown, value: unknown) => void;
    };

    vueApp.provide(
      selectedWalletAccountInjectionKey,
      createSelectedWalletAccountContext({}, plugin.context),
    );
  },
});
