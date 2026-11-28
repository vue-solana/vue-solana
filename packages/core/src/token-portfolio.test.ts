import { address, type Address } from "@solana/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTokenPortfolio } from "./token-portfolio";
import { getTokenAccountsByOwner, TOKEN_PROGRAM_ADDRESS } from "./token-accounts";
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

function mintAccount(decimals: number | null): unknown {
  if (decimals === null) {
    return null;
  }

  return {
    data: {
      parsed: { type: "mint", info: { decimals } },
      program: "spl-token",
      space: 82n,
    },
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
});
