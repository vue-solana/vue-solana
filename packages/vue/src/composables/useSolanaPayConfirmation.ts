import { onUnmounted, ref } from "vue";
import { getSolanaPayPaymentStatus } from "@vue-solana/core";

export function useSolanaPayConfirmation() {
  const status = ref<string>("pending");
  const error = ref<unknown>(null);
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  async function check(rpc: unknown, reference: string) {
    if (stopped) return;
    try {
      status.value = await getSolanaPayPaymentStatus(rpc, reference);
    } catch (e) {
      error.value = e;
      status.value = "error";
    }
  }

  function startPolling(rpc: unknown, reference: string, interval = 2000) {
    stopPolling();
    stopped = false;
    const run = async () => {
      if (stopped) return;
      await check(rpc, reference);
      if (stopped) return;
      if (status.value === "pending" || status.value === "found") {
        timer = setTimeout(run, interval);
      }
    };
    void run();
  }

  function stopPolling() {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }

  onUnmounted(() => {
    stopPolling();
  });

  return { status, error, check, startPolling, stopPolling };
}
