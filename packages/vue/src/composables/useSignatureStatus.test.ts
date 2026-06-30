import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignatureStatus } from "./useSignatureStatus";

describe("useSignatureStatus", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads a signature status", async () => {
    const signatureStatus = {
      slot: 1,
      confirmations: 2,
      err: null,
      confirmationStatus: "confirmed",
    };
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [signatureStatus] });
    const context = createMockSolanaContext({
      connection: { getSignatureStatuses } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    let result: ReturnType<typeof useSignatureStatus> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignatureStatus("signature", { searchTransactionHistory: true });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.status.value).toBe(signatureStatus);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
    expect(getSignatureStatuses).toHaveBeenCalledWith(["signature"], {
      searchTransactionHistory: true,
    });
  });

  it("does not poll RPC for null input", async () => {
    const getSignatureStatuses = vi.fn();
    const context = createMockSolanaContext({
      connection: { getSignatureStatuses } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    let result: ReturnType<typeof useSignatureStatus> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignatureStatus(null);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.status.value).toBeNull();
    expect(getSignatureStatuses).not.toHaveBeenCalled();
  });

  it("keeps the newest signature status when overlapping requests resolve out of order", async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const first = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const second = new Promise((resolve) => {
      resolveSecond = resolve;
    });
    const getSignatureStatuses = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const context = createMockSolanaContext({
      connection: { getSignatureStatuses } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    const signature = ref("old-signature");
    let result: ReturnType<typeof useSignatureStatus> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignatureStatus(signature);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    signature.value = "new-signature";
    await flushPromises();

    const newest = { slot: 2, confirmations: null, err: null, confirmationStatus: "finalized" };
    resolveSecond({ value: [newest] });
    await flushPromises();

    expect(result?.status.value).toBe(newest);

    resolveFirst({ value: [{ slot: 1, confirmations: 1, err: null }] });
    await flushPromises();

    expect(result?.status.value).toBe(newest);
  });

  it("polls when a poll interval is provided and stops on unmount", async () => {
    vi.useFakeTimers();
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const context = createMockSolanaContext({
      connection: { getSignatureStatuses } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });

    const wrapper = mountWithSolana(
      defineComponent({
        setup() {
          useSignatureStatus("signature", { pollIntervalMs: 50 });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    expect(getSignatureStatuses).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(50);
    expect(getSignatureStatuses).toHaveBeenCalledTimes(2);

    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(50);
    expect(getSignatureStatuses).toHaveBeenCalledTimes(2);
  });

  it("subscribes to signature updates and removes the listener on unmount", async () => {
    const getSignatureStatuses = vi.fn().mockResolvedValue({ value: [null] });
    const onSignature = vi.fn().mockReturnValue(7);
    const removeSignatureListener = vi.fn().mockResolvedValue(undefined);
    const context = createMockSolanaContext({
      connection: {
        getSignatureStatuses,
        onSignature,
        removeSignatureListener,
      } as unknown as ReturnType<typeof createMockSolanaContext>["connection"],
    });
    let result: ReturnType<typeof useSignatureStatus> | undefined;

    const wrapper = mountWithSolana(
      defineComponent({
        setup() {
          result = useSignatureStatus("signature", { commitment: "finalized", subscribe: true });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    const listener = onSignature.mock.calls[0]?.[1] as (
      notification: { err: unknown },
      context: { slot: number },
    ) => void;
    listener({ err: null }, { slot: 99 });

    expect(result?.status.value).toEqual({
      slot: 99,
      confirmations: null,
      err: null,
      confirmationStatus: "finalized",
    });
    expect(onSignature).toHaveBeenCalledWith("signature", expect.any(Function), "finalized");

    wrapper.unmount();
    await flushPromises();

    expect(removeSignatureListener).toHaveBeenCalledWith(7);
  });
});
