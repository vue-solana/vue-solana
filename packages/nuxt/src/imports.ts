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
 * `payer`, which module options cannot carry.
 */
const SOLANA_SETUP_IMPORTS = [
  ["createSelectedWalletAccountContext", "createSelectedWalletAccountContext"],
  ["createSolanaPlugin", "createSolanaPlugin"],
  ["selectedWalletAccountInjectionKey", "selectedWalletAccountInjectionKey"],
  ["solanaInjectionKey", "solanaInjectionKey"],
] as const;

export const SOLANA_IMPORTS = [
  ...SOLANA_COMPOSABLE_IMPORTS.map(([name, as]) => ({
    name,
    as,
    from: `@vue-solana/vue/${name}`,
  })),
  ...SOLANA_SWR_IMPORTS.map(([name, as]) => ({ name, as, from: "@vue-solana/vue/swr" })),
  ...SOLANA_SETUP_IMPORTS.map(([name, as]) => ({ name, as, from: "@vue-solana/vue" })),
];
