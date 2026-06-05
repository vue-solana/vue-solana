import { computed } from "vue";
import { useSolana } from "./useSolana";

export function useRpc() {
  const solana = useSolana();

  return {
    cluster: computed(() => solana.cluster),
    endpoint: computed(() => solana.endpoint),
    wsEndpoint: computed(() => solana.wsEndpoint),
    status: solana.status,
    error: solana.error,
    latestBlockhash: solana.latestBlockhash,
    checkConnection: solana.checkConnection,
    connection: solana.connection,
  };
}
