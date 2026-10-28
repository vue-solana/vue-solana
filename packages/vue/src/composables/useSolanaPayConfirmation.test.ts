import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSolanaPayConfirmation } from "./useSolanaPayConfirmation";
import { getSolanaPayPaymentStatus } from "@vue-solana/core";

vi.mock("@vue-solana/core", async () => {
  const actual = await vi.importActual<typeof import("@vue-solana/core")>("@vue-solana/core");
  return {
    ...actual,
    getSolanaPayPaymentStatus: vi.fn(),
  };
});

describe("useSolanaPayConfirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with pending status", () => {
    const { status } = useSolanaPayConfirmation();
    expect(status.value).toBe("pending");
  });

  it("checks payment status", async () => {
    (
      getSolanaPayPaymentStatus as unknown as { mockResolvedValue: (v: string) => void }
    ).mockResolvedValue("confirmed");
    const { check, status } = useSolanaPayConfirmation();
    await check({}, "ref123");
    expect(getSolanaPayPaymentStatus).toHaveBeenCalled();
    expect(status.value).toBe("confirmed");
  });
});
