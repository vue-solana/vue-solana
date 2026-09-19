import { address } from "@solana/kit";
import { computed, ref } from "vue";

interface SlotNotificationShape {
  parent: number | bigint;
  root: number | bigint;
  slot: number | bigint;
}

export function useDemoLiveData() {
  const { t } = useI18n();
  const { client } = useSolanaClient();
  const trackedAddressInput = ref("HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH");
  const trackedAddress = computed(() => {
    const raw = trackedAddressInput.value.trim();

    try {
      return address(raw);
    } catch {
      return null;
    }
  });

  const request = useSolanaRequest(
    computed(() =>
      trackedAddress.value
        ? async (signal: AbortSignal) => {
            const [balanceResponse, versionResponse] = await Promise.all([
              client.rpc.getBalance(trackedAddress.value).send({ abortSignal: signal }),
              client.rpc.getVersion().send({ abortSignal: signal }),
            ]);

            return {
              lamports: balanceResponse.value,
              slot: balanceResponse.context.slot,
              sol: Number(balanceResponse.value) / 1_000_000_000,
              core: versionResponse["solana-core"],
            };
          }
        : null,
    ),
  );

  const slots = useSolanaSubscription<SlotNotificationShape>(
    computed(() => (trackedAddress.value ? client.rpcSubscriptions.slotNotifications() : null)),
  );

  const tracked = useSolanaTrackedData<
    { lamports: bigint } | null,
    { lamports: bigint } | null,
    bigint
  >({
    rpcRequest: computed(() =>
      trackedAddress.value
        ? client.rpc.getAccountInfo(trackedAddress.value, { encoding: "base64" })
        : null,
    ),
    rpcSubscriptionRequest: computed(() =>
      trackedAddress.value
        ? client.rpcSubscriptions.accountNotifications(trackedAddress.value, {
            commitment: "confirmed",
          })
        : null,
    ),
    rpcValueMapper: (value) => value?.lamports ?? 0n,
    rpcSubscriptionValueMapper: (value) => value?.lamports ?? 0n,
  });

  const requestText = computed(() => {
    const data = request.data.value;

    return data ? `${data.sol} SOL · solana-core ${data.core}` : t("demo.liveData.noData");
  });
  const slotsText = computed(() => {
    const data = slots.data.value;

    return data ? `Slot ${data.slot} · root ${data.root}` : t("demo.liveData.noData");
  });
  const trackedText = computed(() => {
    const response = tracked.data.value;

    return response
      ? `Lamports ${response.value} · slot ${response.context.slot}`
      : t("demo.liveData.noData");
  });

  return {
    request,
    requestText,
    slots,
    slotsText,
    tracked,
    trackedAddressInput,
    trackedText,
  };
}
