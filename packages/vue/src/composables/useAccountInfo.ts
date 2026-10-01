import type { Commitment } from "@vue-solana/core/kit";
import type { MaybeRefOrGetter } from "vue";
import { useConnection } from "./useConnection";
import { useAddressRead } from "./use-address-read";
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

  const { data: accountInfo, ...rest } = useAddressRead(
    [address],
    async (key) =>
      (
        await client.rpc
          .getAccountInfo(key, { encoding: "base64", commitment: options.commitment })
          .send()
      ).value,
    (account) => (account ? normalizeAccountInfo(account) : null),
    null,
  );

  return { accountInfo, ...rest };
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
