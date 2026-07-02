import type { TransactionSignature } from "@solana/web3-compat";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { withSolanaTimeout } from "@vue-solana/core/timeout";
import { ref } from "vue";

export interface UseTransactionOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

export function useTransaction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<TransactionSignature>,
  options: UseTransactionOptions = {},
) {
  const signature = ref<TransactionSignature | null>(null);
  const loading = ref(false);
  const error = ref<SolanaError | null>(null);
  let executionId = 0;

  async function execute(...args: TArgs) {
    const currentExecutionId = ++executionId;

    loading.value = true;
    error.value = null;

    try {
      const nextSignature = await withSolanaTimeout(
        handler(...args),
        options.timeoutMs,
        options.timeoutMessage ?? "Transaction did not return a result before timing out.",
      );

      if (currentExecutionId === executionId) {
        signature.value = nextSignature;
      }

      return nextSignature;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (currentExecutionId === executionId) {
        error.value = normalizedError;
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
    loading,
    error,
    execute,
  };
}
