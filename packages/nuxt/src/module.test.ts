import { beforeEach, describe, expect, it, vi } from "vitest";

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

    module.setup(
      { cluster: "testnet", endpoint: "https://rpc.example.com" },
      {
        options: {
          runtimeConfig: {
            public: publicConfig,
          },
          vite: {},
        },
      },
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
    expect(kit.addImports).toHaveBeenCalledWith(
      expect.arrayContaining([
        { name: "useBalance", as: "useSolanaBalance", from: "@vue-solana/vue/useBalance" },
        { name: "useConnection", as: "useSolanaConnection", from: "@vue-solana/vue/useConnection" },
        { name: "useRpc", as: "useSolanaRpc", from: "@vue-solana/vue/useRpc" },
        {
          name: "useSignAndSendTransaction",
          as: "useSolanaSignAndSendTransaction",
          from: "@vue-solana/vue/useSignAndSendTransaction",
        },
        { name: "useSolana", as: "useSolana", from: "@vue-solana/vue/useSolana" },
        { name: "useWallet", as: "useSolanaWallet", from: "@vue-solana/vue/useWallet" },
        { name: "useWallets", as: "useSolanaWallets", from: "@vue-solana/vue/useWallets" },
      ]),
    );
  });

  it("adds Vite dependency optimization for mobile wallet dev interop", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const vite: TestViteOptions = {
      optimizeDeps: {
        include: ["existing-dependency", "qrcode"],
      },
    };

    module.setup(
      {},
      {
        options: {
          runtimeConfig: {
            public: {},
          },
          vite,
        },
      },
    );

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

    module.setup(
      { cluster: "devnet", wallet },
      {
        options: {
          runtimeConfig: {
            public: publicConfig,
          },
          vite: {},
        },
      },
    );

    expect(publicConfig.solana).toEqual({
      cluster: "devnet",
    });
  });
});
