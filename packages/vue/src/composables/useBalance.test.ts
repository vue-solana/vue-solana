import { PublicKey } from "@solana/web3-compat";
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

describe("useBalance", () => {
  it("loads a balance for a provided public key string", async () => {
    const getBalance = vi.fn().mockResolvedValue(123);
    const context = createMockSolanaContext({
      connection: { getBalance } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
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
    expect(getBalance).toHaveBeenCalledWith(expect.any(PublicKey), "confirmed");
  });

  it("clears the balance when no address is provided", async () => {
    const getBalance = vi.fn();
    const context = createMockSolanaContext({
      connection: { getBalance } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
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
    const context = createMockSolanaContext({
      connection: {
        getBalance: vi.fn().mockRejectedValue(failure),
      } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useBalance(new PublicKey("11111111111111111111111111111111"));

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
    const firstRequest = deferred<number>();
    const secondRequest = deferred<number>();
    const getBalance = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const context = createMockSolanaContext({
      connection: { getBalance } as ReturnType<typeof createMockSolanaContext>["connection"],
    });
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

    secondRequest.resolve(456);
    await flushPromises();

    expect(result?.balance.value).toBe(456);
    expect(result?.loading.value).toBe(false);

    firstRequest.resolve(123);
    await flushPromises();

    expect(result?.balance.value).toBe(456);
    expect(result?.error.value).toBeNull();
    expect(getBalance).toHaveBeenCalledTimes(2);
  });
});
