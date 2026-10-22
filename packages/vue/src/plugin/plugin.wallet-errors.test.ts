import { describe, expect, it, vi } from "vitest";
import { createSolanaError } from "@vue-solana/core/errors";
import {
  createDeferred,
  getConnectFeature,
  getRegisteredSolanaWallets,
  handleSolanaIosWalletCallback,
  installPluginTestHooks,
  mockSolanaContext,
  mockStandardWalletDiscovery,
  mountSolanaPlugin,
  registerSolanaMobileWallet,
  silenceConsole,
} from "./plugin.test-utils";

describe("createSolanaPlugin wallet failure observability", () => {
  installPluginTestHooks();

  it("keeps a failed bootstrap wallet refresh in the context error", async () => {
    const consoleSpies = silenceConsole();
    mockSolanaContext();
    getRegisteredSolanaWallets.mockImplementation(() => {
      throw new Error("discovery exploded");
    });

    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    // `checkConnection()` clears `error` when it starts; the refresh failure runs
    // after it, so it must survive the successful RPC check.
    expect(solana?.error.value?.code).toBe("WALLET_FAILURE");
    expect(solana?.error.value?.message).toBe("discovery exploded");
    expect(consoleSpies.error).toHaveBeenCalledWith(
      "[Vue Solana] Failed to refresh Solana wallets",
      expect.any(Error),
    );
  });

  it("reports an iOS callback failure with its typed code", () => {
    const consoleSpies = silenceConsole();
    mockSolanaContext();
    const failure = createSolanaError(
      "REDIRECT_TIMEOUT",
      "Received an expired iOS wallet callback",
    );

    handleSolanaIosWalletCallback.mockImplementation(() => {
      throw failure;
    });
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    solana?.refreshWallets();

    expect(solana?.error.value).toBe(failure);
    expect(consoleSpies.error).toHaveBeenCalledWith(
      "[Vue Solana] Failed to handle Solana iOS wallet callback",
      failure,
    );
  });

  it("normalizes an untyped iOS callback failure to WALLET_FAILURE", () => {
    silenceConsole();
    mockSolanaContext();
    const failure = new Error("iOS wallet blew up");

    handleSolanaIosWalletCallback.mockImplementation(() => {
      throw failure;
    });
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    solana?.refreshWallets();

    expect(solana?.error.value).toMatchObject({
      code: "WALLET_FAILURE",
      cause: failure,
    });
  });

  it("reports a mobile wallet registration failure", async () => {
    const consoleSpies = silenceConsole();
    mockSolanaContext();
    const registrationError = new Error("mobile registration failed");

    registerSolanaMobileWallet.mockImplementation(() => {
      throw registrationError;
    });
    const { solana } = mountSolanaPlugin();

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(solana?.error.value?.code).toBe("WALLET_FAILURE");
    });

    expect(solana?.error.value?.cause).toBe(registrationError);
    expect(consoleSpies.error).toHaveBeenCalledWith(
      "[Vue Solana] Failed to register Solana mobile wallet",
      registrationError,
    );
  });

  it("reports an auto-connect failure once the connect attempt rejects", async () => {
    const consoleSpies = silenceConsole();
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const { standardWallet } = mockStandardWalletDiscovery();
    const connection = createDeferred<{ accounts: readonly unknown[] }>();

    getConnectFeature(standardWallet).connect.mockReturnValue(connection.promise);

    const { solana } = mountSolanaPlugin({ autoConnect: true, mobileWallet: false });

    await vi.waitFor(() => {
      expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    });

    const failure = new Error("wallet locked");
    connection.reject(failure);

    await vi.waitFor(() => {
      expect(solana?.error.value?.code).toBe("WALLET_FAILURE");
    });

    expect(solana?.error.value?.cause).toBe(failure);
    expect(consoleSpies.error).toHaveBeenCalledWith(
      "[Vue Solana] Failed to auto-connect Solana wallet",
      failure,
    );
  });
});
