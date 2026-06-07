import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { createSolanaPlugin } from "./plugin";
import { useSolana } from "./composables/useSolana";
import { useWallet } from "./composables/useWallet";

const StandardConnect = "standard:connect";
const StandardDisconnect = "standard:disconnect";

const account = {
  address: "11111111111111111111111111111111",
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
  features: [],
} satisfies WalletAccount;

function createStandardWallet(accounts: readonly WalletAccount[] = []): Wallet {
  return {
    version: "1.0.0",
    name: "Test Wallet",
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
  } as Wallet;
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

const { createSolanaContext, getRegisteredSolanaWallets, subscribeSolanaWallets } = vi.hoisted(
  () => ({
    createSolanaContext: vi.fn(),
    getRegisteredSolanaWallets: vi.fn(),
    subscribeSolanaWallets: vi.fn(),
  }),
);

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

describe("createSolanaPlugin", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    createSolanaContext.mockReset();
    getRegisteredSolanaWallets.mockReset();
    subscribeSolanaWallets.mockReset();
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
          plugins: [[createSolanaPlugin()]],
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
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

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
          plugins: [[createSolanaPlugin()]],
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

  it("discovers wallets only after refresh is requested", async () => {
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
          plugins: [[createSolanaPlugin()]],
        },
      },
    );

    expect(getRegisteredSolanaWallets).not.toHaveBeenCalled();
    expect(subscribeSolanaWallets).not.toHaveBeenCalled();
    expect(solana?.wallets.value).toEqual([]);

    solana?.refreshWallets();

    expect(getRegisteredSolanaWallets).toHaveBeenCalledOnce();
    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();
    expect(solana?.wallets.value).toEqual([walletInfo]);
  });

  it("keeps selected standard wallets disconnected until explicit connect", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const standardWallet = createStandardWallet([account]);
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
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
});
