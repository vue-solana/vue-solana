import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, provide } from "vue";
import { mount } from "@vue/test-utils";
import { solanaInjectionKey } from "../injection";
import { createMockSolanaContext } from "../../test-utils";
import { MissingClientCapabilityError, useClientCapability } from "./useClientCapability";
import { useIdentity, usePayer } from "./usePayer";
import { usePlanTransaction, usePlanTransactions } from "./usePlanTransaction";

const identitySigner = { address: "identity-address" } as never;
const payerSigner = { address: "payer-address" } as never;

// Captured subscribers so tests can invoke them the way the client would.
let identitySubscriber: (() => void) | undefined;
let payerSubscriber: (() => void) | undefined;

const planningClient = {
  rpc: {},
  identity: identitySigner,
  payer: payerSigner,
  subscribeToPayer: vi.fn((listener: () => void) => {
    payerSubscriber = listener;

    return () => undefined;
  }),
  subscribeToIdentity: vi.fn((listener: () => void) => {
    identitySubscriber = listener;

    return () => undefined;
  }),
  planTransaction: vi.fn(async () => ({ message: "single" }) as never),
  planTransactions: vi.fn(async () => ({ plan: "multi" }) as never),
};

type Consumer<T> = { result?: T; error?: unknown };

function mountWithClient<T>(client: Record<string, unknown>, useComposable: () => T): Consumer<T> {
  const captured: Consumer<T> = {};

  const Consumer = defineComponent({
    setup() {
      try {
        captured.result = useComposable();
      } catch (cause) {
        captured.error = cause;
      }

      return () => h("div");
    },
  });

  const Root = defineComponent({
    setup() {
      provide(solanaInjectionKey, createMockSolanaContext({ client: client as never }));

      return () => h(Consumer);
    },
  });

  mount(Root);

  return captured;
}

describe("useClientCapability", () => {
  it("passes when the capability is present", () => {
    const captured = mountWithClient({ rpc: {}, payer: payerSigner }, () =>
      useClientCapability("payer"),
    );

    expect(captured.error).toBeUndefined();
  });

  it("throws a clear error naming the hook when the capability is missing", () => {
    const captured = mountWithClient({ rpc: {} }, () =>
      useClientCapability("payer", {
        hookName: "usePayer",
        providerHint: "install the payer plugin",
      }),
    );

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
    const error = captured.error as MissingClientCapabilityError;

    expect(error.hookName).toBe("usePayer");
    expect(error.providerHint).toBe("install the payer plugin");
    expect(error.capabilities).toEqual(["payer"]);
    expect(error.message).toContain("usePayer");
    expect(error.message).toContain("`payer`");
    expect(error.message).toContain("install the payer plugin");
  });

  it("accepts an array of capabilities and fails on the first missing one", () => {
    const captured = mountWithClient({ rpc: {}, identity: identitySigner }, () =>
      useClientCapability(["identity", "payer"]),
    );

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured.error as MissingClientCapabilityError).capabilities).toEqual(["payer"]);
  });

  it("passes when every capability in the array is present", () => {
    const captured = mountWithClient(planningClient, () =>
      useClientCapability(["identity", "payer"]),
    );

    expect(captured.error).toBeUndefined();
  });

  it("treats a `null` capability as missing", () => {
    const captured = mountWithClient({ rpc: {}, payer: null }, () =>
      useClientCapability("payer", { hookName: "usePayer" }),
    );

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured.error as MissingClientCapabilityError).capabilities).toEqual(["payer"]);
  });
});

describe("useIdentity", () => {
  it("returns the client's identity signer", () => {
    const captured = mountWithClient(planningClient, () => useIdentity());

    expect(captured.error).toBeUndefined();
    expect(captured.result?.value).toBe(identitySigner);
  });

  it("subscribes to identity changes when the client advertises it", () => {
    const captured = mountWithClient(planningClient, () => useIdentity());

    expect(planningClient.subscribeToIdentity).toHaveBeenCalled();

    // Invoke the registered subscriber the way the client would on change.
    const nextIdentity = { address: "identity-after-change" } as never;
    planningClient.identity = nextIdentity;
    identitySubscriber?.();

    expect(captured.result?.value).toBe(nextIdentity);
  });

  it("does not throw when the client is not subscribable", () => {
    const captured = mountWithClient({ rpc: {}, identity: identitySigner }, () => useIdentity());

    expect(captured.error).toBeUndefined();
    expect(captured.result?.value).toBe(identitySigner);
  });

  it("throws when the client has no identity", () => {
    const captured = mountWithClient({ rpc: {} }, () => useIdentity());

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured.error as MissingClientCapabilityError).hookName).toBe("useIdentity");
  });
});

