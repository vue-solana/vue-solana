import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSolanaQrScanner } from "./useSolanaQrScanner";

vi.mock("@vue-solana/core/solana-pay", () => ({
  parseURL: vi.fn((s: string) => {
    if (s.includes("invalid")) throw new Error("invalid");
    return { recipient: "addr" };
  }),
}));

describe("useSolanaQrScanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { scanning, result, parsed } = useSolanaQrScanner();
    expect(scanning.value).toBe(false);
    expect(result.value).toBeNull();
    expect(parsed.value).toBeNull();
  });

  it("scans from text", async () => {
    const { scanFromText, result, parsed } = useSolanaQrScanner();
    const res = await scanFromText("solana:addr");
    expect(result.value).toBe("solana:addr");
    expect(parsed.value).toEqual({ recipient: "addr" });
    expect(res).toEqual({ recipient: "addr" });
  });

  it("resets state", () => {
    const { reset, result, parsed, scanning } = useSolanaQrScanner();
    result.value = "test";
    parsed.value = {};
    scanning.value = true;
    reset();
    expect(result.value).toBeNull();
    expect(parsed.value).toBeNull();
    expect(scanning.value).toBe(false);
  });
});
