// @vitest-environment node
import type { Address, Signature } from "@vue-solana/core/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import type { TransactionHistoryResult } from "@vue-solana/core/types";
import { MissingClientCapabilityError } from "./useClientCapability";
import { useTransactionHistory } from "./useTransactionHistory";

const { clientMock, getHistoryMock } = vi.hoisted(() => ({
  clientMock: { rpc: { getSignaturesForAddress: vi.fn() } } as Record<string, unknown>,
  getHistoryMock: vi.fn(),
}));

vi.mock("./useSolanaClient", () => ({
  useSolanaClient: () => ({ client: clientMock, rpc: {} }),
}));

vi.mock("@vue-solana/core/transaction-history", () => ({
  getTransactionHistory: getHistoryMock,
}));

const ADDRESS_1 = "11111111111111111111111111111111" as Address;
const ADDRESS_2 = "So11111111111111111111111111111111111111112" as Address;
const SIG_1 = "sig-1" as Signature;
const SIG_2 = "sig-2" as Signature;

function item(signature: Signature) {
  return { signature, slot: 1n, err: null };
}

function fullPage(signature = SIG_1): TransactionHistoryResult {
  return { items: [item(signature)], hasMore: true, nextBefore: signature };
}

function lastPage(signature = SIG_2): TransactionHistoryResult {
  return { items: [item(signature)], hasMore: false };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function setupInScope<TResult>(setup: () => TResult): {
  result: TResult;
  scope: ReturnType<typeof effectScope>;
} {
  let result: TResult | undefined;
  const scope = effectScope();

  scope.run(() => {
    result = setup();
  });

  if (!result) {
    throw new Error("setup did not initialize a result");
  }

  return { result, scope };
}

beforeEach(() => {
  getHistoryMock.mockReset();
  (clientMock.rpc as Record<string, unknown>).getSignaturesForAddress = vi.fn();
});

describe("useTransactionHistory", () => {
  it("fails at setup when the client cannot read signatures", () => {
    delete (clientMock.rpc as Record<string, unknown>).getSignaturesForAddress;

    expect(() => setupInScope(() => useTransactionHistory(ADDRESS_1))).toThrow(
      MissingClientCapabilityError,
    );
  });

  it("fetches immediately by default and exposes reactive aliases", async () => {
    getHistoryMock.mockResolvedValueOnce(fullPage());
    const { result: hook } = setupInScope(() => useTransactionHistory(ADDRESS_1));

    expect(getHistoryMock).toHaveBeenCalledTimes(1);
    expect(hook.status.value).toBe("loading");
    expect(hook.loading.value).toBe(true);

    await nextTick();

    expect(hook.status.value).toBe("loaded");
    expect(hook.data.value).toEqual(fullPage());
    expect(hook.items.value).toEqual([item(SIG_1)]);
    expect(hook.hasMore.value).toBe(true);
    expect(hook.loading.value).toBe(false);
  });

  it("stays idle for an absent address", () => {
    const { result: hook } = setupInScope(() => useTransactionHistory(null));

    expect(getHistoryMock).not.toHaveBeenCalled();
    expect(hook.status.value).toBe("idle");
    expect(hook.data.value).toBeNull();
    expect(hook.items.value).toEqual([]);
  });

  it("does not fetch during setup when immediate is false", () => {
    setupInScope(() => useTransactionHistory(ADDRESS_1, { immediate: false }));

    expect(getHistoryMock).not.toHaveBeenCalled();
  });

  it("refreshes when a reactive address changes and ignores the stale result", async () => {
    const address = ref<Address | null>(ADDRESS_1);
    const first = deferred<TransactionHistoryResult>();
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(address, { immediate: false }),
    );

    getHistoryMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(fullPage(SIG_2));

    const firstRequest = hook.refresh();
    const firstSignal = getHistoryMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;

    address.value = ADDRESS_2;
    await nextTick();

    expect(firstSignal.aborted).toBe(true);
    expect(getHistoryMock).toHaveBeenCalledTimes(2);

    first.resolve(fullPage());
    await firstRequest;
    await nextTick();

    expect(hook.data.value).toEqual(fullPage(SIG_2));
    expect(hook.status.value).toBe("loaded");
  });

  it("refresh supersedes an in-flight request and clears the previous data", async () => {
    const first = deferred<TransactionHistoryResult>();
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock.mockReturnValueOnce(first.promise).mockResolvedValueOnce(lastPage());

    const firstRequest = hook.refresh();
    const firstSignal = getHistoryMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;
    const secondRequest = hook.refresh();

    expect(firstSignal.aborted).toBe(true);

    first.resolve(fullPage());
    await Promise.all([firstRequest, secondRequest]);

    expect(hook.data.value).toEqual(lastPage());
    expect(hook.hasMore.value).toBe(false);
  });

  it("appends older pages with the cursor from the current page", async () => {
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock.mockResolvedValueOnce(fullPage()).mockResolvedValueOnce(lastPage());

    await hook.refresh();
    await hook.loadMore();

    expect(getHistoryMock).toHaveBeenNthCalledWith(
      2,
      clientMock,
      ADDRESS_1,
      expect.objectContaining({
        before: SIG_1,
        limit: undefined,
        commitment: undefined,
        until: undefined,
      }),
    );
    expect(hook.items.value).toEqual([item(SIG_1), item(SIG_2)]);
    expect(hook.hasMore.value).toBe(false);
    expect(hook.loadingMore.value).toBe(false);
  });

  it("does not load more without a cursor or while loading", async () => {
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock.mockResolvedValueOnce(lastPage());
    await hook.refresh();

    await expect(hook.loadMore()).resolves.toEqual(lastPage());
    expect(getHistoryMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the current page but reports an error status when loadMore fails", async () => {
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock.mockResolvedValueOnce(fullPage()).mockRejectedValueOnce(new Error("rpc down"));
    await hook.refresh();

    await expect(hook.loadMore()).rejects.toMatchObject({ code: "RPC_FAILURE" });
    expect(hook.data.value).toEqual(fullPage());
    expect(hook.error.value?.code).toBe("RPC_FAILURE");
    expect(hook.status.value).toBe("error");
    expect(hook.loadingMore.value).toBe(false);
  });

  it("does not append a superseded loadMore result", async () => {
    const more = deferred<TransactionHistoryResult>();
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock
      .mockResolvedValueOnce(fullPage())
      .mockReturnValueOnce(more.promise)
      .mockResolvedValueOnce(lastPage());

    await hook.refresh();
    const moreRequest = hook.loadMore();
    const moreSignal = getHistoryMock.mock.calls[1]?.[2]?.abortSignal as AbortSignal;
    const refreshRequest = hook.refresh();

    expect(moreSignal.aborted).toBe(true);

    more.resolve(lastPage(SIG_1));

    await expect(moreRequest).resolves.toBeNull();
    await refreshRequest;

    expect(hook.data.value).toEqual(lastPage());
    expect(hook.items.value).toEqual([item(SIG_2)]);
  });

  it("refetches when reactive options change", async () => {
    getHistoryMock.mockResolvedValue(fullPage());
    const options = ref({ limit: 1 });
    const { result: hook } = setupInScope(() => useTransactionHistory(ADDRESS_1, options));

    await nextTick();
    await nextTick();

    expect(getHistoryMock).toHaveBeenNthCalledWith(
      1,
      clientMock,
      ADDRESS_1,
      expect.objectContaining({ limit: 1 }),
    );

    options.value = { limit: 2 };
    await nextTick();
    await nextTick();

    expect(getHistoryMock).toHaveBeenNthCalledWith(
      2,
      clientMock,
      ADDRESS_1,
      expect.objectContaining({ limit: 2 }),
    );
    expect(hook.status.value).toBe("loaded");
  });

  it("normalizes failures and moves to the error status", async () => {
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock.mockRejectedValueOnce(new Error("rpc down"));

    await expect(hook.refresh()).rejects.toMatchObject({ code: "RPC_FAILURE" });
    expect(hook.error.value?.code).toBe("RPC_FAILURE");
    expect(hook.status.value).toBe("error");
  });

  it("reset aborts in-flight work and restores the idle state", async () => {
    const pending = deferred<TransactionHistoryResult>();
    const { result: hook } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    getHistoryMock.mockReturnValueOnce(pending.promise);

    const request = hook.refresh();
    const signal = getHistoryMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;

    hook.reset();

    expect(signal.aborted).toBe(true);
    expect(hook.status.value).toBe("idle");
    expect(hook.data.value).toBeNull();
    expect(hook.error.value).toBeNull();

    pending.resolve(fullPage());
    await request;

    expect(hook.data.value).toBeNull();
  });

  it("aborts in-flight work when the scope is disposed", () => {
    const { result: hook, scope } = setupInScope(() =>
      useTransactionHistory(ADDRESS_1, { immediate: false }),
    );

    void hook.refresh();
    const signal = getHistoryMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;

    scope.stop();

    expect(signal.aborted).toBe(true);
  });
});
