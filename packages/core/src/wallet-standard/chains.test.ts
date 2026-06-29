import { describe, expect, it } from "vitest";
import { getSolanaChain } from "./chains";

describe("Wallet Standard chains", () => {
  it("maps Solana clusters to Wallet Standard chains", () => {
    expect(getSolanaChain("mainnet-beta")).toBe("solana:mainnet");
    expect(getSolanaChain("testnet")).toBe("solana:testnet");
    expect(getSolanaChain("devnet")).toBe("solana:devnet");
    expect(getSolanaChain("localnet")).toBe("solana:localnet");
  });
});
