import { PublicKey } from "@solana/web3-compat";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import {
  deferred,
  mountUseAccountInfo,
  systemProgram,
  wrappedSol,
} from "../../test-utils/useAccountInfo";

function rejectedCleanup() {
  const cleanupError = new Error("cleanup failed");

  return {
    cleanupError,
    removeAccountChangeListener: vi.fn().mockRejectedValue(cleanupError),
  };
}

describe("useAccountInfo subscriptions", () => {
  it("subscribes to account changes and cleans up on unmount", async () => {
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValue(42);
    const removeAccountChangeListener = vi.fn().mockResolvedValue(undefined);
    const { result, wrapper } = mountUseAccountInfo(
      systemProgram,
      { commitment: "processed", watch: true },
      {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      },
    );

    await flushPromises();

    const listener = onAccountChange.mock.calls[0]?.[1] as (accountInfo: unknown) => void;
    const nextAccount = { lamports: 999 };
    listener(nextAccount);

    expect(result.accountInfo.value).toBe(nextAccount);
    expect(onAccountChange).toHaveBeenCalledWith(
      expect.any(PublicKey),
      expect.any(Function),
      "processed",
    );

    wrapper.unmount();
    await flushPromises();

    expect(removeAccountChangeListener).toHaveBeenCalledWith(42);
  });

  it("ignores stale account subscription callbacks after the input changes", async () => {
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValueOnce(42).mockReturnValueOnce(43);
    const removeAccountChangeListener = vi.fn().mockResolvedValue(undefined);
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(
      address,
      { watch: true },
      {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      },
    );

    await flushPromises();
    const staleListener = onAccountChange.mock.calls[0]?.[1] as (accountInfo: unknown) => void;

    address.value = wrappedSol;
    await flushPromises();
    const currentListener = onAccountChange.mock.calls[1]?.[1] as (accountInfo: unknown) => void;

    const newest = { lamports: 222 };
    currentListener(newest);
    expect(result.accountInfo.value).toBe(newest);

    staleListener({ lamports: 111 });

    expect(result.accountInfo.value).toBe(newest);
  });

  it("does not leak stale account listeners when watched input changes during cleanup", async () => {
    const stopInitialListener = deferred<void>();
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValueOnce(42).mockReturnValueOnce(43);
    const removeAccountChangeListener = vi
      .fn()
      .mockReturnValueOnce(stopInitialListener.promise)
      .mockResolvedValue(undefined);
    const address = ref(systemProgram);

    mountUseAccountInfo(
      address,
      { watch: true },
      {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      },
    );

    await flushPromises();
    expect(onAccountChange).toHaveBeenCalledTimes(1);

    address.value = wrappedSol;
    await flushPromises();
    expect(removeAccountChangeListener).toHaveBeenCalledWith(42);
    expect(onAccountChange).toHaveBeenCalledTimes(1);

    address.value = systemProgram;
    await flushPromises();
    expect(onAccountChange).toHaveBeenCalledTimes(2);

    stopInitialListener.resolve();
    await flushPromises();

    expect(onAccountChange).toHaveBeenCalledTimes(2);
  });

  it("captures cleanup failures while resubscribing after the input changes", async () => {
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValueOnce(42).mockReturnValueOnce(43);
    const { cleanupError, removeAccountChangeListener } = rejectedCleanup();
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(
      address,
      { watch: true },
      {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      },
    );

    await flushPromises();

    address.value = wrappedSol;
    await flushPromises();

    expect(removeAccountChangeListener).toHaveBeenCalledWith(42);
    expect(result.error.value).toBe(cleanupError);
    expect(onAccountChange).toHaveBeenCalledTimes(2);
  });

  it("captures cleanup failures from manual stop without rejecting", async () => {
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValue(42);
    const { cleanupError, removeAccountChangeListener } = rejectedCleanup();
    const { result } = mountUseAccountInfo(
      systemProgram,
      { watch: true },
      {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      },
    );

    await flushPromises();

    await expect(result.stopWatching()).resolves.toBeUndefined();

    expect(removeAccountChangeListener).toHaveBeenCalledWith(42);
    expect(result.error.value).toBe(cleanupError);
  });

  it("does not restart account watching after manual stop when the input changes", async () => {
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValue(42);
    const removeAccountChangeListener = vi.fn().mockResolvedValue(undefined);
    const address = ref(systemProgram);
    const { result } = mountUseAccountInfo(
      address,
      { watch: true },
      {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      },
    );

    await flushPromises();
    await result.stopWatching();

    address.value = wrappedSol;
    await flushPromises();

    expect(removeAccountChangeListener).toHaveBeenCalledWith(42);
    expect(onAccountChange).toHaveBeenCalledTimes(1);
  });
});
