import type { TransactionSignature } from "@solana/web3-compat";
import { ref } from "vue";

export function useTransaction<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<TransactionSignature>,
) {
  const signature = ref<TransactionSignature | null>(null);
  const loading = ref(false);
  const error = ref<unknown>(null);

  async function execute(...args: TArgs) {
    loading.value = true;
    error.value = null;

    try {
      signature.value = await handler(...args);
      return signature.value;
    } catch (cause) {
      error.value = cause;
      throw cause;
    } finally {
      loading.value = false;
    }
  }

  return {
    signature,
    loading,
    error,
    execute,
  };
}
