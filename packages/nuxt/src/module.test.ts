import { beforeEach, describe, expect, it, vi } from "vitest";
import { SOLANA_IMPORTS } from "./imports";

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

  module.setup(options, {
    options: {
      runtimeConfig: {
        public: publicConfig,
      },
      vite,
    },
  });

  return { publicConfig, vite };
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
      "@solana/web3-compat",
      "@solana/web3.js",
      "buffer",
      "bn.js",
      "bs58",
      "borsh",
      "@solana/buffer-layout",
      "jayson/lib/client/browser",
      "eventemitter3",
      "rpc-websockets",
      "@solana-mobile/wallet-standard-mobile",
      "tweetnacl",
      "tweetnacl/nacl-fast.js",
    ]);
    expect(vite.optimizeDeps.needsInterop).toEqual(["tweetnacl", "tweetnacl/nacl-fast.js"]);
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
});
