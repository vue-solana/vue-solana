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
      };
    },
  ) => void;
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

    module.setup(
      { cluster: "testnet", endpoint: "https://rpc.example.com" },
      {
        options: {
          runtimeConfig: {
            public: publicConfig,
          },
        },
      },
    );

    expect(publicConfig.solana).toEqual({
      commitment: "processed",
      cluster: "testnet",
      endpoint: "https://rpc.example.com",
    });
    expect(kit.createResolver).toHaveBeenCalledWith(expect.stringContaining("module.ts"));
    expect(kit.addPlugin).toHaveBeenCalledWith("resolved:./runtime/plugin");
    expect(kit.addImports).toHaveBeenCalledWith(
      expect.arrayContaining([
        { name: "useBalance", as: "useSolanaBalance", from: "@vue-solana/vue" },
        { name: "useConnection", as: "useSolanaConnection", from: "@vue-solana/vue" },
        { name: "useRpc", as: "useSolanaRpc", from: "@vue-solana/vue" },
        {
          name: "useSignAndSendTransaction",
          as: "useSolanaSignAndSendTransaction",
          from: "@vue-solana/vue",
        },
        { name: "useSolana", as: "useSolana", from: "@vue-solana/vue" },
        { name: "useWallet", as: "useSolanaWallet", from: "@vue-solana/vue" },
        { name: "useWallets", as: "useSolanaWallets", from: "@vue-solana/vue" },
      ]),
    );
  });
});
