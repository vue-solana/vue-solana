import { describe, expect, it, vi } from "vitest";
import { useTransaction } from "./useTransaction";

describe("useTransaction", () => {
  it("tracks successful transaction execution", async () => {
    const handler = vi.fn().mockResolvedValue("signature");
    const transaction = useTransaction(handler);

    await expect(transaction.execute("arg")).resolves.toBe("signature");

    expect(handler).toHaveBeenCalledWith("arg");
    expect(transaction.signature.value).toBe("signature");
    expect(transaction.loading.value).toBe(false);
    expect(transaction.error.value).toBeNull();
  });

  it("tracks failed transaction execution", async () => {
    const failure = new Error("failed");
    const transaction = useTransaction(vi.fn().mockRejectedValue(failure));

    await expect(transaction.execute()).rejects.toThrow("failed");

    expect(transaction.signature.value).toBeNull();
    expect(transaction.loading.value).toBe(false);
    expect(transaction.error.value).toBe(failure);
  });
});
