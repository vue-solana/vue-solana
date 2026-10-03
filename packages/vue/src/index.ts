export * from "./composables/useAccountInfo";
export * from "./composables/useAction";
export * from "./composables/useAirdrop";
export * from "./composables/useBalance";
export * from "./composables/useClientCapability";
export * from "./composables/useConnection";
export * from "./composables/usePlanTransaction";
export * from "./composables/useProgramAccounts";
export * from "./composables/usePayer";
export * from "./composables/useRequest";
export * from "./composables/useRpc";
export * from "./composables/useSelectedWalletAccount";
export * from "./composables/useSendTransaction";
export * from "./composables/useSignMessage";
export * from "./composables/useSignAndSendTransaction";
export * from "./composables/useSignTransactions";
export * from "./composables/useSignAndSendTransactions";
export * from "./composables/useSignatureStatus";
export * from "./composables/useSignIn";
export * from "./composables/useSolana";
export * from "./composables/useSolanaClient";
export * from "./composables/useSubscription";
export * from "./composables/useTokenAccounts";
export * from "./composables/useTokenBalance";
export * from "./composables/useTrackedData";
export * from "./composables/useTransaction";
export * from "./composables/useTransactionConfirmation";
export * from "./composables/useWallet";
export * from "./composables/useWallets";
export * from "./components/SelectedWalletAccountProvider";
export * from "./injection";
export * from "./kit";
export * from "./plugin";
export * from "@vue-solana/core/types";

// `./kit` mirrors all of `@solana/kit`, which exports `SolanaError`,
// `isSolanaError`, `SolanaErrorCode` and `TransactionStatus`. Resolved
// explicitly so the star-export clash cannot drop these from this barrel, and
// in favour of `@vue-solana/core`'s — every error these composables throw is
// core's, so Kit's class would make `instanceof SolanaError` silently false for
// all of them. The Kit originals stay reachable through `@vue-solana/vue/kit`.
export { SolanaError, isSolanaError } from "@vue-solana/core/errors";
export type { SolanaErrorCode } from "@vue-solana/core/errors";
export type { TransactionStatus } from "@vue-solana/core/types";
