import type { Signature } from "@solana/kit";
import { getBase64EncodedWireTransaction, getTransactionDecoder } from "@solana/kit";
import type { SolanaClient } from "./kit";
import { createSolanaError, normalizeSolanaError } from "./errors";
import { assertWalletCanSign, assertWalletConnected } from "./wallet";
import type {
  ConfirmTransactionOptions,
  SendTransactionOptions,
  SolanaTransaction,
  SolanaWallet,
  TransactionConfirmation,
} from "./types";

const DEFAULT_CONFIRMATION_COMMITMENT = "confirmed";
const DEFAULT_CONFIRMATION_TIMEOUT_MS = 60_000;
const SIGNATURE_STATUS_POLL_INTERVAL_MS = 1_500;

const COMMITMENT_RANK: Record<string, number> = { processed: 0, confirmed: 1, finalized: 2 };

/**
 * Sign and send a transaction through a connected wallet.
 *
 * Walks through the supported kit RPC path: the wallet signs the raw wire
 * transaction, and the client sends it via `client.rpc.sendTransaction`.
 */
export async function signAndSendTransaction(
  client: SolanaClient,
  wallet: SolanaWallet,
  transaction: SolanaTransaction,
  options?: SendTransactionOptions,
): Promise<Signature> {
  try {
    assertWalletConnected(wallet);

    if (wallet.signAndSendTransaction) {
      const result = await wallet.signAndSendTransaction(transaction, options);
      return result.signature as Signature;
    }

    assertWalletCanSign(wallet);

    const signedTransaction = await wallet.signTransaction(transaction);
    const base64Transaction = toBase64WireTransaction(signedTransaction);
    const { maxRetries, minContextSlot, preflightCommitment, skipPreflight } = options ?? {};

    return await client.rpc
      .sendTransaction(base64Transaction, {
        encoding: "base64",
        maxRetries,
        minContextSlot,
        preflightCommitment,
        skipPreflight,
      })
      .send();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

/**
 * Confirm a transaction signature against the kit RPC until it reaches the
 * requested commitment.
 */
export async function confirmTransactionSignature(
  client: SolanaClient,
  signature: Signature,
  options: ConfirmTransactionOptions = {},
): Promise<TransactionConfirmation> {
  const commitment = options.commitment ?? DEFAULT_CONFIRMATION_COMMITMENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS;
  let elapsedMs = 0;

  try {
    while (elapsedMs < timeoutMs) {
      const response = await client.rpc.getSignatureStatuses([signature]).send();
      const [status] = response.value;

      if (!status) {
        throw new Error(`Transaction ${signature} was not found.`);
      }

      if (status.err) {
        throw createSolanaError(
          "RPC_FAILURE",
          `Transaction ${signature} failed to reach ${commitment} commitment.`,
          { cause: status.err },
        );
      }

      if (hasReachedCommitment(status.confirmationStatus, commitment)) {
        return { signature, commitment, status };
      }

      await wait(SIGNATURE_STATUS_POLL_INTERVAL_MS);
      elapsedMs += SIGNATURE_STATUS_POLL_INTERVAL_MS;
    }

    throw createSolanaError(
      "TRANSACTION_TIMEOUT",
      `Timed out waiting for transaction ${signature} to reach ${commitment} commitment.`,
    );
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

function toBase64WireTransaction(transaction: SolanaTransaction) {
  return getBase64EncodedWireTransaction(getTransactionDecoder().decode(transaction));
}

function hasReachedCommitment(
  actualStatus: string | null | undefined,
  targetCommitment: string,
): boolean {
  if (!actualStatus) {
    return false;
  }

  return (COMMITMENT_RANK[actualStatus] ?? 0) >= (COMMITMENT_RANK[targetCommitment] ?? 0);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
