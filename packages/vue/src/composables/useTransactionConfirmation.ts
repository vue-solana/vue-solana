import type { Signature } from "@vue-solana/core/kit";
import { confirmTransactionSignature } from "@vue-solana/core/transaction";
import type { ConfirmTransactionOptions, TransactionConfirmation } from "@vue-solana/core/types";
import { ref } from "vue";
import { useExecution } from "./use-execution";
import { useConnection } from "./useConnection";

export type TransactionConfirmationStatus =
  | "idle"
  | "confirming"
  | "processed"
  | "confirmed"
  | "finalized"
  | "error";

export function getConfirmedTransactionStatus(
  confirmation: TransactionConfirmation,
): Extract<TransactionConfirmationStatus, "processed" | "confirmed" | "finalized"> {
  if (confirmation.commitment === "finalized") {
    return "finalized";
  }

  return confirmation.commitment === "processed" ? "processed" : "confirmed";
}

export function useTransactionConfirmation(defaultOptions: ConfirmTransactionOptions = {}) {
  const client = useConnection();
  const signature = ref<Signature | null>(null);
  const confirmation = ref<TransactionConfirmation | null>(null);
  const {
    status,
    loading,
    error,
    execute,
    reset: resetExecution,
  } = useExecution<TransactionConfirmationStatus>("confirming");

  function confirm(nextSignature: Signature, options: ConfirmTransactionOptions = {}) {
    const confirmationOptions = { ...defaultOptions, ...options };

    signature.value = nextSignature;
    confirmation.value = null;

    return execute(
      () => confirmTransactionSignature(client, nextSignature, confirmationOptions),
      (nextConfirmation) => {
        confirmation.value = nextConfirmation;

        return getConfirmedTransactionStatus(nextConfirmation);
      },
    );
  }

  function reset() {
    resetExecution();
    signature.value = null;
    confirmation.value = null;
  }

  return {
    signature,
    confirmation,
    status,
    loading,
    error,
    confirm,
    reset,
  };
}
