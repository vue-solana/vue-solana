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

  it("recognizes structurally identical errors from duplicate package copies", () => {
    // Two copies of `@vue-solana/core` ship two `SolanaError` classes, so
    // `instanceof` fails across the copy boundary. A plain object with the
    // same `name`/`code` shape must still answer `true`.
    const crossCopyError = {
      name: "SolanaError",
      code: "RPC_FAILURE",
      message: "RPC failed",
    };

    expect(isSolanaError(crossCopyError)).toBe(true);
    expect(normalizeSolanaError(crossCopyError, "TRANSACTION_TIMEOUT")).toEqual(crossCopyError);
  });

  it("recognizes cross-copy wallet errors", () => {
    expect(isSolanaError({ name: "SolanaWalletError", code: "WALLET_NOT_CONNECTED" })).toBe(true);
  });

  it("does not misclassify Kit errors, which share the name but use numeric codes", () => {
    expect(isSolanaError({ name: "SolanaError", code: 123456789 })).toBe(false);
    expect(isSolanaError({ name: "SolanaError" })).toBe(false);
    expect(isSolanaError(null)).toBe(false);
  });
});
