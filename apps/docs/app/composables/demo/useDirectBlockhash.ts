import { shallowRef } from "vue";
import { formatError } from "./errors";

export function useDirectBlockhash() {
  const connection = useSolanaConnection();
  const directBlockhash = shallowRef<string | null>(null);
  const directConnectionLoading = shallowRef(false);
  const directConnectionError = shallowRef<string | null>(null);

  async function loadDirectBlockhash() {
    directConnectionLoading.value = true;
    directConnectionError.value = null;

    try {
      const blockhash = await connection.getLatestBlockhash();
      directBlockhash.value = blockhash.blockhash;
    } catch (error) {
      directConnectionError.value = formatError(error);
    } finally {
      directConnectionLoading.value = false;
    }
  }

  return {
    directBlockhash,
    directConnectionError,
    directConnectionLoading,
    loadDirectBlockhash,
  };
}
