import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupModule, type ModuleUnderTest } from "./module.test-utils";

describe("Nuxt module configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defines module metadata", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;

    expect(module.meta).toEqual({
      name: "@vue-solana/nuxt",
      configKey: "solana",
      compatibility: {
        nuxt: "^3.0.0 || ^4.0.0",
      },
    });
    // No `defaults` in `defineNuxtModule`: Nuxt would merge them into `options`,
    // making an explicit inline value equal to the default look untouched.
    expect(module).not.toHaveProperty("defaults");
  });

  it("applies the module defaults after merging public config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {};

    setupModule(module, {}, { publicConfig });

    expect(publicConfig.solana).toEqual({ cluster: "devnet", autoConnect: false });
  });

  it("lets inline options equal to a default win over public config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {
      solana: { cluster: "mainnet", autoConnect: true },
    };

    setupModule(module, { cluster: "devnet", autoConnect: false }, { publicConfig });

    expect(publicConfig.solana).toEqual({ cluster: "devnet", autoConnect: false });
  });

  it("treats a non-object publicConfig.solana as empty before merging options", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const publicConfig: Record<string, unknown> = {
      solana: "not-an-object" as never,
    };

    setupModule(module, { cluster: "testnet" }, { publicConfig });

    expect(publicConfig.solana).toEqual({ cluster: "testnet", autoConnect: false });
  });

  it("fails fast when wallet or signer fields appear in module options", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;

    expect(() =>
      setupModule(module, { cluster: "devnet", wallet: { connect: vi.fn() } } as never, {}),
    ).toThrow(/`wallet` is not allowed in solana module options/);

    expect(() =>
      setupModule(module, { cluster: "devnet", payer: { address: "signer" } } as never, {}),
    ).toThrow(/`payer` is not allowed in solana module options/);

    expect(() =>
      setupModule(module, { cluster: "devnet", payerSecretKey: "secret" } as never, {}),
    ).toThrow(/`payerSecretKey` is not allowed in solana module options/);
  });

  it("fails fast when wallet or signer fields appear in runtimeConfig.public.solana", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;

    expect(() =>
      setupModule(
        module,
        { cluster: "devnet" },
        { publicConfig: { solana: { payerSecretKey: "secret" } } },
      ),
    ).toThrow(/`payerSecretKey` is not allowed in runtimeConfig\.public\.solana/);

    expect(() =>
      setupModule(
        module,
        { cluster: "devnet" },
        { publicConfig: { solana: { payer: { address: "signer" } } } },
      ),
    ).toThrow(/`payer` is not allowed in runtimeConfig\.public\.solana/);

    expect(() =>
      setupModule(
        module,
        { cluster: "devnet" },
        { publicConfig: { solana: { wallet: { connect: vi.fn() } } } },
      ),
    ).toThrow(/`wallet` is not allowed in runtimeConfig\.public\.solana/);
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
      cluster: "devnet",
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
