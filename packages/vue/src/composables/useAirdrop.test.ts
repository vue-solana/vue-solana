// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import type { Address, Lamports, Signature } from "@vue-solana/core/kit";
import { useAirdrop } from "./useAirdrop";

const { airdropMock } = vi.hoisted(() => ({ airdropMock: vi.fn() }));

vi.mock("./useSolanaClient", () => ({
  useSolanaClient: () => ({ client: { rpc: {}, airdrop: airdropMock }, rpc: {} }),
}));

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
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

const address = "11111111111111111111111111111111" as Address;
const amount = 1_000_000n as Lamports;
const signature = "abc" as Signature;

describe("useAirdrop", () => {
  it("dispatches an airdrop and exposes the returned signature", async () => {
    airdropMock.mockResolvedValue(signature);
    const { result } = setupInScope(() => useAirdrop());

    expect(result.status.value).toBe("idle");
    expect(result.data.value).toBeUndefined();

    await expect(result.dispatch(address, amount)).resolves.toBe(signature);

    expect(airdropMock).toHaveBeenCalledWith(address, amount, expect.any(AbortSignal));
    expect(result.status.value).toBe("success");
    expect(result.data.value).toBe(signature);
  });

  it("aborts the prior airdrop when a new dispatch starts", async () => {
    const signals: AbortSignal[] = [];
    const firstDeferred = deferred<Signature | undefined>();
    const secondDeferred = deferred<Signature | undefined>();
    airdropMock.mockImplementation(
      (_address: Address, _amount: Lamports, abortSignal?: AbortSignal) => {
        signals.push(abortSignal as AbortSignal);

        return signals.length === 1 ? firstDeferred.promise : secondDeferred.promise;
      },
    );
    const { result } = setupInScope(() => useAirdrop());

    const firstDispatch = result.dispatch(address, amount);
    const firstSignal = signals[0];
    expect(firstSignal?.aborted).toBe(false);

    const secondDispatch = result.dispatch(address, amount);
    expect(firstSignal?.aborted).toBe(true);

    const firstRejection = expect(firstDispatch).rejects.toSatisfy(
      (error: unknown) => error instanceof Error,
    );

    secondDeferred.resolve(signature);
    await expect(secondDispatch).resolves.toBe(signature);
    await firstRejection;

    expect(signals).toHaveLength(2);
    expect(signals[1]?.aborted).toBe(false);
    expect(result.data.value).toBe(signature);
    expect(result.status.value).toBe("success");
  });

  it("resolves data to undefined when the airdrop is applied without a transaction", async () => {
    airdropMock.mockResolvedValue(undefined);
    const { result } = setupInScope(() => useAirdrop());

    await expect(result.dispatch(address, amount)).resolves.toBeUndefined();

    expect(result.status.value).toBe("success");
    expect(result.data.value).toBeUndefined();
    expect(result.error.value).toBeUndefined();
  });

  it("explains the faucet when the RPC reports an HTTP 429", async () => {
    const transportError = Object.assign(new Error("HTTP error (429)"), {
      context: { statusCode: 429 },
    });
    airdropMock.mockRejectedValue(transportError);
    const { result } = setupInScope(() => useAirdrop());

    await expect(result.dispatch(address, amount)).rejects.toMatchObject({
      message: expect.stringContaining("faucet is rate-limited"),
      cause: transportError,
    });
    expect(result.status.value).toBe("error");
  });

  it("explains the faucet when the RPC returns a generic internal error", async () => {
    airdropMock.mockRejectedValue(
      new Error("JSON-RPC error: Internal JSON-RPC error (Internal error)"),
    );
    const { result } = setupInScope(() => useAirdrop());

    await expect(result.dispatch(address, amount)).rejects.toMatchObject({
      message: expect.stringContaining("faucet is rate-limited"),
    });
  });

  it("passes unrelated airdrop errors through unchanged", async () => {
    const boom = new Error("boom");
    airdropMock.mockRejectedValue(boom);
    const { result } = setupInScope(() => useAirdrop());

    await expect(result.dispatch(address, amount)).rejects.toBe(boom);
  });
});
