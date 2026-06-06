import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, shallowRef } from "vue";
import type { SolanaWalletInfo } from "@vue-solana/core";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";
import { useWallets } from "./useWallets";

describe("useWallets", () => {
  it("exposes discovered wallets and selection actions", () => {
    const walletInfo = {
      name: "Test Wallet",
      icon: "data:image/png;base64,AA==",
      chains: ["solana:devnet"],
      accounts: [],
      wallet: {},
    } satisfies SolanaWalletInfo;
    const refreshWallets = vi.fn();
    const selectWallet = vi.fn();
    const context = createMockSolanaContext({
      wallets: shallowRef([walletInfo]),
      selectedWallet: shallowRef(walletInfo),
      refreshWallets,
      selectWallet,
    });
    let result: ReturnType<typeof useWallets> | undefined;

    mountWithSolana(
      defineComponent({
        setup() {
          result = useWallets();

          return () => h("div");
        },
      }),
      context,
    );

    expect(result?.wallets.value).toEqual([walletInfo]);
    expect(result?.selectedWallet.value).toBe(walletInfo);

    result?.refreshWallets();
    result?.selectWallet(null);

    expect(refreshWallets).toHaveBeenCalledOnce();
    expect(selectWallet).toHaveBeenCalledWith(null);
  });
});
