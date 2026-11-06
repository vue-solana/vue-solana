import { describe, expect, it, vi } from "vitest";
import {
  account,
  getConnectFeature,
  getDisconnectFeature,
  installPluginTestHooks,
  mockStandardWalletDiscovery,
  mountSolanaPlugin,
  mountTwoStandardWallets,
  silenceConsole,
} from "./plugin.test-utils";

const STORAGE_KEY = "vue-solana:selected-wallet";

function readStoredSelection() {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value ? (JSON.parse(value) as Record<string, unknown>) : null;
}

/**
 * A refresh must not show a wallet the user left connected as disconnected:
 * the wallet still trusts the site, so the next `connect()` would succeed with
 * no prompt. The session is restored silently even without `autoConnect`.
 */
describe("createSolanaPlugin wallet session restore", () => {
  installPluginTestHooks();

  it("remembers that the selected wallet was left connected", async () => {
    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);
    await wallet?.connect();

    expect(readStoredSelection()).toEqual({ name: "Test Wallet", connected: true });

    await wallet?.disconnect();

    expect(readStoredSelection()).toEqual({ name: "Test Wallet" });
  });

  it("keeps the session when the connected wallet is selected again", async () => {
    const { walletInfo } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);
    await wallet?.connect();
    solana?.selectWallet(walletInfo);

    expect(readStoredSelection()).toEqual({ name: "Test Wallet", connected: true });
  });

  it("keeps the new session after the sweep disconnects the previous wallet", async () => {
    const { firstStandardWallet, firstWalletInfo, secondWalletInfo, solana, wallet } =
      mountTwoStandardWallets();

    solana?.refreshWallets();
    solana?.selectWallet(firstWalletInfo);
    await wallet?.connect();
    solana?.selectWallet(secondWalletInfo);
    await wallet?.connect();

    // Connecting the second wallet swept the first one through its adapter,
    // which reports a disconnect — for a wallet that is no longer selected.
    expect(getDisconnectFeature(firstStandardWallet).disconnect).toHaveBeenCalledOnce();
    expect(readStoredSelection()).toEqual({ name: "Second Wallet", connected: true });
  });

  it("silently restores a session left connected, without autoConnect", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ name: "Test Wallet", connected: true }),
    );
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(wallet?.connected.value).toBe(true);
    });
    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledWith({ silent: true });
    expect(wallet?.publicKey.value).toBe(account.address);
  });

  it("does not reconnect a wallet that was only selected, without autoConnect", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: "Test Wallet" }));
    const { standardWallet } = mockStandardWalletDiscovery();
    const { solana } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();

    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

  it("forgets the session when the wallet no longer authorizes the site", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ name: "Test Wallet", connected: true }),
    );
    const { standardWallet } = mockStandardWalletDiscovery();
    getConnectFeature(standardWallet).connect.mockResolvedValue({ accounts: [] });
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(readStoredSelection()).toEqual({ name: "Test Wallet" });
    });
    expect(wallet?.connected.value).toBe(false);
    expect(solana?.error.value).toBeNull();
    expect(getDisconnectFeature(standardWallet).disconnect).not.toHaveBeenCalled();
  });

  it("does not surface a failed silent restore without autoConnect", async () => {
    silenceConsole();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ name: "Test Wallet", connected: true }),
    );
    const { standardWallet } = mockStandardWalletDiscovery();
    getConnectFeature(standardWallet).connect.mockRejectedValue(new Error("wallet locked"));
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    });
    await Promise.resolve();
    expect(wallet?.connected.value).toBe(false);
    expect(solana?.error.value).toBeNull();
  });
});
