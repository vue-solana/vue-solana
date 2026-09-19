import type { Signature } from "@vue-solana/core/kit";
import type { SolanaTransaction } from "@vue-solana/core/types";
import { normalizeSolanaError, SolanaError } from "@vue-solana/core/errors";
import { withSolanaTimeout } from "@vue-solana/core/timeout";
import type { SendTransactionOptions } from "@vue-solana/core/types";
import {
  assertWalletCanSignAndSendTransactions,
  createNoWalletSelectedError,
} from "@vue-solana/core/wallet";
import { ref, shallowRef } from "vue";
import { useWallet } from "./useWallet";

const SIGN_AND_SEND_TIMEOUT_MS = 120_000;

export type SignAndSendTransactionsStatus = "idle" | "sending" | "sent" | "error";

/**
 * Thrown when the singular fallback path fails partway through: the earlier
 * transactions in the batch have already been sent, and their signatures are
 * exposed here so callers can avoid resubmitting them.
 */
export class PartialSignAndSendError extends SolanaError {
  constructor(
    cause: SolanaError,
    public readonly signatures: Signature[],
  ) {
    super(cause.code, cause.message, { cause: cause.cause, feature: cause.feature });
    this.name = "PartialSignAndSendError";
  }
}

/**
 * Sign and send multiple serialized transactions in a single wallet request,
 * returning one signature per transaction.
 *
 * Prefers the wallet's batch `signAndSendTransactions` capability and falls
 * back to sending the singular `signAndSendTransaction` requests in sequence.
 * When that fallback fails partway through, it rejects with a
 * {@link PartialSignAndSendError} carrying the signatures already sent, so a
 * retry can skip them (the wallet has no batch rollback).
 */
export function useSignAndSendTransactions() {
  const { wallet } = useWallet();
  const signatures = shallowRef<Signature[] | null>(null);
  const status = ref<SignAndSendTransactionsStatus>("idle");
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function execute(
    transactions: SolanaTransaction[],
    options?: SendTransactionOptions,
  ): Promise<Signature[]> {
    const currentExecutionId = ++executionId;

    status.value = "sending";
    loading.value = true;
    error.value = null;
    signatures.value = null;

    const activeWallet = wallet.value;

    if (!activeWallet) {
      const normalizedError = createNoWalletSelectedError();
      error.value = normalizedError;
      status.value = "error";
      loading.value = false;

      throw normalizedError;
    }

    const sendSingularSequentially = async (): Promise<Signature[]> => {
      const collected: Signature[] = [];

      for (const transaction of transactions) {
        try {
          const result = await activeWallet.signAndSendTransaction!(transaction, options);
          collected.push(result.signature as Signature);
        } catch (cause) {
          // Sequential on purpose: a parallel batch would strand in-flight
          // siblings on the first failure, losing signatures that already
          // landed and inviting a double-send on retry.
          throw new PartialSignAndSendError(normalizeSolanaError(cause, "RPC_FAILURE"), collected);
        }
      }

      return collected;
    };

    try {
      assertWalletCanSignAndSendTransactions(activeWallet);

      const send = withSolanaTimeout(
        activeWallet.signAndSendTransactions
          ? activeWallet.signAndSendTransactions(transactions, options)
          : sendSingularSequentially(),
        SIGN_AND_SEND_TIMEOUT_MS,
        "Wallet transaction did not return a result. Check your wallet or explorer for the final status.",
      );
      const result = (await send) as Signature[];

      if (currentExecutionId === executionId) {
        signatures.value = result;
        status.value = "sent";
      }

      return result;
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
    signatures,
    status,
    loading,
    error,
    execute,
  };
}
