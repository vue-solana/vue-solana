import { createSolanaClient } from "@vue-solana/nuxt/kit";
import type { VueSolanaContext } from "@vue-solana/nuxt";

// The same registry symbol as the package's `solanaInjectionKey`, which Nuxt's
// import protection keeps out of app code (`@vue-solana/nuxt` root is
// module-only; the app may import `@vue-solana/nuxt/kit` and
// `/buffer-polyfill`). `Symbol.for` is global, so identity is guaranteed.
const solanaInjectionKey = Symbol.for("vue-solana:context");

/**
 * Re-provides the Solana context with a client that carries a `payer` signer.
 *
 * The client is rebuilt, not extended. Kit's plugins capture the client they
 * are installed on (`solanaRpc()` closes over it when it registers the planner
 * and the sending executor), and the planner reads `client.payer` from that
 * captured snapshot when it builds a message. Patching a payer onto an
 * already-built client with `extendClient()` therefore leaves the planner
 * looking at a payer-less client, and planning dies with
 * `Cannot read properties of undefined (reading 'address')` inside
 * `setTransactionMessageFeePayerSigner`. Passing the payer to
 * `createSolanaClient()` installs it *before* the RPC plugins, so every
 * closure sees it.
 *
 * `createSolanaClient()` composes `solanaRpc()`, which already installs
 * `planTransaction(s)` and `sendTransaction(s)`, so rebuilding restores the
 * whole capability set.
 *
 * The payer is required because Kit reads `client.payer` when it plans a
 * transaction, and the module can never carry one: Nuxt strips `payer` and
 * `payerSecretKey` from both module options and `runtimeConfig.public`, so no
 * secret reaches the browser. The demo therefore generates an ephemeral
 * in-memory signer and funds it through the airdrop card. Without it
 * `useSolanaSendTransaction()` throws `MissingClientCapabilityError`.
 *
 * Nuxt runs `app/` plugins after module plugins, so the module's provider has
 * already run when this executes.
 */
export default defineNuxtPlugin({
  name: "docs-solana-client-capabilities",
  setup(nuxtApp) {
    const vueApp = nuxtApp.vueApp;
    // `app._context.provides` is a plain (null-prototype) object keyed by the
    // injection symbol, not a Map.
    const provides = (vueApp as unknown as { _context: { provides: Record<symbol, unknown> } })
      ._context.provides;
    const moduleContext = provides[solanaInjectionKey] as VueSolanaContext | undefined;

    if (!moduleContext) {
      console.warn(
        "[docs] The @vue-solana/nuxt provider did not run before the capabilities plugin; " +
          "client-sent transactions are disabled in the demo.",
      );

      return;
    }

    // `'payer' in client` cannot narrow, so read it through a wider type. A
    // client built by a release that supports a payer already has one.
    // use moduleContext below
    const payerSecretKey =
      "/9PWQs2/nKlZttrp3CuU12Xr44cSqFZCiGRDCzU4huswhsUUXeWd0Z4cRibCe62Oh9KVthROHyG9ZnBSx8s+dw==";
    const client = createSolanaClient({
      cluster: moduleContext.cluster,
      endpoint: moduleContext.endpoint,
      wsEndpoint: moduleContext.wsEndpoint,
      payerSecretKey,
    });
    const extendedContext: VueSolanaContext = { ...moduleContext, client };

    vueApp.provide(solanaInjectionKey, extendedContext);
  },
});
