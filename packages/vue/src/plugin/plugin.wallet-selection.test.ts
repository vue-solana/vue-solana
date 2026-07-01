import { describe, expect, it, vi } from "vitest";
import type { SolanaWallet } from "@vue-solana/core/types";
import {
  account,
  createStandardWallet,
  createWalletInfo,
  getConnectFeature,
  getRegisteredSolanaWallets,
  installPluginTestHooks,
  mockSolanaContext,
  mockStandardWalletDiscovery,
  mountSolanaPlugin,
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

  it("clears the selected wallet when it disappears from discovery", () => {
    silenceConsole();
    const configuredWallet: SolanaWallet = {
      publicKey: null,
      connected: false,
      connecting: false,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    const standardWallet = createStandardWallet([account], "Test Wallet");
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValueOnce([walletInfo]).mockReturnValue([]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    const { solana, wallet } = mountSolanaPlugin(
      { mobileWallet: false, wallet: configuredWallet },
      { wallet: true },
    );

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(solana?.selectedWallet.value).toBe(walletInfo);
    expect(wallet?.wallet.value).not.toBe(configuredWallet);

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBeNull();
    expect(wallet?.wallet.value).toBe(configuredWallet);
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

  it("stores typed errors when selected wallet persistence fails", () => {
    silenceConsole();
    const failure = new Error("storage unavailable");
    const originalLocalStorage = window.localStorage;

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: vi.fn(),
        removeItem: vi.fn(),
        setItem: vi.fn(() => {
          throw failure;
        }),
      },
    });

    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(solana?.error.value?.code).toBe("STORAGE_FAILURE");
    expect(solana?.error.value?.cause).toBe(failure);

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  it("clears selected wallet metadata when setting a wallet directly", () => {
    silenceConsole();
    const configuredWallet: SolanaWallet = {
      publicKey: null,
      connected: false,
      connecting: false,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    };
    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(solana?.selectedWallet.value).toBe(walletInfo);
    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBe(
      JSON.stringify({ name: "Test Wallet" }),
    );

    solana?.setWallet(configuredWallet);

    expect(solana?.selectedWallet.value).toBeNull();
    expect(wallet?.wallet.value).toBe(configuredWallet);
    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBeNull();
  });
});
