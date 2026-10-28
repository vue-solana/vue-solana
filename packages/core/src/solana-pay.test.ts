import { describe, it, expect } from "vitest";
import { encodeURL, parseURL } from "../src/solana-pay";
import { address } from "@solana/kit";

describe("solana pay", () => {
  it("encodes and parses a transfer url", () => {
    const url = encodeURL({
      recipient: address("11111111111111111111111111111111"),
      amount: 100000000n,
      label: "Test",
    });
    const parsed = parseURL(url.toString()) as { recipient: string; amount: bigint; label: string };
    expect(parsed.recipient).toBe("11111111111111111111111111111111");
    expect(parsed.amount).toBe(100000000n);
    expect(parsed.label).toBe("Test");
  });
});
