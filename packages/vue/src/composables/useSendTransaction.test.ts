// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import type {
  Signature,
  SingleTransactionPlan,
  SuccessfulSingleTransactionPlanResult,
  TransactionPlanResult,
} from "@vue-solana/core/kit";
import { MissingClientCapabilityError } from "./useClientCapability";
import {
  useSendTransaction,
  useSendTransactions,
  type SendTransactionConfig,
} from "./useSendTransaction";

const { clientMock } = vi.hoisted(() => ({
  clientMock: { payer: { address: "payer-address" }, rpc: {} } as Record<string, unknown>,
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

function installSendingClient(): {
  sendTransaction: ReturnType<typeof vi.fn>;
  sendTransactions: ReturnType<typeof vi.fn>;
} {
  const sendTransaction = vi.fn();
  const sendTransactions = vi.fn();

  clientMock.sendTransaction = sendTransaction;
  clientMock.sendTransactions = sendTransactions;

  return { sendTransaction, sendTransactions };
}

const clearCapabilities = (): void => {
  delete clientMock.sendTransaction;
  delete clientMock.sendTransactions;
};

const signature = "abc" as Signature;
const singleResult = {
  context: { signature },
  kind: "single",
  planType: "transactionPlanResult",
  plannedMessage: {},
  status: "successful",
} as unknown as SuccessfulSingleTransactionPlanResult;
const planResult = {
  kind: "sequential",
  divisible: false,
  plans: [],
} as unknown as TransactionPlanResult;

describe("useSendTransaction", () => {
  it("sends a single transaction from an instruction input and exposes the result", async () => {
    const { sendTransaction } = installSendingClient();
    sendTransaction.mockResolvedValue(singleResult);
    const input = [{}] as never;
    const { result } = setupInScope(() => useSendTransaction());

    expect(result.status.value).toBe("idle");
    expect(result.data.value).toBeNull();

    await expect(result.execute(input)).resolves.toBe(singleResult);

    expect(sendTransaction).toHaveBeenCalledWith(input, { abortSignal: expect.any(AbortSignal) });
    expect(result.status.value).toBe("sent");
    expect(result.data.value).toBe(singleResult);
    expect(result.error.value).toBeNull();
  });

  it("accepts a single transaction plan as input", async () => {
    const { sendTransaction } = installSendingClient();
    const plan = { message: { instructions: [] } } as unknown as SingleTransactionPlan;
    sendTransaction.mockResolvedValue(singleResult);
    const { result } = setupInScope(() => useSendTransaction());

    await expect(result.execute(plan)).resolves.toBe(singleResult);

    expect(sendTransaction).toHaveBeenCalledWith(plan, { abortSignal: expect.any(AbortSignal) });
    expect(result.status.value).toBe("sent");
  });

  it("tracks errors through status and error", async () => {
    const { sendTransaction } = installSendingClient();
    const boom = new Error("boom");
    sendTransaction.mockRejectedValue(boom);
    const input = [{}] as never;
    const { result } = setupInScope(() => useSendTransaction());

    await expect(result.execute(input)).rejects.toMatchObject({
      message: expect.stringContaining("boom"),
      cause: boom,
    });

    expect(result.status.value).toBe("error");
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.loading.value).toBe(false);
  });

  it("ignores stale results after a newer execution starts", async () => {
    const { sendTransaction } = installSendingClient();
    const firstDeferred = deferred<SuccessfulSingleTransactionPlanResult>();
    const stale = { ...singleResult, context: { signature: "stale" as Signature } } as never;
    const fresh = { ...singleResult, context: { signature: "fresh" as Signature } } as never;
    sendTransaction.mockImplementation(() => firstDeferred.promise);
    const { result } = setupInScope(() => useSendTransaction());

    const firstCall = result.execute([{}] as never);
    sendTransaction.mockResolvedValue(fresh);
    const secondCall = result.execute([{}] as never);

    await secondCall;
    firstDeferred.resolve(stale as never);
    await firstCall;

    expect(result.data.value).toBe(fresh);
    expect(result.status.value).toBe("sent");
  });

  it("aborts the prior send when a new execution starts", async () => {
    const { sendTransaction } = installSendingClient();
    const firstDeferred = deferred<SuccessfulSingleTransactionPlanResult>();
    const secondDeferred = deferred<SuccessfulSingleTransactionPlanResult>();
    const signals: AbortSignal[] = [];
    const abortError = new Error("aborted");
    sendTransaction.mockImplementation((_input: never, config?: SendTransactionConfig) => {
      const signal = config?.abortSignal as AbortSignal;
      signals.push(signal);

      if (signals.length === 1) {
        signal.addEventListener("abort", () => firstDeferred.reject(abortError));
        return firstDeferred.promise;
      }

      return secondDeferred.promise;
    });
    const { result } = setupInScope(() => useSendTransaction());

    const firstCall = result.execute([{}] as never);
    const firstSignal = signals[0];
    expect(firstSignal?.aborted).toBe(false);

    const secondCall = result.execute([{}] as never);
    expect(firstSignal?.aborted).toBe(true);

    const firstRejection = expect(firstCall).rejects.toMatchObject({
      message: expect.stringContaining("aborted"),
      cause: abortError,
    });

    secondDeferred.resolve(singleResult);
    await expect(secondCall).resolves.toBe(singleResult);
    await firstRejection;

    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.data.value).toBe(singleResult);
    expect(result.status.value).toBe("sent");
  });

  it("honors an external abortSignal merged with its own", async () => {
    const { sendTransaction } = installSendingClient();
    const external = new AbortController();
    const abortError = new Error("aborted externally");
    sendTransaction.mockImplementation((_input: never, config?: SendTransactionConfig) => {
      const signal = config?.abortSignal as AbortSignal;
      return new Promise<never>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(abortError));
      });
    });
    const { result } = setupInScope(() => useSendTransaction());

    const call = result.execute([{}] as never, { abortSignal: external.signal });
    expect(sendTransaction).toHaveBeenCalledWith([{}] as never, {
      abortSignal: expect.any(AbortSignal),
    });
    external.abort();

    await expect(call).rejects.toMatchObject({
      message: expect.stringContaining("aborted"),
      cause: abortError,
    });
    expect(result.status.value).toBe("error");
    expect(result.loading.value).toBe(false);
  });

  it("aborts in-flight work when the owning scope is disposed", async () => {
    const { sendTransaction } = installSendingClient();
    const firstDeferred = deferred<SuccessfulSingleTransactionPlanResult>();
    const signals: AbortSignal[] = [];
    const abortError = new Error("aborted");
    sendTransaction.mockImplementation((_input: never, config?: SendTransactionConfig) => {
      const signal = config?.abortSignal as AbortSignal;
      signals.push(signal);
      signal.addEventListener("abort", () => firstDeferred.reject(abortError));
      return firstDeferred.promise;
    });
    const { result, scope } = setupInScope(() => useSendTransaction());

    const call = result.execute([{}] as never);
    expect(signals[0]?.aborted).toBe(false);

    scope.stop();
    expect(signals[0]?.aborted).toBe(true);
    await expect(call).rejects.toMatchObject({
      message: expect.stringContaining("aborted"),
      cause: abortError,
    });
  });
});

