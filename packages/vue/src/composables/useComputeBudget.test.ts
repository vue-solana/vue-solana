// @vitest-environment node
import type { TransactionMessage } from "@vue-solana/core/kit";
import type { FeeBudget } from "@vue-solana/core/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";
import { MissingClientCapabilityError } from "./useClientCapability";
import { useComputeBudget, useFeePolicy } from "./useComputeBudget";

const { clientMock, resolveFeePolicyMock } = vi.hoisted(() => ({
  clientMock: { rpc: {} } as Record<string, unknown>,
  resolveFeePolicyMock: vi.fn(),
}));

vi.mock("./useSolanaClient", () => ({
  useSolanaClient: () => ({ client: clientMock, rpc: {} }),
}));

vi.mock("@vue-solana/core/fee-policy", () => ({
  resolveFeePolicy: resolveFeePolicyMock,
}));

const MESSAGE = { version: 0, instructions: [] } as unknown as TransactionMessage;
const NEXT_MESSAGE = {
  version: 0,
  instructions: [{ programAddress: "next" }],
} as unknown as TransactionMessage;
const BUDGET: FeeBudget = {
  mode: "standard",
  computeUnitLimit: 1_200,
  computeUnitPriceMicroLamports: 10_000n,
  priorityFeeLamports: 12n,
  baseFeeLamports: 5_000n,
  estimatedFeeLamports: 5_012n,
  capped: false,
  cappedBy: [],
  unitsConsumed: 1_000,
  source: "simulation",
};

