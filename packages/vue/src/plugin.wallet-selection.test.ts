import { describe, expect, it, vi } from "vitest";
import type { App } from "vue";
import type { SolanaWallet } from "@vue-solana/core/types";
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
  mockWalletDiscovery,
  mountSolanaPlugin,
  registerSolanaMobileWallet,
  silenceConsole,
  subscribeSolanaWallets,
} from "./plugin.test-utils";

describe("createSolanaPlugin wallet selection", () => {
  installPluginTestHooks();

  it("keeps selected standard wallets disconnected until explicit connect", async () => {
    silenceConsole();
    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin(undefined, { wallet: true });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(wallet?.connected.value).toBe(false);
    expect(wallet?.publicKey.value).toBeNull();

    await wallet?.connect();

    expect(wallet?.connected.value).toBe(true);
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("persists wallet selection without auto-connecting by default", () => {
    silenceConsole();
    const { standardWallet, walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBe(
      JSON.stringify({ name: "Test Wallet" }),
    );
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(wallet?.connected.value).toBe(false);
  });

  it("restores a persisted wallet selection without connecting when autoConnect is disabled", () => {
    silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const { standardWallet, walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin(
      { autoConnect: false, mobileWallet: false },
      { wallet: true },
    );

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBe(walletInfo);
    expect(wallet?.wallet.value).not.toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(wallet?.connected.value).toBe(false);
  });

  it("keeps an explicitly configured wallet active when a persisted selection exists", () => {
    silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const configuredWallet: SolanaWallet = {
      publicKey: null,
      connected: false,
      connecting: false,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin(
      { autoConnect: true, mobileWallet: false, wallet: configuredWallet },
      { wallet: true },
    );

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBeNull();
    expect(wallet?.wallet.value).toBe(configuredWallet);
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(configuredWallet.connect).not.toHaveBeenCalled();
  });

  it("restores wallets by name, platform, and source", () => {
    silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({
        name: "Shared Wallet",
        platform: "mobile",
        source: "mobile-wallet-adapter",
      }),
    );
    const browserWallet = createWalletInfo(createStandardWallet([account], "Shared Wallet"));
    browserWallet.platform = "browser";
    browserWallet.source = "wallet-standard";
    const mobileWallet = createWalletInfo(createStandardWallet([account], "Shared Wallet"));
    mobileWallet.platform = "mobile";
    mobileWallet.source = "mobile-wallet-adapter";
    mockSolanaContext();
    mockWalletDiscovery([browserWallet, mobileWallet]);
    const { solana } = mountSolanaPlugin({ autoConnect: false, mobileWallet: false });

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBe(mobileWallet);
  });

  it("ignores invalid persisted wallet JSON", () => {
    silenceConsole();
    window.localStorage.setItem("vue-solana:selected-wallet", "not json");
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ autoConnect: true, mobileWallet: false });

    expect(() => solana?.refreshWallets()).not.toThrow();
    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

  it("ignores persisted wallet selection when storage reads fail", () => {
    silenceConsole();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ autoConnect: true, mobileWallet: false });

    expect(() => solana?.refreshWallets()).not.toThrow();
    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

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

  it("keeps missing persisted wallet selections disconnected and stored", () => {
    silenceConsole();
    const storedSelection = JSON.stringify({ name: "Missing Wallet" });
    window.localStorage.setItem("vue-solana:selected-wallet", storedSelection);
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ autoConnect: true, mobileWallet: false });

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBe(storedSelection);
  });

  it("removes persisted wallet selection when selection is cleared", () => {
    silenceConsole();
    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);
    solana?.selectWallet(null);

    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBeNull();
  });

  it("keeps wallet selection working when browser storage fails", () => {
    silenceConsole();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();

    expect(() => solana?.selectWallet(walletInfo)).not.toThrow();
    expect(solana?.selectedWallet.value).toBe(walletInfo);
    expect(wallet?.wallet.value).not.toBeNull();
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
