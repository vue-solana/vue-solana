import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useBalance } from "./useBalance";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function createGetBalance(getBalance: ReturnType<typeof vi.fn>) {
  return createMockSolanaContext({
    client: { rpc: { getBalance } } as unknown as ReturnType<
      typeof createMockSolanaContext
    >["client"],
  });
}

describe("useBalance", () => {
  it("loads a balance for a provided address string", async () => {
    const getBalance = vi.fn(() => ({ send: vi.fn().mockResolvedValue({ value: 123n }) }));
    const context = createGetBalance(getBalance);
    const address = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(address, "confirmed");

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBe(123);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
    expect(getBalance).toHaveBeenCalledWith("11111111111111111111111111111111", {
      commitment: "confirmed",
    });
  });

  it("clears the balance when no address is provided", async () => {
    const getBalance = vi.fn();
    const context = createGetBalance(getBalance);
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(null);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBeNull();
    expect(getBalance).not.toHaveBeenCalled();
  });

  it("stores and rethrows balance loading errors", async () => {
    const failure = new Error("RPC failed");
    const getBalance = vi.fn(() => ({ send: vi.fn().mockRejectedValue(failure) }));
    const context = createGetBalance(getBalance);
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance("11111111111111111111111111111111");

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    await expect(result?.refresh()).rejects.toThrow("RPC failed");
    expect(result?.error.value?.code).toBe("RPC_FAILURE");
    expect(result?.error.value?.cause).toBe(failure);
    expect(result?.loading.value).toBe(false);
  });

  it("keeps the newest balance when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<{ value: bigint }>();
    const secondRequest = deferred<{ value: bigint }>();
    const getBalance = vi
      .fn()
      .mockReturnValueOnce({ send: () => firstRequest.promise })
      .mockReturnValueOnce({ send: () => secondRequest.promise });
    const context = createGetBalance(getBalance);
    const address = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(address);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    address.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    secondRequest.resolve({ value: 456n });
    await flushPromises();

    expect(result?.balance.value).toBe(456);
    expect(result?.loading.value).toBe(false);

    firstRequest.resolve({ value: 123n });
    await flushPromises();

    expect(result?.balance.value).toBe(456);
    expect(result?.error.value).toBeNull();
    expect(getBalance).toHaveBeenCalledTimes(2);
  });
});
