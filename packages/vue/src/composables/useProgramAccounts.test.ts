import { PublicKey } from "@solana/web3-compat";
import { flushPromises } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useProgramAccounts } from "./useProgramAccounts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("useProgramAccounts", () => {
  it("loads accounts for a program id string with config", async () => {
    const accounts = [
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 123 } },
    ];
    const getProgramAccounts = vi.fn().mockResolvedValue(accounts);
    const context = createMockSolanaContext({
      connection: { getProgramAccounts } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    let result: ReturnType<typeof useProgramAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useProgramAccounts("11111111111111111111111111111111", {
            commitment: "confirmed",
            filters: [{ dataSize: 165 }],
          });

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.accounts.value).toBe(accounts);
    expect(result?.loading.value).toBe(false);
    expect(result?.error.value).toBeNull();
    expect(getProgramAccounts).toHaveBeenCalledWith(expect.any(PublicKey), {
      commitment: "confirmed",
      filters: [{ dataSize: 165 }],
    });
  });

  it("does not call RPC for null input", async () => {
    const getProgramAccounts = vi.fn();
    const context = createMockSolanaContext({
      connection: { getProgramAccounts } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    let result: ReturnType<typeof useProgramAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useProgramAccounts(null);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    expect(result?.accounts.value).toEqual([]);
    expect(getProgramAccounts).not.toHaveBeenCalled();
  });

  it("stores invalid public key errors without spamming RPC", async () => {
    const getProgramAccounts = vi.fn();
    const context = createMockSolanaContext({
      connection: { getProgramAccounts } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    let result: ReturnType<typeof useProgramAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useProgramAccounts("not-a-public-key");

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();

    await expect(result?.refresh()).rejects.toThrow();
    expect(result?.error.value).toBeInstanceOf(Error);
    expect(getProgramAccounts).not.toHaveBeenCalled();
  });

  it("refreshes when the program id changes", async () => {
    const getProgramAccounts = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const context = createMockSolanaContext({
      connection: { getProgramAccounts } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    const programId = ref("11111111111111111111111111111111");

    mountWithSolana(
      defineComponent({
        setup() {
          useProgramAccounts(programId);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    programId.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    expect(getProgramAccounts).toHaveBeenCalledTimes(2);
  });

  it("keeps the newest accounts when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<unknown[]>();
    const secondRequest = deferred<unknown[]>();
    const getProgramAccounts = vi
      .fn()
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);
    const context = createMockSolanaContext({
      connection: { getProgramAccounts } as ReturnType<
        typeof createMockSolanaContext
      >["connection"],
    });
    const programId = ref("11111111111111111111111111111111");
    let result: ReturnType<typeof useProgramAccounts> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useProgramAccounts(programId);

          return () => h("div");
        },
      }),
      context,
    );

    await flushPromises();
    programId.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    const newest = [
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 456 } },
    ];
    secondRequest.resolve(newest);
    await flushPromises();

    expect(result?.accounts.value).toBe(newest);

    firstRequest.resolve([
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 123 } },
    ]);
    await flushPromises();

    expect(result?.accounts.value).toBe(newest);
    expect(getProgramAccounts).toHaveBeenCalledTimes(2);
  });
});
