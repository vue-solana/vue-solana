import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWallet } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignMessage } from "./useSignMessage";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (cause: unknown) => void;
}

describe("useSignMessage", () => {
  it("signs messages through the current wallet", async () => {
    const message = new Uint8Array([1, 2, 3]);
    const signedMessage = new Uint8Array([1, 2, 3]);
    const signature = new Uint8Array([4, 5, 6]);
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signMessage: vi.fn().mockResolvedValue({ signedMessage, signature }),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useSignMessage> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignMessage();

          return () => h("div");
        },
      }),
      context,
    );

    await expect(result?.execute(message)).resolves.toEqual({ signedMessage, signature });
    expect(wallet.signMessage).toHaveBeenCalledWith(message);
    expect(result?.signedMessage.value).toBe(signedMessage);
    expect(result?.signature.value).toBe(signature);
    expect(result?.status.value).toBe("signed");
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
  });

  it("rejects when no wallet is configured", async () => {
    let result: ReturnType<typeof useSignMessage> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignMessage();

          return () => h("div");
        },
      }),
    );

    await expect(result?.execute(new Uint8Array())).rejects.toThrow(
      "No Solana wallet is configured",
    );
    expect(result?.status.value).toBe("error");
  });

  it("rejects when the active wallet cannot sign messages", async () => {
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useSignMessage> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignMessage();

          return () => h("div");
        },
      }),
      context,
    );

    await expect(result?.execute(new Uint8Array())).rejects.toThrow(
      "Solana wallet does not support signMessage",
    );
    expect(result?.status.value).toBe("error");
  });

  it("ignores an older signature that resolves after a newer signature", async () => {
    const firstSign = createDeferred<{ signedMessage: Uint8Array; signature: Uint8Array }>();
    const secondSign = createDeferred<{ signedMessage: Uint8Array; signature: Uint8Array }>();
    const firstSignature = new Uint8Array([1]);
    const secondSignature = new Uint8Array([2]);
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signMessage: vi
        .fn()
        .mockReturnValueOnce(firstSign.promise)
        .mockReturnValueOnce(secondSign.promise),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useSignMessage> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useSignMessage();

          return () => h("div");
        },
      }),
      context,
    );

    const first = result?.execute(new Uint8Array([1]));
    const second = result?.execute(new Uint8Array([2]));

    secondSign.resolve({ signedMessage: new Uint8Array([2]), signature: secondSignature });
    await expect(second).resolves.toEqual({
      signedMessage: new Uint8Array([2]),
      signature: secondSignature,
    });
    expect(result?.signature.value).toBe(secondSignature);
    expect(result?.status.value).toBe("signed");

    firstSign.resolve({ signedMessage: new Uint8Array([1]), signature: firstSignature });
    await expect(first).resolves.toEqual({
      signedMessage: new Uint8Array([1]),
      signature: firstSignature,
    });
    expect(result?.signature.value).toBe(secondSignature);
    expect(result?.status.value).toBe("signed");
    expect(result?.error.value).toBeNull();
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
