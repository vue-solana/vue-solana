import type { TransactionSignature } from "@solana/web3-compat";
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
  const error = ref<unknown>(null);
  let executionId = 0;

  async function execute(...args: TArgs) {
    const currentExecutionId = ++executionId;

    loading.value = true;
    error.value = null;

    try {
      const nextSignature = await withTimeout(
        handler(...args),
        options.timeoutMs,
        options.timeoutMessage ?? "Transaction did not return a result before timing out.",
      );

      if (currentExecutionId === executionId) {
        signature.value = nextSignature;
      }

      return nextSignature;
    } catch (cause) {
      if (currentExecutionId === executionId) {
        error.value = cause;
      }

      throw cause;
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

function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined, message: string) {
  if (!timeoutMs) {
    return promise;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}
