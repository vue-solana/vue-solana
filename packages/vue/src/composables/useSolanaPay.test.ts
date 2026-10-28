import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSolanaPay } from "./useSolanaPay";
import { useSolanaClient } from "./useSolanaClient";

vi.mock("./useSolanaClient", () => ({
  useSolanaClient: vi.fn(),
}));

vi.mock("@vue-solana/core/solana-pay-confirmation", () => ({
  createSolanaPayReference: vi.fn().mockResolvedValue("ref123"),
  verifySolanaPayPayment: vi.fn(),
}));

vi.mock("@vue-solana/core/solana-pay", () => ({
  encodeURL: vi.fn((input: Record<string, unknown>) => ({
    toString: () => {
      const safe = { ...input };
      try {
        return (
          "solana:" + JSON.stringify(safe, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
        );
      } catch {
        return "solana:" + JSON.stringify({ recipient: String(safe.recipient) });
      }
    },
  })),
  parseURL: vi.fn((s: string) => JSON.parse(s.replace("solana:", ""))),
}));

vi.mock("@vue-solana/core", async () => {
  const actual = await vi.importActual<typeof import("@vue-solana/core")>("@vue-solana/core");
  return {
    ...actual,
    getSolanaPayPaymentStatus: vi.fn(),
  };
});

describe("useSolanaPay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSolanaClient as unknown as { mockReturnValue: (v: unknown) => void }).mockReturnValue({
      client: { rpc: {} },
    });
  });

  it("initializes with default state", () => {
    const { status, loading, requestUrl } = useSolanaPay();
    expect(status.value).toBe("idle");
    expect(loading.value).toBe(false);
    expect(requestUrl.value).toBeNull();
  });

  it("creates a transfer request", async () => {
    const { createSolanaPayReference } = await import("@vue-solana/core/solana-pay-confirmation");
    const { createTransferRequest, requestUrl, reference, status } = useSolanaPay();
    const result = await createTransferRequest({ recipient: "addr", amount: 100 });
    expect(createSolanaPayReference).toHaveBeenCalled();
    expect(String(reference.value)).toBe("ref123");
    expect(String(requestUrl.value)).toContain("ref123");
    expect(status.value).toBe("pending");
    expect(typeof result).toBe("string");
  });

  it("resets state", () => {
    const { reset, status, requestUrl } = useSolanaPay();
    requestUrl.value = "test";
    status.value = "pending";
    reset();
    expect(status.value).toBe("idle");
    expect(requestUrl.value).toBeNull();
  });

  it("parses a request", () => {
    const { parseRequest, parsedRequest } = useSolanaPay();
    const parsed = parseRequest('solana:{"recipient":"addr"}');
    expect(parsed.recipient).toBe("addr");
    expect(parsedRequest.value).toEqual(parsed);
  });
});
