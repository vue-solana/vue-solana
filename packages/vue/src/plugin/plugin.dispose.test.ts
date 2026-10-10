import { describe, expect, it, vi } from "vitest";
import type { App } from "vue";
import {
  createDeferred,
  createSolanaContext,
  installPluginTestHooks,
  mockSolanaContext,
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
});
