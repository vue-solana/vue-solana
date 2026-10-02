import { describe, expect, expectTypeOf, it } from "vitest";
import * as core from "@vue-solana/core";
import * as coreErrors from "@vue-solana/core/errors";
import * as coreKit from "@vue-solana/core/kit";
import * as vue from "@vue-solana/vue";
import * as vueKit from "@vue-solana/vue/kit";
import type { SolanaErrorCode } from "@vue-solana/core/errors";
import type { TransactionStatus } from "@vue-solana/core/types";

// `@solana/kit` is not resolvable from this package under pnpm's strict
// `node_modules`; `@vue-solana/core/kit` is the same object, and its own
// completeness against the real `@solana/kit` is asserted in core's
// `kit-mirror.test.ts`.
describe("@vue-solana/vue/kit", () => {
  it("re-exports every runtime value core's kit mirror exports", () => {
    expect(Object.keys(coreKit).filter((name) => !(name in vueKit))).toEqual([]);
  });

  it("keeps kit's own SolanaError reachable, distinct from core's", () => {
    expect(vueKit.SolanaError).toBe(coreKit.SolanaError);
    expect(vueKit.SolanaError).not.toBe(coreErrors.SolanaError);
  });
});

describe("@vue-solana/vue root", () => {
  it("re-exports every runtime value core's kit mirror exports", () => {
    expect(Object.keys(coreKit).filter((name) => !(name in vue))).toEqual([]);
  });

  // The root also carries `@vue-solana/core/types` and core's `errors`. Kit
  // uses four of those names, and two `export *` under one name is ambiguous —
  // the name vanishes from the barrel rather than clashing. These explicit
  // re-exports are the only thing keeping them there.
  it("resolves the names kit shares with core in favour of core's", () => {
    expect(vue.SolanaError).toBe(coreErrors.SolanaError);
    expect(vue.isSolanaError).toBe(coreErrors.isSolanaError);
    expect(vue.SolanaError).not.toBe(coreKit.SolanaError);

    for (const name of ["SolanaError", "isSolanaError"]) {
      expect(name in vue, `${name} is missing from the root barrel`).toBe(true);
    }
    expectTypeOf<vue.SolanaErrorCode>().toMatchTypeOf<SolanaErrorCode>();
  });

  // The regression this guards: every composable throws core's `SolanaError`,
  // so a root export of kit's class made `instanceof` false for all of them —
  // silently, with no crash to notice.
  it("matches instanceof against errors the composables actually throw", () => {
    const error = new coreErrors.SolanaError("RPC_FAILURE", "boom");

    expect(error instanceof vue.SolanaError).toBe(true);
    expect(error instanceof core.SolanaError).toBe(true);
    expect(vue.isSolanaError(error)).toBe(true);
  });

  it("keeps a TransactionStatus that is core's confirmation status", () => {
    expectTypeOf<vue.TransactionStatus>().toEqualTypeOf<TransactionStatus>();
  });
});
