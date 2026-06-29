import { mount } from "@vue/test-utils";
import type { Mock } from "vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { defineComponent, h, type App } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import { createSolanaPlugin } from "../plugin";
import { useSolana } from "../composables/useSolana";
import { useWallet } from "../composables/useWallet";

const StandardConnect = "standard:connect";
const StandardDisconnect = "standard:disconnect";

type WalletAccount = SolanaWalletInfo["accounts"][number];

export type TestWalletAccount = WalletAccount & {
  features: readonly string[];
};

type DisconnectFeature = {
  disconnect: Mock;
};

type ConnectFeature = {
  connect: Mock;
};

export type TestStandardWallet = {
  version: "1.0.0";
  name: string;
  icon: string;
  chains: readonly string[];
  accounts: readonly TestWalletAccount[];
  features: Record<string, unknown>;
};

export const account = {
  address: "11111111111111111111111111111111",
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
  features: [],
} satisfies TestWalletAccount;

export function createStandardWallet(
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

export function getDisconnectFeature(wallet: TestStandardWallet): DisconnectFeature {
  return wallet.features[StandardDisconnect] as DisconnectFeature;
}

export function getConnectFeature(wallet: TestStandardWallet): ConnectFeature {
  return wallet.features[StandardConnect] as ConnectFeature;
}

export function createWalletInfo(standardWallet: TestStandardWallet): SolanaWalletInfo {
  return {
    name: standardWallet.name,
    icon: standardWallet.icon,
    chains: standardWallet.chains,
    accounts: standardWallet.accounts,
    wallet: standardWallet,
  };
}

export function mockStandardWalletDiscovery(
  accounts: readonly TestWalletAccount[] = [account],
  name?: string,
) {
  const standardWallet = createStandardWallet(accounts, name);
  const walletInfo = createWalletInfo(standardWallet);
  mockSolanaContext();
  mockWalletDiscovery([walletInfo]);

  return { standardWallet, walletInfo };
}

export function mountTwoStandardWallets() {
  const firstStandardWallet = createStandardWallet([], "First Wallet");
  const secondStandardWallet = createStandardWallet([], "Second Wallet");
  const firstWalletInfo = createWalletInfo(firstStandardWallet);
  const secondWalletInfo = createWalletInfo(secondStandardWallet);
  mockSolanaContext();
  mockWalletDiscovery([firstWalletInfo, secondWalletInfo]);
  const { solana, wallet } = mountSolanaPlugin(undefined, { wallet: true });

  return {
    firstStandardWallet,
    secondStandardWallet,
    firstWalletInfo,
    secondWalletInfo,
    solana,
    wallet,
  };
}

export function mockSolanaContext() {
  createSolanaContext.mockReturnValue({
    cluster: "devnet",
    endpoint: "https://api.devnet.solana.com",
    wsEndpoint: "wss://api.devnet.solana.com",
    connection: {
      getLatestBlockhash: vi.fn().mockResolvedValue({ blockhash: "latest-blockhash" }),
    },
  });
}

export function mockWalletDiscovery(wallets: SolanaWalletInfo[]) {
  getRegisteredSolanaWallets.mockReturnValue(wallets);
  subscribeSolanaWallets.mockReturnValue(vi.fn());
}

export function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

export function silenceConsole() {
  return {
    info: vi.spyOn(console, "info").mockImplementation(() => {}),
    error: vi.spyOn(console, "error").mockImplementation(() => {}),
  };
}

type SolanaPluginOptions = Parameters<typeof createSolanaPlugin>[0];

export function mountSolanaPlugin(
  options?: SolanaPluginOptions,
  composables: { wallet?: boolean } = {},
) {
  const result: {
    solana?: ReturnType<typeof useSolana>;
    wallet?: ReturnType<typeof useWallet>;
  } = {};

  mount(
    defineComponent({
      setup() {
        result.solana = useSolana();

        if (composables.wallet) {
          result.wallet = useWallet();
        }

        return () => h("div");
      },
    }),
    {
      global: {
        plugins: [[createSolanaPlugin(options)]],
      },
    },
  );

  return result;
}

export function installSolanaPlugin(options: SolanaPluginOptions, app: App) {
  createSolanaPlugin(options).install(app);
}

const mockCore = vi.hoisted(() => ({
  adaptSolanaIosWallet: vi.fn(),
  createSolanaContext: vi.fn(),
  getSolanaIosWallets: vi.fn<() => SolanaWalletInfo[]>(() => []),
  getRegisteredSolanaWallets: vi.fn<() => SolanaWalletInfo[]>(),
  handleSolanaIosWalletCallback: vi.fn(),
  isSolanaIosWalletInfo: vi.fn(() => false),
  registerSolanaMobileWallet: vi.fn(),
  subscribeSolanaWallets: vi.fn(),
}));

const adaptSolanaIosWallet: Mock = mockCore.adaptSolanaIosWallet;
const createSolanaContext: Mock = mockCore.createSolanaContext;
const getSolanaIosWallets: Mock = mockCore.getSolanaIosWallets;
const getRegisteredSolanaWallets: Mock = mockCore.getRegisteredSolanaWallets;
const handleSolanaIosWalletCallback: Mock = mockCore.handleSolanaIosWalletCallback;
const isSolanaIosWalletInfo: Mock = mockCore.isSolanaIosWalletInfo;
const registerSolanaMobileWallet: Mock = mockCore.registerSolanaMobileWallet;
const subscribeSolanaWallets: Mock = mockCore.subscribeSolanaWallets;

vi.mock("@vue-solana/core/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/rpc")>();

  return {
    ...actual,
    createSolanaContext: mockCore.createSolanaContext,
  };
});

vi.mock("@vue-solana/core/wallet-standard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/wallet-standard")>();

  return {
    ...actual,
    getRegisteredSolanaWallets: mockCore.getRegisteredSolanaWallets,
    subscribeSolanaWallets: mockCore.subscribeSolanaWallets,
  };
});

vi.mock("@vue-solana/core/mobile-wallet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/mobile-wallet")>();

  return {
    ...actual,
    registerSolanaMobileWallet: mockCore.registerSolanaMobileWallet,
  };
});

vi.mock("@vue-solana/core/ios-wallet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@vue-solana/core/ios-wallet")>();

  return {
    ...actual,
    adaptSolanaIosWallet: mockCore.adaptSolanaIosWallet,
    getSolanaIosWallets: mockCore.getSolanaIosWallets,
    handleSolanaIosWalletCallback: mockCore.handleSolanaIosWalletCallback,
    isSolanaIosWalletInfo: mockCore.isSolanaIosWalletInfo,
  };
});

export function installPluginTestHooks() {
  beforeEach(() => {
    mockWalletDiscovery([]);
    getSolanaIosWallets.mockReturnValue([]);
    isSolanaIosWalletInfo.mockReturnValue(false);
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
    handleSolanaIosWalletCallback.mockReset();
    isSolanaIosWalletInfo.mockReset();
    isSolanaIosWalletInfo.mockReturnValue(false);
    registerSolanaMobileWallet.mockReset();
    subscribeSolanaWallets.mockReset();
    mockWalletDiscovery([]);
    window.localStorage.clear();
  });
}

export {
  adaptSolanaIosWallet,
  createSolanaContext,
  getSolanaIosWallets,
  getRegisteredSolanaWallets,
  handleSolanaIosWalletCallback,
  isSolanaIosWalletInfo,
  registerSolanaMobileWallet,
  subscribeSolanaWallets,
};
