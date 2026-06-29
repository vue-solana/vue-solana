import { describe, expect, it, vi } from "vitest";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import {
  adaptSolanaIosWallet,
  getRegisteredSolanaWallets,
  getSolanaIosWallets,
  handleSolanaIosWalletCallback,
  installPluginTestHooks,
  isSolanaIosWalletInfo,
  mockSolanaContext,
  mockWalletDiscovery,
  mountSolanaPlugin,
  registerSolanaMobileWallet,
  silenceConsole,
} from "./plugin.test-utils";

describe("createSolanaPlugin wallet discovery", () => {
  installPluginTestHooks();

  it("registers mobile wallets after the initial wallet discovery refresh", async () => {
    silenceConsole();
    mockSolanaContext();
    mockWalletDiscovery([]);
    const { solana } = mountSolanaPlugin();

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(registerSolanaMobileWallet).toHaveBeenCalledWith({ chains: ["solana:devnet"] });
    });

    expect(getRegisteredSolanaWallets.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("passes mobile wallet options through registration", async () => {
    silenceConsole();
    mockSolanaContext();
    mockWalletDiscovery([]);
    const { solana } = mountSolanaPlugin({
      mobileWallet: {
        appIdentity: { name: "Test App", uri: "https://example.com" },
        chains: ["solana:mainnet"],
        remoteHostAuthority: "example.com",
      },
    });

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(registerSolanaMobileWallet).toHaveBeenCalledWith({
        chains: ["solana:mainnet"],
        appIdentity: { name: "Test App", uri: "https://example.com" },
        remoteHostAuthority: "example.com",
      });
    });
  });

  it("skips mobile wallet registration when disabled", async () => {
    silenceConsole();
    mockSolanaContext();
    mockWalletDiscovery([]);
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    solana?.refreshWallets();

    expect(registerSolanaMobileWallet).not.toHaveBeenCalled();
    expect(getRegisteredSolanaWallets).toHaveBeenCalledOnce();
  });

  it("logs mobile wallet registration failures without failing wallet refresh", async () => {
    const { error: consoleError } = silenceConsole();
    const registrationError = new Error("mobile registration failed");
    mockSolanaContext();
    mockWalletDiscovery([]);
    registerSolanaMobileWallet.mockImplementation(() => {
      throw registrationError;
    });
    const { solana } = mountSolanaPlugin();

    expect(() => solana?.refreshWallets()).not.toThrow();

    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        "[Vue Solana] Mobile wallet registration failed",
        registrationError,
      );
    });
  });

  it("discovers and adapts iOS deep-link wallets through the unified wallet list", () => {
    silenceConsole();
    mockSolanaContext();
    const iosWalletInfo = {
      name: "Phantom",
      icon: "https://phantom.app/img/phantom-logo.svg",
      chains: ["solana:devnet"],
      platform: "mobile",
      source: "deep-link",
      accounts: [],
      wallet: { id: "phantom" },
    } satisfies SolanaWalletInfo;
    const adaptedWallet = {
      publicKey: null,
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    mockWalletDiscovery([]);
    getSolanaIosWallets.mockReturnValue([iosWalletInfo]);
    isSolanaIosWalletInfo.mockReturnValue(true);
    adaptSolanaIosWallet.mockReturnValue(adaptedWallet);
    const { solana, wallet } = mountSolanaPlugin(
      {
        mobileWallet: false,
        iosWallet: { redirectUrl: "https://example.com/cb" },
      },
      { wallet: true },
    );

    solana?.refreshWallets();
    solana?.selectWallet(iosWalletInfo);

    expect(handleSolanaIosWalletCallback).toHaveBeenCalledWith({ clearUrl: true });
    expect(getSolanaIosWallets).toHaveBeenCalledWith({
      chains: ["solana:devnet"],
      cluster: "devnet",
      redirectUrl: "https://example.com/cb",
    });
    expect(adaptSolanaIosWallet).toHaveBeenCalledWith(
      iosWalletInfo,
      expect.objectContaining({
        chain: "solana:devnet",
        cluster: "devnet",
        redirectUrl: "https://example.com/cb",
      }),
    );
    expect(wallet?.wallet.value).toBe(adaptedWallet);
  });
});
