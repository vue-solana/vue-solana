import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";

export default defineNuxtPlugin(() => {
  installSolanaBufferPolyfill();
});
