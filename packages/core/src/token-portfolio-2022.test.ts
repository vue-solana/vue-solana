import { address } from "@solana/kit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTokenPortfolio2022, TOKEN_2022_PROGRAM_ADDRESS } from "./token-portfolio-2022";
import { getTokenAccountsByOwner, TOKEN_PROGRAM_ADDRESS } from "./token-accounts";
import type { SolanaClient } from "./kit";

vi.mock("./token-accounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./token-accounts")>();
  return { ...actual, getTokenAccountsByOwner: vi.fn() };
});

const OWNER = address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
const MINT = address("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const ACCOUNT = address("11111111111111111111111111111111");

const mockedGetTokenAccountsByOwner = vi.mocked(getTokenAccountsByOwner);

describe("getTokenPortfolio2022", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetTokenAccountsByOwner.mockResolvedValue([]);
  });

  it("reads only Token-2022 accounts by default", async () => {
    const getMultipleAccounts = vi.fn(() => ({
      send: vi.fn().mockResolvedValue({ context: { slot: 1n }, value: [] }),
    }));
    const client = { rpc: { getMultipleAccounts } } as unknown as SolanaClient;

    mockedGetTokenAccountsByOwner.mockResolvedValue([
      {
        address: ACCOUNT,
        mint: MINT,
        owner: OWNER,
        amount: 42n,
        decimals: 2,
        state: "initialized",
        isNative: false,
      },
    ]);

    const result = await getTokenPortfolio2022(client, OWNER, { commitment: "processed" });

    expect(result.programId).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    expect(result.programId).not.toBe(TOKEN_PROGRAM_ADDRESS);
    expect(result.accounts).toHaveLength(1);
    expect(result.totals).toEqual({ accounts: 1, mints: 1 });
    expect(mockedGetTokenAccountsByOwner).toHaveBeenCalledWith(client, OWNER, {
      commitment: "processed",
      programId: TOKEN_2022_PROGRAM_ADDRESS,
      abortSignal: undefined,
    });
  });
});
