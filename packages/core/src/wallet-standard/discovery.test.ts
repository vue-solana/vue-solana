import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SolanaSignAndSendTransaction,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import {
  getRegisteredSolanaWallets,
  isSolanaStandardWallet,
  SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME,
} from "./discovery";
import { createStandardWallet } from "./test-utils.test-utils";

const walletRegistry = vi.hoisted(() => ({
  wallets: [] as ReturnType<typeof createStandardWallet>[],
}));

vi.mock("@wallet-standard/app", () => ({
  getWallets: () => ({
    get: () => walletRegistry.wallets,
    on: () => vi.fn(),
  }),
}));

describe("Wallet Standard discovery", () => {
  afterEach(() => {
    walletRegistry.wallets = [];
    vi.unstubAllGlobals();
  });

  it("keeps the local mobile wallet adapter name aligned with the upstream package", async () => {
    const { SolanaMobileWalletAdapterWalletName } =
      await import("@solana-mobile/wallet-standard-mobile");

    expect(SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME).toBe(SolanaMobileWalletAdapterWalletName);
  });

  it("detects standard wallets that support Solana", () => {
    expect(isSolanaStandardWallet(createStandardWallet())).toBe(true);
    expect(isSolanaStandardWallet({ ...createStandardWallet(), chains: ["eip155:1"] })).toBe(false);
  });

  it("populates capability metadata for discovered standard wallets", async () => {
    const wallet = createStandardWallet();
    (wallet.features as Record<string, unknown>)[SolanaSignMessage] = {
      version: "1.0.0",
      signMessage: async () => [],
    };
    (wallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signTransaction: async () => [],
    };
    (wallet.features as Record<string, unknown>)[SolanaSignAndSendTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signAndSendTransaction: async () => [],
    };
    walletRegistry.wallets = [wallet];
    vi.stubGlobal("window", {});

    expect(getRegisteredSolanaWallets()[0]?.capabilities).toEqual({
      connect: true,
      disconnect: true,
      signMessage: true,
      signTransaction: true,
      signAllTransactions: true,
      signAndSendTransaction: true,
    });
  });
});
