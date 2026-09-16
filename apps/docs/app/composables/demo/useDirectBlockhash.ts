import { shallowRef } from "vue";
import { formatError } from "./errors";

export function useDirectBlockhash() {
  const { rpc } = useSolanaClient();
  const directBlockhash = shallowRef<string | null>(null);
  const directConnectionLoading = shallowRef(false);
  const directConnectionError = shallowRef<string | null>(null);

  async function loadDirectBlockhash() {
    directConnectionLoading.value = true;
    directConnectionError.value = null;

    try {
      const { value } = await rpc.getLatestBlockhash().send();
      directBlockhash.value = value.blockhash;
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
