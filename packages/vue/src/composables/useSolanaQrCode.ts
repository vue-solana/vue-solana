import { ref, shallowRef } from "vue";
import { createQR } from "@vue-solana/core/solana-pay";

export function useSolanaQrCode() {
  const url = shallowRef<string | null>(null);
  const svg = ref<unknown>(null);
  const loading = ref(false);
  const error = ref<unknown>(null);
  async function generate(input: string | URL, options: Record<string, unknown> = {}) {
    loading.value = true;
    error.value = null;
    try {
      url.value = typeof input === "string" ? input : input.toString();
      const result = await createQR(
        input as string,
        ...(Object.values(options) as [number?, string?, string?]),
      );
      svg.value = result;
      return result;
    } catch (e) {
      error.value = e;
      throw e;
    } finally {
      loading.value = false;
    }
  }
  function reset() {
    url.value = null;
    svg.value = null;
    error.value = null;
  }
  return { url, svg, generate, reset, loading, error };
}
