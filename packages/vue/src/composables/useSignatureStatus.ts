import {
  getBase58Encoder,
  type Commitment,
  type ReadonlyUint8Array,
  type Signature,
} from "@vue-solana/core/kit";
import { createSolanaError, normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { onMounted, onScopeDispose, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useSolanaClient } from "./useSolanaClient";
import { tryUseSolana } from "./useSolana";

export interface UseSignatureStatusOptions {
  pollIntervalMs?: number;
  searchTransactionHistory?: boolean;
}

export interface SignatureStatus {
  slot: number;
  confirmations: number | null;
  err: unknown | null;
  confirmationStatus: Commitment | null;
}

export function useSignatureStatus(
  signature: MaybeRefOrGetter<string | null | undefined>,
  options: UseSignatureStatusOptions = {},
) {
  const solana = tryUseSolana();
  const client = solana?.client ?? useSolanaClient().client;
  const status = shallowRef<SignatureStatus | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef<SolanaError | null>(null);
  let refreshId = 0;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let manuallyStoppedPolling = false;
  let refreshInFlight: {
    value: string | null | undefined;
    promise: Promise<SignatureStatus | null>;
  } | null = null;

  async function refresh() {
    // Same-signature concurrent calls join the in-flight request instead of
    // starting a second `getSignatureStatuses` call. A signature change
    // always starts a fresh RPC: joining the old one would return the stale
    // signature's result and leave the new signature's status unset (the
    // stale response is dropped by the `requestId` guard in `runRefresh`).
    const value = toValue(signature);
    const inFlight = refreshInFlight;

    if (inFlight && inFlight.value === value) {
      return inFlight.promise;
    }

    const promise = runRefresh();

    refreshInFlight = { value, promise };

    try {
      return await promise;
    } finally {
      if (refreshInFlight?.promise === promise) {
        refreshInFlight = null;
      }
    }
  }

  async function runRefresh() {
    const requestId = ++refreshId;
    const value = toValue(signature);

    if (!value || !solana) {
      status.value = null;
      loading.value = false;
      error.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const validSignature = parseTransactionSignature(value);
      // No `commitment` here: `getSignatureStatuses` takes no per-call
      // commitment (Kit's config type confirms it), it uses the one the client
      // was built with. Set it on the endpoint / `createSolanaPlugin`.
      const response = await client.rpc
        .getSignatureStatuses([validSignature], {
          searchTransactionHistory: options.searchTransactionHistory,
        })
        .send();
      const nextRawStatus = response.value[0] ?? null;
      const nextStatus = nextRawStatus ? normalizeSignatureStatus(nextRawStatus) : null;

      if (requestId === refreshId) {
        status.value = nextStatus;
      }

      return nextStatus;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (requestId === refreshId) {
        status.value = null;
        error.value = normalizedError;
      }

      throw normalizedError;
    } finally {
      if (requestId === refreshId) {
        loading.value = false;
      }
    }
  }

  function stopPolling() {
    manuallyStoppedPolling = true;
    stopCurrentPolling();
  }

  function stopCurrentPolling() {
    if (pollTimer === null) {
      return;
    }

    clearTimeout(pollTimer);
    pollTimer = null;
  }

  function schedulePoll() {
    stopCurrentPolling();

    if (!options.pollIntervalMs || !solana) {
      return;
    }

    if (manuallyStoppedPolling) {
      return;
    }

    const value = toValue(signature);

    if (!value) {
      return;
    }

    if (options.pollIntervalMs <= 0) {
      error.value = createSolanaError("RPC_FAILURE", "pollIntervalMs must be greater than 0");
      return;
    }

    try {
      parseTransactionSignature(value);
    } catch (cause) {
      error.value = normalizeSolanaError(cause, "RPC_FAILURE");
      return;
    }

    // Chained `setTimeout`, not `setInterval`: the next tick is scheduled
    // only after the current request settles, so a slow RPC can delay the
    // cadence but never overlap itself.
    pollTimer = setTimeout(() => {
      pollTimer = null;
      void refresh()
        .catch(() => undefined)
        .finally(() => {
          schedulePoll();
        });
    }, options.pollIntervalMs);
  }

  function startPolling() {
    // A signature change is an explicit restart: it clears a manual stop, so
    // polling resumes for the new signature even after `stopPolling()`.
    manuallyStoppedPolling = false;
    schedulePoll();
  }

  onMounted(() => {
    void refresh().catch(() => undefined);
    schedulePoll();
  });

  // `onScopeDispose` also fires on unmount, and additionally covers setup
  // contexts with no mounted component (SSR, manual effect scopes), where
  // `onUnmounted` would warn about a missing instance and never run.
  onScopeDispose(() => {
    refreshId += 1;
    stopPolling();
  });

  watch(
    () => toValue(signature),
    () => {
      void refresh().catch(() => undefined);
      startPolling();
    },
  );

  return {
    status,
    loading,
    error,
    refresh,
    stopPolling,
  };
}

function parseTransactionSignature(signature: string): Signature {
  let decodedSignature: ReadonlyUint8Array;

  try {
    decodedSignature = getBase58Encoder().encode(signature);
  } catch (cause) {
    throw new TypeError("Invalid Solana transaction signature", { cause });
  }

  if (decodedSignature.length !== 64) {
    throw new TypeError("Invalid Solana transaction signature");
  }

  return signature as Signature;
}

function normalizeSignatureStatus(status: {
  slot: bigint;
  confirmations: bigint | null;
  err: unknown | null;
  confirmationStatus: Commitment | null;
}): SignatureStatus {
  return {
    slot: Number(status.slot),
    confirmations: status.confirmations === null ? null : Number(status.confirmations),
    err: status.err,
    confirmationStatus: status.confirmationStatus,
  };
}
