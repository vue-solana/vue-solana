import bs58 from "bs58";
import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  deferred,
  mountUseSignatureStatus,
  nextSignature,
  signature,
} from "../../test-utils/useSignatureStatus";

describe("useSignatureStatus", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("loads a signature status", async () => {
    const signatureStatus = {
      slot: 1,
      confirmations: 2,
      err: null,
      confirmationStatus: "confirmed",
    };
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [signatureStatus] });
    const { result } = mountUseSignatureStatus(
      signature,
      { searchTransactionHistory: true },
      { getSignatureStatuses },
    );

    await flushPromises();

    expect(result.status.value).toBe(signatureStatus);
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeNull();
    expect(getSignatureStatuses).toHaveBeenCalledWith([signature], {
      searchTransactionHistory: true,
    });
  });

  it("stores invalid signature errors without calling or polling RPC", async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const getSignatureStatuses = vi.fn();
    const { result } = mountUseSignatureStatus(
      "not-a-signature",
      { pollIntervalMs: 1 },
      {
        getSignatureStatuses,
      },
    );

    await flushPromises();
    await vi.advanceTimersByTimeAsync(5);

    expect(result.status.value).toBeNull();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(getSignatureStatuses).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it("rejects signatures that do not decode to 64 bytes", async () => {
    const getSignatureStatuses = vi.fn();
    const { result } = mountUseSignatureStatus(bs58.encode(new Uint8Array(63).fill(1)), undefined, {
      getSignatureStatuses,
    });

    await flushPromises();

    expect(result.status.value).toBeNull();
    expect(result.error.value).toBeInstanceOf(TypeError);
    expect(getSignatureStatuses).not.toHaveBeenCalled();
  });

  it("clears stale signature status when a loaded signature becomes invalid", async () => {
    const signatureStatus = {
      slot: 1,
      confirmations: 2,
      err: null,
      confirmationStatus: "confirmed",
    };
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [signatureStatus] });
    const signatureRef = ref(signature);
    const { result } = mountUseSignatureStatus(signatureRef, undefined, { getSignatureStatuses });

    await flushPromises();
    expect(result.status.value).toBe(signatureStatus);

    signatureRef.value = "not-a-signature";
    await flushPromises();

    expect(result.status.value).toBeNull();
    expect(result.error.value).toBeInstanceOf(TypeError);
    expect(getSignatureStatuses).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid poll intervals without creating a tight polling loop", async () => {
    vi.useFakeTimers();
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const { result } = mountUseSignatureStatus(
      signature,
      { pollIntervalMs: -1 },
      {
        getSignatureStatuses,
      },
    );

    await flushPromises();
    await vi.advanceTimersByTimeAsync(5);

    expect(result.error.value).toBeInstanceOf(RangeError);
    expect(getSignatureStatuses).toHaveBeenCalledTimes(1);
  });

  it("does not poll RPC for null input", async () => {
    const getSignatureStatuses = vi.fn();
    const { result } = mountUseSignatureStatus(null, undefined, { getSignatureStatuses });

    await flushPromises();

    expect(result.status.value).toBeNull();
    expect(getSignatureStatuses).not.toHaveBeenCalled();
  });

  it("keeps the newest signature status when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<unknown>();
    const secondRequest = deferred<unknown>();
    const getSignatureStatuses = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const signatureRef = ref(signature);
    const { result } = mountUseSignatureStatus(signatureRef, undefined, { getSignatureStatuses });

    await flushPromises();
    signatureRef.value = nextSignature;
    await flushPromises();

    const newest = { slot: 2, confirmations: null, err: null, confirmationStatus: "finalized" };
    secondRequest.resolve({ value: [newest] });
    await flushPromises();

    expect(result.status.value).toBe(newest);

    firstRequest.resolve({ value: [{ slot: 1, confirmations: 1, err: null }] });
    await flushPromises();

    expect(result.status.value).toBe(newest);
  });

  it("polls when a poll interval is provided and stops on unmount", async () => {
    vi.useFakeTimers();
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const { wrapper } = mountUseSignatureStatus(
      signature,
      { pollIntervalMs: 50 },
      {
        getSignatureStatuses,
      },
    );

    await flushPromises();
    expect(getSignatureStatuses).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    expect(getSignatureStatuses).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(50);
    expect(getSignatureStatuses).toHaveBeenCalledTimes(2);
  });

  it("does not restart polling after manual stop when the input changes", async () => {
    vi.useFakeTimers();
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const signatureRef = ref(signature);
    const { result } = mountUseSignatureStatus(
      signatureRef,
      { pollIntervalMs: 50 },
      {
        getSignatureStatuses,
      },
    );

    await flushPromises();
    result.stopPolling();

    signatureRef.value = nextSignature;
    await flushPromises();
    await vi.advanceTimersByTimeAsync(50);

    expect(getSignatureStatuses).toHaveBeenCalledTimes(2);
  });
});
