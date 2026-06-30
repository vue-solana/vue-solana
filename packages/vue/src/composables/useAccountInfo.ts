import { parsePublicKey, type PublicKeyInput } from "@vue-solana/core/address";
import type { AccountInfo, Commitment } from "@solana/web3-compat";
import { onMounted, onUnmounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";

export interface UseAccountInfoOptions {
  commitment?: Commitment;
  watch?: boolean;
}

export function useAccountInfo(
  address: MaybeRefOrGetter<PublicKeyInput>,
  options: UseAccountInfoOptions = {},
) {
  const solana = tryUseSolana();
  const connection = solana?.connection ?? useConnection();
  const accountInfo = shallowRef<AccountInfo<Buffer> | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef<unknown>(null);
  let refreshId = 0;
  let watchId = 0;
  let subscriptionId: number | null = null;
  let manuallyStopped = false;

  async function refresh() {
    const requestId = ++refreshId;
    const value = toValue(address);

    if (!value || !solana) {
      accountInfo.value = null;
      loading.value = false;
      error.value = null;
      return null;
    }

    loading.value = true;
    error.value = null;

    try {
      const publicKey = parsePublicKey(value);

      if (!publicKey) {
        accountInfo.value = null;
        return null;
      }

      const nextAccountInfo = await connection.getAccountInfo(publicKey, options.commitment);

      if (requestId === refreshId) {
        accountInfo.value = nextAccountInfo;
      }

      return nextAccountInfo;
    } catch (cause) {
      if (requestId === refreshId) {
        accountInfo.value = null;
        error.value = cause;
      }

      throw cause;
    } finally {
      if (requestId === refreshId) {
        loading.value = false;
      }
    }
  }

  async function stopWatching() {
    manuallyStopped = true;
    watchId += 1;
    await stopCurrentWatcher();
  }

  async function stopCurrentWatcher() {
    if (subscriptionId === null) {
      return;
    }

    const currentSubscriptionId = subscriptionId;
    subscriptionId = null;

    try {
      await connection.removeAccountChangeListener(currentSubscriptionId);
    } catch (cause) {
      error.value = cause;
    }
  }

  async function startWatching() {
    const requestId = ++watchId;
    await stopCurrentWatcher();

    if (requestId !== watchId) {
      return;
    }

    if (manuallyStopped || !options.watch || !solana) {
      return;
    }

    try {
      const publicKey = parsePublicKey(toValue(address));

      if (!publicKey) {
        return;
      }

      const nextSubscriptionId = connection.onAccountChange(
        publicKey,
        (nextAccountInfo: AccountInfo<Buffer>) => {
          if (requestId !== watchId) {
            return;
          }

          accountInfo.value = nextAccountInfo;
          error.value = null;
        },
        options.commitment,
      );

      if (requestId !== watchId) {
        await connection.removeAccountChangeListener(nextSubscriptionId);
        return;
      }

      subscriptionId = nextSubscriptionId;
    } catch (cause) {
      if (requestId === watchId) {
        error.value = cause;
      }
    }
  }

  onMounted(() => {
    void refresh().catch(() => undefined);
    void startWatching();
  });

  onUnmounted(() => {
    refreshId += 1;
    void stopWatching();
  });

  watch(
    () => toValue(address),
    () => {
      void refresh().catch(() => undefined);
      void startWatching();
    },
  );

  return {
    accountInfo,
    loading,
    error,
    refresh,
    stopWatching,
  };
}
