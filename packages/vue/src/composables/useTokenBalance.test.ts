import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useTokenBalance } from "./useTokenBalance";

vi.mock("@vue-solana/core/token-accounts", () => ({
  getTokenBalance: vi.fn(),
}));

import { getTokenBalance } from "@vue-solana/core/token-accounts";

const mockedGetTokenBalance = vi.mocked(getTokenBalance);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("useTokenBalance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads balance for a provided mint and owner", async () => {
    mockedGetTokenBalance.mockResolvedValue({ amount: 1000n, decimals: 6 });
    const context = createMockSolanaContext({
      client: {} as never,
    });
    const mint = ref("11111111111111111111111111111111");
    const owner = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance(mint, owner);
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBe(1000n);
    expect(result?.decimals.value).toBe(6);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
  });

  it("clears balance when mint is null", async () => {
    mockedGetTokenBalance.mockResolvedValue(null);
    const context = createMockSolanaContext({
      client: {} as never,
    });
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance(null, "11111111111111111111111111111111");
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBeNull();
    expect(result?.decimals.value).toBeNull();
    expect(mockedGetTokenBalance).not.toHaveBeenCalled();
  });

  it("clears balance when owner is null", async () => {
    mockedGetTokenBalance.mockResolvedValue(null);
    const context = createMockSolanaContext({
      client: {} as never,
    });
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance("11111111111111111111111111111111", null);
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBeNull();
    expect(mockedGetTokenBalance).not.toHaveBeenCalled();
  });

  it("sets null balance for missing ATA without error", async () => {
    mockedGetTokenBalance.mockResolvedValue(null);
    const context = createMockSolanaContext({
      client: {} as never,
    });
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance(
            "11111111111111111111111111111111",
            "11111111111111111111111111111111",
          );
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBeNull();
    expect(result?.decimals.value).toBeNull();
    expect(result?.error.value).toBeNull();
  });

  it("stores and rethrows errors", async () => {
    const failure = new Error("RPC failed");
    mockedGetTokenBalance.mockRejectedValue(failure);
    const context = createMockSolanaContext({
      client: {} as never,
    });
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance(
            "11111111111111111111111111111111",
            "11111111111111111111111111111111",
          );
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.error.value?.code).toBe("RPC_FAILURE");
    expect(result?.loading.value).toBe(false);
  });

  // The stale-value fix in `useAddressRead`: a failed re-read nulls the balance
  // instead of leaving the last amount up next to the error. Note this proves
  // the reset too — `refresh()` resolving would hide it.
  it("drops a previously loaded balance when a re-read fails", async () => {
    const failure = new Error("RPC failed");
    mockedGetTokenBalance
      .mockResolvedValueOnce({ amount: 500n, decimals: 6 })
      .mockRejectedValue(failure);
    const context = createMockSolanaContext({
      client: {} as never,
    });
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance(
            "11111111111111111111111111111111",
            "11111111111111111111111111111111",
          );
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.balance.value).toBe(500n);

    await expect(result?.refresh()).rejects.toThrow("RPC failed");

    expect(result?.balance.value).toBeNull();
    expect(result?.decimals.value).toBeNull();
    expect(result?.error.value?.code).toBe("RPC_FAILURE");
  });

  it("keeps the newest balance when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<{ amount: bigint; decimals: number } | null>();
    const secondRequest = deferred<{ amount: bigint; decimals: number } | null>();
    mockedGetTokenBalance
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const context = createMockSolanaContext({
      client: {} as never,
    });
    const mint = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useTokenBalance> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenBalance(mint, "11111111111111111111111111111111");
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    mint.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    secondRequest.resolve({ amount: 456n, decimals: 9 });
    await flushPromises();

    expect(result?.balance.value).toBe(456n);
    expect(result?.decimals.value).toBe(9);

    firstRequest.resolve({ amount: 123n, decimals: 6 });
    await flushPromises();

    expect(result?.balance.value).toBe(456n);
    expect(result?.decimals.value).toBe(9);
    expect(mockedGetTokenBalance).toHaveBeenCalledTimes(2);
  });
});
