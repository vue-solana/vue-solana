import { describe, expect, expectTypeOf, it } from "vitest";
import * as kit from "@solana/kit";
import * as core from "@vue-solana/core";
import * as coreKit from "@vue-solana/core/kit";
import { SolanaError } from "./errors";
import type { TransactionStatus } from "./types";

describe("@vue-solana/core/kit", () => {
  // The whole point of the module: an app installs one package and reaches
  // every Kit symbol. A curated list failed exactly here — a consumer needing
  // one unlisted symbol had to add `@solana/kit` to its own `package.json`,
  // which pnpm's strict `node_modules` does not resolve for a transitive dep.
  it("re-exports every runtime value @solana/kit exports", () => {
    expect(Object.keys(kit).filter((name) => !(name in coreKit))).toEqual([]);
  });

  it("re-exports type-only names too", () => {
    expectTypeOf<coreKit.TransactionMessage>().toMatchTypeOf<kit.TransactionMessage>();
    expectTypeOf<coreKit.Commitment>().toMatchTypeOf<kit.Commitment>();
  });

  it("keeps kit's own SolanaError reachable, distinct from this package's", () => {
    expect(coreKit.SolanaError).toBe(kit.SolanaError);
    expect(coreKit.SolanaError).not.toBe(SolanaError);
  });
});

describe("@vue-solana/core root", () => {
  it("re-exports every runtime value @solana/kit exports", () => {
    expect(Object.keys(kit).filter((name) => !(name in core))).toEqual([]);
  });

  // The root also carries this package's own `errors` and `types` barrels. Kit
  // uses four of their names, and two `export *` providing the same name is
  // ambiguous — the name would vanish from the barrel rather than clash. These
  // explicit re-exports are the only thing keeping them there.
  it("resolves the names kit shares with this package in favour of our own", () => {
    expect(core.SolanaError).toBe(SolanaError);
    expect(core.isSolanaError(new SolanaError("RPC_FAILURE", "boom"))).toBe(true);
    expect(core.SolanaError).not.toBe(kit.SolanaError);

    for (const name of ["SolanaError", "isSolanaError"]) {
      expect(name in core, `${name} is missing from the root barrel`).toBe(true);
    }
    expectTypeOf<core.SolanaErrorCode>().toMatchTypeOf<SolanaError["code"]>();
  });

  it("keeps a TransactionStatus that is this package's confirmation status", () => {
    expectTypeOf<core.TransactionStatus>().toEqualTypeOf<TransactionStatus>();
  });
});