describe("usePayer", () => {
  it("returns the client's payer signer", () => {
    const captured = mountWithClient(planningClient, () => usePayer());

    expect(captured.error).toBeUndefined();
    expect(captured.result?.value).toBe(payerSigner);
  });

  it("subscribes to payer changes when the client advertises it", () => {
    const captured = mountWithClient(planningClient, () => usePayer());

    expect(planningClient.subscribeToPayer).toHaveBeenCalled();

    // Invoke the registered subscriber the way the client would on change and
    // prove the exposed ref re-reads the client's current payer.
    const nextPayer = { address: "payer-after-change" } as never;
    planningClient.payer = nextPayer;
    payerSubscriber?.();

    expect(captured.result?.value).toBe(nextPayer);
  });

  it("does not throw when the client is not subscribable", () => {
    const captured = mountWithClient({ rpc: {}, payer: payerSigner }, () => usePayer());

    expect(captured.error).toBeUndefined();
    expect(captured.result?.value).toBe(payerSigner);
  });

  it("throws when the client has no payer", () => {
    const captured = mountWithClient({ rpc: {} }, () => usePayer());

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
  });
});

describe("usePlanTransaction", () => {
  it("plans a single transaction message", async () => {
    const captured = mountWithClient(planningClient, () => usePlanTransaction());
    const result = captured.result!;

    const promise = result.execute([{ instruction: "noop" }] as never);

    expect(result.status.value).toBe("planning");

    const message = await promise;

    expect(planningClient.planTransaction).toHaveBeenCalledWith([{ instruction: "noop" }], {
      abortSignal: expect.any(AbortSignal),
    });
    expect(message).toMatchObject({ message: "single" });
    expect(result.transactionMessage.value).toMatchObject({ message: "single" });
    expect(result.status.value).toBe("planned");
  });

  it("captures planning failures into error state", async () => {
    const rejection = new Error("planning failed");
    const client = {
      ...planningClient,
      planTransaction: vi.fn(async () => {
        throw rejection;
      }),
    };
    const captured = mountWithClient(client, () => usePlanTransaction());
    const result = captured.result!;

    await expect(result.execute([] as never)).rejects.toBeInstanceOf(Error);
    expect(result.status.value).toBe("error");
    expect(result.error.value?.cause).toBe(rejection);
  });

  it("names `payer` when the client can plan but has no payer to plan with", () => {
    const client = { rpc: {}, planTransaction: vi.fn(async () => ({}) as never) };
    const captured = mountWithClient(client, () => usePlanTransaction());

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured.error as MissingClientCapabilityError).capabilities).toEqual(["payer"]);
    expect((captured.error as Error).message).toContain("`payer`");
    expect(client.planTransaction).not.toHaveBeenCalled();
  });
});

describe("usePlanTransactions", () => {
  it("plans the full transaction plan", async () => {
    const captured = mountWithClient(planningClient, () => usePlanTransactions());
    const result = captured.result!;

    const plan = await result.execute([{ instruction: "noop" }] as never);

    expect(planningClient.planTransactions).toHaveBeenCalledWith([{ instruction: "noop" }], {
      abortSignal: expect.any(AbortSignal),
    });
    expect(plan).toMatchObject({ plan: "multi" });
    expect(result.transactionPlan.value).toMatchObject({ plan: "multi" });
    expect(result.status.value).toBe("planned");
  });
});

describe("planning capability errors", () => {
  it("throws a capability error when the client cannot plan", () => {
    const captured = mountWithClient({ rpc: {} }, () => usePlanTransaction());

    expect(captured.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((captured.error as MissingClientCapabilityError).hookName).toBe("usePlanTransaction");
    expect((captured.error as MissingClientCapabilityError).providerHint).toContain(
      "rpcTransactionPlanner",
    );
  });

  it("only asserts the method each planning hook actually calls", () => {
    const singleOnly = {
      rpc: {},
      payer: payerSigner,
      planTransaction: vi.fn(async () => ({}) as never),
    };
    const multiOnly = {
      rpc: {},
      payer: payerSigner,
      planTransactions: vi.fn(async () => ({}) as never),
    };

    const single = mountWithClient(singleOnly, () => usePlanTransaction());
    expect(single.error).toBeUndefined();

    const multiWithSingleOnly = mountWithClient(singleOnly, () => usePlanTransactions());
    expect(multiWithSingleOnly.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((multiWithSingleOnly.error as MissingClientCapabilityError).capabilities).toEqual([
      "planTransactions",
    ]);

    const singleWithMultiOnly = mountWithClient(multiOnly, () => usePlanTransaction());
    expect(singleWithMultiOnly.error).toBeInstanceOf(MissingClientCapabilityError);
    expect((singleWithMultiOnly.error as MissingClientCapabilityError).capabilities).toEqual([
      "planTransaction",
    ]);

    const multi = mountWithClient(multiOnly, () => usePlanTransactions());
    expect(multi.error).toBeUndefined();
  });
});
