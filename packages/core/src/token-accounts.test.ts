import { describe, expect, it, vi } from "vitest";
import type { Address } from "./kit";
import type { SolanaClient } from "./kit";
import { SolanaError } from "./errors";
import { getTokenAccountsByOwner, getTokenAccount, getTokenBalance } from "./token-accounts";

const OWNER = "11111111111111111111111111111111" as Address;
const MINT = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9SEiFPUQpX" as Address;
const TOKEN_ACCOUNT = "BHUdKjNQLK7XxxYggCSbcrUBvc9LCBveAqDN2cM3b5b2" as Address;
const TOKEN_PROGRAM_ADDRESS = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" as Address;

function parsedTokenAccountResponse(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    pubkey: TOKEN_ACCOUNT,
    account: {
      executable: false,
      lamports: 2039280n,
      owner: TOKEN_PROGRAM_ADDRESS,
      space: 165n,
      data: {
        parsed: {
          info: {
            isNative: false,
            mint: MINT,
            owner: OWNER,
            state: "initialized",
            tokenAmount: {
              amount: "1000",
              decimals: 6,
              uiAmount: 0.001,
              uiAmountString: "0.001",
            },
          },
          type: "account",
        },
        program: "spl-token",
        space: 165n,
      },
    },
    ...overrides,
  };
}

function mockClient() {
  const getTokenAccountsByOwner = vi.fn();
  const getAccountInfo = vi.fn();

  const client = {
    rpc: {
      getTokenAccountsByOwner: vi.fn((...args: unknown[]) => ({
        send: () => getTokenAccountsByOwner(...args),
      })),
      getAccountInfo: vi.fn((...args: unknown[]) => ({
        send: () => getAccountInfo(...args),
      })),
    },
  } as unknown as SolanaClient & {
    rpc: {
      getTokenAccountsByOwner: ReturnType<typeof vi.fn>;
      getAccountInfo: ReturnType<typeof vi.fn>;
    };
  };

  return { accountInfo: getAccountInfo, client, tokenAccounts: getTokenAccountsByOwner };
}

describe("getTokenAccountsByOwner", () => {
  it("returns parsed token accounts for both token programs", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockResolvedValue({ value: [parsedTokenAccountResponse()] });

    const result = await getTokenAccountsByOwner(client, OWNER);

    expect(tokenAccounts).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      address: TOKEN_ACCOUNT,
      mint: MINT,
      owner: OWNER,
      amount: 1000n,
      decimals: 6,
      state: "initialized",
      isNative: false,
    });
  });

  it("returns empty array when no accounts found", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockResolvedValue({ value: [] });

    const result = await getTokenAccountsByOwner(client, OWNER);

    expect(result).toEqual([]);
  });

  it("filters by programId when provided", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockResolvedValue({ value: [] });

    await getTokenAccountsByOwner(client, OWNER, { programId: TOKEN_PROGRAM_ADDRESS });

    expect(tokenAccounts).toHaveBeenCalledTimes(1);
    expect(tokenAccounts).toHaveBeenCalledWith(
      OWNER,
      { programId: TOKEN_PROGRAM_ADDRESS },
      { encoding: "jsonParsed", commitment: undefined },
    );
  });

  it("wraps RPC errors", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockRejectedValue(new Error("RPC down"));

    await expect(getTokenAccountsByOwner(client, OWNER)).rejects.toThrow("RPC down");
  });

  it("throws RPC_FAILURE for malformed token amounts instead of a raw BigInt throw", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockResolvedValue({
      value: [
        parsedTokenAccountResponse({
          account: {
            ...(parsedTokenAccountResponse().account as Record<string, unknown>),
            data: {
              ...((parsedTokenAccountResponse().account as Record<string, unknown>).data as Record<
                string,
                unknown
              >),
              parsed: {
                info: {
                  isNative: false,
                  mint: MINT,
                  owner: OWNER,
                  state: "initialized",
                  tokenAmount: { amount: "not-a-number", decimals: 6 },
                },
                type: "account",
              },
            },
          },
        }),
      ],
    });

    const error = await getTokenAccountsByOwner(client, OWNER).then(
      () => {
        throw new Error("Expected malformed token data to reject.");
      },
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(SolanaError);
    expect((error as SolanaError).code).toBe("RPC_FAILURE");
    expect((error as SolanaError).message).toContain("tokenAmount.amount");
  });

  it("throws RPC_FAILURE for unknown token account states", async () => {
    const { accountInfo, client } = mockClient();
    const response = parsedTokenAccountResponse().account as Record<string, unknown>;
    const data = response.data as Record<string, unknown>;
    const parsed = data.parsed as Record<string, unknown>;
    const info = parsed.info as Record<string, unknown>;
    accountInfo.mockResolvedValue({
      value: {
        ...response,
        data: { ...data, parsed: { ...parsed, info: { ...info, state: "melted" } } },
      },
    });

    const error = await getTokenAccount(client, TOKEN_ACCOUNT).then(
      () => {
        throw new Error("Expected malformed token state to reject.");
      },
      (cause: unknown) => cause,
    );

    expect(error).toBeInstanceOf(SolanaError);
    expect((error as SolanaError).code).toBe("RPC_FAILURE");
    expect((error as SolanaError).message).toContain("state");
  });
});

