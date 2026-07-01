import { describe, expect, it, vi } from "vitest";
import {
  createDeferred,
  createSolanaContext,
  getRegisteredSolanaWallets,
  installPluginTestHooks,
  mockWalletDiscovery,
  mountSolanaPlugin,
  silenceConsole,
  subscribeSolanaWallets,
} from "./plugin.test-utils";

describe("createSolanaPlugin RPC connection", () => {
  installPluginTestHooks();

  it("provides Solana context and checks the RPC connection", async () => {
    silenceConsole();
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
    };
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection,
    });
    const { solana } = mountSolanaPlugin({ cluster: "devnet" });

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    expect(createSolanaContext).toHaveBeenCalledWith({ cluster: "devnet" });
    expect(solana?.latestBlockhash.value).toBe("latest-blockhash");
    expect(solana?.connection).toBe(connection);
  });

  it("checks the RPC connection when startup wallet refresh fails", async () => {
    vi.useFakeTimers();
    const { error: consoleError } = silenceConsole();
    const discoveryError = new Error("wallet discovery failed");
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
    };
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection,
    });
    getRegisteredSolanaWallets.mockImplementation(() => {
      throw discoveryError;
    });
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    await vi.advanceTimersByTimeAsync(0);

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    expect(connection.getLatestBlockhash).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("[Vue Solana] Wallet refresh failed", discoveryError);
  });

  it("stores connection check errors", async () => {
    silenceConsole();
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi.fn().mockRejectedValue(new Error("offline")),
      },
    });
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("error");
    });

    expect(solana?.error.value?.code).toBe("RPC_FAILURE");
    expect(solana?.error.value?.message).toBe("offline");
  });

  it("sets an error when the RPC connection check times out", async () => {
    vi.useFakeTimers();
    silenceConsole();
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi.fn().mockReturnValue(new Promise(() => {})),
      },
    });
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    await vi.advanceTimersByTimeAsync(0);

    expect(solana?.status.value).toBe("checking");

    await vi.advanceTimersByTimeAsync(10_000);

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("error");
    });

    expect(solana?.error.value?.code).toBe("RPC_FAILURE");
    expect(solana?.error.value?.message).toBe("RPC connection check timed out after 10 seconds.");
  });

  it("ignores stale RPC connection check results", async () => {
    silenceConsole();
    const firstCheck = createDeferred<{ blockhash: string }>();
    const secondCheck = createDeferred<{ blockhash: string }>();
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi
          .fn()
          .mockReturnValueOnce(firstCheck.promise)
          .mockReturnValueOnce(secondCheck.promise),
      },
    });
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    void solana?.checkConnection();
    secondCheck.resolve({ blockhash: "second-blockhash" });

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    expect(solana?.latestBlockhash.value).toBe("second-blockhash");

    firstCheck.resolve({ blockhash: "first-blockhash" });

    await Promise.resolve();

    expect(solana?.latestBlockhash.value).toBe("second-blockhash");
  });

  it("does not discover wallets synchronously during plugin install", async () => {
    silenceConsole();
    const walletInfo = {
      name: "Test Wallet",
      icon: "data:image/png;base64,AA==",
      chains: ["solana:devnet"],
      accounts: [],
      wallet: {},
    };
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
      },
    });
    mockWalletDiscovery([walletInfo]);
    const { solana } = mountSolanaPlugin({ mobileWallet: false });

    expect(getRegisteredSolanaWallets).not.toHaveBeenCalled();
    expect(subscribeSolanaWallets).not.toHaveBeenCalled();
    expect(solana?.wallets.value).toEqual([]);

    await vi.waitFor(() => {
      expect(getRegisteredSolanaWallets).toHaveBeenCalledOnce();
    });

    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();
    expect(solana?.wallets.value).toEqual([walletInfo]);
  });
});
