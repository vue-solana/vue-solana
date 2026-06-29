import { describe, expect, it } from "vitest";
import {
  account,
  createStandardWallet,
  createWalletInfo,
  getDisconnectFeature,
  installPluginTestHooks,
  mockSolanaContext,
  mockWalletDiscovery,
  mountSolanaPlugin,
  mountTwoStandardWallets,
  silenceConsole,
} from "./plugin.test-utils";

describe("createSolanaPlugin cached wallets", () => {
  installPluginTestHooks();

  it("keeps a connected wallet connected when it is reselected", async () => {
    silenceConsole();
    const { firstStandardWallet, firstWalletInfo, secondWalletInfo, solana, wallet } =
      mountTwoStandardWallets();

    solana?.refreshWallets();
    solana?.selectWallet(firstWalletInfo);
    await wallet?.connect();

    expect(wallet?.connected.value).toBe(true);

    solana?.selectWallet(secondWalletInfo);

    expect(wallet?.connected.value).toBe(false);

    solana?.selectWallet(firstWalletInfo);

    expect(wallet?.connected.value).toBe(true);
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
    expect(getDisconnectFeature(firstStandardWallet).disconnect).not.toHaveBeenCalled();
  });

  it("keeps a connected wallet connected when selection is cleared and restored", async () => {
    silenceConsole();
    const standardWallet = createStandardWallet();
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    mockWalletDiscovery([walletInfo]);
    const { solana, wallet } = mountSolanaPlugin(undefined, { wallet: true });

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);
    await wallet?.connect();

    solana?.selectWallet(null);

    expect(wallet?.wallet.value).toBeNull();
    expect(getDisconnectFeature(standardWallet).disconnect).not.toHaveBeenCalled();

    solana?.selectWallet(walletInfo);

    expect(wallet?.connected.value).toBe(true);
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("disconnects other cached wallets after connecting another wallet", async () => {
    silenceConsole();
    const { firstStandardWallet, firstWalletInfo, secondWalletInfo, solana, wallet } =
      mountTwoStandardWallets();

    solana?.refreshWallets();
    solana?.selectWallet(firstWalletInfo);
    await wallet?.connect();
    solana?.selectWallet(secondWalletInfo);
    await wallet?.connect();

    expect(wallet?.connected.value).toBe(true);
    expect(getDisconnectFeature(firstStandardWallet).disconnect).toHaveBeenCalledOnce();

    solana?.selectWallet(firstWalletInfo);

    expect(wallet?.connected.value).toBe(false);
  });
});
