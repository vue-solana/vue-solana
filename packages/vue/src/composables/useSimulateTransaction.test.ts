// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { SolanaError } from "@vue-solana/core/errors";
import type { SimulatedTransactionResult } from "@vue-solana/core/types";
import { MissingClientCapabilityError } from "./useClientCapability";
import {
  useSimulateTransaction,
  type UseSimulateTransactionOptions,
} from "./useSimulateTransaction";

const { clientMock, simulateTransactionMock } = vi.hoisted(() => ({
  clientMock: { rpc: { simulateTransaction: vi.fn() } } as Record<string, unknown>,
  simulateTransactionMock: vi.fn(),
}));

vi.mock("./useSolanaClient", () => ({
  useSolanaClient: () => ({ client: clientMock, rpc: {} }),
}));

vi.mock("@vue-solana/core/transaction", () => ({
  simulateTransaction: simulateTransactionMock,
}));

function deferred<T>(): {
  promise: Promise<T>;
  reject: (reason: unknown) => void;
  resolve: (value: T) => void;
} {
  let reject!: (reason: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
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

function installSimulationClient(): void {
  (clientMock.rpc as Record<string, unknown>).simulateTransaction = vi.fn();
}

function clearCapabilities(): void {
  delete (clientMock.rpc as Record<string, unknown>).simulateTransaction;
}

const transaction = new Uint8Array([1]) as never;
const result = {
  err: null,
  logs: ["Program invoke [1]"],
  fee: 5000n,
  balanceChanges: [],
  preBalances: [1000n],
  postBalances: [995n],
  tokenBalanceChanges: [],
  preTokenBalances: [],
  postTokenBalances: [],
  loadedAddresses: { readonly: [], writable: [] },
  loadedAccountsDataSize: 0,
  returnData: null,
  replacementBlockhash: null,
  unitsConsumed: 120n,
} satisfies SimulatedTransactionResult;

beforeEach(() => {
  simulateTransactionMock.mockReset();
  installSimulationClient();
});

describe("useSimulateTransaction", () => {
  it("moves from idle to simulating to simulated and exposes the result", async () => {
    const firstDeferred = deferred<SimulatedTransactionResult>();
    simulateTransactionMock.mockReturnValueOnce(firstDeferred.promise);
    const { result: hook } = setupInScope(() => useSimulateTransaction());

    expect(hook.status.value).toBe("idle");
    expect(hook.data.value).toBeNull();
    expect(hook.loading.value).toBe(false);

    const call = hook.execute(transaction);
    expect(hook.status.value).toBe("simulating");
    expect(hook.loading.value).toBe(true);

    firstDeferred.resolve(result);
    await expect(call).resolves.toBe(result);

    expect(hook.status.value).toBe("simulated");
    expect(hook.data.value).toBe(result);
    expect(hook.error.value).toBeNull();
    expect(hook.loading.value).toBe(false);
  });

  it("forwards core simulation options and an internal abort signal", async () => {
    simulateTransactionMock.mockResolvedValue(result);
    const { result: hook } = setupInScope(() => useSimulateTransaction());
    const options: UseSimulateTransactionOptions = {
      commitment: "finalized",
      replaceRecentBlockhash: true,
    };

    await hook.execute(transaction, options);

    expect(simulateTransactionMock).toHaveBeenCalledWith(clientMock, transaction, {
      ...options,
      abortSignal: expect.any(AbortSignal),
    });
  });

  it("tracks SolanaError codes and normalizes raw failures", async () => {
    const solanaError = new SolanaError("INVALID_INPUT", "bad transaction");
    simulateTransactionMock.mockRejectedValueOnce(solanaError);
    const { result: hook } = setupInScope(() => useSimulateTransaction());

    await expect(hook.execute(transaction)).rejects.toBe(solanaError);
    expect(hook.status.value).toBe("error");
    expect(hook.error.value).toBe(solanaError);

    const rawFailure = new Error("transport down");
    simulateTransactionMock.mockRejectedValueOnce(rawFailure);

    await expect(hook.execute(transaction)).rejects.toMatchObject({
      code: "RPC_FAILURE",
      cause: rawFailure,
    });
    expect(hook.status.value).toBe("error");
    expect(hook.error.value?.code).toBe("RPC_FAILURE");
  });

  it("aborts the prior execution and ignores its result", async () => {
    const firstDeferred = deferred<SimulatedTransactionResult>();
    const secondResult = { ...result, fee: 6000n } satisfies SimulatedTransactionResult;
    const signals: AbortSignal[] = [];
    simulateTransactionMock.mockImplementation(
      (_client: unknown, _transaction: never, options: UseSimulateTransactionOptions) => {
        const signal = options.abortSignal as AbortSignal;
        signals.push(signal);

        if (signals.length === 1) {
          signal.addEventListener("abort", () => firstDeferred.reject(new Error("superseded")));
          return firstDeferred.promise;
        }

        return Promise.resolve(secondResult);
      },
    );
    const { result: hook } = setupInScope(() => useSimulateTransaction());

    const firstCall = hook.execute(transaction);
    const firstSignal = signals[0];
    expect(firstSignal?.aborted).toBe(false);

    const secondCall = hook.execute(transaction);
    expect(firstSignal?.aborted).toBe(true);

    await expect(secondCall).resolves.toBe(secondResult);
    await expect(firstCall).rejects.toMatchObject({ code: "RPC_FAILURE" });

    firstDeferred.resolve(result);
    expect(hook.data.value).toBe(secondResult);
    expect(hook.status.value).toBe("simulated");
    expect(signals[1]?.aborted).toBe(false);
  });

  it("merges a caller abortSignal with its internal controller", async () => {
    const external = new AbortController();
    simulateTransactionMock.mockImplementation(
      (_client: unknown, _transaction: never, options: UseSimulateTransactionOptions) => {
        const signal = options.abortSignal as AbortSignal;
        return new Promise<never>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted externally")), {
            once: true,
          });
        });
      },
    );
    const { result: hook } = setupInScope(() => useSimulateTransaction());

    const call = hook.execute(transaction, { abortSignal: external.signal });
    expect(simulateTransactionMock).toHaveBeenCalledWith(clientMock, transaction, {
      abortSignal: expect.any(AbortSignal),
    });
    external.abort();

    await expect(call).rejects.toMatchObject({ code: "RPC_FAILURE" });
    expect(hook.status.value).toBe("error");
  });

  it("throws MissingClientCapabilityError at setup when the RPC method is absent", () => {
    clearCapabilities();

    expect(() => setupInScope(() => useSimulateTransaction())).toThrow(
      MissingClientCapabilityError,
    );
  });

  it("resets state after success and after failure", async () => {
    simulateTransactionMock.mockResolvedValueOnce(result);
    const { result: hook } = setupInScope(() => useSimulateTransaction());

    await hook.execute(transaction);
    hook.reset();

    expect(hook.status.value).toBe("idle");
    expect(hook.data.value).toBeNull();
    expect(hook.error.value).toBeNull();
    expect(hook.loading.value).toBe(false);

    simulateTransactionMock.mockRejectedValueOnce(new Error("boom"));
    await expect(hook.execute(transaction)).rejects.toBeDefined();
    hook.reset();

    expect(hook.status.value).toBe("idle");
    expect(hook.error.value).toBeNull();
  });

  it("aborts in-flight work when the owning scope is disposed", async () => {
    const signals: AbortSignal[] = [];
    const deferredCall = deferred<SimulatedTransactionResult>();
    simulateTransactionMock.mockImplementation(
      (_client: unknown, _transaction: never, options: UseSimulateTransactionOptions) => {
        const signal = options.abortSignal as AbortSignal;
        signals.push(signal);
        signal.addEventListener("abort", () => deferredCall.reject(new Error("disposed")));
        return deferredCall.promise;
      },
    );
    const { result: hook, scope } = setupInScope(() => useSimulateTransaction());

    const call = hook.execute(transaction);
    expect(signals[0]?.aborted).toBe(false);

    scope.stop();
    expect(signals[0]?.aborted).toBe(true);
    await expect(call).rejects.toBeDefined();
  });
});
