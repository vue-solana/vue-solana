import { generateKeyPairSigner } from "@solana/kit";
import {
  createSelectedWalletAccountContext,
  createSolanaPlugin,
  selectedWalletAccountInjectionKey,
  solanaInjectionKey,
} from "@vue-solana/vue";
import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin({
  name: "example-demo-payer",
  async setup(nuxtApp) {
    const payer = await generateKeyPairSigner();
    const plugin = createSolanaPlugin({ cluster: "devnet", payer });

    nuxtApp.vueApp.use(plugin);

    const vueApp = nuxtApp.vueApp as unknown as {
      provide: (key: unknown, value: unknown) => void;
    };
    const selectedWalletAccount = createSelectedWalletAccountContext({}, plugin.context);

    vueApp.provide(solanaInjectionKey, plugin.context);
    vueApp.provide(selectedWalletAccountInjectionKey, selectedWalletAccount);
  },
});
