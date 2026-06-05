import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWallet } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useWallet } from "./useWallet";

const publicKey = { toBase58: () => "public-key" } as SolanaWallet["publicKey"];

describe("useWallet", () => {
  it("exposes wallet state and actions", async () => {
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

    await result?.connect();
    await result?.disconnect();

    expect(wallet.connect).toHaveBeenCalledOnce();
    expect(wallet.disconnect).toHaveBeenCalledOnce();
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
