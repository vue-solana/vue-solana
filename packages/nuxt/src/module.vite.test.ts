import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  setupModule,
  type ModuleUnderTest,
  type TestViteOptions,
  type ViteExtendConfigHook,
} from "./module.test-utils";

describe("Nuxt module Vite dependency optimization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not merge Vite dependency optimization into the SSR config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const vite: TestViteOptions = {
      optimizeDeps: {
        include: ["existing-dependency", "existing-sibling"],
      },
    };

    setupModule(module, {}, { vite });

    // The eager merge was removed so the SSR Vite config is not polluted;
    // merging now happens only in the client-aware `vite:extendConfig` hook.
    expect(vite.optimizeDeps.include).toEqual(["existing-dependency", "existing-sibling"]);
    expect(vite.optimizeDeps.needsInterop).toBeUndefined();
  });

  it("forces Solana dependency optimization into the final Vite client config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const { viteExtendConfigHooks } = setupModule(module);
    const clientConfig: Parameters<ViteExtendConfigHook>[0] = {
      optimizeDeps: {
        include: ["existing-dependency"],
      },
      environments: {
        client: {
          optimizeDeps: {
            include: ["client-only-dependency"],
          },
        },
      },
    };

    for (const hook of viteExtendConfigHooks) {
      hook(clientConfig, { isClient: true, isServer: false });
    }

    expect(clientConfig.optimizeDeps?.include).toContain(
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
    );
    expect(clientConfig.optimizeDeps?.needsInterop).toEqual([
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
    ]);
    expect(clientConfig.environments?.client?.optimizeDeps?.include).toContain(
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
    );
    expect(clientConfig.environments?.client?.optimizeDeps?.needsInterop).toEqual([
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
    ]);
  });

  it("does not mutate the final Vite server config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const { viteExtendConfigHooks } = setupModule(module);
    const serverConfig: Parameters<ViteExtendConfigHook>[0] = {
      optimizeDeps: {
        include: ["existing-dependency"],
      },
    };

    for (const hook of viteExtendConfigHooks) {
      hook(serverConfig, { isClient: false, isServer: true });
    }

    expect(serverConfig.optimizeDeps?.include).toEqual(["existing-dependency"]);
    expect(serverConfig.optimizeDeps?.needsInterop).toBeUndefined();
  });
});
