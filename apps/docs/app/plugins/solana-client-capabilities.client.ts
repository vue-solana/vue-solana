import { extendClient, generateKeyPairSigner, type TransactionSigner } from "@solana/kit";
import { rpcTransactionPlanSendingExecutor, rpcTransactionPlanner } from "@solana/kit-plugin-rpc";
import { solanaInjectionKey, type VueSolanaContext } from "@vue-solana/vue";

/** Adds a `payer` signer: the capability Kit's transaction planner requires. */
function withPayer(payer: TransactionSigner) {
  return <T extends object>(client: T) => extendClient(client, { payer });
}

/**
 * Extends the Solana client built by `@vue-solana/nuxt` with the transaction
 * planner, the RPC plan-sending executor (which backs
 * `useSolanaSendTransaction(s)`), and a `payer` signer.
 *
 * The demo app must always run against the latest published packages, and the
 * published module builds its client internally without extension hooks, so
 * this plugin re-provides the context with the extended client (Kit clients are
 * frozen; `.use()` returns a new extended client).
 *
 * A `payer` is required because Kit reads `client.payer` when it plans a
 * transaction, and the module can never carry one: Nuxt strips `payer` and
 * `payerSecretKey` from both module options and `runtimeConfig.public`, so no
 * secret reaches the browser. The demo therefore generates an ephemeral
 * in-memory signer and funds it through the airdrop card. When the docs move to
 * a `@vue-solana/nuxt` release whose `createSolanaClient()` accepts a `payer`,
 * the fallback below starts picking up that signer and this plugin only has to
 * keep the planner and executor.
 *
 * Nuxt runs `app/` plugins after module plugins, so the module's provider has
 * already run when this executes.
 */
export default defineNuxtPlugin({
  name: "docs-solana-client-capabilities",
  async setup(nuxtApp) {
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

    const { client } = moduleContext;
    // `'payer' in client` cannot narrow, so read it through a wider type. A
    // client built by a release that supports a payer already has one.
    const configuredPayer = (client as { payer?: TransactionSigner }).payer;
    const payer = configuredPayer ?? (await generateKeyPairSigner());
    const extendedContext: VueSolanaContext = {
      ...moduleContext,
      client: client
        .use(withPayer(payer))
        .use(rpcTransactionPlanner())
        .use(rpcTransactionPlanSendingExecutor()),
    };

    vueApp.provide(solanaInjectionKey, extendedContext);
  },
});
