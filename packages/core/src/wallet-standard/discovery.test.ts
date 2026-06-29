import { describe, expect, it } from "vitest";
import { isSolanaStandardWallet, SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME } from "./discovery";
import { createStandardWallet } from "./test-utils.test-utils";

describe("Wallet Standard discovery", () => {
  it("keeps the local mobile wallet adapter name aligned with the upstream package", async () => {
    const { SolanaMobileWalletAdapterWalletName } =
      await import("@solana-mobile/wallet-standard-mobile");

    expect(SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME).toBe(SolanaMobileWalletAdapterWalletName);
  });

  it("detects standard wallets that support Solana", () => {
    expect(isSolanaStandardWallet(createStandardWallet())).toBe(true);
    expect(isSolanaStandardWallet({ ...createStandardWallet(), chains: ["eip155:1"] })).toBe(false);
  });
});
