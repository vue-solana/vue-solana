import { PublicKey } from "@solana/web3-compat";
import { flushPromises } from "@vue/test-utils";
import {
  useProgramAccounts,
  type UseProgramAccountsOptions,
} from "@vue-solana/vue/useProgramAccounts";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function createProgramAccountsContext(getProgramAccounts: unknown) {
  return createMockSolanaContext({
    connection: { getProgramAccounts } as ReturnType<typeof createMockSolanaContext>["connection"],
  });
}

function mountProgramAccounts(
  context: ReturnType<typeof createMockSolanaContext>,
  programId: Parameters<typeof useProgramAccounts>[0],
  options?: Parameters<typeof useProgramAccounts>[1],
) {
  let result: ReturnType<typeof useProgramAccounts> | undefined;

  const wrapper = mountWithSolana(
    defineComponent({
      setup() {
        result = useProgramAccounts(programId, options);

        return () => h("div");
      },
    }),
    context,
  );

  if (!result) {
    throw new Error("useProgramAccounts did not mount");
  }

  return { result, wrapper };
}

describe("useProgramAccounts", () => {
  it("accepts Solana SDK getProgramAccounts option shapes", () => {
    const validOptions = {
      commitment: "confirmed",
      dataSlice: { offset: 1, length: 32 },
      filters: [
        { dataSize: 165 },
        { memcmp: { offset: 0, bytes: "11111111111111111111111111111111", encoding: "base64" } },
      ],
    } satisfies UseProgramAccountsOptions;

    const invalidOptions: UseProgramAccountsOptions = {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: "abc",
            // @ts-expect-error memcmp encoding must match Solana RPC's supported literals.
            encoding: "hex",
          },
        },
      ],
    };

    expect(validOptions.filters).toHaveLength(2);
    expect(invalidOptions.filters).toHaveLength(1);
  });

  it("loads accounts for a program id string with config", async () => {
    const accounts = [
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 123 } },
    ];
    const getProgramAccounts = vi.fn().mockResolvedValue(accounts);
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result } = mountProgramAccounts(context, "11111111111111111111111111111111", {
      commitment: "confirmed",
      dataSlice: { offset: 1, length: 32 },
      filters: [{ dataSize: 165 }],
    });

    await flushPromises();

    expect(result.accounts.value).toBe(accounts);
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeNull();
    expect(getProgramAccounts).toHaveBeenCalledWith(expect.any(PublicKey), {
      commitment: "confirmed",
      dataSlice: { offset: 1, length: 32 },
      filters: [{ dataSize: 165 }],
    });
  });

  it("does not call RPC for null input", async () => {
    const getProgramAccounts = vi.fn();
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result } = mountProgramAccounts(context, null);

    await flushPromises();

    expect(result.accounts.value).toEqual([]);
    expect(getProgramAccounts).not.toHaveBeenCalled();
  });

  it("stores invalid public key errors without spamming RPC", async () => {
    const getProgramAccounts = vi.fn();
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result } = mountProgramAccounts(context, "not-a-public-key");

    await flushPromises();

    await expect(result.refresh()).rejects.toThrow();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(getProgramAccounts).not.toHaveBeenCalled();
  });

  it("clears stale program accounts when a loaded program id becomes invalid", async () => {
    const accounts = [
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 123 } },
    ];
    const getProgramAccounts = vi.fn().mockResolvedValue(accounts);
    const context = createProgramAccountsContext(getProgramAccounts);
    const programId = ref("11111111111111111111111111111111");
    const { result } = mountProgramAccounts(context, programId);

    await flushPromises();
    expect(result.accounts.value).toBe(accounts);

    programId.value = "not-a-public-key";
    await flushPromises();

    expect(result.accounts.value).toEqual([]);
    expect(result.error.value).toBeInstanceOf(Error);
    expect(getProgramAccounts).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the program id changes", async () => {
    const getProgramAccounts = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const context = createProgramAccountsContext(getProgramAccounts);
    const programId = ref("11111111111111111111111111111111");
    mountProgramAccounts(context, programId);

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
    const context = createProgramAccountsContext(getProgramAccounts);
    const programId = ref("11111111111111111111111111111111");
    const { result } = mountProgramAccounts(context, programId);

    await flushPromises();
    programId.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    const newest = [
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 456 } },
    ];
    secondRequest.resolve(newest);
    await flushPromises();

    expect(result.accounts.value).toBe(newest);

    firstRequest.resolve([
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 123 } },
    ]);
    await flushPromises();

    expect(result.accounts.value).toBe(newest);
    expect(getProgramAccounts).toHaveBeenCalledTimes(2);
  });

  it("ignores pending program account responses after unmount", async () => {
    const pendingRequest = deferred<unknown[]>();
    const getProgramAccounts = vi.fn().mockReturnValue(pendingRequest.promise);
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result, wrapper } = mountProgramAccounts(context, "11111111111111111111111111111111");

    await flushPromises();
    expect(result.loading.value).toBe(true);

    wrapper.unmount();

    const accounts = [
      { pubkey: new PublicKey("11111111111111111111111111111111"), account: { lamports: 123 } },
    ];
    pendingRequest.resolve(accounts);
    await flushPromises();

    expect(result.accounts.value).toEqual([]);
    expect(result.loading.value).toBe(true);
    expect(result.error.value).toBeNull();
  });
});
