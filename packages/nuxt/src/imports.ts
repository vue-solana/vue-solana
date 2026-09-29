import { join } from "node:path";

const SOLANA_COMPOSABLE_IMPORTS = [
  ["useAccountInfo", "useSolanaAccountInfo"],
  ["useAction", "useSolanaAction"],
  ["useAirdrop", "useSolanaAirdrop"],
  ["useBalance", "useSolanaBalance"],
  ["useConnection", "useSolanaConnection"],
  ["useIdentity", "useSolanaIdentity"],
  ["usePlanTransaction", "useSolanaPlanTransaction"],
  ["usePlanTransactions", "useSolanaPlanTransactions"],
  ["useProgramAccounts", "useSolanaProgramAccounts"],
  ["usePayer", "useSolanaPayer"],
  ["useRequest", "useSolanaRequest"],
  ["useRpc", "useSolanaRpc"],
  ["useSelectedWalletAccount", "useSolanaSelectedWalletAccount"],
  ["useSendTransaction", "useSolanaSendTransaction"],
  ["useSendTransactions", "useSolanaSendTransactions"],
  ["useSignIn", "useSolanaSignIn"],
  ["useSignMessage", "useSolanaSignMessage"],
  ["useSignAndSendTransaction", "useSolanaSignAndSendTransaction"],
  ["useSignTransactions", "useSolanaSignTransactions"],
  ["useSignAndSendTransactions", "useSolanaSignAndSendTransactions"],
  ["useSignatureStatus", "useSolanaSignatureStatus"],
  ["useSolana", "useSolana"],
  ["useSolanaClient", "useSolanaClient"],
  ["useSubscription", "useSolanaSubscription"],
  ["useTokenAccounts", "useSolanaTokenAccounts"],
  ["useTokenBalance", "useSolanaTokenBalance"],
  ["useTrackedData", "useSolanaTrackedData"],
  ["useTransaction", "useSolanaTransaction"],
  ["useTransactionConfirmation", "useSolanaTransactionConfirmation"],
  ["useWallet", "useSolanaWallet"],
  ["useWallets", "useSolanaWallets"],
] as const;

const SOLANA_SWR_IMPORTS = [
  ["useRequestSwr", "useSolanaRequestSwr"],
  ["useSubscriptionSwr", "useSolanaSubscriptionSwr"],
  ["useTrackedDataSwr", "useSolanaTrackedDataSwr"],
] as const;

/**
 * Values an app touches only when it opts out of the runtime plugin
 * (`solana.clientPlugin: false`) to install the context with a client-only
 * `payer`, which module options cannot carry. Registered for that case only:
 * an ambient `createSolanaPlugin` in every app would put `payerSecretKey`
 * construction in global scope, which the module otherwise keeps out of Nuxt
 * entirely.
 */
const SOLANA_SETUP_IMPORTS = [
  ["createSelectedWalletAccountContext", "createSelectedWalletAccountContext"],
  ["createSolanaPlugin", "createSolanaPlugin"],
  ["selectedWalletAccountInjectionKey", "selectedWalletAccountInjectionKey"],
  ["solanaInjectionKey", "solanaInjectionKey"],
] as const;

export type SolanaAutoImport = {
  name: string;
  as: string;
  from: string;
};

/**
 * Auto-import sources must name a real file, not a package subpath.
 *
 * The specifier Nuxt writes into the app's generated `imports.d.ts` is a path
 * relative to the app, and a relative path bypasses the package `exports` map
 * entirely. `@vue-solana/vue/swr` is an `exports` alias, so the app resolved
 * `<package root>/swr` — no such file, because the build output is under `dist`.
 * The miss lands inside a `.d.ts`, which `skipLibCheck` swallows, so every
 * composable silently degraded to `any` instead of erroring.
 *
 * Nuxt resolves the `from` we register, so registering a path into the copy
 * this module resolved for itself fixes the specifier at the source and leaves
 * the app installing one package. Falls back to the bare subpath when the
 * module cannot resolve its own dependency.
 */
export function solanaAutoImports(vueDist: string | undefined): SolanaAutoImport[] {
  return [
    ...SOLANA_COMPOSABLE_IMPORTS.map(([name, as]) => ({
      name,
      as,
      from: vueSource(vueDist, name),
    })),
    ...SOLANA_SWR_IMPORTS.map(([name, as]) => ({ name, as, from: vueSource(vueDist, "swr") })),
  ];
}

export function solanaSetupAutoImports(vueDist: string | undefined): SolanaAutoImport[] {
  return SOLANA_SETUP_IMPORTS.map(([name, as]) => ({ name, as, from: vueSource(vueDist) }));
}

function vueSource(vueDist: string | undefined, subpath = "index"): string {
  return vueDist ? join(vueDist, `${subpath}.mjs`) : `@vue-solana/vue/${subpath}`;
}
