import { describe, expect, it, vi } from "vitest";
import {
  account,
  createStandardWallet,
  createWalletInfo,
  getConnectFeature,
  installPluginTestHooks,
  mockSolanaContext,
  mockStandardWalletDiscovery,
  mockWalletDiscovery,
  mountSolanaPlugin,
  silenceConsole,
} from "./plugin.test-utils";

describe("createSolanaPlugin wallet selection persistence", () => {
  installPluginTestHooks();

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
});