describe("getTokenAccount", () => {
  it("returns null when account does not exist", async () => {
    const { accountInfo, client } = mockClient();
    accountInfo.mockResolvedValue({ value: null });

    const result = await getTokenAccount(client, TOKEN_ACCOUNT);

    expect(result).toBeNull();
  });

  it("returns a parsed token account", async () => {
    const { accountInfo, client } = mockClient();
    accountInfo.mockResolvedValue({ value: parsedTokenAccountResponse().account });

    const result = await getTokenAccount(client, TOKEN_ACCOUNT);

    expect(result).toEqual({
      address: TOKEN_ACCOUNT,
      mint: MINT,
      owner: OWNER,
      amount: 1000n,
      decimals: 6,
      state: "initialized",
      isNative: false,
    });
    expect(accountInfo).toHaveBeenCalledWith(TOKEN_ACCOUNT, {
      encoding: "jsonParsed",
      commitment: undefined,
    });
  });

  it("returns null for non-token parsed accounts", async () => {
    const { accountInfo, client } = mockClient();
    accountInfo.mockResolvedValue({
      value: {
        executable: false,
        lamports: 10n,
        owner: TOKEN_PROGRAM_ADDRESS,
        space: 1n,
        data: { parsed: { info: null, type: "mint" }, program: "spl-token", space: 1n },
      },
    });

    const result = await getTokenAccount(client, TOKEN_ACCOUNT);

    expect(result).toBeNull();
  });

  it("wraps RPC errors", async () => {
    const { accountInfo, client } = mockClient();
    accountInfo.mockRejectedValue(new Error("timeout"));

    await expect(getTokenAccount(client, TOKEN_ACCOUNT)).rejects.toThrow("timeout");
  });
});

describe("getTokenBalance", () => {
  it("returns amount and decimals from the first matching account", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockResolvedValue({ value: [parsedTokenAccountResponse()] });

    const result = await getTokenBalance(client, MINT, OWNER);

    expect(result).toEqual({ amount: 1000n, decimals: 6 });
    expect(tokenAccounts).toHaveBeenCalledWith(
      OWNER,
      { mint: MINT },
      { encoding: "jsonParsed", commitment: undefined },
    );
  });

  it("returns null when no account exists", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockResolvedValue({ value: [] });

    const result = await getTokenBalance(client, MINT, OWNER);

    expect(result).toBeNull();
  });

  it("wraps RPC errors", async () => {
    const { client, tokenAccounts } = mockClient();
    tokenAccounts.mockRejectedValue(new Error("RPC down"));

    await expect(getTokenBalance(client, MINT, OWNER)).rejects.toThrow("RPC down");
  });
});
