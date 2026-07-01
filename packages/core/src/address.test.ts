import { PublicKey } from "@solana/web3-compat";
import { describe, expect, it } from "vitest";
import { parsePublicKey } from "./address";
import { SolanaError } from "./errors";

describe("parsePublicKey", () => {
  it("returns null for nullish input", () => {
    expect(parsePublicKey(null)).toBeNull();
    expect(parsePublicKey(undefined)).toBeNull();
  });

  it("returns existing public keys unchanged", () => {
    const publicKey = new PublicKey("11111111111111111111111111111111");

    expect(parsePublicKey(publicKey)).toBe(publicKey);
  });

  it("parses public key strings", () => {
    expect(parsePublicKey("11111111111111111111111111111111")?.toBase58()).toBe(
      "11111111111111111111111111111111",
    );
  });

  it("parses public keys from refs", () => {
    expect(parsePublicKey({ value: "11111111111111111111111111111111" })?.toBase58()).toBe(
      "11111111111111111111111111111111",
    );
  });

  it("parses public keys from getters", () => {
    expect(parsePublicKey(() => "11111111111111111111111111111111")?.toBase58()).toBe(
      "11111111111111111111111111111111",
    );
  });

  it("throws for invalid public key strings", () => {
    expect(() => parsePublicKey("not-a-public-key")).toThrow();

    try {
      parsePublicKey("not-a-public-key");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("INVALID_ADDRESS");
      expect((error as SolanaError).cause).toBeInstanceOf(Error);
    }
  });
});
