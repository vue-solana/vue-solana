import { describe, expect, it } from "vitest";
import { parseAddress, type MaybeAddressInput } from "./address";
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

  it("throws INVALID_ADDRESS for numbers and objects instead of returning null", () => {
    for (const value of [123, {}, true, [ADDRESS]] as unknown[]) {
      try {
        parseAddress(value as Parameters<typeof parseAddress>[0]);
        throw new Error(`Expected parseAddress to throw for ${String(value)}.`);
      } catch (error) {
        expect(error).toBeInstanceOf(SolanaError);
        expect((error as SolanaError).code).toBe("INVALID_ADDRESS");
      }
    }
  });

  it("unwraps nested getters and refs", () => {
    expect(parseAddress(() => ({ value: ADDRESS }))).toBe(ADDRESS);
    expect(parseAddress({ value: () => ADDRESS })).toBe(ADDRESS);
  });

  it("throws INVALID_ADDRESS for cyclic getters and refs instead of overflowing the stack", () => {
    const selfGetter = (() => selfGetter) as () => MaybeAddressInput;
    const selfRef: { value: MaybeAddressInput } = { value: null };
    selfRef.value = selfRef;

    for (const value of [selfGetter, selfRef]) {
      try {
        parseAddress(value);
        throw new Error("Expected parseAddress to throw for a cyclic input.");
      } catch (error) {
        expect(error).toBeInstanceOf(SolanaError);
        expect((error as SolanaError).code).toBe("INVALID_ADDRESS");
        expect((error as SolanaError).message).toContain("possible cycle");
      }
    }
  });

  it("unwraps legitimate nesting up to the depth limit", () => {
    let nested: MaybeAddressInput = ADDRESS;

    for (let index = 0; index < 30; index += 1) {
      nested = { value: nested };
    }

    expect(parseAddress(nested)).toBe(ADDRESS);
  });

  it("accepts exactly the depth limit and rejects one level past it", () => {
    const nest = (levels: number): MaybeAddressInput => {
      let nested: MaybeAddressInput = ADDRESS;

      for (let index = 0; index < levels; index += 1) {
        nested = { value: nested };
      }

      return nested;
    };

    expect(parseAddress(nest(32))).toBe(ADDRESS);

    try {
      parseAddress(nest(33));
      throw new Error("Expected parseAddress to throw past the depth limit.");
    } catch (error) {
      expect(error).toBeInstanceOf(SolanaError);
      expect((error as SolanaError).code).toBe("INVALID_ADDRESS");
      expect((error as SolanaError).message).toContain("possible cycle");
    }
  });
});
