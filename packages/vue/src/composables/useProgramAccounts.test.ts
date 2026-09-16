import { flushPromises } from "@vue/test-utils";
import {
  useProgramAccounts,
  type UseProgramAccountsOptions,
} from "@vue-solana/vue/useProgramAccounts";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";

const PROGRAM_ID = "11111111111111111111111111111111";
const ACCOUNTS = [
  {
    pubkey: PROGRAM_ID,
    account: {
      executable: false,
      lamports: 123n,
      owner: PROGRAM_ID,
      space: 10n,
      data: ["AQ==", "base64"],
    },
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

function createProgramAccountsContext(getProgramAccounts: unknown) {
  return createMockSolanaContext({
    client: { rpc: { getProgramAccounts } } as ReturnType<typeof createMockSolanaContext>["client"],
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

  it("loads and normalizes accounts for a program id string with config", async () => {
    const getProgramAccounts = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ value: ACCOUNTS }),
    }));
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result } = mountProgramAccounts(context, PROGRAM_ID, {
      commitment: "confirmed",
      dataSlice: { offset: 1, length: 32 },
      filters: [{ dataSize: 165 }],
    });

    await flushPromises();

    expect(result.accounts.value).toEqual([
      {
        pubkey: PROGRAM_ID,
        account: {
          executable: false,
          lamports: 123,
          owner: PROGRAM_ID,
          space: 10,
          data: new Uint8Array([1]),
        },
      },
    ]);
    expect(result.loading.value).toBe(false);
    expect(result.error.value).toBeNull();
    expect(getProgramAccounts).toHaveBeenCalledWith(PROGRAM_ID, {
      encoding: "base64",
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

  it("stores invalid address errors without spamming RPC", async () => {
    const getProgramAccounts = vi.fn();
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result } = mountProgramAccounts(context, "not-a-public-key");

    await flushPromises();

    await expect(result.refresh()).rejects.toThrow();
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.error.value).toMatchObject({ code: "INVALID_ADDRESS" });
    expect(getProgramAccounts).not.toHaveBeenCalled();
  });

  it("clears stale program accounts when a loaded program id becomes invalid", async () => {
    const getProgramAccounts = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ value: ACCOUNTS }),
    }));
    const context = createProgramAccountsContext(getProgramAccounts);
    const programId = ref(PROGRAM_ID);
    const { result } = mountProgramAccounts(context, programId);

    await flushPromises();
    expect(result.accounts.value).toHaveLength(1);

    programId.value = "not-a-public-key";
    await flushPromises();

    expect(result.accounts.value).toEqual([]);
    expect(result.error.value).toBeInstanceOf(Error);
    expect(result.error.value).toMatchObject({ code: "INVALID_ADDRESS" });
    expect(getProgramAccounts).toHaveBeenCalledTimes(1);
  });

  it("refreshes when the program id changes", async () => {
    const getProgramAccounts = vi
      .fn()
      .mockReturnValueOnce({ send: vi.fn().mockResolvedValue({ value: [] }) })
      .mockReturnValueOnce({ send: vi.fn().mockResolvedValue({ value: [] }) });
    const context = createProgramAccountsContext(getProgramAccounts);
    const programId = ref(PROGRAM_ID);
    mountProgramAccounts(context, programId);

    await flushPromises();
    programId.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    expect(getProgramAccounts).toHaveBeenCalledTimes(2);
  });

  it("keeps the newest accounts when overlapping requests resolve out of order", async () => {
    const firstRequest = deferred<{ value: unknown[] }>();
    const secondRequest = deferred<{ value: unknown[] }>();
    const getProgramAccounts = vi
      .fn()
      .mockReturnValueOnce({ send: () => firstRequest.promise })
      .mockReturnValueOnce({ send: () => secondRequest.promise });
    const context = createProgramAccountsContext(getProgramAccounts);
    const programId = ref(PROGRAM_ID);
    const { result } = mountProgramAccounts(context, programId);

    await flushPromises();
    programId.value = "So11111111111111111111111111111111111111112";
    await flushPromises();

    const newest = [{ ...ACCOUNTS[0]!, account: { ...ACCOUNTS[0]!.account, lamports: 456n } }];
    secondRequest.resolve({ value: newest });
    await flushPromises();

    expect(result.accounts.value[0]?.account.lamports).toBe(456);

    firstRequest.resolve({
      value: [{ ...ACCOUNTS[0]!, account: { ...ACCOUNTS[0]!.account, lamports: 123n } }],
    });
    await flushPromises();

    expect(result.accounts.value[0]?.account.lamports).toBe(456);
    expect(getProgramAccounts).toHaveBeenCalledTimes(2);
  });

  it("ignores pending program account responses after unmount", async () => {
    const pendingRequest = deferred<{ value: unknown[] }>();
    const getProgramAccounts = vi.fn().mockReturnValue({ send: () => pendingRequest.promise });
    const context = createProgramAccountsContext(getProgramAccounts);
    const { result, wrapper } = mountProgramAccounts(context, PROGRAM_ID);

    await flushPromises();
    expect(result.loading.value).toBe(true);

    wrapper.unmount();

    pendingRequest.resolve({ value: ACCOUNTS });
    await flushPromises();

    expect(result.accounts.value).toEqual([]);
    expect(result.loading.value).toBe(true);
    expect(result.error.value).toBeNull();
  });
});
