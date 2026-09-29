import { beforeEach, describe, expect, it, vi } from "vitest";

import { solanaAutoImports, solanaSetupAutoImports } from "./imports";

const kit = vi.hoisted(() => ({
  addImports: vi.fn(),
  addPlugin: vi.fn(),
  createResolver: vi.fn(() => ({
    resolve: (path: string) => `resolved:${path}`,
  })),
  defineNuxtModule: vi.fn((options: unknown) => options),
}));

vi.mock("@nuxt/kit", () => kit);

interface ModuleUnderTest {
  meta: {
    name: string;
    configKey: string;
  };
  defaults: {
    cluster: string;
    autoConnect: boolean;
  };
  setup: (
    options: Record<string, unknown>,
    nuxt: {
      hook: (name: "vite:extendConfig", callback: ViteExtendConfigHook) => void;
      options: {
        runtimeConfig: {
          public: Record<string, unknown>;
        };
        vite: {
          optimizeDeps?: {
            include?: string[];
            needsInterop?: string[];
          };
        };
      };
    },
  ) => void;
}

type ViteExtendConfigHook = (
  config: {
    optimizeDeps?: {
      include?: string[];
      needsInterop?: string[];
    };
    environments?: {
      client?: {
        optimizeDeps?: {
          include?: string[];
          needsInterop?: string[];
        };
      };
    };
  },
  context: { isClient: boolean; isServer: boolean },
) => void;

type TestViteOptions = {
  optimizeDeps: {
    include?: string[];
    needsInterop?: string[];
  };
};

function setupModule(
  module: ModuleUnderTest,
  options: Record<string, unknown> = {},
  context: {
    publicConfig?: Record<string, unknown>;
    vite?: TestViteOptions | Record<string, unknown>;
  } = {},
) {
  const publicConfig = context.publicConfig ?? {};
  const vite = context.vite ?? {};
  const viteExtendConfigHooks: ViteExtendConfigHook[] = [];

  module.setup(options, {
    hook: (name, callback) => {
      if (name === "vite:extendConfig") {
        viteExtendConfigHooks.push(callback as ViteExtendConfigHook);
      }
    },
    options: {
      runtimeConfig: {
        public: publicConfig,
      },
      vite,
    },
  });

  return { publicConfig, vite, viteExtendConfigHooks };
}

describe("Nuxt module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines module metadata and defaults", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;

    expect(module.meta).toEqual({
      name: "@vue-solana/nuxt",
      configKey: "solana",
      compatibility: {
        nuxt: "^3.0.0 || ^4.0.0",
      },
    });
    expect(module.defaults).toEqual({
      cluster: "devnet",
      autoConnect: false,
    });
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
    });
    expect(kit.createResolver).toHaveBeenCalledWith(expect.stringContaining("module.ts"));
    expect(kit.addPlugin).toHaveBeenCalledWith({
      src: "resolved:./runtime/plugin",
      mode: "client",
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

    expect(kit.addPlugin).not.toHaveBeenCalled();
    const [imports] = kit.addImports.mock.calls[0] ?? [[]];
    const names = imports.map((entry: { as: string }) => entry.as);
    expect(names).toEqual(
      expect.arrayContaining([
        ...solanaAutoImports(undefined).map((entry) => entry.as),
        ...solanaSetupAutoImports(undefined).map((entry) => entry.as),
      ]),
    );
    // `clientPlugin` is build-time only and must not reach the client bundle.
    expect(publicConfig.solana).toEqual({ cluster: "devnet" });
  });

  it("adds Vite dependency optimization for mobile wallet dev interop", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const vite: TestViteOptions = {
      optimizeDeps: {
        include: ["existing-dependency", "qrcode"],
      },
    };

    setupModule(module, {}, { vite });

    expect(vite.optimizeDeps.include).toEqual([
      "existing-dependency",
      "qrcode",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > @solana-mobile/wallet-standard-mobile",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > buffer/",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > bs58",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
    ]);
    expect(vite.optimizeDeps.needsInterop).toEqual([
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
    ]);
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
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
    ]);
    expect(clientConfig.environments?.client?.optimizeDeps?.include).toContain(
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
    );
    expect(clientConfig.environments?.client?.optimizeDeps?.needsInterop).toEqual([
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl",
      "@vue-solana/nuxt > @vue-solana/vue > @vue-solana/core > tweetnacl/nacl-fast.js",
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

  it("omits non-serializable wallet adapters from public runtime config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const wallet = { connect: vi.fn() };
    const publicConfig: Record<string, unknown> = {};

    setupModule(module, { cluster: "devnet", wallet }, { publicConfig });

    expect(publicConfig.solana).toEqual({
      cluster: "devnet",
    });
  });

  it("omits client signer options from public runtime config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {};

    setupModule(
      module,
      { cluster: "devnet", payer: { address: "signer" }, payerSecretKey: "secret" },
      { publicConfig },
    );

    expect(publicConfig.solana).toEqual({ cluster: "devnet" });
  });

  it("omits client signer options a user wrote into runtimeConfig.public.solana", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {
      // Nuxt resolves a hand-written `runtimeConfig` before module setup, so it
      // reaches the same merge as the module options and must be sanitized too.
      solana: {
        cluster: "devnet",
        payerSecretKey: "secret",
        wallet: { connect: vi.fn() },
      },
    };

    setupModule(module, { cluster: "devnet" }, { publicConfig });

    expect(publicConfig.solana).toEqual({ cluster: "devnet" });
  });

  it("serializes reconnect and native wallet options into public runtime config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {};

    setupModule(
      module,
      {
        autoConnect: true,
        mobileWallet: {
          appIdentity: {
            name: "Vue Solana",
            uri: "https://example.com",
          },
        },
        iosWallet: {
          redirectUrl: "https://example.com/wallet-callback",
        },
      },
      { publicConfig },
    );

    expect(publicConfig.solana).toEqual({
      autoConnect: true,
      mobileWallet: {
        appIdentity: {
          name: "Vue Solana",
          uri: "https://example.com",
        },
      },
      iosWallet: {
        redirectUrl: "https://example.com/wallet-callback",
      },
    });
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
      const isSwr = name.endsWith("Swr");
      expect(from).toBe(`${dist}/${isSwr ? "swr" : name}.mjs`);
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
});
