import type {
  Address,
  Commitment,
  Signature,
  TokenAmount,
  TokenBalance,
  TransactionBlockhashLifetime,
  TransactionError,
} from "@solana/kit";
import { getBase64EncodedWireTransaction, getTransactionDecoder } from "@solana/kit";
import type { SolanaClient } from "./kit";
import { createSolanaError, normalizeSolanaError } from "./errors";
import { assertWalletCanSign, assertWalletConnected } from "./wallet";
import type {
  ConfirmTransactionOptions,
  SendTransactionOptions,
  SimulateTransactionOptions,
  SimulatedBalanceChange,
  SimulatedLoadedAddresses,
  SimulatedTokenBalanceChange,
  SimulatedTransactionResult,
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

    return await sendSignedTransaction(client, signedTransaction, options);
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

/**
 * Submit an already-signed transaction through the client RPC.
 */
export async function sendSignedTransaction(
  client: SolanaClient,
  signedTransaction: SolanaTransaction,
  options?: SendTransactionOptions,
): Promise<Signature> {
  const { maxRetries, minContextSlot, preflightCommitment, skipPreflight } = options ?? {};

  try {
    return await client.rpc
      .sendTransaction(toBase64WireTransaction(signedTransaction), {
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
 * Simulate a raw wire transaction without submitting it.
 *
 * A non-null `err` in the returned result means the simulation failed; it is
 * inspectable data rather than a thrown error. Only transport failures and
 * invalid input reject.
 */
export async function simulateTransaction(
  client: SolanaClient,
  transaction: SolanaTransaction,
  options: SimulateTransactionOptions = {},
): Promise<SimulatedTransactionResult> {
  const { commitment, minContextSlot, sigVerify, replaceRecentBlockhash, abortSignal } = options;

  if (sigVerify && replaceRecentBlockhash) {
    throw createSolanaError(
      "INVALID_INPUT",
      "simulateTransaction: `sigVerify` and `replaceRecentBlockhash` are mutually exclusive.",
    );
  }

  abortSignal?.throwIfAborted();

  let encoded: ReturnType<typeof toBase64WireTransaction>;

  try {
    encoded = toBase64WireTransaction(transaction);
  } catch (cause) {
    throw createSolanaError("INVALID_INPUT", "Invalid transaction bytes for simulation.", {
      cause,
    });
  }

  const rpcConfig = {
    encoding: "base64",
    commitment,
    minContextSlot,
    ...(sigVerify ? { sigVerify: true as const } : {}),
    ...(replaceRecentBlockhash ? { replaceRecentBlockhash: true as const } : {}),
  } as NonNullable<Parameters<SolanaClient["rpc"]["simulateTransaction"]>[1]>;

  try {
    const response = await client.rpc.simulateTransaction(encoded, rpcConfig).send({ abortSignal });

    return normalizeSimulationResult(response.value as SimulationRpcValue);
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

/**
 * Confirm a transaction signature against the kit RPC until it reaches the
 * requested commitment.
 *
 * Kit's `sendAndConfirmTransaction` cannot back this: it needs the whole
 * transaction plus a `rpcSubscriptions` websocket and sends the transaction
 * itself, whereas this confirms a signature a wallet already submitted.
 *
 * Kit's `getSignatureStatuses` takes no commitment parameter — the commitment
 * check below is client-side. A missing status means the signature is unknown
 * (not found), distinct from a failed transaction or an expired wait.
 */
export async function confirmTransactionSignature(
  client: SolanaClient,
  signature: Signature,
  options: ConfirmTransactionOptions = {},
): Promise<TransactionConfirmation> {
  const commitment: Commitment = options.commitment ?? DEFAULT_CONFIRMATION_COMMITMENT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CONFIRMATION_TIMEOUT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? SIGNATURE_STATUS_POLL_INTERVAL_MS;
  const { abortSignal, searchTransactionHistory = false } = options;

  if (typeof timeoutMs !== "number" || Number.isNaN(timeoutMs) || timeoutMs < 0) {
    throw createSolanaError(
      "INVALID_INPUT",
      `Invalid confirmation timeout: expected a non-negative number of milliseconds, received ${String(timeoutMs)}`,
    );
  }

  if (typeof pollIntervalMs !== "number" || Number.isNaN(pollIntervalMs) || pollIntervalMs <= 0) {
    throw createSolanaError(
      "INVALID_INPUT",
      `Invalid confirmation poll interval: expected a positive number of milliseconds, received ${String(pollIntervalMs)}`,
    );
  }

  abortSignal?.throwIfAborted();

  // Wall clock, not accumulated sleeps: `getSignatureStatuses` can take
  // seconds on a loaded RPC, and a timeout that only counts the sleeps would
  // keep polling long past `timeoutMs`.
  const deadline = Date.now() + timeoutMs;
  // Whether any poll ever returned a status. A signature that never appears
  // before the deadline is not-found; one that appears but never reaches the
  // requested commitment is a timeout. Collapsing both into a timeout would
  // send callers to poll a signature that never existed.
  let sawStatus = false;

  try {
    while (Date.now() < deadline) {
      abortSignal?.throwIfAborted();

      const response = await client.rpc
        .getSignatureStatuses([signature], { searchTransactionHistory })
        .send({ abortSignal });
      const [status] = response.value;

      // A miss usually means the signature has not propagated to this RPC
      // node yet; keep polling until the deadline rather than failing on the
      // first empty poll.
      if (!status) {
        await wait(pollIntervalMs, abortSignal);
        continue;
      }

      sawStatus = true;

      if (status.err) {
        throw createSolanaError(
          "TRANSACTION_FAILED",
          `Transaction ${signature} failed to reach ${commitment} commitment.`,
          { cause: status.err },
        );
      }

      if (hasReachedCommitment(status.confirmationStatus, commitment)) {
        return { signature, commitment, status };
      }

      await wait(pollIntervalMs, abortSignal);
    }

    if (!sawStatus) {
      throw createSolanaError("TRANSACTION_NOT_FOUND", `Transaction ${signature} was not found.`);
    }

    throw createSolanaError(
      "TRANSACTION_TIMEOUT",
      `Timed out waiting for transaction ${signature} to reach ${commitment} commitment.`,
    );
  } catch (cause) {
    if (abortSignal?.aborted) {
      // `reason` is always set after `abort()` per spec; fall back to the
      // thrown cause for non-conforming signals that report `undefined`.
      throw abortSignal.reason ?? cause;
    }

    if (isAbortErrorLike(cause)) {
      throw cause;
    }

    throw normalizeSolanaError(cause, "RPC_FAILURE");
  }
}

function toBase64WireTransaction(transaction: SolanaTransaction) {
  return getBase64EncodedWireTransaction(getTransactionDecoder().decode(transaction));
}

interface SimulationRpcValue {
  err?: TransactionError | null;
  fee?: bigint | null;
  loadedAccountsDataSize?: number;
  loadedAddresses?: {
    readonly: readonly Address[];
    writable: readonly Address[];
  } | null;
  logs?: string[] | null;
  postBalances?: readonly bigint[] | null;
  postTokenBalances?: readonly TokenBalance[] | null;
  preBalances?: readonly bigint[] | null;
  preTokenBalances?: readonly TokenBalance[] | null;
  replacementBlockhash?: TransactionBlockhashLifetime | null;
  returnData?: { data: string; programId: Address } | null;
  unitsConsumed?: bigint;
}

function normalizeSimulationResult(value: SimulationRpcValue): SimulatedTransactionResult {
  const preBalances = value.preBalances ? [...value.preBalances] : null;
  const postBalances = value.postBalances ? [...value.postBalances] : null;
  const preTokenBalances = value.preTokenBalances ? [...value.preTokenBalances] : null;
  const postTokenBalances = value.postTokenBalances ? [...value.postTokenBalances] : null;
  const loadedAddresses: SimulatedLoadedAddresses = {
    readonly: value.loadedAddresses ? [...value.loadedAddresses.readonly] : [],
    writable: value.loadedAddresses ? [...value.loadedAddresses.writable] : [],
  };

  return {
    err: value.err ?? null,
    logs: value.logs ? [...value.logs] : null,
    fee: value.fee ?? null,
    balanceChanges: normalizeBalanceChanges(preBalances, postBalances),
    preBalances,
    postBalances,
    tokenBalanceChanges: normalizeTokenBalanceChanges(preTokenBalances, postTokenBalances),
    preTokenBalances,
    postTokenBalances,
    loadedAddresses,
    loadedAccountsDataSize: value.loadedAccountsDataSize ?? null,
    returnData: value.returnData
      ? { data: value.returnData.data, programId: value.returnData.programId }
      : null,
    replacementBlockhash: value.replacementBlockhash ?? null,
    unitsConsumed: value.unitsConsumed ?? null,
  };
}

function normalizeBalanceChanges(
  before: readonly bigint[] | null,
  after: readonly bigint[] | null,
): readonly SimulatedBalanceChange[] | null {
  if (!before || !after || before.length !== after.length) {
    return null;
  }

  return before.flatMap((value, accountIndex) => {
    const afterValue = after[accountIndex];

    if (afterValue === undefined) {
      return [];
    }

    return [
      {
        accountIndex,
        before: value,
        after: afterValue,
        change: afterValue - value,
      },
    ];
  });
}

function normalizeTokenBalanceChanges(
  before: readonly TokenBalance[] | null,
  after: readonly TokenBalance[] | null,
): readonly SimulatedTokenBalanceChange[] | null {
  if (!before || !after) {
    return null;
  }

  const beforeByKey = new Map(before.map((balance) => [tokenBalanceKey(balance), balance]));
  const afterByKey = new Map(after.map((balance) => [tokenBalanceKey(balance), balance]));
  const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);

  return [...keys].flatMap((key) => {
    const beforeBalance = beforeByKey.get(key);
    const afterBalance = afterByKey.get(key);
    const source = afterBalance ?? beforeBalance;

    if (!source) {
      return [];
    }

    return [
      {
        accountIndex: source.accountIndex,
        mint: source.mint,
        ...(source.owner ? { owner: source.owner } : {}),
        ...(source.programId ? { programId: source.programId } : {}),
        before: beforeBalance?.uiTokenAmount ?? null,
        after: afterBalance?.uiTokenAmount ?? null,
        change: tokenAmountDelta(beforeBalance?.uiTokenAmount, afterBalance?.uiTokenAmount),
      },
    ];
  });
}

function tokenBalanceKey(balance: TokenBalance): string {
  return [balance.accountIndex, balance.mint, balance.programId ?? "", balance.owner ?? ""].join(
    ":",
  );
}

function tokenAmountDelta(
  before: TokenAmount | undefined,
  after: TokenAmount | undefined,
): bigint | null {
  if (!before || !after) {
    return null;
  }

  try {
    return BigInt(after.amount) - BigInt(before.amount);
  } catch {
    return null;
  }
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

function wait(ms: number, signal?: AbortSignal) {
  if (ms <= 0) {
    signal?.throwIfAborted();
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timeoutId);
      reject(signal!.reason);
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbortErrorLike(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { name?: unknown }).name === "AbortError"
  );
}
