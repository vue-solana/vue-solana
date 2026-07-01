import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWallet } from "@vue-solana/core";
import { SolanaWalletError } from "@vue-solana/core/wallet";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignMessage } from "./useSignMessage";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

type SignMessageResult = ReturnType<typeof useSignMessage>;

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
    const wallet = createWallet({
      signMessage: vi.fn().mockResolvedValue({ signedMessage, signature }),
    });
    const result = mountUseSignMessage(wallet);

    await expect(result.execute(message)).resolves.toEqual({ signedMessage, signature });
    expect(wallet.signMessage).toHaveBeenCalledWith(message);
    expect(result.signedMessage.value).toBe(signedMessage);
    expect(result.signature.value).toBe(signature);
    expect(result.status.value).toBe("signed");
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeNull();
  });

  it("rejects when no wallet is configured", async () => {
    const result = mountUseSignMessage();

    await expect(result.execute(new Uint8Array())).rejects.toThrow(
      "No Solana wallet is configured",
    );
    expect(result.status.value).toBe("error");
  });

  it("rejects when the active wallet cannot sign messages", async () => {
    const result = mountUseSignMessage(createWallet());

    await expect(result.execute(new Uint8Array())).rejects.toThrow(
      "Solana wallet does not support signMessage",
    );
    expect(result.status.value).toBe("error");
    expect(result.error.value).toBeInstanceOf(SolanaWalletError);
    expect((result.error.value as SolanaWalletError | null)?.code).toBe(
      "WALLET_SIGN_MESSAGE_UNSUPPORTED",
    );
  });

  it("rejects with a typed error when the active wallet is disconnected", async () => {
    const wallet = createWallet({
      connected: false,
      signMessage: vi.fn(),
    });
    const result = mountUseSignMessage(wallet);

    await expect(result.execute(new Uint8Array())).rejects.toThrow(
      "Solana wallet is not connected",
    );
    expect(wallet.signMessage).not.toHaveBeenCalled();
    expect(result.status.value).toBe("error");
    expect(result.error.value).toBeInstanceOf(SolanaWalletError);
    expect((result.error.value as SolanaWalletError | null)?.code).toBe("WALLET_NOT_CONNECTED");
  });

  it("normalizes wallet signing rejections before storing and rethrowing them", async () => {
    const wallet = createWallet({
      signMessage: vi.fn().mockRejectedValue("User rejected the message signing request"),
    });
    const result = mountUseSignMessage(wallet);

    await expect(result.execute(new Uint8Array([1, 2, 3]))).rejects.toThrow(
      "User rejected the message signing request",
    );
    expect(result.status.value).toBe("error");
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.error.value?.message).toBe("User rejected the message signing request");
  });

  it("ignores an older signature that resolves after a newer signature", async () => {
    const scenario = createOverlappingSignMessageScenario();
    const firstSignature = new Uint8Array([1]);

    scenario.secondSign.resolve({
      signedMessage: new Uint8Array([2]),
      signature: scenario.secondSignature,
    });
    await expect(scenario.second).resolves.toEqual({
      signedMessage: new Uint8Array([2]),
      signature: scenario.secondSignature,
    });
    expect(scenario.result.signature.value).toBe(scenario.secondSignature);
    expect(scenario.result.status.value).toBe("signed");

    scenario.firstSign.resolve({ signedMessage: new Uint8Array([1]), signature: firstSignature });
    await expect(scenario.first).resolves.toEqual({
      signedMessage: new Uint8Array([1]),
      signature: firstSignature,
    });
    expect(scenario.result.signature.value).toBe(scenario.secondSignature);
    expect(scenario.result.status.value).toBe("signed");
    expect(scenario.result.error.value).toBeNull();
  });

  it("ignores an older rejection that settles after a newer signature", async () => {
    const scenario = createOverlappingSignMessageScenario();

    scenario.secondSign.resolve({
      signedMessage: new Uint8Array([2]),
      signature: scenario.secondSignature,
    });
    await expect(scenario.second).resolves.toEqual({
      signedMessage: new Uint8Array([2]),
      signature: scenario.secondSignature,
    });
    expect(scenario.result.signature.value).toBe(scenario.secondSignature);
    expect(scenario.result.status.value).toBe("signed");

    scenario.firstSign.reject(new Error("Older request failed"));
    await expect(scenario.first).rejects.toThrow("Older request failed");
    expect(scenario.result.signature.value).toBe(scenario.secondSignature);
    expect(scenario.result.status.value).toBe("signed");
    expect(scenario.result.error.value).toBeNull();
  });
});

function createWallet(overrides: Partial<SolanaWallet> = {}): SolanaWallet {
  return {
    publicKey,
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as SolanaWallet;
}

function mountUseSignMessage(wallet?: SolanaWallet): SignMessageResult {
  const context = wallet ? createMockSolanaContext({ wallet: shallowRef(wallet) }) : undefined;
  let result: SignMessageResult | undefined;

  mountWithSolana(
    defineComponent({
      setup() {
        result = useSignMessage();

        return () => h("div");
      },
    }),
    context,
  );

  return result as SignMessageResult;
}

function createOverlappingSignMessageScenario() {
  const firstSign = createDeferred<{ signedMessage: Uint8Array; signature: Uint8Array }>();
  const secondSign = createDeferred<{ signedMessage: Uint8Array; signature: Uint8Array }>();
  const secondSignature = new Uint8Array([2]);
  const wallet = createWallet({
    signMessage: vi
      .fn()
      .mockReturnValueOnce(firstSign.promise)
      .mockReturnValueOnce(secondSign.promise),
  });
  const result = mountUseSignMessage(wallet);
  const first = result.execute(new Uint8Array([1]));
  const second = result.execute(new Uint8Array([2]));

  return { first, firstSign, result, second, secondSign, secondSignature };
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>["resolve"];
  let reject!: Deferred<T>["reject"];
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
