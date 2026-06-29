import { describe, expect, it, vi } from "vitest";
import type { App } from "vue";
import {
  account,
  createSolanaContext,
  createStandardWallet,
  createWalletInfo,
  getConnectFeature,
  getRegisteredSolanaWallets,
  installSolanaPlugin,
  installPluginTestHooks,
  mockSolanaContext,
  mockStandardWalletDiscovery,
  mountSolanaPlugin,
  registerSolanaMobileWallet,
  silenceConsole,
  subscribeSolanaWallets,
} from "./plugin.test-utils";

describe("createSolanaPlugin wallet auto-connect", () => {
  installPluginTestHooks();

  it("auto-connects only a restored persisted wallet when enabled", async () => {
    silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const { standardWallet } = mockStandardWalletDiscovery();
    const { wallet } = mountSolanaPlugin(
      { autoConnect: true, mobileWallet: false },
      { wallet: true },
    );

    await vi.waitFor(() => {
      expect(wallet?.connected.value).toBe(true);
    });

    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("restores and auto-connects a persisted wallet on client boot", async () => {
    silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const { standardWallet, walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin(
      { autoConnect: true, mobileWallet: false },
      { wallet: true },
    );

    await vi.waitFor(() => {
      expect(solana?.selectedWallet.value).toBe(walletInfo);
      expect(wallet?.connected.value).toBe(true);
    });

    expect(getRegisteredSolanaWallets).toHaveBeenCalledOnce();
    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("restores and auto-connects a persisted Android mobile wallet after delayed registration", async () => {
    silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({
        name: "Mobile Wallet Adapter",
        platform: "mobile",
        source: "mobile-wallet-adapter",
      }),
    );
    const standardWallet = createStandardWallet([account], "Mobile Wallet Adapter");
    const mobileWallet = createWalletInfo(standardWallet);
    mobileWallet.platform = "mobile";
    mobileWallet.source = "mobile-wallet-adapter";
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValueOnce([]).mockReturnValue([mobileWallet]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    const { solana, wallet } = mountSolanaPlugin({ autoConnect: true }, { wallet: true });

    await vi.waitFor(() => {
      expect(registerSolanaMobileWallet).toHaveBeenCalledWith({ chains: ["solana:devnet"] });
      expect(wallet?.connected.value).toBe(true);
    });

    expect(solana?.selectedWallet.value).toBe(mobileWallet);
    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("does not auto-connect arbitrary discovered wallets without persisted selection", () => {
    silenceConsole();
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ autoConnect: true, mobileWallet: false });

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

  it("keeps browser-only reconnect behavior inert without window", () => {
    silenceConsole();
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    mockSolanaContext();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(() =>
        installSolanaPlugin({ autoConnect: true }, { provide: vi.fn() } as unknown as App),
      ).not.toThrow();
      expect(createSolanaContext).toHaveBeenCalledWith({ autoConnect: true });
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, "window", windowDescriptor);
      }
    }
  });
});
