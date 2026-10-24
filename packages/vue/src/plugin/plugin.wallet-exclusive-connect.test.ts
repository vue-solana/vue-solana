import { describe, expect, it, vi } from "vitest";
import type { SolanaWalletInfo } from "@vue-solana/core/types";
import {
  account,
  createStandardWallet,
  createWalletInfo,
  getConnectFeature,
  getDisconnectFeature,
  installPluginTestHooks,
  mockSolanaContext,
  mockWalletDiscovery,
  mountSolanaPlugin,
} from "./plugin.test-utils";

/**
 * Only one wallet may stay authorized for the app at a time: a second
 * authorized extension is what makes the wrong wallet answer a signing request
 * (a Phantom connection signing through Backpack, for example).
 */
function mountTwoWallets() {
  const phantom = createStandardWallet([], "Phantom");
  const backpack = createStandardWallet([], "Backpack");
  const phantomInfo = createWalletInfo(phantom);
  const backpackInfo = createWalletInfo(backpack);
  mockSolanaContext();
  mockWalletDiscovery([phantomInfo, backpackInfo]);
  const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });

  solana?.refreshWallets();

  return { backpack, backpackInfo, phantom, phantomInfo, solana, wallet };
}

describe("createSolanaPlugin exclusive connect", () => {
  installPluginTestHooks();

  it("disconnects every other discovered wallet after a successful connect", async () => {
    const { backpack, phantom, phantomInfo, solana, wallet } = mountTwoWallets();

    solana?.selectWallet(phantomInfo);
    await wallet?.connect();

    expect(wallet?.connected.value).toBe(true);
    // Backpack was never selected, so it has no adapter here. The sweep has to
    // reach it through discovery, which is the case that used to leak an
    // authorized extension from an earlier page session.
    expect(getDisconnectFeature(backpack).disconnect).toHaveBeenCalledTimes(1);
    expect(getDisconnectFeature(phantom).disconnect).not.toHaveBeenCalled();
  });

  it("clears the cached state of a wallet that was connected earlier", async () => {
    const { backpackInfo, phantomInfo, solana, wallet } = mountTwoWallets();

    solana?.selectWallet(backpackInfo);
    await wallet?.connect();
    expect(wallet?.connected.value).toBe(true);

    solana?.selectWallet(phantomInfo);
    await wallet?.connect();
    expect(wallet?.connected.value).toBe(true);

    // Switching back must not resurrect the previous connection: the sweep went
    // through that wallet's adapter, so its cached account is gone.
    solana?.selectWallet(backpackInfo);
    expect(wallet?.connected.value).toBe(false);
  });

  it("keeps the connection when another wallet refuses to disconnect", async () => {
    const { backpack, phantomInfo, solana, wallet } = mountTwoWallets();
    getDisconnectFeature(backpack).disconnect.mockRejectedValue(new Error("user rejected"));

    solana?.selectWallet(phantomInfo);

    await expect(wallet?.connect()).resolves.toBeUndefined();
    expect(wallet?.connected.value).toBe(true);
  });

  it("leaves other wallets alone when the connect is rejected", async () => {
    const { backpack, phantom, phantomInfo, solana, wallet } = mountTwoWallets();
    getConnectFeature(phantom).connect.mockRejectedValue(new Error("user rejected"));

    solana?.selectWallet(phantomInfo);

    await expect(wallet?.connect()).rejects.toBeTruthy();
    expect(getDisconnectFeature(backpack).disconnect).not.toHaveBeenCalled();
  });

  it("does not let a wallet that never answers hold up the connect", async () => {
    vi.useFakeTimers();
    const { backpack, phantomInfo, solana, wallet } = mountTwoWallets();
    // A disabled extension can leave a promise that never settles.
    getDisconnectFeature(backpack).disconnect.mockReturnValue(new Promise(() => {}));

    solana?.selectWallet(phantomInfo);
    const connecting = wallet?.connect();
    await vi.advanceTimersByTimeAsync(2_000);

    await expect(connecting).resolves.toBeUndefined();
    expect(wallet?.connected.value).toBe(true);
  });

  it("sweeps a cached adapter whose own disconnect fails without failing the connect", async () => {
    const { backpack, backpackInfo, phantomInfo, solana, wallet } = mountTwoWallets();
    getDisconnectFeature(backpack).disconnect.mockRejectedValue(new Error("user rejected"));

    solana?.selectWallet(backpackInfo);
    await wallet?.connect();
    solana?.selectWallet(phantomInfo);

    await expect(wallet?.connect()).resolves.toBeUndefined();
    expect(wallet?.connected.value).toBe(true);
    expect(getDisconnectFeature(backpack).disconnect).toHaveBeenCalledTimes(1);
  });

  it("survives a discovered entry that is not a Wallet Standard wallet", async () => {
    const phantom = createStandardWallet([], "Phantom");
    const backpack = createStandardWallet([], "Backpack");
    const phantomInfo = createWalletInfo(phantom);
    // iOS deep-link entries carry a primitive instead of a Wallet Standard wallet.
    const iosInfo = {
      name: "Phantom iOS",
      icon: "",
      chains: ["solana:devnet"],
      source: "deep-link",
      accounts: [],
      wallet: "https://phantom.app/ul/v1/connect",
    } satisfies SolanaWalletInfo;
    mockSolanaContext();
    mockWalletDiscovery([phantomInfo, createWalletInfo(backpack), iosInfo]);
    const { solana, wallet } = mountSolanaPlugin({ mobileWallet: false }, { wallet: true });
    solana?.refreshWallets();

    solana?.selectWallet(phantomInfo);

    await expect(wallet?.connect()).resolves.toBeUndefined();
    expect(wallet?.connected.value).toBe(true);
  });

  it("does not deauthorize the wallet it just connected when the extension re-registers", async () => {
    const { backpackInfo, phantom, phantomInfo, solana, wallet } = mountTwoWallets();

    // An extension update can unregister and re-register the wallet while its
    // `connect()` is in flight, so discovery reports a new wallet object with
    // the same metadata right before the sweep runs.
    const reRegisteredPhantom = createStandardWallet([], "Phantom");
    getConnectFeature(phantom).connect.mockImplementation(async () => {
      mockWalletDiscovery([createWalletInfo(reRegisteredPhantom), backpackInfo]);
      solana?.refreshWallets();

      return { accounts: [account] };
    });

    solana?.selectWallet(phantomInfo);
    await wallet?.connect();

    expect(wallet?.connected.value).toBe(true);
    expect(getDisconnectFeature(reRegisteredPhantom).disconnect).not.toHaveBeenCalled();
  });
});
