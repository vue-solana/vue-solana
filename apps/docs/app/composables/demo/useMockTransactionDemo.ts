import { computed } from "vue";
import { useTransaction } from "@vue-solana/vue/useTransaction";
import { formatError } from "./errors";

export function useMockTransactionDemo() {
  const mockTransaction = useTransaction(async (label: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    return `mock-${label}-${Date.now()}`;
  });

  const mockTransactionError = computed(() => formatError(mockTransaction.error.value));

  async function runMockTransaction() {
    await mockTransaction.execute("transaction");
  }

  return {
    mockTransaction,
    mockTransactionError,
    runMockTransaction,
  };
}
