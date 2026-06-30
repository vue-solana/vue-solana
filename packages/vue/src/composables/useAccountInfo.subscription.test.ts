import { PublicKey } from "@solana/web3-compat";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useAccountInfo } from "./useAccountInfo";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("useAccountInfo subscriptions", () => {
  const systemProgram = "11111111111111111111111111111111";
  const wrappedSol = "So11111111111111111111111111111111111111112";

  it("subscribes to account changes and cleans up on unmount", async () => {
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValue(42);
    const removeAccountChangeListener = vi.fn().mockResolvedValue(undefined);
    const context = createMockSolanaContext({
      connection: {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      } as unknown as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useAccountInfo> | undefined;

    const wrapper = mountWithSolana(
      defineComponent({
        setup() {
          result = useAccountInfo("11111111111111111111111111111111", {
            commitment: "processed",
            watch: true,
          });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    const listener = onAccountChange.mock.calls[0]?.[1] as (accountInfo: unknown) => void;
    const nextAccount = { lamports: 999 };
    listener(nextAccount);

    expect(result?.accountInfo.value).toBe(nextAccount);
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
    const context = createMockSolanaContext({
      connection: {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      } as unknown as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    const address = ref(systemProgram);
    let result: ReturnType<typeof useAccountInfo> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useAccountInfo(address, { watch: true });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    const staleListener = onAccountChange.mock.calls[0]?.[1] as (accountInfo: unknown) => void;

    address.value = wrappedSol;
    await flushPromises();
    const currentListener = onAccountChange.mock.calls[1]?.[1] as (accountInfo: unknown) => void;

    const newest = { lamports: 222 };
    currentListener(newest);
    expect(result?.accountInfo.value).toBe(newest);

    staleListener({ lamports: 111 });

    expect(result?.accountInfo.value).toBe(newest);
  });

  it("does not leak stale account listeners when watched input changes during cleanup", async () => {
    const stopInitialListener = deferred<void>();
    const getAccountInfo = vi.fn().mockResolvedValue(null);
    const onAccountChange = vi.fn().mockReturnValueOnce(42).mockReturnValueOnce(43);
    const removeAccountChangeListener = vi
      .fn()
      .mockReturnValueOnce(stopInitialListener.promise)
      .mockResolvedValue(undefined);
    const context = createMockSolanaContext({
      connection: {
        getAccountInfo,
        onAccountChange,
        removeAccountChangeListener,
      } as unknown as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    const address = ref(systemProgram);

    mountWithSolana(
      defineComponent({
        setup() {
          useAccountInfo(address, { watch: true });

          return () => h("div");
        },
      }),
      context,
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
});