describe("useSendTransactions", () => {
  it("sends a batch of transaction messages and exposes the plan result", async () => {
    const { sendTransactions } = installSendingClient();
    sendTransactions.mockResolvedValue(planResult);
    const input = [{ instructions: [] }, { instructions: [] }] as never;
    const { result } = setupInScope(() => useSendTransactions());

    expect(result.status.value).toBe("idle");
    expect(result.data.value).toBeNull();

    await expect(result.execute(input)).resolves.toBe(planResult);

    expect(sendTransactions).toHaveBeenCalledWith(input, { abortSignal: expect.any(AbortSignal) });
    expect(result.status.value).toBe("sent");
    expect(result.data.value).toBe(planResult);
    expect(result.error.value).toBeNull();
  });

  it("accepts a transaction plan as input", async () => {
    const { sendTransactions } = installSendingClient();
    sendTransactions.mockResolvedValue(planResult);
    const input = { message: { instructions: [] } } as never;
    const { result } = setupInScope(() => useSendTransactions());

    await expect(result.execute(input)).resolves.toBe(planResult);

    expect(sendTransactions).toHaveBeenCalledWith(input, { abortSignal: expect.any(AbortSignal) });
    expect(result.status.value).toBe("sent");
  });

  it("ignores stale results after a newer execution starts", async () => {
    const { sendTransactions } = installSendingClient();
    const firstDeferred = deferred<TransactionPlanResult>();
    const stale = { ...planResult, kind: "sequential-fresh" } as never;
    const fresh = { ...planResult, kind: "sequential" } as never;
    sendTransactions.mockImplementation(() => firstDeferred.promise);
    const { result } = setupInScope(() => useSendTransactions());

    const firstCall = result.execute([{}] as never);
    sendTransactions.mockResolvedValue(fresh);
    const secondCall = result.execute([{}] as never);

    await secondCall;
    firstDeferred.resolve(stale as never);
    await firstCall;

    expect(result.data.value).toBe(fresh);
    expect(result.status.value).toBe("sent");
  });

  it("aborts the prior send when a new execution starts", async () => {
    const { sendTransactions } = installSendingClient();
    const firstDeferred = deferred<TransactionPlanResult>();
    const secondDeferred = deferred<TransactionPlanResult>();
    const signals: AbortSignal[] = [];
    const abortError = new Error("aborted");
    sendTransactions.mockImplementation((_input: never, config?: SendTransactionConfig) => {
      const signal = config?.abortSignal as AbortSignal;
      signals.push(signal);

      if (signals.length === 1) {
        signal.addEventListener("abort", () => firstDeferred.reject(abortError));
        return firstDeferred.promise;
      }

      return secondDeferred.promise;
    });
    const { result } = setupInScope(() => useSendTransactions());

    const firstCall = result.execute([{}] as never);
    const firstSignal = signals[0];
    expect(firstSignal?.aborted).toBe(false);

    const secondCall = result.execute([{}] as never);
    expect(firstSignal?.aborted).toBe(true);

    const firstRejection = expect(firstCall).rejects.toMatchObject({
      message: expect.stringContaining("aborted"),
      cause: abortError,
    });

    secondDeferred.resolve(planResult);
    await expect(secondCall).resolves.toBe(planResult);
    await firstRejection;

    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.data.value).toBe(planResult);
    expect(result.status.value).toBe("sent");
  });
});

