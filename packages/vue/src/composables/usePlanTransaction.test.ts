// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import type { TransactionMessage } from "@vue-solana/core/kit";
import { MissingClientCapabilityError } from "./useClientCapability";
import {
  usePlanTransaction,
  usePlanTransactions,
  type PlanTransactionConfig,
} from "./usePlanTransaction";

const { clientMock } = vi.hoisted(() => ({
  clientMock: { rpc: {} } as Record<string, unknown>,
}));

vi.mock("./useSolanaClient", () => ({
  useSolanaClient: () => ({ client: clientMock, rpc: {} }),
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

function installPlanningClient(): {
  planTransaction: ReturnType<typeof vi.fn>;
  planTransactions: ReturnType<typeof vi.fn>;
} {
  const planTransaction = vi.fn();
  const planTransactions = vi.fn();

  clientMock.planTransaction = planTransaction;
  clientMock.planTransactions = planTransactions;

  return { planTransaction, planTransactions };
}

const clearCapabilities = (): void => {
  delete clientMock.planTransaction;
  delete clientMock.planTransactions;
};

const message = { instructions: [] } as never;
const plan = { message, plans: [], type: "parallel" } as never;

describe("usePlanTransaction", () => {
  it("plans a transaction message and exposes it", async () => {
    const { planTransaction } = installPlanningClient();
    planTransaction.mockResolvedValue(message);
    const { result } = setupInScope(() => usePlanTransaction());

    expect(result.status.value).toBe("idle");
    expect(result.transactionMessage.value).toBeNull();

    await expect(result.execute([{}] as never)).resolves.toBe(message);

    expect(planTransaction).toHaveBeenCalledWith([{}] as never, {
      abortSignal: expect.any(AbortSignal),
    });
    expect(result.status.value).toBe("planned");
    expect(result.transactionMessage.value).toBe(message);
  });

  it("aborts the prior plan when a new execution starts", async () => {
    const { planTransaction } = installPlanningClient();
    const firstDeferred = deferred<TransactionMessage>();
    const secondDeferred = deferred<TransactionMessage>();
    const signals: AbortSignal[] = [];
    const abortError = new Error("aborted");
    planTransaction.mockImplementation((_input: never, config?: PlanTransactionConfig) => {
      const signal = config?.abortSignal as AbortSignal;
      signals.push(signal);

      if (signals.length === 1) {
        signal.addEventListener("abort", () => firstDeferred.reject(abortError));
        return firstDeferred.promise;
      }

      return secondDeferred.promise;
    });
    const { result } = setupInScope(() => usePlanTransaction());

    const firstCall = result.execute([{}] as never);
    const firstSignal = signals[0];
    expect(firstSignal?.aborted).toBe(false);

    const secondCall = result.execute([{}] as never);
    expect(firstSignal?.aborted).toBe(true);

    const firstRejection = expect(firstCall).rejects.toMatchObject({
      message: expect.stringContaining("aborted"),
      cause: abortError,
    });

    secondDeferred.resolve(message);
    await expect(secondCall).resolves.toBe(message);
    await firstRejection;

    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.transactionMessage.value).toBe(message);
    expect(result.status.value).toBe("planned");
  });
});

describe("usePlanTransactions", () => {
  it("plans a transaction plan and exposes it", async () => {
    const { planTransactions } = installPlanningClient();
    planTransactions.mockResolvedValue(plan);
    const { result } = setupInScope(() => usePlanTransactions());

    await expect(result.execute({ message } as never)).resolves.toBe(plan);

    expect(planTransactions).toHaveBeenCalledWith({ message } as never, {
      abortSignal: expect.any(AbortSignal),
    });
    expect(result.status.value).toBe("planned");
    expect(result.transactionPlan.value).toBe(plan);
  });

  it("aborts the prior plan when a new execution starts", async () => {
    const { planTransactions } = installPlanningClient();
    const firstDeferred = deferred<unknown>();
    const secondDeferred = deferred<unknown>();
    const signals: AbortSignal[] = [];
    const abortError = new Error("aborted");
    planTransactions.mockImplementation((_input: never, config?: PlanTransactionConfig) => {
      const signal = config?.abortSignal as AbortSignal;
      signals.push(signal);

      if (signals.length === 1) {
        signal.addEventListener("abort", () => firstDeferred.reject(abortError));
        return firstDeferred.promise;
      }

      return secondDeferred.promise;
    });
    const { result } = setupInScope(() => usePlanTransactions());

    const firstCall = result.execute({ message } as never);
    const firstSignal = signals[0];
    expect(firstSignal?.aborted).toBe(false);

    const secondCall = result.execute({ message } as never);
    expect(firstSignal?.aborted).toBe(true);

    const firstRejection = expect(firstCall).rejects.toMatchObject({
      message: expect.stringContaining("aborted"),
      cause: abortError,
    });

    secondDeferred.resolve(plan);
    await expect(secondCall).resolves.toBe(plan);
    await firstRejection;

    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.transactionPlan.value).toBe(plan);
    expect(result.status.value).toBe("planned");
  });
});

describe("capability fail-fast", () => {
  it("throws a clear error when the client lacks planTransaction", () => {
    clearCapabilities();
    let captured: unknown;

    try {
      usePlanTransaction();
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).hookName).toBe("usePlanTransaction");
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["planTransaction"]);
  });

  it("throws a clear error when the client lacks planTransactions", () => {
    clearCapabilities();
    let captured: unknown;

    try {
      usePlanTransactions();
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).hookName).toBe("usePlanTransactions");
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["planTransactions"]);
  });
});
