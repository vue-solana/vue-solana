import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSolanaQrCode } from "./useSolanaQrCode";
import { createQR } from "@vue-solana/core/solana-pay";

vi.mock("@vue-solana/core/solana-pay", () => ({
  createQR: vi.fn(),
}));

describe("useSolanaQrCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { svg, loading } = useSolanaQrCode();
    expect(svg.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  it("generates QR code", async () => {
    (createQR as unknown as { mockResolvedValue: (v: string) => void }).mockResolvedValue(
      "<svg>test</svg>",
    );
    const { generate, svg, url } = useSolanaQrCode();
    const result = await generate("solana:abc123");
    expect(createQR).toHaveBeenCalled();
    expect(svg.value).toBe("<svg>test</svg>");
    expect(url.value).toBe("solana:abc123");
    expect(result).toBe("<svg>test</svg>");
  });

  it("resets state", () => {
    const { reset, svg, url } = useSolanaQrCode();
    svg.value = "<svg></svg>";
    url.value = "test";
    reset();
    expect(svg.value).toBeNull();
    expect(url.value).toBeNull();
  });
});
