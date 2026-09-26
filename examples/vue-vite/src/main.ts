import "./assets/main.css";

import { createApp } from "vue";
import { generateKeyPairSigner } from "@solana/kit";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

// A fresh unfunded payer per session demonstrates the client-sent transaction
// capability: the "Airdrop payer" panel funds it on devnet, after which the
// send panels work. Real apps would load a server-held keypair instead.
const demoPayer = await generateKeyPairSigner();

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      payer: demoPayer,
    }),
  )
  .mount("#app");
