import { describe, expect, it } from "vitest";
import { parseAddress } from "./address";
import { SolanaError } from "./errors";

const ADDRESS = "11111111111111111111111111111111";

describe("parseAddress", () => {
  it("returns null for nullish input", () => {
    expect(parseAddress(null)).toBeNull();
    expect(parseAddress(undefined)).toBeNull();
  });

  it("returns existing addresses unchanged", () => {
    expect(parseAddress(ADDRESS)).toBe(ADDRESS);
  });

  it("parses address strings", () => {
    expect(parseAddress(ADDRESS)).toBe(ADDRESS);
  });

  it("parses addresses from refs", () => {
    expect(parseAddress({ value: ADDRESS })).toBe(ADDRESS);
  });

  it("parses addresses from getters", () => {
    expect(parseAddress(() => ADDRESS)).toBe(ADDRESS);
  });

  it("throws for invalid address strings", () => {
    expect(() => parseAddress("not-a-public-key")).toThrow();

    try {
      parseAddress("not-a-public-key");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("INVALID_ADDRESS");
      expect((error as SolanaError).cause).toBeInstanceOf(Error);
    }
  });
});