function deferred<T>() {
  let reject!: (reason: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function setupInScope<TResult>(setup: () => TResult) {
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

function installRpc(): void {
  clientMock.rpc = { simulateTransaction: vi.fn() };
}

describe("useComputeBudget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMock.rpc = {};
    resolveFeePolicyMock.mockResolvedValue({ message: NEXT_MESSAGE, budget: BUDGET });
  });

  it("fails at setup when estimation is needed but the RPC capability is missing", () => {
    expect(() => setupInScope(() => useComputeBudget(MESSAGE))).toThrow(
      MissingClientCapabilityError,
    );
  });

  it("accepts a simulation source without an RPC simulation capability", async () => {
    const simulation = { unitsConsumed: 1_000n, fee: 5_000n };
    const { result } = setupInScope(() =>
      useComputeBudget(MESSAGE, {}, { simulationResult: simulation }),
    );

    await expect(result.apply()).resolves.toEqual({ message: NEXT_MESSAGE, budget: BUDGET });

    expect(resolveFeePolicyMock).toHaveBeenCalledWith(
      MESSAGE,
      {},
      expect.objectContaining({ simulationResult: simulation }),
    );
  });

  it("exposes the resolved budget, message, and computed status", async () => {
    installRpc();
    const policy = { mode: "priority" as const, maxLamports: 6_000n };
    const { result } = setupInScope(() => useComputeBudget(MESSAGE, policy));

    expect(result.status.value).toBe("idle");
    expect(result.budget.value).toBeNull();
    expect(result.message.value).toBeNull();
    expect(result.loading.value).toBe(false);

    const promise = result.apply();
    expect(result.status.value).toBe("computing");
    expect(result.loading.value).toBe(true);

    await expect(promise).resolves.toEqual({ message: NEXT_MESSAGE, budget: BUDGET });

    expect(result.status.value).toBe("computed");
    expect(result.budget.value).toEqual(BUDGET);
    expect(result.message.value).toBe(NEXT_MESSAGE);
    expect(result.error.value).toBeNull();
    expect(resolveFeePolicyMock).toHaveBeenCalledWith(
      MESSAGE,
      policy,
      expect.objectContaining({ client: clientMock, abortSignal: expect.any(AbortSignal) }),
    );
  });

  it("passes INVALID_INPUT through and reports unknown failures as RPC_FAILURE", async () => {
    installRpc();
    const { result } = setupInScope(() => useComputeBudget(MESSAGE));

    resolveFeePolicyMock.mockRejectedValueOnce(new Error("invalid policy"));
    await expect(result.apply()).rejects.toMatchObject({
      code: "RPC_FAILURE",
      message: "invalid policy",
    });
    expect(result.status.value).toBe("error");
    expect(result.error.value?.code).toBe("RPC_FAILURE");

    const invalid = Object.assign(new Error("bad option"), {
      name: "SolanaError",
      code: "INVALID_INPUT",
    });
    resolveFeePolicyMock.mockRejectedValueOnce(invalid);
    await expect(result.apply()).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(result.error.value?.code).toBe("INVALID_INPUT");
  });

  it("supersedes an in-flight resolution and aborts its signal", async () => {
    installRpc();
    const first = deferred<{ message: TransactionMessage; budget: FeeBudget }>();
    resolveFeePolicyMock.mockReturnValueOnce(first.promise);
    const { result } = setupInScope(() => useComputeBudget(MESSAGE));

    const firstRun = result.apply();
    const firstSignal = resolveFeePolicyMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;

    const secondRun = result.apply();

    expect(firstSignal.aborted).toBe(true);
    await expect(secondRun).resolves.toEqual({ message: NEXT_MESSAGE, budget: BUDGET });

    first.resolve({ message: MESSAGE, budget: { ...BUDGET, computeUnitLimit: 1 } });
    await expect(firstRun).resolves.toMatchObject({ budget: { computeUnitLimit: 1 } });
    expect(result.budget.value).toEqual(BUDGET);
    expect(result.status.value).toBe("computed");
  });

  it("aborts in-flight work and ignores results after scope disposal", async () => {
    installRpc();
    const pending = deferred<{ message: TransactionMessage; budget: FeeBudget }>();
    resolveFeePolicyMock.mockReturnValueOnce(pending.promise);
    const { result, scope } = setupInScope(() => useComputeBudget(MESSAGE));

    const promise = result.apply();
    const signal = resolveFeePolicyMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;
    scope.stop();

    expect(signal.aborted).toBe(true);
    pending.resolve({ message: MESSAGE, budget: { ...BUDGET, computeUnitLimit: 1 } });
    await promise;
    expect(result.budget.value).toBeNull();
    expect(result.status.value).toBe("computing");
  });

  it("watches reactive message and policy sources", async () => {
    installRpc();
    const message = ref(MESSAGE);
    const { result } = setupInScope(() => useComputeBudget(message));

    message.value = NEXT_MESSAGE;
    await nextTick();
    await vi.waitFor(() => expect(resolveFeePolicyMock).toHaveBeenCalledTimes(1));

    expect(resolveFeePolicyMock).toHaveBeenCalledWith(
      NEXT_MESSAGE,
      {},
      expect.objectContaining({ abortSignal: expect.any(AbortSignal) }),
    );
    expect(result.status.value).toBe("computed");
  });

  it("exports useFeePolicy as a discovery alias", () => {
    expect(useFeePolicy).toBe(useComputeBudget);
  });

  it("reset clears the budget and aborts the active resolution", async () => {
    installRpc();
    const pending = deferred<{ message: TransactionMessage; budget: FeeBudget }>();
    resolveFeePolicyMock.mockReturnValueOnce(pending.promise);
    const { result } = setupInScope(() => useComputeBudget(MESSAGE));

    const promise = result.apply();
    const signal = resolveFeePolicyMock.mock.calls[0]?.[2]?.abortSignal as AbortSignal;
    result.reset();

    expect(signal.aborted).toBe(true);
    expect(result.budget.value).toBeNull();
    expect(result.message.value).toBeNull();
    expect(result.status.value).toBe("idle");

    pending.resolve({ message: NEXT_MESSAGE, budget: BUDGET });
    await promise;
    expect(result.budget.value).toBeNull();
  });
});
