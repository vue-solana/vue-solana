import { useRpc } from './useRpc'

export function useConnection() {
  return useRpc().connection
}
