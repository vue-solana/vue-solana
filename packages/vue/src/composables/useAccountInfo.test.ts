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

describe("useAccountInfo", () => {
  it("loads account info for a public key string", async () => {
    const account = { lamports: 123 };
    const getAccountInfo = vi.fn().mockResolvedValue(account);
    const context = createMockSolanaContext({
      connection: { getAccountInfo } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useAccountInfo> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useAccountInfo("11111111111111111111111111111111", { commitment: "confirmed" });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.accountInfo.value).toBe(account);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
    expect(getAccountInfo).toHaveBeenCalledWith(expect.any(PublicKey), "confirmed");
  });

  it("does not call RPC for null input", async () => {
    const getAccountInfo = vi.fn();
    const context = createMockSolanaContext({
      connection: { getAccountInfo } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useAccountInfo> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useAccountInfo(null);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.accountInfo.value).toBeNull();
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("stores invalid public key errors without spamming RPC", async () => {
    const getAccountInfo = vi.fn();
    const context = createMockSolanaContext({
      connection: { getAccountInfo } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useAccountInfo> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useAccountInfo("not-a-public-key");

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    await expect(result?.refresh()).rejects.toThrow();
    expect(result?.error.value).toBeInstanceOf(Error);
    expect(getAccountInfo).not.toHaveBeenCalled();
  });

  it("keeps the newest account info when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<unknown>();
    const secondRequest = deferred<unknown>();
    const getAccountInfo = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const context = createMockSolanaContext({
      connection: { getAccountInfo } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    const address = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useAccountInfo> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useAccountInfo(address);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    address.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    const newest = { lamports: 456 };
    secondRequest.resolve(newest);
    await flushPromises();

    expect(result?.accountInfo.value).toBe(newest);

    firstRequest.resolve({ lamports: 123 });
    await flushPromises();

    expect(result?.accountInfo.value).toBe(newest);
    expect(getAccountInfo).toHaveBeenCalledTimes(2);
  });

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
});
