import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWallet } from "@vue-solana/core";
import type { SolanaError } from "@vue-solana/core/errors";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useWallet } from "./useWallet";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

type WalletResult = ReturnType<typeof useWallet>;
type TestSolanaContext = ReturnType<typeof createMockSolanaContext>;

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
      signMessage: vi.fn(),
    } as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    const result = mountUseWallet(context);

    expect(result.publicKey.value).toBe(publicKey);
    expect(result.connected.value).toBe(true);
    expect(result.connecting.value).toBe(false);
    expect(result.disconnecting.value).toBe(false);
    expect(result.loading.value).toBe(false);
    expect(result.canConnect.value).toBe(true);
    expect(result.canDisconnect.value).toBe(true);
    expect(result.canSignMessage.value).toBe(true);
    expect(result.canSignTransaction.value).toBe(false);
    expect(result.canSignAllTransactions.value).toBe(false);
    expect(result.canSignAndSendTransaction.value).toBe(false);
    expect(result.capabilities.value).toEqual({
      connect: true,
      disconnect: true,
      signMessage: true,
      signTransaction: false,
      signAllTransactions: false,
      signAndSendTransaction: false,
    });

    await result.connect();
    await result.disconnect();

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
    const result = mountUseWallet(context);

    expect(result.connected.value).toBe(true);

    await result.disconnect();

    expect(result.connected.value).toBe(false);
    expect(result.publicKey.value).toBeNull();
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
    const result = mountUseWallet(context);

    const disconnect = result.disconnect();

    expect(result.disconnecting.value).toBe(true);
    expect(result.loading.value).toBe(true);

    resolveDisconnect?.();
    await disconnect;

    expect(result.disconnecting.value).toBe(false);
    expect(result.loading.value).toBe(false);
  });

  it("sets and clears the active wallet", () => {
    const context = createMockSolanaContext();
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as SolanaWallet;
    const result = mountUseWallet(context);

    result.setWallet(wallet);
    expect(result.wallet.value).toBe(wallet);
    expect(result.connected.value).toBe(true);

    result.setWallet(null);
    expect(result.wallet.value).toBeNull();
    expect(result.connected.value).toBe(false);
  });

  it("updates capability flags when the active wallet changes", () => {
    const context = createMockSolanaContext();
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signMessage: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn(),
      signAndSendTransaction: vi.fn(),
    } as unknown as SolanaWallet;
    const result = mountUseWallet(context);

    expect(result.canSignMessage.value).toBe(false);

    result.setWallet(wallet);

    expect(result.capabilities.value).toEqual({
      connect: true,
      disconnect: true,
      signMessage: true,
      signTransaction: true,
      signAllTransactions: true,
      signAndSendTransaction: true,
    });
  });

  it("rejects connect when no wallet is configured and resolves disconnect", async () => {
    const result = mountUseWallet();

    await expect(result.connect()).rejects.toThrow("No Solana wallet is selected");
    await expect(result.disconnect()).resolves.toBeUndefined();
  });

  it("normalizes wallet connect rejections", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = { code: 4001, message: "User rejected connection" };
    const wallet = {
      publicKey: null,
      connected: false,
      connect: vi.fn().mockRejectedValue(cause),
      disconnect: vi.fn(),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    const result = mountUseWallet(context);

    await expect(result.connect()).rejects.toMatchObject({
      code: "USER_REJECTED",
      cause,
    } satisfies Partial<SolanaError>);
  });

  it("normalizes wallet disconnect failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("disconnect transport failed");
    const wallet = {
      publicKey,
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn().mockRejectedValue(cause),
    } as unknown as SolanaWallet;
    const context = createMockSolanaContext({ wallet: shallowRef(wallet) });
    const result = mountUseWallet(context);

    await expect(result.disconnect()).rejects.toMatchObject({
      code: "RPC_FAILURE",
      cause,
    } satisfies Partial<SolanaError>);
  });
});

function mountUseWallet(context?: TestSolanaContext): WalletResult {
  let result: WalletResult | undefined;

  mountWithSolana(
    defineComponent({
      setup() {
        result = useWallet();

        return () => h("div");
      },
    }),
    context,
  );

  if (!result) {
    throw new Error("useWallet did not mount.");
  }

  return result;
}
