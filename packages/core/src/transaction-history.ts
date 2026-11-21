import type { Commitment, Signature, Slot, TransactionError, UnixTimestamp } from "@solana/kit";
import { parseAddress, type MaybeAddressInput } from "./address";
import { createSolanaError, normalizeSolanaError } from "./errors";
import type { SolanaClient } from "./kit";
import type {
  TransactionHistoryItem,
  TransactionHistoryOptions,
  TransactionHistoryResult,
} from "./types";

export type {
  TransactionHistoryCommitment,
  TransactionHistoryItem,
  TransactionHistoryOptions,
  TransactionHistoryResult,
} from "./types";

const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 1000;

/**
 * List signature metadata for an address without fetching transaction bodies.
 *
 * Results are the RPC's newest-first order, normalized only to omit nullable
 * fields that carry no information. `hasMore` is derived from page length;
 * pass `nextBefore` back as `before` to fetch the next older page.
 */
export async function getTransactionHistory(
  client: SolanaClient,
  address: MaybeAddressInput,
  options: TransactionHistoryOptions = {},
): Promise<TransactionHistoryResult> {
  const rawOptions: unknown = options;

  if (typeof rawOptions !== "object" || rawOptions === null) {
    throw createSolanaError("INVALID_INPUT", "getTransactionHistory: `options` must be an object.");
  }

  const {
    before,
    until,
    limit = DEFAULT_HISTORY_LIMIT,
    commitment,
    abortSignal,
  } = rawOptions as TransactionHistoryOptions;

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_HISTORY_LIMIT) {
    throw createSolanaError(
      "INVALID_INPUT",
      `getTransactionHistory: \`limit\` must be an integer between 1 and ${MAX_HISTORY_LIMIT}.`,
    );
  }

  abortSignal?.throwIfAborted();

  const parsedAddress = parseAddress(address);

  if (!parsedAddress) {
    throw createSolanaError("INVALID_ADDRESS", "getTransactionHistory: an address is required.");
  }

  const rpcConfig = { before, until, limit, commitment } as NonNullable<
    Parameters<SolanaClient["rpc"]["getSignaturesForAddress"]>[1]
  >;

  try {
    const response = await client.rpc
      .getSignaturesForAddress(parsedAddress, rpcConfig)
      .send({ abortSignal });
    const items = response.map(normalizeHistoryItem);
    const hasMore = items.length === limit;
    const nextBefore = hasMore ? items.at(-1)?.signature : undefined;

    return {
      items,
      hasMore,
      ...(nextBefore ? { nextBefore } : {}),
    };
  } catch (cause) {
    if (abortSignal?.aborted) {
      throw abortSignal.reason ?? cause;
    }

    if (isAbortErrorLike(cause)) {
      throw cause;
    }

    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

interface HistoryRpcItem {
  signature: Signature;
  slot: Slot;
  blockTime: UnixTimestamp | null;
  err: TransactionError | null;
  memo: string | null;
  confirmationStatus: Commitment | null;
}

function normalizeHistoryItem(item: HistoryRpcItem): TransactionHistoryItem {
  return {
    signature: item.signature,
    slot: item.slot,
    ...(item.blockTime == null ? {} : { blockTime: item.blockTime }),
    err: item.err,
    ...(item.memo == null ? {} : { memo: item.memo }),
    ...(item.confirmationStatus == null ? {} : { confirmationStatus: item.confirmationStatus }),
  };
}

function isAbortErrorLike(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { name?: unknown }).name === "AbortError"
  );
}
