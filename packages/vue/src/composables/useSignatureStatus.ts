import type {
  Commitment,
  SignatureResult,
  SignatureStatus,
  TransactionSignature,
} from "@solana/web3-compat";
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
      const response = await connection.getSignatureStatuses([value], {
        searchTransactionHistory: options.searchTransactionHistory,
      });
      const nextStatus = response.value[0] ?? null;

      if (requestId === refreshId) {
        status.value = nextStatus;
      }

      return nextStatus;
    } catch (cause) {
      if (requestId === refreshId) {
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

    if (!options.pollIntervalMs || !toValue(signature) || !solana) {
      return;
    }

    pollId = setInterval(() => {
      void refresh().catch(() => undefined);
    }, options.pollIntervalMs);
  }

  async function stopSubscription() {
    if (subscriptionId === null) {
      return;
    }

    const currentSubscriptionId = subscriptionId;
    subscriptionId = null;
    await connection.removeSignatureListener(currentSubscriptionId);
  }

  async function startSubscription() {
    await stopSubscription();

    const value = toValue(signature);

    if (!options.subscribe || !value || !solana) {
      return;
    }

    subscriptionId = connection.onSignature(
      value,
      (notification: SignatureResult, context: { slot: number }) => {
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
