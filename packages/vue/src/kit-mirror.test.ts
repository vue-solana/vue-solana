import { describe, expect, expectTypeOf, it } from "vitest";
import type { TransactionStatus } from "@vue-solana/core/types";
import * as coreKit from "@vue-solana/core/kit";
import * as vue from "@vue-solana/vue";
import * as vueKit from "@vue-solana/vue/kit";

// `@solana/kit` is not resolvable from this package under pnpm's strict
// `node_modules`; `@vue-solana/core/kit` is the same object, and its own
// completeness against the real `@solana/kit` is asserted in core's
// `kit-mirror.test.ts`.
describe("@vue-solana/vue/kit", () => {
  it("re-exports every runtime value core's kit mirror exports", () => {
    expect(Object.keys(coreKit).filter((name) => !(name in vueKit))).toEqual([]);
  });
});

describe("@vue-solana/vue root", () => {
  it("re-exports every runtime value core's kit mirror exports", () => {
    expect(Object.keys(coreKit).filter((name) => !(name in vue))).toEqual([]);
  });

  // The root also carries `@vue-solana/core/types`, whose `TransactionStatus`
  // clashes with kit's. Two `export *` under one name drops it from the barrel.
  it("resolves TransactionStatus in favour of this package's own", () => {
    expectTypeOf<vue.TransactionStatus>().toEqualTypeOf<TransactionStatus>();
  });
});
