import { computed, shallowRef } from "vue";
import { encodeURL, parseURL } from "@vue-solana/core/solana-pay";
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";
import { verifySolanaPayPayment } from "@vue-solana/core/solana-pay-confirmation";
import { useSolanaClient } from "./useSolanaClient";

export function useSolanaPay() {
  const { client } = useSolanaClient();
  const rpc = computed(() => (client as { rpc: unknown }).rpc);

  const requestUrl = shallowRef<string | null>(null);
  const parsedRequest = shallowRef<unknown>(null);
  const reference = shallowRef<unknown>(null);
  const status = shallowRef<
    "idle" | "pending" | "found" | "confirmed" | "finalized" | "expired" | "error"
  >("idle");
  const loading = shallowRef(false);
  const error = shallowRef<unknown>(null);

  async function createTransferRequest(input: Record<string, unknown>) {
    loading.value = true;
    error.value = null;
    try {
      const refAddr = await createSolanaPayReference();
      reference.value = refAddr;
      const url = encodeURL({ ...input, reference: refAddr });
      requestUrl.value = url.toString();
      parsedRequest.value = parseURL(url.toString());
      status.value = "pending";
      return url.toString();
    } catch (e) {
      error.value = e;
      status.value = "error";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function parseRequest(value: string) {
    try {
      const parsed = parseURL(value);
      parsedRequest.value = parsed;
      error.value = null;
      return parsed;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function createReference() {
    const refAddr = await createSolanaPayReference();
    reference.value = refAddr;
    return refAddr;
  }

  async function confirmTransfer(options: Record<string, unknown> = {}) {
    if (!reference.value) throw new Error("No reference");
    loading.value = true;
    error.value = null;
    try {
      const parsed = parsedRequest.value as unknown;
      const p = parsed as { recipient?: string; amount?: bigint; splToken?: string } | null;
      const result = await verifySolanaPayPayment(rpc.value as unknown, {
        reference: String(reference.value),
        expectedRecipient: (options as Record<string, unknown>).expectedRecipient ?? p?.recipient,
        expectedAmount: (options as Record<string, unknown>).expectedAmount ?? p?.amount,
        expectedTokenMint: (options as Record<string, unknown>).expectedTokenMint ?? p?.splToken,
        ...(options as Record<string, unknown>),
      });
      status.value = (result as { status: typeof status.value }).status;
      return result;
    } catch (e) {
      error.value = e;
      status.value = "error";
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    requestUrl.value = null;
    parsedRequest.value = null;
    reference.value = null;
    status.value = "idle";
    loading.value = false;
    error.value = null;
  }

  return {
    requestUrl,
    parsedRequest,
    reference,
    status,
    loading,
    error,
    createTransferRequest,
    parseRequest,
    createReference,
    confirmTransfer,
    reset,
  };
}
