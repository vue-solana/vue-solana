import { beforeEach, describe, expect, it, vi } from "vitest";
import plugin from "./plugin";
import { runtimeConfig } from "../../../../test/stubs/nuxt-app";
import { useRuntimeConfig } from "#app";

const { createSolanaPlugin } = vi.hoisted(() => ({
  createSolanaPlugin: vi.fn(() => ({ install: vi.fn() })),
}));

vi.mock("@vue-solana/vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/vue")>();

  return {
    ...actual,
    createSolanaPlugin,
  };
});

describe("Nuxt runtime plugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeConfig.public.solana = {};
  });

  it("installs the Vue Solana plugin with public runtime config", () => {
    runtimeConfig.public.solana = {
      cluster: "testnet",
      endpoint: "https://rpc.example.com",
      wsEndpoint: "wss://rpc.example.com",
      commitment: "confirmed",
      autoConnect: true,
      mobileWallet: false,
      iosWallet: { redirectUrl: "https://example.com/wallet-callback" },
    };
    const vueApp = {
      use: vi.fn(),
    };

    const runPlugin = plugin as (nuxtApp: { vueApp: typeof vueApp }) => void;

    runPlugin({ vueApp });

    expect(useRuntimeConfig).toHaveBeenCalledOnce();
    expect(createSolanaPlugin).toHaveBeenCalledWith({
      cluster: "testnet",
      endpoint: "https://rpc.example.com",
      wsEndpoint: "wss://rpc.example.com",
      commitment: "confirmed",
      autoConnect: true,
      mobileWallet: false,
      iosWallet: { redirectUrl: "https://example.com/wallet-callback" },
    });
    expect(vueApp.use).toHaveBeenCalledWith(createSolanaPlugin.mock.results[0]?.value);
  });
});
