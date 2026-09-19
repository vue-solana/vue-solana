import { beforeEach, describe, expect, it, vi } from "vitest";
import plugin from "./plugin";
import { runtimeConfig } from "../../../../test/stubs/nuxt-app";
import { useRuntimeConfig } from "#app";
import { selectedWalletAccountInjectionKey } from "@vue-solana/vue";

const { createSolanaPlugin, createSelectedWalletAccountContext } = vi.hoisted(() => {
  // The plugin object returned by the real `createSolanaPlugin` carries the
  // built Solana context once `install` runs; the runtime plugin must thread
  // it into the selected wallet account context.
  const pluginContext = { wallets: { value: [] as unknown[] } };

  return {
    createSolanaPlugin: vi.fn(() => ({ install: vi.fn(), context: pluginContext })),
    createSelectedWalletAccountContext: vi.fn(() => ({
      selectedWalletAccount: { value: null },
      setSelectedWalletAccount: vi.fn(),
      filteredWallets: { value: [] },
    })),
  };
});

vi.mock("@vue-solana/vue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/vue")>();

  return {
    ...actual,
    createSolanaPlugin,
    createSelectedWalletAccountContext,
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
      provide: vi.fn(),
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

  it("installs the app-wide selected wallet account context", () => {
    const vueApp = {
      use: vi.fn(),
      provide: vi.fn(),
    };

    const runPlugin = plugin as (nuxtApp: { vueApp: typeof vueApp }) => void;

    runPlugin({ vueApp });

    // The context is built outside a component setup, where `inject` cannot
    // resolve the Solana context — the plugin must pass it explicitly so
    // `filteredWallets` and the persisted-selection restore still work.
    expect(createSelectedWalletAccountContext).toHaveBeenCalledWith(
      {},
      createSolanaPlugin.mock.results[0]?.value.context,
    );
    expect(vueApp.provide).toHaveBeenCalledWith(
      selectedWalletAccountInjectionKey,
      createSelectedWalletAccountContext.mock.results[0]?.value,
    );
  });
});
