import { useSolanaClient } from "./useSolanaClient";

/**
 * @deprecated Use `useSolanaClient()` which returns the Kit client instead of
 * the legacy web3-compat Connection.
 */
export function useConnection() {
  return useSolanaClient().client;
}
