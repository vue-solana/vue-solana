import { PublicKey } from "@vue-solana/core/web3";
import { flushPromises } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useTokenAccounts } from "./useTokenAccounts";

vi.mock("@vue-solana/core/token-accounts", () => ({
  getTokenAccountsByOwner: vi.fn(),
}));

import { getTokenAccountsByOwner } from "@vue-solana/core/token-accounts";

const mockedGetTokenAccountsByOwner = vi.mocked(getTokenAccountsByOwner);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("useTokenAccounts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads token accounts for a provided owner", async () => {
    const mockAccounts = [{ mint: "mint1", amount: 100n }];
    mockedGetTokenAccountsByOwner.mockResolvedValue(mockAccounts as never);
    const context = createMockSolanaContext({
      connection: {} as never,
    });
    const owner = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useTokenAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenAccounts(owner, { commitment: "confirmed" });
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.tokenAccounts.value).toEqual(mockAccounts);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
  });

  it("clears token accounts when owner is null", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([] as never);
    const context = createMockSolanaContext({
      connection: {} as never,
    });
    let result: ReturnType<typeof useTokenAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenAccounts(null);
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.tokenAccounts.value).toEqual([]);
    expect(mockedGetTokenAccountsByOwner).not.toHaveBeenCalled();
  });

  it("stores and rethrows errors", async () => {
    const failure = new Error("RPC failed");
    mockedGetTokenAccountsByOwner.mockRejectedValue(failure);
    const context = createMockSolanaContext({
      connection: {} as never,
    });
    let result: ReturnType<typeof useTokenAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenAccounts(new PublicKey("11111111111111111111111111111111"));
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.error.value?.code).toBe("RPC_FAILURE");
    expect(result?.loading.value).toBe(false);
  });

  it("keeps the newest accounts when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<never[]>();
    const secondRequest = deferred<never[]>();
    mockedGetTokenAccountsByOwner
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const context = createMockSolanaContext({
      connection: {} as never,
    });
    const owner = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useTokenAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useTokenAccounts(owner);
          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    owner.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    secondRequest.resolve([{ mint: "mint2", amount: 200n }] as never[]);
    await flushPromises();

    expect(result?.tokenAccounts.value).toEqual([{ mint: "mint2", amount: 200n }]);

    firstRequest.resolve([{ mint: "mint1", amount: 100n }] as never[]);
    await flushPromises();

    expect(result?.tokenAccounts.value).toEqual([{ mint: "mint2", amount: 200n }]);
    expect(mockedGetTokenAccountsByOwner).toHaveBeenCalledTimes(2);
  });
});
