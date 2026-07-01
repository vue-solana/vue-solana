import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaTransaction, SolanaWallet } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignAndSendTransaction } from "./useSignAndSendTransaction";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
}

describe("useSignAndSendTransaction", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends transactions through the current wallet", async () => {
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "signature" }),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    const transaction = {} as SolanaTransaction;
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    await expect(result?.execute(transaction)).resolves.toBe("signature");
    expect(wallet.signAndSendTransaction).toHaveBeenCalledWith(transaction, undefined);
    expect(result?.signature.value).toBe("signature");
    expect(result?.status.value).toBe("sent");
  });

  it("optionally waits for confirmation after sending", async () => {
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "signature" }),
    } as unknown as SolanaWallet;
    const confirmationResult = { value: { err: null } };
    const context = createMockSolanaContext({
      wallet: shallowRef(wallet),
      connection: {
        confirmTransaction: vi.fn().mockResolvedValue(confirmationResult),
      } as never,
    });
    const transaction = {} as SolanaTransaction;
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    await expect(
      result?.execute(transaction, {
        skipPreflight: false,
        confirm: true,
        confirmation: { commitment: "finalized" },
      }),
    ).resolves.toBe("signature");
    expect(wallet.signAndSendTransaction).toHaveBeenCalledWith(transaction, {
      skipPreflight: false,
    });
    expect(context.connection.confirmTransaction).toHaveBeenCalledWith("signature", "finalized");
    expect(result?.status.value).toBe("finalized");
    expect(result?.confirmation.value?.result).toEqual(confirmationResult);
  });

  it("marks processed when confirmation uses processed commitment", async () => {
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "signature" }),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({
      wallet: shallowRef(wallet),
      connection: {
        confirmTransaction: vi.fn().mockResolvedValue({ value: { err: null } }),
      } as never,
    });
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    await result?.execute({} as SolanaTransaction, {
      confirm: true,
      confirmation: { commitment: "processed" },
    });

    expect(result?.status.value).toBe("processed");
    expect(context.connection.confirmTransaction).toHaveBeenCalledWith("signature", "processed");
  });

  it("ignores an older send that resolves after a newer send", async () => {
    const firstSend = createDeferred<{ signature: string }>();
    const secondSend = createDeferred<{ signature: string }>();
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi
        .fn()
        .mockReturnValueOnce(firstSend.promise)
        .mockReturnValueOnce(secondSend.promise),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    const first = result?.execute({} as SolanaTransaction);
    const second = result?.execute({} as SolanaTransaction);

    secondSend.resolve({ signature: "new-signature" });
    await expect(second).resolves.toBe("new-signature");
    expect(result?.signature.value).toBe("new-signature");
    expect(result?.status.value).toBe("sent");

    firstSend.resolve({ signature: "old-signature" });
    await expect(first).resolves.toBe("old-signature");
    expect(result?.signature.value).toBe("new-signature");
    expect(result?.status.value).toBe("sent");
    expect(result?.error.value).toBeNull();
  });

  it("ignores an older send that rejects after a newer send", async () => {
    const firstSend = createDeferred<{ signature: string }>();
    const secondSend = createDeferred<{ signature: string }>();
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi
        .fn()
        .mockReturnValueOnce(firstSend.promise)
        .mockReturnValueOnce(secondSend.promise),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    const first = result?.execute({} as SolanaTransaction);
    const second = result?.execute({} as SolanaTransaction);

    secondSend.resolve({ signature: "new-signature" });
    await expect(second).resolves.toBe("new-signature");

    firstSend.reject(new Error("stale send failed"));
    await expect(first).rejects.toThrow("stale send failed");
    expect(result?.signature.value).toBe("new-signature");
    expect(result?.status.value).toBe("sent");
    expect(result?.error.value).toBeNull();
  });

  it("keeps the signature when confirmation fails", async () => {
    const failure = new Error("confirmation failed");
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi.fn().mockResolvedValue({ signature: "signature" }),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({
      wallet: shallowRef(wallet),
      connection: {
        confirmTransaction: vi.fn().mockRejectedValue(failure),
      } as never,
    });
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    await expect(result?.execute({} as SolanaTransaction, { confirm: true })).rejects.toThrow(
      "confirmation failed",
    );
    expect(result?.signature.value).toBe("signature");
    expect(result?.status.value).toBe("error");
    expect(result?.error.value?.code).toBe("RPC_FAILURE");
    expect(result?.error.value?.cause).toBe(failure);
  });

  it("rejects when no wallet is configured", async () => {
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
    );

    await expect(result?.execute({} as SolanaTransaction)).rejects.toThrow(
      "No Solana wallet is selected",
    );
    expect(result?.status.value).toBe("error");
    expect(result?.error.value?.code).toBe("NO_WALLET_SELECTED");
  });

  it("times out when the wallet does not return a signature", async () => {
    vi.useFakeTimers();
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signAndSendTransaction: vi.fn(() => new Promise(() => undefined)),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useSignAndSendTransaction> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignAndSendTransaction();

          return () => h("div");
        },
      }),
      context,
    );

    const execution = result?.execute({} as SolanaTransaction);
    const rejection = expect(execution).rejects.toThrow(
      "Wallet transaction did not return a result",
    );

    await vi.advanceTimersByTimeAsync(120_000);
    await rejection;
    expect(result?.status.value).toBe("error");
    expect(result?.signature.value).toBeNull();
    expect(result?.error.value?.code).toBe("TRANSACTION_TIMEOUT");
  });
});

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
