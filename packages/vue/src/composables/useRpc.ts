import { computed } from 'vue'
import { useSolana } from './useSolana'

export function useRpc() {
  const solana = useSolana()

  return {
    cluster: computed(() => solana.cluster),
    endpoint: computed(() => solana.endpoint),
    connection: solana.connection
  }
}
