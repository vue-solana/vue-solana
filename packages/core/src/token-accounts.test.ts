import type { Connection, PublicKey } from "@vue-solana/core/web3";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@solana/spl-token", () => ({
  TOKEN_PROGRAM_ID: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  TOKEN_2022_PROGRAM_ID: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  getAssociatedTokenAddressSync: vi.fn().mockReturnValue("mock-ata-pubkey"),
  unpackAccount: vi.fn().mockImplementation(() => ({
    mint: "mock-mint",
    owner: "mock-owner",
    amount: 1000n,
    delegate: null,
    state: 0,
    isNative: null,
    delegatedAmount: 0n,
    closeAuthority: null,
  })),
  unpackMint: vi.fn().mockReturnValue({
    mintAuthority: null,
    supply: 1000000n,
    decimals: 6,
    isInitialized: true,
    freezeAuthority: null,
  }),
}));

import { getTokenAccountsByOwner, getTokenAccount, getTokenBalance } from "./token-accounts";
import { getAssociatedTokenAddressSync, unpackAccount } from "@solana/spl-token";

function mockConnection(overrides: Record<string, unknown> = {}) {
  return {
    getTokenAccountsByOwner: vi.fn(),
    getAccountInfo: vi.fn(),
    ...overrides,
  } as unknown as Connection & {
    getTokenAccountsByOwner: ReturnType<typeof vi.fn>;
  };
}

function mockOwner() {
  return { toString: () => "owner-pubkey" } as unknown as PublicKey;
}

function mockMint() {
  return { toString: () => "mint-pubkey" } as unknown as PublicKey;
}

describe("getTokenAccountsByOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns token accounts for both token programs", async () => {
    const mockAccount = { pubkey: "addr1", account: { data: Buffer.alloc(165) } };
    const connection = mockConnection({
      getTokenAccountsByOwner: vi.fn().mockResolvedValue({ value: [mockAccount] }),
    });

    const result = await getTokenAccountsByOwner(connection, mockOwner());

    expect(connection.getTokenAccountsByOwner).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it("returns empty array when no accounts found", async () => {
    const connection = mockConnection({
      getTokenAccountsByOwner: vi.fn().mockResolvedValue({ value: [] }),
    });

    const result = await getTokenAccountsByOwner(connection, mockOwner());

    expect(result).toEqual([]);
  });

  it("filters by programId when provided", async () => {
    const programId = { toString: () => "custom-program" } as unknown as PublicKey;
    const connection = mockConnection({
      getTokenAccountsByOwner: vi.fn().mockResolvedValue({ value: [] }),
    });

    await getTokenAccountsByOwner(connection, mockOwner(), { programId });

    expect(connection.getTokenAccountsByOwner).toHaveBeenCalledTimes(1);
    expect(connection.getTokenAccountsByOwner).toHaveBeenCalledWith(
      expect.anything(),
      { programId },
      "confirmed",
    );
  });

  it("wraps RPC errors", async () => {
    const connection = mockConnection({
      getTokenAccountsByOwner: vi.fn().mockRejectedValue(new Error("RPC down")),
    });

    await expect(getTokenAccountsByOwner(connection, mockOwner())).rejects.toThrow("RPC down");
  });
});

describe("getTokenAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when account does not exist", async () => {
    const connection = mockConnection({
      getAccountInfo: vi.fn().mockResolvedValue(null),
    });

    const result = await getTokenAccount(connection, mockMint());

    expect(result).toBeNull();
  });

  it("unpacks and returns a token account", async () => {
    const accountInfo = { data: Buffer.alloc(165) };
    const connection = mockConnection({
      getAccountInfo: vi.fn().mockResolvedValue(accountInfo),
    });

    const result = await getTokenAccount(connection, mockMint());

    expect(result).toMatchObject({ amount: 1000n });
    expect(unpackAccount).toHaveBeenCalledWith(expect.anything(), accountInfo);
  });

  it("wraps RPC errors", async () => {
    const connection = mockConnection({
      getAccountInfo: vi.fn().mockRejectedValue(new Error("timeout")),
    });

    await expect(getTokenAccount(connection, mockMint())).rejects.toThrow("timeout");
  });
});

describe("getTokenBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns amount and decimals for existing ATA", async () => {
    const connection = mockConnection({
      getAccountInfo: vi.fn().mockResolvedValue({ data: Buffer.alloc(165) }),
    });

    const result = await getTokenBalance(connection, mockMint(), mockOwner());

    expect(result).toEqual({ amount: 1000n, decimals: 6 });
    expect(getAssociatedTokenAddressSync).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      true,
    );
  });

  it("returns null when ATA does not exist", async () => {
    const connection = mockConnection({
      getAccountInfo: vi.fn().mockResolvedValue(null),
    });

    const result = await getTokenBalance(connection, mockMint(), mockOwner());

    expect(result).toBeNull();
  });

  it("wraps RPC errors", async () => {
    const connection = mockConnection({
      getAccountInfo: vi.fn().mockRejectedValue(new Error("RPC down")),
    });

    await expect(getTokenBalance(connection, mockMint(), mockOwner())).rejects.toThrow("RPC down");
  });
});
