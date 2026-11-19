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

  it("omits non-serializable wallet adapters from public runtime config", async () => {
    const module = (await import("./module")).default as unknown as ModuleUnderTest;
    const wallet = { connect: vi.fn() };
    const publicConfig: Record<string, unknown> = {};

    setupModule(module, { cluster: "devnet", wallet }, { publicConfig });

    expect(publicConfig.solana).toEqual({
      cluster: "devnet",
      autoConnect: false,
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

    expect(publicConfig.solana).toEqual({ cluster: "devnet", autoConnect: false });
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

    expect(publicConfig.solana).toEqual({ cluster: "devnet", autoConnect: false });
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
