import { useSolana } from "./useSolana";

export function useSolanaClient() {
  const { client } = useSolana();
  return { client, rpc: client.rpc };
}
