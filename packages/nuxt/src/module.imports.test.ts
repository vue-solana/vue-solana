import { beforeEach, describe, expect, it, vi } from "vitest";
import { solanaAutoImports, solanaSetupAutoImports } from "./imports";
import { kit, setupModule, type ModuleUnderTest } from "./module.test-utils";

describe("Nuxt module auto-import mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("points every auto-import source at the module's own vue copy", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;

    setupModule(module);

    const [imports] = kit.addImports.mock.calls[0] ?? [[]];

    // A bare `@vue-solana/vue/swr` makes the app resolve `<package root>/swr`,
    // which is not a file; the miss lands in a `.d.ts` and every composable
    // degrades to `any` instead of erroring. Nuxt inlines whatever we register,
    // so the registered source must be the path to the file, not its name.
    for (const { from } of imports) {
      expect(from.startsWith("/")).toBe(true);
      expect(from.endsWith(".mjs")).toBe(true);
    }
  });

  it("maps every auto-import to its own file, or the swr entry", () => {
    const dist = "/pkg/vue/dist";

    for (const { name, from } of solanaAutoImports(dist)) {
      const isSwr = name.endsWith("Swr") || name === "clearSwrCache" || name === "deleteSwrKey";
      const file = name === "tryUseSolana" ? "useSolana" : isSwr ? "swr" : name;
      expect(from).toBe(`${dist}/${file}.mjs`);
    }

    // Falls back to the bare subpaths when the module cannot resolve its own
    // dependency, rather than writing a path that points nowhere.
    expect(solanaAutoImports(undefined).find(({ name }) => name === "useRequestSwr")?.from).toBe(
      "@vue-solana/vue/swr",
    );

    // The setup values all live in the package root, not a subpath of their own.
    for (const { from } of solanaSetupAutoImports(dist)) {
      expect(from).toBe(`${dist}/index.mjs`);
    }
  });

  it("registers the transaction-simulation alias with its own Vue subpath", () => {
    const dist = "/pkg/vue/dist";

    expect(solanaAutoImports(dist)).toContainEqual({
      name: "useSimulateTransaction",
      as: "useSolanaSimulateTransaction",
      from: `${dist}/useSimulateTransaction.mjs`,
    });
  });

  it("registers the transaction-history alias with its own Vue subpath", () => {
    const dist = "/pkg/vue/dist";

    expect(solanaAutoImports(dist)).toContainEqual({
      name: "useTransactionHistory",
      as: "useSolanaTransactionHistory",
      from: `${dist}/useTransactionHistory.mjs`,
    });
  });
});
