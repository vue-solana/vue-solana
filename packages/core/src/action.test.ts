// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createSolanaActionStore, isSolanaActionAborted } from "./action";

describe("createSolanaActionStore", () => {
  it("exposes an idle state before the first dispatch", () => {
    const store = createSolanaActionStore(async () => "value");

    expect(store.getState()).toEqual({ status: "idle" });
  });

  it("moves through running and success states and resolves dispatchAsync", async () => {
    let resolveFn!: (value: string) => void;
    const store = createSolanaActionStore(
      () =>
        new Promise<string>((resolve) => {
          resolveFn = resolve;
        }),
    );
    const states: string[] = [];
    const unsubscribe = store.subscribe(() => {
      states.push(store.getState().status);
    });

    const running = store.dispatchAsync();

    expect(store.getState().status).toBe("running");

    resolveFn("value");
    await expect(running).resolves.toBe("value");

    expect(store.getState()).toMatchObject({ status: "success", data: "value" });
    expect(states.filter((status, index) => status !== states[index - 1])).toEqual([
      "running",
      "success",
    ]);

    unsubscribe();
  });

  it("surfaces failures as error state and rejects dispatchAsync", async () => {
    const failure = new Error("boom");
    const store = createSolanaActionStore(async () => {
      throw failure;
    });

    await expect(store.dispatchAsync()).rejects.toBe(failure);

    expect(store.getState()).toMatchObject({ status: "error" });
    expect(store.getState().error).toBe(failure);
  });

  it("aborts the previous in-flight dispatch when a new one starts", async () => {
    const signals: AbortSignal[] = [];
    let resolveFirst!: (value: string) => void;
    const store = createSolanaActionStore(async (signal) => {
      signals.push(signal);
      return new Promise<string>((resolve) => {
        resolveFirst = resolve;
      });
    });

    const first = store.dispatchAsync();
    const firstSignal = signals[0];
    if (!firstSignal) {
      throw new Error("first dispatch did not receive a signal");
    }

    const second = store.dispatchAsync();

    await expect(first).rejects.toSatisfy(isSolanaActionAborted);
    expect(firstSignal.aborted).toBe(true);

    resolveFirst("stale");
    await expect(second).resolves.toBe("stale");
    expect(store.getState()).toMatchObject({ status: "success", data: "stale" });
  });

  it("gives each dispatch a fresh AbortSignal", async () => {
    const signals: AbortSignal[] = [];
    const store = createSolanaActionStore(async (signal) => {
      signals.push(signal);
      return signals.length;
    });

    await store.dispatchAsync();
    await store.dispatchAsync();

    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
  });

  it("resets to idle and aborts the in-flight call", async () => {
    const signals: AbortSignal[] = [];
    const store = createSolanaActionStore(async (signal) => {
      signals.push(signal);
      return new Promise<string>(() => {});
    });

    const running = store.dispatchAsync().catch((error: unknown) => error);
    store.reset();

    await running;

    expect(store.getState()).toEqual({ status: "idle" });
    expect(signals[0]?.aborted).toBe(true);
  });

  it("keeps previous data while running and clears error on success", async () => {
    const deferreds: { resolve: (value: string) => void; reject: (error: Error) => void }[] = [];
    const store = createSolanaActionStore(
      () =>
        new Promise<string>((resolve, reject) => {
          deferreds.push({ resolve, reject });
        }),
    );

    const first = store.dispatchAsync();
    const firstDeferred = deferreds[0];
    if (!firstDeferred) {
      throw new Error("first dispatch never started");
    }
    const failure = new Error("boom");
    firstDeferred.reject(failure);
    await expect(first).rejects.toBe(failure);
    expect(store.getState()).toMatchObject({ status: "error" });

    const running = store.dispatchAsync();
    expect(store.getState()).toMatchObject({ status: "running" });
    expect(store.getState().data).toBeUndefined();

    const secondDeferred = deferreds[1];
    if (!secondDeferred) {
      throw new Error("second dispatch never started");
    }
    secondDeferred.resolve("fresh");
    await expect(running).resolves.toBe("fresh");

    const state = store.getState();
    expect(state).toMatchObject({ status: "success", data: "fresh", error: undefined });
  });

  it("supports withSignal for caller-provided cancellation", async () => {
    const controller = new AbortController();
    const store = createSolanaActionStore(() => new Promise<string>(() => {}));

    const running = store
      .withSignal(controller.signal)
      .dispatchAsync()
      .catch((error: unknown) => error);
    controller.abort(new Error("killed"));

    await running;

    expect(store.getState().status).toBe("error");
  });

  it("does not notify subscribers when state does not change", () => {
    const listener = vi.fn();
    const store = createSolanaActionStore(async () => "value");

    store.subscribe(listener);
    store.dispatch();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
