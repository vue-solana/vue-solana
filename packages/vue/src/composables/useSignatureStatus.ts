import type {
  Commitment,
  SignatureResult,
  SignatureStatus,
  TransactionSignature,
} from "@solana/web3-compat";
import bs58 from "bs58";
import { onMounted, onUnmounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export interface UseSignatureStatusOptions {
  commitment?: Commitment;
  pollIntervalMs?: number;
  searchTransactionHistory?: boolean;
  subscribe?: boolean;
}

export function useSignatureStatus(
  signature: MaybeRefOrGetter<TransactionSignature | null | undefined>,
  options: UseSignatureStatusOptions = {},
) {
  const solana = tryUseSolana();
  const connection = solana?.connection ?? useConnection();
  const status = shallowRef<SignatureStatus | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef<unknown>(null);
  let refreshId = 0;
  let subscriptionStartId = 0;
  let pollId: ReturnType<typeof setInterval> | null = null;
  let subscriptionId: number | null = null;

  async function refresh() {
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
      const response = await connection.getSignatureStatuses([validSignature], {
        searchTransactionHistory: options.searchTransactionHistory,
      });
      const nextStatus = response.value[0] ?? null;

      if (requestId === refreshId) {
        status.value = nextStatus;
      }

      return nextStatus;
    } catch (cause) {
      if (requestId === refreshId) {
        status.value = null;
        error.value = cause;
      }

      throw cause;
    } finally {
      if (requestId === refreshId) {
        loading.value = false;
      }
    }
  }

  function stopPolling() {
    if (pollId === null) {
      return;
    }

    clearInterval(pollId);
    pollId = null;
  }

  function startPolling() {
    stopPolling();

    const value = toValue(signature);

    if (!options.pollIntervalMs || !value || !solana) {
      return;
    }

    if (options.pollIntervalMs <= 0) {
      error.value = new RangeError("pollIntervalMs must be greater than 0");
      return;
    }

    try {
      parseTransactionSignature(value);
    } catch (cause) {
      error.value = cause;
      return;
    }

    pollId = setInterval(() => {
      void refresh().catch(() => undefined);
    }, options.pollIntervalMs);
  }

  async function stopSubscription() {
    subscriptionStartId += 1;
    await stopCurrentSubscription();
  }

  async function stopCurrentSubscription() {
    if (subscriptionId === null) {
      return;
    }

    const currentSubscriptionId = subscriptionId;
    subscriptionId = null;
    await connection.removeSignatureListener(currentSubscriptionId);
  }

  async function startSubscription() {
    const requestId = ++subscriptionStartId;
    await stopCurrentSubscription();

    if (requestId !== subscriptionStartId) {
      return;
    }

    const value = toValue(signature);

    if (!options.subscribe || !value || !solana) {
      return;
    }

    try {
      const validSignature = parseTransactionSignature(value);
      const nextSubscriptionId = connection.onSignature(
        validSignature,
        (notification: SignatureResult, context: { slot: number }) => {
          if (requestId !== subscriptionStartId) {
            return;
          }

          status.value = {
            slot: context.slot,
            confirmations: null,
            err: notification.err,
            confirmationStatus: options.commitment ?? "confirmed",
          };
          error.value = null;
        },
        options.commitment,
      );

      if (requestId !== subscriptionStartId) {
        await connection.removeSignatureListener(nextSubscriptionId);
        return;
      }

      subscriptionId = nextSubscriptionId;
    } catch (cause) {
      if (requestId === subscriptionStartId) {
        error.value = cause;
      }
    }
  }

  function resetIntervals() {
    startPolling();
    void startSubscription();
  }

  onMounted(() => {
    void refresh().catch(() => undefined);
    resetIntervals();
  });

  onUnmounted(() => {
    refreshId += 1;
    stopPolling();
    void stopSubscription();
  });

  watch(
    () => toValue(signature),
    () => {
      void refresh().catch(() => undefined);
      resetIntervals();
    },
  );

  return {
    status,
    loading,
    error,
    refresh,
    stopPolling,
    stopSubscription,
  };
}

function parseTransactionSignature(signature: string): TransactionSignature {
  let decodedSignature: Uint8Array;

  try {
    decodedSignature = bs58.decode(signature);
  } catch (cause) {
    throw new TypeError("Invalid Solana transaction signature", { cause });
  }

  if (decodedSignature.length !== 64) {
    throw new TypeError("Invalid Solana transaction signature");
  }

  return signature;
}
