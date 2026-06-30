import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  deferred,
  mountUseSignatureStatus,
  nextSignature,
  signature,
} from "../../test-utils/useSignatureStatus";

describe("useSignatureStatus subscriptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("subscribes to signature updates and removes the listener on unmount", async () => {
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const onSignature = vi.fn().mockReturnValue(7);
    const removeSignatureListener = vi.fn().mockResolvedValue(undefined);
    const { result, wrapper } = mountUseSignatureStatus(
      signature,
      { commitment: "finalized", subscribe: true },
      {
        getSignatureStatuses,
        onSignature,
        removeSignatureListener,
      },
    );

    await flushPromises();

    const listener = onSignature.mock.calls[0]?.[1] as (
      notification: { err: unknown },
      context: { slot: number },
    ) => void;
    listener({ err: null }, { slot: 99 });

    expect(result.status.value).toEqual({
      slot: 99,
      confirmations: null,
      err: null,
      confirmationStatus: "finalized",
    });
    expect(onSignature).toHaveBeenCalledWith(signature, expect.any(Function), "finalized");

    wrapper.unmount();
    await flushPromises();

    expect(removeSignatureListener).toHaveBeenCalledWith(7);
  });

  it("ignores stale signature subscription callbacks after the input changes", async () => {
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const onSignature = vi.fn().mockReturnValueOnce(7).mockReturnValueOnce(8);
    const removeSignatureListener = vi.fn().mockResolvedValue(undefined);
    const signatureRef = ref(signature);
    const { result } = mountUseSignatureStatus(
      signatureRef,
      { subscribe: true },
      {
        getSignatureStatuses,
        onSignature,
        removeSignatureListener,
      },
    );

    await flushPromises();
    const staleListener = onSignature.mock.calls[0]?.[1] as (
      notification: { err: unknown },
      context: { slot: number },
    ) => void;

    signatureRef.value = nextSignature;
    await flushPromises();
    const currentListener = onSignature.mock.calls[1]?.[1] as (
      notification: { err: unknown },
      context: { slot: number },
    ) => void;

    currentListener({ err: null }, { slot: 2 });
    expect(result.status.value?.slot).toBe(2);

    staleListener({ err: "stale" }, { slot: 1 });

    expect(result.status.value).toEqual({
      slot: 2,
      confirmations: null,
      err: null,
      confirmationStatus: "confirmed",
    });
  });

  it("does not leak stale signature listeners when input changes during cleanup", async () => {
    const stopInitialListener = deferred<void>();
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const onSignature = vi.fn().mockReturnValueOnce(7).mockReturnValueOnce(8);
    const removeSignatureListener = vi
      .fn()
      .mockReturnValueOnce(stopInitialListener.promise)
      .mockResolvedValue(undefined);
    const signatureRef = ref(signature);
    mountUseSignatureStatus(
      signatureRef,
      { subscribe: true },
      {
        getSignatureStatuses,
        onSignature,
        removeSignatureListener,
      },
    );

    await flushPromises();
    expect(onSignature).toHaveBeenCalledTimes(1);

    signatureRef.value = nextSignature;
    await flushPromises();
    expect(removeSignatureListener).toHaveBeenCalledWith(7);
    expect(onSignature).toHaveBeenCalledTimes(1);

    signatureRef.value = signature;
    await flushPromises();
    expect(onSignature).toHaveBeenCalledTimes(2);

    stopInitialListener.resolve();
    await flushPromises();

    expect(onSignature).toHaveBeenCalledTimes(2);
  });
});
