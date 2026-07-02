import { describe, expect, it } from "vitest";
import { createSolanaError, isSolanaError, normalizeSolanaError, SolanaError } from "./errors";

describe("SolanaError", () => {
  it("creates stable coded errors with causes and feature metadata", () => {
    const cause = new Error("wallet failed");
    const error = createSolanaError("WALLET_FEATURE_UNSUPPORTED", "Unsupported feature", {
      cause,
      feature: "signMessage",
    });

    expect(error).toBeInstanceOf(SolanaError);
    expect(error.name).toBe("SolanaError");
    expect(error.code).toBe("WALLET_FEATURE_UNSUPPORTED");
    expect(error.cause).toBe(cause);
    expect(error.feature).toBe("signMessage");
    expect(isSolanaError(error)).toBe(true);
  });

  it("preserves existing Solana errors while normalizing", () => {
    const error = createSolanaError("RPC_FAILURE", "RPC failed");

    expect(normalizeSolanaError(error, "TRANSACTION_TIMEOUT")).toBe(error);
  });

  it("maps wallet rejection codes to USER_REJECTED", () => {
    const cause = { code: 4001, message: "Rejected" };
    const error = normalizeSolanaError(cause, "RPC_FAILURE");

    expect(error.code).toBe("USER_REJECTED");
    expect(error.cause).toBe(cause);
  });

  it("maps wallet rejection messages to USER_REJECTED", () => {
    const error = normalizeSolanaError("User rejected the request", "RPC_FAILURE");

    expect(error.code).toBe("USER_REJECTED");
    expect(error.message).toBe("User rejected the request");
  });
});
