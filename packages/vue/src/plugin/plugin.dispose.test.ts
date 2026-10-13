import { describe, expect, it, vi } from "vitest";
import type { App } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import {
  adaptSolanaIosWallet,
  createDeferred,
  createSolanaContext,
  getSolanaIosWallets,
  installPluginTestHooks,
  isSolanaIosWalletInfo,
  mockSolanaContext,
  mockWalletDiscovery,
  silenceConsole,
  subscribeSolanaWallets,
} from "./plugin.test-utils";
import { createSolanaPlugin } from "../plugin";

function createAppStub() {
  return { provide: vi.fn() } as unknown as App;
}

function installPlugin() {
  const plugin = createSolanaPlugin({ mobileWallet: false });
  plugin.install(createAppStub());

  return plugin;
}

describe("createSolanaPlugin dispose", () => {
  installPluginTestHooks();

  it("unsubscribes from wallet discovery", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    const plugin = installPlugin();

    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();

    const unsubscribe = subscribeSolanaWallets.mock.results[0]?.value;

    plugin.dispose();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("cancels the deferred bootstrap when called before it runs", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    const plugin = installPlugin();

    plugin.dispose();

    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets).not.toHaveBeenCalled();
    expect(plugin.context?.status?.value).toBe("idle");
  });

  it("is safe before install and when called twice", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    const plugin = createSolanaPlugin({ mobileWallet: false });

    expect(() => plugin.dispose()).not.toThrow();

    plugin.install(createAppStub());

    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();

    const unsubscribe = subscribeSolanaWallets.mock.results[0]?.value;

    plugin.dispose();
    plugin.dispose();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("ignores an RPC check that resolves after dispose", async () => {
    silenceConsole();
    const check = createDeferred<{ value: { blockhash: string } }>();
    createSolanaContext.mockReturnValue({
      cluster: "devnet",
      endpoint: "https://api.devnet.solana.com",
      wsEndpoint: "wss://api.devnet.solana.com",
      client: {
        rpc: { getLatestBlockhash: vi.fn().mockReturnValue({ send: () => check.promise }) },
      },
    });
    const plugin = installPlugin();

    await vi.waitFor(() => {
      expect(plugin.context?.status?.value).toBe("checking");
    });

    plugin.dispose();
    check.resolve({ value: { blockhash: "late-blockhash" } });

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(plugin.context?.status?.value).toBe("checking");
    expect(plugin.context?.latestBlockhash?.value).toBeNull();
  });

  it("makes a late mobile-wallet registration a no-op after dispose", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    // Mobile path enabled (no `mobileWallet: false`): the support gate is
    // mocked to true in `plugin.test-utils.ts`, so `refreshWallets()` kicks
    // off the lazy `import("@vue-solana/core/mobile-wallet")`.
    const plugin = createSolanaPlugin();
    plugin.install(createAppStub());

    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();

    const callsAfterBootstrap = subscribeSolanaWallets.mock.calls.length;

    plugin.dispose();
    plugin.context?.refreshWallets();

    // Let the pre-dispose dynamic import resolve; its `.then` must not
    // register or re-subscribe.
    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets.mock.calls.length).toBe(callsAfterBootstrap);
  });

  it("makes a manual refreshWallets a no-op after dispose", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    const plugin = installPlugin();

    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets).toHaveBeenCalledOnce();

    const callsAfterBootstrap = subscribeSolanaWallets.mock.calls.length;

    plugin.dispose();
    plugin.context?.refreshWallets();

    await vi.advanceTimersByTimeAsync(0);

    expect(subscribeSolanaWallets.mock.calls.length).toBe(callsAfterBootstrap);
  });

  it("releases adapted-wallet change subscriptions on dispose", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    let changeListener: ((properties: { accounts: unknown[] }) => void) | null = null;
    const standardWallet = {
      version: "1.0.0",
      name: "Test Wallet",
      icon: "data:image/png;base64,AA==",
      chains: ["solana:devnet"],
      accounts: [],
      features: {
        "standard:events": {
          version: "1.0.0",
          on: vi.fn((_event: string, listener: (properties: { accounts: unknown[] }) => void) => {
            changeListener = listener;
            return () => {
              changeListener = null;
            };
          }),
        },
      },
    };
    const walletInfo = {
      name: "Test Wallet",
      icon: "data:image/png;base64,AA==",
      chains: ["solana:devnet"],
      accounts: [],
      wallet: standardWallet,
    } as unknown as SolanaWalletInfo;
    mockWalletDiscovery([walletInfo]);
    const plugin = installPlugin();

    await vi.advanceTimersByTimeAsync(0);

    plugin.context?.selectWallet(walletInfo);

    expect(changeListener).not.toBeNull();

    plugin.dispose();

    // The registry's `disposeAllAdaptedWallets()` ran the adapter's
    // unsubscribe: the captured listener is gone and a second dispose is safe.
    expect(changeListener).toBeNull();
    expect(() => plugin.dispose()).not.toThrow();
  });

  it("releases subscriptions for wallets unregistered before dispose", async () => {
    vi.useFakeTimers();
    silenceConsole();
    mockSolanaContext();
    let changeListener: ((properties: { accounts: unknown[] }) => void) | null = null;
    const standardWallet = {
      version: "1.0.0",
      name: "Test Wallet",
      icon: "data:image/png;base64,AA==",
      chains: ["solana:devnet"],
      accounts: [],
      features: {
        "standard:events": {
          version: "1.0.0",
          on: vi.fn((_event: string, listener: (properties: { accounts: unknown[] }) => void) => {
            changeListener = listener;
            return () => {
              changeListener = null;
            };
          }),
        },
      },
    };
    const walletInfo = {
      name: "Test Wallet",
      icon: "data:image/png;base64,AA==",
      chains: ["solana:devnet"],
      accounts: [],
      wallet: standardWallet,
    } as unknown as SolanaWalletInfo;
    mockWalletDiscovery([walletInfo]);
    const plugin = installPlugin();

    await vi.advanceTimersByTimeAsync(0);

    plugin.context?.selectWallet(walletInfo);

    expect(changeListener).not.toBeNull();

    // The wallet disappeared from discovery after adaptation (e.g. extension
    // unload). Teardown tracks every adapter it created rather than only what
    // discovery still lists, so the subscription is still released.
    mockWalletDiscovery([]);
    plugin.context?.refreshWallets();
    plugin.dispose();

    expect(changeListener).toBeNull();
  });

  it("reuses iOS adapters across selections instead of rebuilding them", async () => {
    vi.useFakeTimers();
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
    } as unknown as SolanaWalletInfo;
    mockWalletDiscovery([]);
    getSolanaIosWallets.mockReturnValue([iosWalletInfo]);
    isSolanaIosWalletInfo.mockReturnValue(true);
    const adaptedWallet = {
      publicKey: null,
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
    adaptSolanaIosWallet.mockReturnValue(adaptedWallet);
    const plugin = installPlugin();

    await vi.advanceTimersByTimeAsync(0);

    plugin.context?.selectWallet(iosWalletInfo);
    const firstAdapter = plugin.context?.wallet.value;

    plugin.context?.selectWallet(null);
    plugin.context?.selectWallet(iosWalletInfo);
    const secondAdapter = plugin.context?.wallet.value;

    expect(firstAdapter).toBeDefined();
    expect(secondAdapter).toBe(firstAdapter);
    expect(adaptSolanaIosWallet).toHaveBeenCalledTimes(1);
  });
});
