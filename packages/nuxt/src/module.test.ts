import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOLANA_IMPORTS, SOLANA_SETUP_AUTO_IMPORTS } from "./imports";

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
      hook: (
        name: "vite:extendConfig" | "prepare:types",
        callback: ViteExtendConfigHook | PrepareTypesHook,
      ) => void;
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

type PrepareTypesHook = (context: {
  tsConfig: { compilerOptions?: { paths?: Record<string, string[]> } };
}) => void;

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
  const prepareTypesHooks: PrepareTypesHook[] = [];

  module.setup(options, {
    hook: (name, callback) => {
      if (name === "vite:extendConfig") {
        viteExtendConfigHooks.push(callback as ViteExtendConfigHook);
      }

      if (name === "prepare:types") {
        prepareTypesHooks.push(callback as PrepareTypesHook);
      }
    },
    options: {
      runtimeConfig: {
        public: publicConfig,
      },
      vite,
    },
  });

  return { prepareTypesHooks, publicConfig, vite, viteExtendConfigHooks };
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
    expect(kit.addImports).toHaveBeenCalledWith(expect.arrayContaining(SOLANA_IMPORTS));
    // `createSolanaPlugin` accepts `payerSecretKey`, so it stays out of global
    // scope for apps that did not opt out of the runtime plugin.
    expect(kit.addImports).not.toHaveBeenCalledWith(
      expect.arrayContaining(SOLANA_SETUP_AUTO_IMPORTS),
    );
  });

  it("skips the runtime plugin but keeps composable imports when clientPlugin is false", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {};

    setupModule(module, { cluster: "devnet", clientPlugin: false }, { publicConfig });

    expect(kit.addPlugin).not.toHaveBeenCalled();
    expect(kit.addImports).toHaveBeenCalledWith(
      expect.arrayContaining([...SOLANA_IMPORTS, ...SOLANA_SETUP_AUTO_IMPORTS]),
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

  it("points the app's tsconfig at the module's own vue dependency", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const { prepareTypesHooks } = setupModule(module);

    expect(prepareTypesHooks).toHaveLength(1);

    const tsConfig: { compilerOptions?: { paths?: Record<string, string[]> } } = {};
    prepareTypesHooks[0]?.({ tsConfig });

    // The app does not depend on `@vue-solana/vue`, so without this the
    // generated `imports.d.ts` degrades the composables to `any` instead of
    // failing loudly. The app still installs one package: these paths point at
    // the copy the module already resolved for itself.
    const paths = tsConfig.compilerOptions?.paths ?? {};
    const [entry, subpaths] = [paths["@vue-solana/vue"]?.[0], paths["@vue-solana/vue/*"]?.[0]];
    expect(entry).toMatch(/vue[/\\]dist[/\\]index\.d\.ts$/);
    expect(subpaths).toBe(`${entry?.replace(/index\.d\.ts$/, "")}*`);
  });
  it("keeps an app-authored vue path mapping", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const { prepareTypesHooks } = setupModule(module);

    const tsConfig: { compilerOptions?: { paths?: Record<string, string[]> } } = {
      compilerOptions: { paths: { "@vue-solana/vue": ["./my-own/types.d.ts"] } },
    };
    prepareTypesHooks[0]?.({ tsConfig });

    expect(tsConfig.compilerOptions?.paths?.["@vue-solana/vue"]).toEqual(["./my-own/types.d.ts"]);
  });
});
