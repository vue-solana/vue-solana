import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaSignInInput, SolanaSignInResult, SolanaWallet } from "@vue-solana/core/types";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useSignIn } from "./useSignIn";

const publicKey = "public-key" as SolanaWallet["publicKey"];

const signInResult: SolanaSignInResult = {
  account: {
    address: publicKey as SolanaSignInResult["account"]["address"],
    publicKey: new Uint8Array([1, 2, 3]),
    chains: ["solana:devnet"],
    label: "Main account",
  },
  signedMessage: new Uint8Array([4, 5]),
  signature: new Uint8Array([6, 7]),
  signatureType: "ed25519",
};

function connectedWallet(overrides: Partial<SolanaWallet> = {}): SolanaWallet {
  return {
    publicKey,
    connected: true,
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    ...overrides,
  } as SolanaWallet;
}

type SignInResult = ReturnType<typeof useSignIn>;

describe("useSignIn", () => {
  it("signs in via the wallet and exposes the result", async () => {
    const signIn = vi.fn(async (_input?: SolanaSignInInput) => {
      void _input;

      return signInResult;
    });
    const {
      signIn: execute,
      status,
      signInResult: result,
      loading,
    } = mountUseSignIn(
      createMockSolanaContext({ wallet: shallowRef(connectedWallet({ signIn })) }),
    );

    const promise = execute({ statement: "Sign in to My App" });

    expect(status.value).toBe("signing-in");
    expect(loading.value).toBe(true);

    const resolved = await promise;

    expect(resolved).toBe(signInResult);
    expect(signIn).toHaveBeenCalledWith({ statement: "Sign in to My App" });
    expect(result.value).toBe(signInResult);
    expect(status.value).toBe("signed-in");
    expect(loading.value).toBe(false);
  });

  it("forwards no input to the wallet when none is provided", async () => {
    const signIn = vi.fn(async () => signInResult);
    const { signIn: execute } = mountUseSignIn(
      createMockSolanaContext({ wallet: shallowRef(connectedWallet({ signIn })) }),
    );

    await execute();

    expect(signIn).toHaveBeenCalledWith(undefined);
  });

  it("rejects with NO_WALLET_SELECTED when no wallet is selected", async () => {
    const { signIn: execute, status, error } = mountUseSignIn();

    await expect(execute()).rejects.toMatchObject({ code: "NO_WALLET_SELECTED" });
    expect(status.value).toBe("error");
    expect(error.value?.code).toBe("NO_WALLET_SELECTED");
  });

  it("rejects with WALLET_FEATURE_UNSUPPORTED when the wallet lacks SIWS", async () => {
    const {
      signIn: execute,
      status,
      error,
    } = mountUseSignIn(createMockSolanaContext({ wallet: shallowRef(connectedWallet()) }));

    await expect(execute()).rejects.toMatchObject({ code: "WALLET_FEATURE_UNSUPPORTED" });
    expect(status.value).toBe("error");
    expect(error.value?.code).toBe("WALLET_FEATURE_UNSUPPORTED");
  });

  it("captures wallet rejection into error state and rethrows", async () => {
    const rejection = new Error("user declined the sign-in request");
    const signIn = vi.fn(async () => {
      throw rejection;
    });
    const {
      signIn: execute,
      status,
      error,
    } = mountUseSignIn(
      createMockSolanaContext({ wallet: shallowRef(connectedWallet({ signIn })) }),
    );

    await expect(execute()).rejects.toBeInstanceOf(Error);
    expect(status.value).toBe("error");
    expect(error.value?.cause).toBe(rejection);
  });

  it("ignores stale sign-ins that resolve after a newer attempt starts", async () => {
    let resolveFirst: (result: SolanaSignInResult) => void = () => undefined;
    const signIn = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<SolanaSignInResult>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(async () => signInResult);
    const {
      signIn: execute,
      status,
      signInResult: result,
    } = mountUseSignIn(
      createMockSolanaContext({ wallet: shallowRef(connectedWallet({ signIn })) }),
    );

    const first = execute();
    const second = execute({ statement: "second" });

    resolveFirst(signInResult);
    await first;
    await second;

    expect(result.value).toBe(signInResult);
    expect(status.value).toBe("signed-in");
    expect(signIn).toHaveBeenCalledTimes(2);
  });
});

function mountUseSignIn(context = createMockSolanaContext()): SignInResult {
  let result: SignInResult | undefined;

  mountWithSolana(
    defineComponent({
      setup() {
        result = useSignIn();

        return () => h("div");
      },
    }),
    context,
  );

  if (!result) {
    throw new Error("useSignIn did not mount.");
  }

  return result;
}
