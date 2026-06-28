import { mount } from "@vue/test-utils";
import type { Mock } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, type App } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { createSolanaPlugin } from "./plugin";
import { useSolana } from "./composables/useSolana";
import { useWallet } from "./composables/useWallet";

const StandardConnect = "standard:connect";
const StandardDisconnect = "standard:disconnect";

type WalletAccount = SolanaWalletInfo["accounts"][number];

type TestWalletAccount = WalletAccount & {
  features: readonly string[];
};

type DisconnectFeature = {
  disconnect: Mock;
};

type ConnectFeature = {
  connect: Mock;
};

type TestStandardWallet = {
  version: "1.0.0";
  name: string;
  icon: string;
  chains: readonly string[];
  accounts: readonly TestWalletAccount[];
  features: Record<string, unknown>;
};

const account = {
  address: "11111111111111111111111111111111",
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
  features: [],
} satisfies TestWalletAccount;

function createStandardWallet(
  accounts: readonly TestWalletAccount[] = [],
  name = "Test Wallet",
): TestStandardWallet {
  return {
    version: "1.0.0",
    name,
    icon: "data:image/png;base64,AA==",
    chains: ["solana:devnet"],
    accounts,
    features: {
      [StandardConnect]: {
        version: "1.0.0",
        connect: vi.fn().mockResolvedValue({ accounts: [account] }),
      },
      [StandardDisconnect]: {
        version: "1.0.0",
        disconnect: vi.fn().mockResolvedValue(undefined),
      },
    },
  };
}

function getDisconnectFeature(wallet: TestStandardWallet): DisconnectFeature {
  return wallet.features[StandardDisconnect] as DisconnectFeature;
}

function getConnectFeature(wallet: TestStandardWallet): ConnectFeature {
  return wallet.features[StandardConnect] as ConnectFeature;
}

function createWalletInfo(standardWallet: TestStandardWallet): SolanaWalletInfo {
  return {
    name: standardWallet.name,
    icon: standardWallet.icon,
    chains: standardWallet.chains,
    accounts: standardWallet.accounts,
    wallet: standardWallet,
  };
}

function mockSolanaContext() {
  createSolanaContext.mockReturnValue({
    cluster: "devnet",
    endpoint: "https://api.devnet.solana.com",
    wsEndpoint: "wss://api.devnet.solana.com",
    connection: {
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
    },
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

const {
  adaptSolanaIosWallet,
  createSolanaContext,
  getSolanaIosWallets,
  getRegisteredSolanaWallets,
  handleSolanaIosWalletCallback,
  isSolanaIosWalletInfo,
  registerSolanaMobileWallet,
  subscribeSolanaWallets,
} = vi.hoisted(() => ({
  adaptSolanaIosWallet: vi.fn(),
  createSolanaContext: vi.fn(),
  getSolanaIosWallets: vi.fn<() => SolanaWalletInfo[]>(() => []),
  getRegisteredSolanaWallets: vi.fn<() => SolanaWalletInfo[]>(),
  handleSolanaIosWalletCallback: vi.fn(),
  isSolanaIosWalletInfo: vi.fn(() => false),
  registerSolanaMobileWallet: vi.fn(),
  subscribeSolanaWallets: vi.fn(),
}));

vi.mock("@vue-solana/core/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/rpc")>();

  return {
    ...actual,
    createSolanaContext,
  };
});

vi.mock("@vue-solana/core/wallet-standard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/wallet-standard")>();

  return {
    ...actual,
    getRegisteredSolanaWallets,
    subscribeSolanaWallets,
  };
});

vi.mock("@vue-solana/core/mobile-wallet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/mobile-wallet")>();

  return {
    ...actual,
    registerSolanaMobileWallet,
  };
});

vi.mock("@vue-solana/core/ios-wallet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/ios-wallet")>();

  return {
    ...actual,
    adaptSolanaIosWallet,
    getSolanaIosWallets,
    handleSolanaIosWalletCallback,
    isSolanaIosWalletInfo,
  };
});

