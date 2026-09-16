import type { Commitment } from "@vue-solana/core/kit";
import { normalizeSolanaError, type SolanaError } from "@vue-solana/core/errors";
import { onMounted, shallowRef, toValue, watch, type MaybeRefOrGetter } from "vue";
import { parseAddress } from "@vue-solana/core/address";
import { useConnection } from "./useConnection";
import { tryUseSolana } from "./useSolana";
import { decodeBase64 } from "./decode-base64";

export interface UseAccountInfoOptions {
  commitment?: Commitment;
}

export interface AccountInfo {
  executable: boolean;
  lamports: number;
  owner: string;
  space: number;
  data: Uint8Array;
}

export function useAccountInfo(
  address: MaybeRefOrGetter<string | null | undefined>,
  options: UseAccountInfoOptions = {},
) {
  const solana = tryUseSolana();
  const client = solana?.client ?? useConnection();
  const accountInfo = shallowRef<AccountInfo | null>(null);
  const loading = shallowRef(false);
  const error = shallowRef<SolanaError | null>(null);
  let refreshId = 0;

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
      const parsedAddress = parseAddress(value);

      if (!parsedAddress) {
        accountInfo.value = null;
        return null;
      }

      const { value: account } = await client.rpc
        .getAccountInfo(parsedAddress, {
          encoding: "base64",
          commitment: options.commitment,
        })
        .send();
      const nextAccountInfo = account ? normalizeAccountInfo(account) : null;

      if (requestId === refreshId) {
        accountInfo.value = nextAccountInfo;
      }

      return nextAccountInfo;
    } catch (cause) {
      const normalizedError = normalizeSolanaError(cause, "RPC_FAILURE");

      if (requestId === refreshId) {
        accountInfo.value = null;
        error.value = normalizedError;
      }

      throw normalizedError;
    } finally {
      if (requestId === refreshId) {
        loading.value = false;
      }
    }
  }

  onMounted(() => {
    void refresh().catch(() => undefined);
  });

  watch(
    () => toValue(address),
    () => {
      void refresh().catch(() => undefined);
    },
  );

  return {
    accountInfo,
    loading,
    error,
    refresh,
  };
}

function normalizeAccountInfo(account: {
  executable: boolean;
  lamports: bigint;
  owner: string;
  space: bigint;
  data: readonly [string, "base64"];
}): AccountInfo {
  return {
    executable: account.executable,
    lamports: Number(account.lamports),
    owner: account.owner,
    space: Number(account.space),
    data: decodeBase64(account.data[0]),
  };
}