describe("capability fail-fast", () => {
  it("throws a clear error when the client lacks sendTransaction", () => {
    clearCapabilities();
    let captured: unknown;

    try {
      useSendTransaction();
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).hookName).toBe("useSendTransaction");
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["sendTransaction"]);
  });

  it("throws a clear error when the client lacks sendTransactions", () => {
    clearCapabilities();
    let captured: unknown;

    try {
      useSendTransactions();
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).hookName).toBe("useSendTransactions");
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["sendTransactions"]);
  });
});

describe("payer fail-fast", () => {
  it("throws at setup time and names `payer`", () => {
    installSendingClient();
    delete clientMock.payer;
    let captured: unknown;

    try {
      setupInScope(() => useSendTransaction());
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).hookName).toBe("useSendTransaction");
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["payer"]);
    expect((captured as Error).message).toContain("`payer`");
    clientMock.payer = { address: "payer-address" };
  });

  it("names `payer` for the batch hook too", () => {
    installSendingClient();
    delete clientMock.payer;
    let captured: unknown;

    try {
      setupInScope(() => useSendTransactions());
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).hookName).toBe("useSendTransactions");
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["payer"]);
    clientMock.payer = { address: "payer-address" };
  });

  it("rejects a transaction message too, since kit always reads `payer`", () => {
    const { sendTransaction } = installSendingClient();
    sendTransaction.mockResolvedValue(singleResult);
    delete clientMock.payer;
    let captured: unknown;

    try {
      setupInScope(() => useSendTransaction());
    } catch (cause) {
      captured = cause;
    }

    expect(captured).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured as MissingClientCapabilityError).capabilities).toEqual(["payer"]);
    expect(sendTransaction).not.toHaveBeenCalled();
    clientMock.payer = { address: "payer-address" };
  });
});
