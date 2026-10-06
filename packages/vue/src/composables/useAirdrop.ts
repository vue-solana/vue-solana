import { createSolanaError } from "@vue-solana/core/errors";
import type { Address, Lamports, Signature } from "@vue-solana/core/kit";
import { useAction, type UseActionReturn } from "./useAction";
import { MissingClientCapabilityError, useClientCapability } from "./useClientCapability";
import { useSolanaClient } from "./useSolanaClient";

type ClientWithAirdrop = {
  airdrop?: (
    recipientAddress: Address,
    lamports: Lamports,
    abortSignal?: AbortSignal,
  ) => Promise<Signature | undefined>;
};

/**
 * Devnet/testnet airdrop faucets are commonly rate-limited or temporarily
 * drained. The RPC reports this as an HTTP 429 or a generic "Internal error",
 * so translate those two unmistakable signatures into an actionable message,
 * preserving the original error as `cause`. Always throws so a `.catch`
 * handler using it keeps rejecting.
 *
 * `RPC_FAILURE` matches the code the surrounding action normalizes to, so
 * `isSolanaError(error, "RPC_FAILURE")` keeps working for callers that
 * already branch on it.
 */
function toReadableAirdropError(error: unknown): never {
  if (error instanceof Error) {
    const httpStatus = (error as Error & { context?: { statusCode?: unknown } }).context
      ?.statusCode;
    const isThrottled =
      httpStatus === 429 ||
      error.message.startsWith("JSON-RPC error: Internal JSON-RPC error (Internal error)");

    if (!isThrottled) {
      throw error;
    }

    throw createSolanaError(
      "RPC_FAILURE",
      `${error.message} This likely means the network's airdrop faucet is rate-limited or out of test SOL. ` +
        "Retry later, use https://faucet.solana.com, or point the client at a local validator.",
      { cause: error },
    );
  }

  throw createSolanaError("RPC_FAILURE", `Airdrop failed: ${String(error)}`, { cause: error });
}

/**
 * Airdrops SOL into an account. Each `dispatch(address, amount)` runs the
 * airdrop with a fresh `AbortSignal`; calling `dispatch` again while a call is
 * in flight aborts the previous one.
 *
 * Requires the client to expose an `airdrop` capability, typically installed
 * with the RPC airdrop plugin, e.g.
 * `createClient().use(solanaRpc({ ... })).use(rpcAirdrop())` from
 * `@solana/kit-plugin-rpc`. `solanaRpc()` is required rather than the
 * read-only `solanaRpcConnection()`: an airdrop signs a request, so the
 * client needs a `payer`. The capability is commonly available on test
 * networks (devnet, testnet) and local validators.
 *
 * Some implementations (e.g. LiteSVM) update balances directly without sending
 * a transaction, in which case the resolved `data` is `undefined` rather than
 * a {@link Signature}.
 */
export function useAirdrop(): UseActionReturn<
  [address: Address, amount: Lamports],
  Signature | undefined
> {
  const providerHint =
    "Install it by adding the airdrop capability with `createClient().use(solanaRpc({ ... })).use(rpcAirdrop())` from `@solana/kit-plugin-rpc`, on a client that has a `payer` signer to sign the request.";

  useClientCapability("airdrop", { hookName: "useAirdrop", providerHint });

  const { client } = useSolanaClient();

  return useAction((abortSignal, address, amount) => {
    const airdrop = (client as unknown as ClientWithAirdrop).airdrop;

    // ponytail: catches only a client swapped in after the setup-time
    // assertion, so it reuses the same error instead of a second shape.
    if (!airdrop) {
      throw new MissingClientCapabilityError("useAirdrop", ["airdrop"], providerHint);
    }

    return airdrop(address, amount, abortSignal).catch(toReadableAirdropError);
  });
}
