import { confirmTransactionSignature } from "@vue-solana/core/transaction";
import type { ConfirmTransactionOptions, TransactionConfirmation } from "@vue-solana/core/types";
import type { TransactionSignature } from "@solana/web3-compat";
import { ref } from "vue";
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
  const connection = useConnection();
  const signature = ref<TransactionSignature | null>(null);
  const confirmation = ref<TransactionConfirmation | null>(null);
  const status = ref<TransactionConfirmationStatus>("idle");
  const loading = ref(false);
  const error = ref<unknown>(null);
  let executionId = 0;

  async function confirm(
    nextSignature: TransactionSignature,
    options: ConfirmTransactionOptions = {},
  ) {
    const currentExecutionId = ++executionId;
    const confirmationOptions = { ...defaultOptions, ...options };

    signature.value = nextSignature;
    confirmation.value = null;
    status.value = "confirming";
    loading.value = true;
    error.value = null;

    try {
      const nextConfirmation = await confirmTransactionSignature(
        connection,
        nextSignature,
        confirmationOptions,
      );

      if (currentExecutionId === executionId) {
        confirmation.value = nextConfirmation;
        status.value = getConfirmedTransactionStatus(nextConfirmation);
      }

      return nextConfirmation;
    } catch (cause) {
      if (currentExecutionId === executionId) {
        error.value = cause;
        status.value = "error";
      }

      throw cause;
    } finally {
      if (currentExecutionId === executionId) {
        loading.value = false;
      }
    }
  }

  function reset() {
    executionId += 1;
    signature.value = null;
    confirmation.value = null;
    status.value = "idle";
    loading.value = false;
    error.value = null;
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