describe("createSolanaPlugin", () => {
  beforeEach(() => {
    getRegisteredSolanaWallets.mockReturnValue([]);
    getSolanaIosWallets.mockReturnValue([]);
    isSolanaIosWalletInfo.mockReturnValue(false);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
  });

  afterEach(async () => {
    if (vi.isFakeTimers()) {
      await vi.runOnlyPendingTimersAsync();
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    }

    vi.useRealTimers();
    vi.restoreAllMocks();
    createSolanaContext.mockReset();
    adaptSolanaIosWallet.mockReset();
    getSolanaIosWallets.mockReset();
    getSolanaIosWallets.mockReturnValue([]);
    getRegisteredSolanaWallets.mockReset();
    getRegisteredSolanaWallets.mockReturnValue([]);
    handleSolanaIosWalletCallback.mockReset();
    isSolanaIosWalletInfo.mockReset();
    isSolanaIosWalletInfo.mockReturnValue(false);
    registerSolanaMobileWallet.mockReset();
    subscribeSolanaWallets.mockReset();
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    window.localStorage.clear();
  });

  it("provides Solana context and checks the RPC connection", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const connection = {
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
    };
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection,
    });
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ cluster: "devnet" })]],
        },
      },
    );

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    expect(createSolanaContext).toHaveBeenCalledWith({ cluster: "devnet" });
    expect(solana?.latestBlockhash.value).toBe("latest-blockhash");
    expect(solana?.connection).toBe(connection);
  });

  it("checks the RPC connection when startup wallet refresh fails", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
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
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    await vi.advanceTimersByTimeAsync(0);

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("connected");
    });

    expect(connection.getLatestBlockhash).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("[Vue Solana] Wallet refresh failed", discoveryError);
  });

  it("stores connection check errors", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi.fn().mockRejectedValue(new Error("offline")),
      },
    });
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("error");
    });

    expect(solana?.error.value).toBe("offline");
  });

  it("sets an error when the RPC connection check times out", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      connection: {
        getLatestBlockhash: vi.fn().mockReturnValue(new Promise(() => {})),
      },
    });
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    await vi.advanceTimersByTimeAsync(0);

    expect(solana?.status.value).toBe("checking");

    await vi.advanceTimersByTimeAsync(10_000);

    await vi.waitFor(() => {
      expect(solana?.status.value).toBe("error");
    });

    expect(solana?.error.value).toBe("RPC connection check timed out after 10 seconds.");
  });

  it("ignores stale RPC connection check results", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

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
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    expect(getRegisteredSolanaWallets).not.toHaveBeenCalled();
    expect(subscribeSolanaWallets).not.toHaveBeenCalled();
    expect(solana?.wallets.value).toEqual([]);

    await vi.waitFor(() => {
      expect(getRegisteredSolanaWallets).toHaveBeenCalledOnce();
    });

    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();
    expect(solana?.wallets.value).toEqual([walletInfo]);
  });

  it("registers mobile wallets after the initial wallet discovery refresh", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

    solana?.refreshWallets();

    await vi.waitFor(() => {
      expect(registerSolanaMobileWallet).toHaveBeenCalledWith({ chains: ["solana:devnet"] });
    });

    expect(getRegisteredSolanaWallets.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("passes mobile wallet options through registration", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [
            [
              createSolanaPlugin({
                mobileWallet: {
                  appIdentity: { name: "Test App", uri: "https://example.com" },
                  chains: ["solana:mainnet"],
                  remoteHostAuthority: "example.com",
                },
              }),
            ],
          ],
        },
      },
    );

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
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();

    expect(registerSolanaMobileWallet).not.toHaveBeenCalled();
    expect(getRegisteredSolanaWallets).toHaveBeenCalledOnce();
  });

  it("discovers and adapts iOS deep-link wallets through the unified wallet list", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    getRegisteredSolanaWallets.mockReturnValue([]);
    getSolanaIosWallets.mockReturnValue([iosWalletInfo]);
    isSolanaIosWalletInfo.mockReturnValue(true);
    adaptSolanaIosWallet.mockReturnValue(adaptedWallet);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [
            [
              createSolanaPlugin({
                mobileWallet: false,
                iosWallet: { redirectUrl: "https://example.com/cb" },
              }),
            ],
          ],
        },
      },
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

  it("keeps selected standard wallets disconnected until explicit connect", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(wallet?.connected.value).toBe(false);
    expect(wallet?.publicKey.value).toBeNull();

    await wallet?.connect();

    expect(wallet?.connected.value).toBe(true);
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("persists wallet selection without auto-connecting by default", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);

    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBe(
      JSON.stringify({ name: "Test Wallet" }),
    );
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(wallet?.connected.value).toBe(false);
  });

  it("restores a persisted wallet selection without connecting when autoConnect is disabled", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: false, mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBe(walletInfo);
    expect(wallet?.wallet.value).not.toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(wallet?.connected.value).toBe(false);
  });

  it("restores wallets by name, platform, and source", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    getRegisteredSolanaWallets.mockReturnValue([browserWallet, mobileWallet]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: false, mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBe(mobileWallet);
  });

  it("ignores invalid persisted wallet JSON", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem("vue-solana:selected-wallet", "not json");
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true, mobileWallet: false })]],
        },
      },
    );

    expect(() => solana?.refreshWallets()).not.toThrow();
    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

  it("ignores persisted wallet selection when storage reads fail", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true, mobileWallet: false })]],
        },
      },
    );

    expect(() => solana?.refreshWallets()).not.toThrow();
    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

  it("auto-connects only a restored persisted wallet when enabled", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true, mobileWallet: false })]],
        },
      },
    );

    await vi.waitFor(() => {
      expect(wallet?.connected.value).toBe(true);
    });

    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("restores and auto-connects a persisted wallet on client boot", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.localStorage.setItem(
      "vue-solana:selected-wallet",
      JSON.stringify({ name: "Test Wallet" }),
    );
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true, mobileWallet: false })]],
        },
      },
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
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true })]],
        },
      },
    );

    await vi.waitFor(() => {
      expect(registerSolanaMobileWallet).toHaveBeenCalledWith({ chains: ["solana:devnet"] });
      expect(wallet?.connected.value).toBe(true);
    });

    expect(solana?.selectedWallet.value).toBe(mobileWallet);
    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();
    expect(wallet?.publicKey.value?.toBase58()).toBe(account.address);
  });

  it("does not auto-connect arbitrary discovered wallets without persisted selection", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true, mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
  });

  it("keeps missing persisted wallet selections disconnected and stored", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const storedSelection = JSON.stringify({ name: "Missing Wallet" });
    window.localStorage.setItem("vue-solana:selected-wallet", storedSelection);
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ autoConnect: true, mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();

    expect(solana?.selectedWallet.value).toBeNull();
    expect(getConnectFeature(standardWallet).connect).not.toHaveBeenCalled();
    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBe(storedSelection);
  });

  it("removes persisted wallet selection when selection is cleared", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();
    solana?.selectWallet(walletInfo);
    solana?.selectWallet(null);

    expect(window.localStorage.getItem("vue-solana:selected-wallet")).toBeNull();
  });

  it("keeps wallet selection working when browser storage fails", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const standardWallet = createStandardWallet([account]);
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin({ mobileWallet: false })]],
        },
      },
    );

    solana?.refreshWallets();

    expect(() => solana?.selectWallet(walletInfo)).not.toThrow();
    expect(solana?.selectedWallet.value).toBe(walletInfo);
    expect(wallet?.wallet.value).not.toBeNull();
  });

  it("keeps browser-only reconnect behavior inert without window", () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    mockSolanaContext();

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    });

    try {
      expect(() =>
        createSolanaPlugin({ autoConnect: true }).install({ provide: vi.fn() } as unknown as App),
      ).not.toThrow();
      expect(createSolanaContext).toHaveBeenCalledWith({ autoConnect: true });
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, "window", windowDescriptor);
      }
    }
  });

  it("keeps a connected wallet connected when it is reselected", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const firstStandardWallet = createStandardWallet([], "First Wallet");
    const secondStandardWallet = createStandardWallet([], "Second Wallet");
    const firstWalletInfo = createWalletInfo(firstStandardWallet);
    const secondWalletInfo = createWalletInfo(secondStandardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([firstWalletInfo, secondWalletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

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
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const standardWallet = createStandardWallet();
    const walletInfo = createWalletInfo(standardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([walletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

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
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const firstStandardWallet = createStandardWallet([], "First Wallet");
    const secondStandardWallet = createStandardWallet([], "Second Wallet");
    const firstWalletInfo = createWalletInfo(firstStandardWallet);
    const secondWalletInfo = createWalletInfo(secondStandardWallet);
    mockSolanaContext();
    getRegisteredSolanaWallets.mockReturnValue([firstWalletInfo, secondWalletInfo]);
    subscribeSolanaWallets.mockReturnValue(vi.fn());
    let solana: ReturnType<typeof useSolana> | undefined;
    let wallet: ReturnType<typeof useWallet> | undefined;

    mount(
      defineComponent({
        setup() {
          solana = useSolana();
          wallet = useWallet();

          return () => h("div");
        },
      }),
      {
        global: {
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

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
