import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWallet } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useWallet } from "./useWallet";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

describe("useWallet", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes wallet state and actions", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const wallet = {
      publicKey,
      connected: true,
      connecting: false,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    } as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useWallet> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useWallet();

          return () => h("div");
        },
      }),
      context,
    );

    expect(result?.publicKey.value).toBe(publicKey);
    expect(result?.connected.value).toBe(true);
    expect(result?.connecting.value).toBe(false);
    expect(result?.disconnecting.value).toBe(false);
    expect(result?.loading.value).toBe(false);

    await result?.connect();
    await result?.disconnect();

    expect(wallet.connect).toHaveBeenCalledOnce();
    expect(wallet.disconnect).toHaveBeenCalledOnce();
    expect(console.info).toHaveBeenCalledWith("[Vue Solana] Wallet connected", {
      publicKey: "public-key",
    });
    expect(console.info).toHaveBeenCalledWith("[Vue Solana] Wallet disconnected", {
      publicKey: "public-key",
    });
  });

  it("refreshes computed state after a wallet mutates during disconnect", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    let connected = true;
    let currentPublicKey = publicKey;
    const wallet = {
      get publicKey() {
        return currentPublicKey;
      },
      get connected() {
        return connected;
      },
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockImplementation(async () => {
        connected = false;
        currentPublicKey = null;
      }),
    } as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useWallet> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useWallet();

          return () => h("div");
        },
      }),
      context,
    );

    expect(result?.connected.value).toBe(true);

    await result?.disconnect();

    expect(result?.connected.value).toBe(false);
    expect(result?.publicKey.value).toBeNull();
  });

  it("tracks disconnect loading state while disconnect is pending", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    let resolveDisconnect: (() => void) | undefined;
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveDisconnect = resolve;
          }),
      ),
    } as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    let result: ReturnType<typeof useWallet> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useWallet();

          return () => h("div");
        },
      }),
      context,
    );

    const disconnect = result?.disconnect();

    expect(result?.disconnecting.value).toBe(true);
    expect(result?.loading.value).toBe(true);

    resolveDisconnect?.();
    await disconnect;

    expect(result?.disconnecting.value).toBe(false);
    expect(result?.loading.value).toBe(false);
  });

  it("sets and clears the active wallet", () => {
    const context = createMockSolanaContext();
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as SolanaWallet;
    let result: ReturnType<typeof useWallet> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useWallet();

          return () => h("div");
        },
      }),
      context,
    );

    result?.setWallet(wallet);
    expect(result?.wallet.value).toBe(wallet);
    expect(result?.connected.value).toBe(true);

    result?.setWallet(null);
    expect(result?.wallet.value).toBeNull();
    expect(result?.connected.value).toBe(false);
  });

  it("rejects connect when no wallet is configured and resolves disconnect", async () => {
    let result: ReturnType<typeof useWallet> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useWallet();

          return () => h("div");
        },
      }),
    );

    await expect(result?.connect()).rejects.toThrow("No Solana wallet is configured");
    await expect(result?.disconnect()).resolves.toBeUndefined();
  });
});
