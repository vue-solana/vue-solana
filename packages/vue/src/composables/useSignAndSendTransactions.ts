import type { Signature } from "@vue-solana/core/kit";
import type { SolanaTransaction } from "@vue-solana/core/types";
import { normalizeSolanaError, SolanaError } from "@vue-solana/core/errors";
import { withSolanaTimeout } from "@vue-solana/core/timeout";
import type { SendTransactionOptions } from "@vue-solana/core/types";
import {
  assertWalletCanSignAndSendTransactions,
  createNoWalletSelectedError,
} from "@vue-solana/core/wallet";
import { shallowRef } from "vue";
import { useExecution } from "./use-execution";
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
  const { status, loading, error, execute } =
    useExecution<SignAndSendTransactionsStatus>("sending");

  function send(
    transactions: SolanaTransaction[],
    options?: SendTransactionOptions,
  ): Promise<Signature[]> {
    signatures.value = null;

    return execute(
      async () => {
        const activeWallet = wallet.value;

        if (!activeWallet) {
          throw createNoWalletSelectedError();
        }

        assertWalletCanSignAndSendTransactions(activeWallet);

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
              throw new PartialSignAndSendError(
                normalizeSolanaError(cause, "RPC_FAILURE"),
                collected,
              );
            }
          }

          return collected;
        };

        const send = withSolanaTimeout(
          activeWallet.signAndSendTransactions
            ? activeWallet.signAndSendTransactions(transactions, options)
            : sendSingularSequentially(),
          SIGN_AND_SEND_TIMEOUT_MS,
          "Wallet transaction did not return a result. Check your wallet or explorer for the final status.",
        );

        return (await send) as Signature[];
      },
      (result) => {
        signatures.value = result;

        return "sent";
      },
    );
  }

  return {
    signatures,
    status,
    loading,
    error,
    execute: send,
  };
}
