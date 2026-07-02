import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { withSolanaTimeout } from "@vue-solana/core/timeout";
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";
import type {
  ConfirmTransactionOptions,
  SendTransactionOptions,
  SolanaTransaction,
  TransactionConfirmation,
} from "@vue-solana/core/types";
import { createNoWalletSelectedError } from "@vue-solana/core/wallet";
import type { TransactionSignature } from "@solana/web3-compat";
import { ref } from "vue";
import { useConnection } from "./useConnection";
import { useWallet } from "./useWallet";
import { getConfirmedTransactionStatus } from "./useTransactionConfirmation";

const SIGN_AND_SEND_TIMEOUT_MS = 120_000;

export type SignAndSendTransactionStatus =
  | "idle"
  | "sending"
  | "sent"
  | "confirming"
  | "processed"
  | "confirmed"
  | "finalized"
  | "error";

export interface SignAndSendTransactionOptions extends SendTransactionOptions {
  confirm?: boolean;
  confirmation?: ConfirmTransactionOptions;
}

export function useSignAndSendTransaction() {
  const connection = useConnection();
  const { wallet } = useWallet();
  const signature = ref<TransactionSignature | null>(null);
  const confirmation = ref<TransactionConfirmation | null>(null);
  const status = ref<SignAndSendTransactionStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function execute(transaction: SolanaTransaction, options?: SignAndSendTransactionOptions) {
    const currentExecutionId = ++executionId;
    const { confirm, confirmation: confirmationOptions, ...sendOptions } = options ?? {};
    const transactionOptions = Object.keys(sendOptions).length > 0 ? sendOptions : undefined;

    status.value = "sending";
    loading.value = true;
    error.value = null;
    confirmation.value = null;

    const activeWallet = wallet.value;

    if (!activeWallet) {
      const normalizedError = createNoWalletSelectedError();
      error.value = normalizedError;
      status.value = "error";
      loading.value = false;

      throw normalizedError;
    }

    try {
      const nextSignature = await withSolanaTimeout(
        signAndSendTransaction(connection, activeWallet, transaction, transactionOptions),
        SIGN_AND_SEND_TIMEOUT_MS,
        "Wallet transaction did not return a result. Check your wallet or explorer for the final status.",
      );

      if (currentExecutionId === executionId) {
        signature.value = nextSignature;
        status.value = confirm ? "confirming" : "sent";
      }

      if (!confirm) {
        return nextSignature;
      }

      const nextConfirmation = await confirmTransactionSignature(
        connection,
        nextSignature,
        confirmationOptions,
      );

      if (currentExecutionId === executionId) {
        confirmation.value = nextConfirmation;
        status.value = getConfirmedTransactionStatus(nextConfirmation);
      }

      return nextSignature;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
        status.value = "error";
      }

      throw normalizedError;
    } finally {
      if (currentExecutionId === executionId) {
        loading.value = false;
      }
    }
  }

  return {
    signature,
    confirmation,
    status,
    loading,
    error,
    execute,
  };
}
