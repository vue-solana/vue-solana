import { beforeEach, describe, expect, it, vi } from "vitest";
import { solanaAutoImports, solanaSetupAutoImports } from "./imports";
import { kit, setupModule, type ModuleUnderTest } from "./module.test-utils";

describe("Nuxt module plugin and import registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers the runtime plugin and composable imports", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {
      solana: {
        commitment: "processed",
      },
    };

    setupModule(
      module,
      { cluster: "testnet", endpoint: "https://rpc.example.com" },
      { publicConfig },
    );

    expect(publicConfig.solana).toEqual({
      commitment: "processed",
      cluster: "testnet",
      endpoint: "https://rpc.example.com",
      autoConnect: false,
    });
    expect(kit.createResolver).toHaveBeenCalledWith(expect.stringContaining("module.ts"));
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: "resolved:./runtime/plugin",
      mode: "client",
      order: -10,
    });
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: "resolved:./runtime/server-plugin",
      mode: "server",
    });
    const [imports] = kit.addImports.mock.calls[0] ?? [[]];
    const asNames = imports.map((entry: { as: string }) => entry.as);
    // Every source must name a real file, or the app resolves the bare
    // package subpath relative to itself and misses.
    expect(imports.every((entry: { from: string }) => entry.from.endsWith(".mjs"))).toBe(true);
    // `createSolanaPlugin` accepts `payerSecretKey`, so it stays out of global
    // scope for apps that did not opt out of the runtime plugin.
    expect(asNames).toEqual(
      expect.arrayContaining(solanaAutoImports(undefined).map((entry) => entry.as)),
    );
    expect(asNames).not.toEqual(
      expect.arrayContaining(solanaSetupAutoImports(undefined).map((entry) => entry.as)),
    );
  });

  it("skips the runtime plugin but keeps composable imports when clientPlugin is false", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {};

    setupModule(module, { cluster: "devnet", clientPlugin: false }, { publicConfig });

    // Only the client plugin is skipped; the server context is still needed.
    expect(kit.addPlugin).toHaveBeenCalledOnce();
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: "resolved:./runtime/server-plugin",
      mode: "server",
    });
    const [imports] = kit.addImports.mock.calls[0] ?? [[]];
    const names = imports.map((entry: { as: string }) => entry.as);
    expect(names).toEqual(
      expect.arrayContaining([
        ...solanaAutoImports(undefined).map((entry) => entry.as),
        ...solanaSetupAutoImports(undefined).map((entry) => entry.as),
      ]),
    );
    // `clientPlugin` is build-time only and must not reach the client bundle.
    expect(publicConfig.solana).toEqual({ cluster: "devnet", autoConnect: false });
  });
});
