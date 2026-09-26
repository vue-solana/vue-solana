import { rpcTransactionPlanSendingExecutor, rpcTransactionPlanner } from "@solana/kit-plugin-rpc";
import { solanaInjectionKey, type VueSolanaContext } from "@vue-solana/vue";

/**
 * Extends the Solana client built by `@vue-solana/nuxt` with Kit's real
 * transaction planner and RPC plan-sending executor, installing the
 * `sendTransaction` / `sendTransactions` capability used by
 * `useSolanaSendTransaction(s)` in the live demo.
 *
 * The demo app must always run against the latest published packages, and the
 * published module builds its client internally without extension hooks, so
 * this plugin re-provides the context with the extended client (Kit clients
 * are frozen; `.use()` returns a new extended client).
 *
 * Nuxt runs `app/` plugins after module plugins, so the module's provider has
 * already run when this executes.
 *
 * TODO: once a release containing the official Kit transaction stack
 * (`createSolanaClient()` composing `solanaRpc()` with the upstream planner and
 * RPC plan-sending executor) is published on npm, delete this plugin — the
 * published `@vue-solana/nuxt` module will install the send capability itself
 * and the demo needs no client extension. Track with the
 * `official-transaction-stack` changeset.
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

    const extendedContext: VueSolanaContext = {
      ...moduleContext,
      client: moduleContext.client
        .use(rpcTransactionPlanner())
        .use(rpcTransactionPlanSendingExecutor()),
    };

    vueApp.provide(solanaInjectionKey, extendedContext);
  },
});
