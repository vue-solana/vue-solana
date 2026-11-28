import { address, getAddressDecoder, type Address } from "@solana/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTokenPortfolio } from "./token-portfolio";
import { getTokenAccountsByOwner, TOKEN_PROGRAM_ADDRESS } from "./token-accounts";
import { SolanaError } from "./errors";
import type { TokenAccountInfo } from "./token-accounts";
import type { SolanaClient } from "./kit";

vi.mock("./token-accounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./token-accounts")>();
  return { ...actual, getTokenAccountsByOwner: vi.fn() };
});

const OWNER = address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
const MINT_A = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MINT_B = address("So11111111111111111111111111111111111111112");
const ACCOUNT_1 = address("11111111111111111111111111111111");
const ACCOUNT_2 = address("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ACCOUNT_3 = address("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

function syntheticAddress(seed: number): Address {
  const bytes = new Uint8Array(32);

  bytes[31] = seed;

  return getAddressDecoder().decode(bytes);
}

function tokenAccount(
  accountAddress: Address,
  mint: Address,
  amount: bigint,
  decimals: number,
): TokenAccountInfo {
  return {
    address: accountAddress,
    mint,
    owner: OWNER,
    amount,
    decimals,
    state: "initialized",
    isNative: false,
  };
}

function mintAccount(
  decimals: number | null,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> | null {
  if (decimals === null) {
    return null;
  }

  return {
    owner: TOKEN_PROGRAM_ADDRESS,
    data: {
      parsed: { type: "mint", info: { decimals } },
      program: "spl-token",
      space: 82n,
    },
    ...overrides,
  };
}

function createClient(mintAccounts: readonly unknown[] = []) {
  const getMultipleAccounts = vi.fn(() => ({
    send: vi.fn().mockResolvedValue({ context: { slot: 1n }, value: [...mintAccounts] }),
  }));
  const client = {
    rpc: { getMultipleAccounts },
  } as unknown as SolanaClient;
  return { client, getMultipleAccounts };
}

const mockedGetTokenAccountsByOwner = vi.mocked(getTokenAccountsByOwner);

describe("getTokenPortfolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTokenAccountsByOwner.mockResolvedValue([]);
  });

  it("aggregates accounts by mint and normalizes decimals and UI amounts", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([
      tokenAccount(ACCOUNT_1, MINT_A, 1_500_000n, 9),
      tokenAccount(ACCOUNT_2, MINT_A, 250_000n, 9),
      tokenAccount(ACCOUNT_3, MINT_B, 3_000_000_000n, 9),
    ]);
    const { client } = createClient([mintAccount(6), mintAccount(9)]);

    const result = await getTokenPortfolio(client, OWNER);

    expect(result.owner).toBe(OWNER);
    expect(result.programId).toBe(TOKEN_PROGRAM_ADDRESS);
    expect(result.accounts).toHaveLength(3);
    expect(result.accounts[0]?.decimals).toBe(6);
    expect(result.accounts[0]?.decimalsSource).toBe("mint");
    expect(result.accounts[0]?.uiAmount).toBe(1.5);
    expect(result.accounts[2]?.uiAmount).toBe(3);
    expect(result.totals).toEqual({ accounts: 3, mints: 2 });
    expect(result.byMint[MINT_A]).toMatchObject({
      decimals: 6,
      amount: 1_750_000n,
      uiAmount: 1.75,
    });
    expect(result.byMint[MINT_A]?.accounts).toHaveLength(2);
    expect(result.unresolvedMints).toEqual([]);
  });

  it("reads classic accounts only and forwards commitment and abort signal", async () => {
    const { client } = createClient();
    const abortSignal = new AbortController().signal;

    await getTokenPortfolio(client, OWNER, { commitment: "confirmed", abortSignal });

    expect(mockedGetTokenAccountsByOwner).toHaveBeenCalledWith(client, OWNER, {
      commitment: "confirmed",
      programId: TOKEN_PROGRAM_ADDRESS,
      abortSignal,
    });
  });

  it("keeps zero balances visible", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([tokenAccount(ACCOUNT_1, MINT_A, 0n, 6)]);
    const { client } = createClient([mintAccount(6)]);

    const result = await getTokenPortfolio(client, OWNER);

    expect(result.accounts[0]?.uiAmount).toBe(0);
    expect(result.byMint[MINT_A]?.uiAmount).toBe(0);
  });

  it("falls back to token-account decimals when mint metadata is missing", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([
      tokenAccount(ACCOUNT_1, MINT_A, 2_000_000n, 6),
      tokenAccount(ACCOUNT_2, MINT_B, 1_000_000_000n, 9),
    ]);
    const { client, getMultipleAccounts } = createClient([null, mintAccount(9)]);

    const result = await getTokenPortfolio(client, OWNER);

    expect(result.accounts[0]?.decimals).toBe(6);
    expect(result.accounts[0]?.decimalsSource).toBe("account");
    expect(result.accounts[0]?.uiAmount).toBe(2);
    expect(result.unresolvedMints).toEqual([MINT_A]);
    expect(getMultipleAccounts).toHaveBeenCalledWith([MINT_A, MINT_B], {
      encoding: "jsonParsed",
      commitment: undefined,
    });
  });

  it("rejects malformed options and missing owners before reading the RPC", async () => {
    const { client } = createClient();

    await expect(getTokenPortfolio(client, OWNER, null as never)).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
    await expect(getTokenPortfolio(client, null)).rejects.toMatchObject({
      code: "INVALID_ADDRESS",
    });
    expect(mockedGetTokenAccountsByOwner).not.toHaveBeenCalled();
  });

  it("throws a pre-aborted signal's reason before reading", async () => {
    const { client } = createClient();
    const reason = new Error("cancelled");

    await expect(
      getTokenPortfolio(client, OWNER, { abortSignal: AbortSignal.abort(reason) }),
    ).rejects.toBe(reason);
    expect(mockedGetTokenAccountsByOwner).not.toHaveBeenCalled();
  });

  it("fails fast when mint metadata needs a missing RPC capability", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([tokenAccount(ACCOUNT_1, MINT_A, 1n, 6)]);
    const client = { rpc: {} } as unknown as SolanaClient;

    await expect(getTokenPortfolio(client, OWNER)).rejects.toMatchObject({
      code: "MISSING_CLIENT_CAPABILITY",
      feature: "rpc.getMultipleAccounts",
    });
  });

  it("normalizes RPC failures without swallowing an existing SolanaError", async () => {
    const failure = new Error("RPC down");
    mockedGetTokenAccountsByOwner.mockRejectedValueOnce(failure);
    const { client } = createClient();

    await expect(getTokenPortfolio(client, OWNER)).rejects.toMatchObject({
      code: "RPC_FAILURE",
      cause: failure,
    });
  });

  it("batches mint metadata reads in groups of 100", async () => {
    const mints = Array.from({ length: 101 }, (_, index) => syntheticAddress(index + 1));
    mockedGetTokenAccountsByOwner.mockResolvedValue(
      mints.map((mint, index) =>
        tokenAccount(syntheticAddress(index + 200), mint, BigInt(index + 1), 9),
      ),
    );
    const getMultipleAccounts = vi.fn((addresses: readonly Address[]) => ({
      send: vi.fn().mockResolvedValue({
        context: { slot: 1n },
        value: addresses.map(() => mintAccount(6)),
      }),
    }));
    const client = { rpc: { getMultipleAccounts } } as unknown as SolanaClient;

    const result = await getTokenPortfolio(client, OWNER);

    expect(getMultipleAccounts).toHaveBeenCalledTimes(2);
    expect(getMultipleAccounts.mock.calls[0]?.[0]).toHaveLength(100);
    expect(getMultipleAccounts.mock.calls[1]?.[0]).toEqual([mints[100]]);
    expect(result.totals).toEqual({ accounts: 101, mints: 101 });
    expect(result.unresolvedMints).toEqual([]);
  });

  it("treats malformed or unowned mint payloads as unresolved", async () => {
    const mints = Array.from({ length: 7 }, (_, index) => syntheticAddress(index + 300));
    mockedGetTokenAccountsByOwner.mockResolvedValue(
      mints.map((mint, index) => tokenAccount(syntheticAddress(index + 400), mint, 1_000_000n, 6)),
    );
    const validMint = mintAccount(6)!;
    const validData = validMint.data as Record<string, unknown>;
    const responses = [
      mintAccount(6, { owner: OWNER }),
      mintAccount(6, {
        data: { ...validData, parsed: { type: "account", info: { decimals: 6 } } },
      }),
      mintAccount(6, {
        data: {
          ...validData,
          parsed: { type: "mint", info: { decimals: "6" } },
        },
      }),
      mintAccount(6, {
        data: {
          ...validData,
          parsed: { type: "mint", info: { decimals: -1 } },
        },
      }),
      mintAccount(6, {
        data: {
          ...validData,
          parsed: { type: "mint", info: { decimals: Number.NaN } },
        },
      }),
      mintAccount(6, {
        data: {
          ...validData,
          parsed: { type: "mint", info: { decimals: 256 } },
        },
      }),
    ];
    const { client } = createClient(responses);

    const result = await getTokenPortfolio(client, OWNER);

    expect(result.unresolvedMints).toEqual(mints);
    expect(result.accounts.every((account) => account.decimalsSource === "account")).toBe(true);
    expect(result.accounts[0]?.decimals).toBe(6);
    expect(result.accounts[0]?.uiAmount).toBe(1);
  });

  it("preserves UI precision for balances above Number.MAX_SAFE_INTEGER", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([
      tokenAccount(ACCOUNT_1, MINT_A, 9_007_199_254_740_993n, 6),
    ]);
    const { client } = createClient([mintAccount(6)]);

    const result = await getTokenPortfolio(client, OWNER);

    expect(result.accounts[0]?.uiAmount).toBe(9_007_199_254.740993);
  });

  it("rethrows the caller's abort reason when mint resolution is cancelled", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([tokenAccount(ACCOUNT_1, MINT_A, 1n, 6)]);
    const controller = new AbortController();
    const reason = new Error("cancel mint read");
    const getMultipleAccounts = vi.fn(() => ({
      send: vi.fn().mockImplementation(async () => {
        controller.abort(reason);
        throw new Error("aborted");
      }),
    }));
    const client = { rpc: { getMultipleAccounts } } as unknown as SolanaClient;

    await expect(getTokenPortfolio(client, OWNER, { abortSignal: controller.signal })).rejects.toBe(
      reason,
    );
  });

  it("normalizes a stray AbortError during mint reads when no signal was supplied", async () => {
    mockedGetTokenAccountsByOwner.mockResolvedValue([tokenAccount(ACCOUNT_1, MINT_A, 1n, 6)]);
    const failure = Object.assign(new Error("aborted"), { name: "AbortError" });
    const getMultipleAccounts = vi.fn(() => ({
      send: vi.fn().mockRejectedValue(failure),
    }));
    const client = { rpc: { getMultipleAccounts } } as unknown as SolanaClient;

    const error = await getTokenPortfolio(client, OWNER).then(
      () => {
        throw new Error("Expected AbortError to be normalized.");
      },
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(SolanaError);
    expect((error as SolanaError).code).toBe("RPC_FAILURE");
    expect((error as SolanaError).cause).toBe(failure);
  });
});
