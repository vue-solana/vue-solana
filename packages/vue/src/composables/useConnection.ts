import { useSolanaClient } from "./useSolanaClient";

/**
 * @deprecated Use `useSolanaClient()` which returns the Kit client instead of
 * the legacy web3-compat Connection. Kept through 4.x; scheduled for removal
 * in 5.0.0.
 */
export function useConnection() {
  return useSolanaClient().client;
}
