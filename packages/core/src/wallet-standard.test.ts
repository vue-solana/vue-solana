import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import { SolanaSignTransaction } from "@solana/wallet-standard-features";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3-compat";
import {
  adaptSolanaStandardWallet,
  getSolanaChain,
  isSolanaStandardWallet,
  SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME,
} from "./wallet-standard";
import type { SolanaWalletInfo } from "./types";

type TestStandardWallet = Wallet & {
  emitAccountsChange(accounts: readonly WalletAccount[]): void;
};

type ConnectFeature = { connect: Mock };
type DisconnectFeature = { disconnect: Mock };

const account = {
  address: "11111111111111111111111111111111",
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
  features: [],
} satisfies WalletAccount;

function createTestTransaction() {
  const publicKey = new PublicKey(account.address);

  return new Transaction({
    feePayer: new PublicKey(account.address),
    recentBlockhash: "11111111111111111111111111111111",
  }).add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: publicKey,
      lamports: 0,
    }),
  );
}

function createStandardWallet(accounts: readonly WalletAccount[] = []): TestStandardWallet {
  let eventsListener: ((properties: { accounts?: readonly WalletAccount[] }) => void) | null = null;

  return {
    version: "1.0.0",
    name: "Test Wallet",
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
      [StandardEvents]: {
        version: "1.0.0",
        on: vi.fn((event, listener) => {
          if (event === "change") {
            eventsListener = listener;
          }

          return vi.fn();
        }),
      },
    },
    emitAccountsChange(accounts: readonly WalletAccount[]) {
      eventsListener?.({ accounts });
    },
  } as TestStandardWallet;
}

function getConnectFeature(wallet: Wallet): ConnectFeature {
  return wallet.features[StandardConnect] as ConnectFeature;
}

function getDisconnectFeature(wallet: Wallet): DisconnectFeature {
  return wallet.features[StandardDisconnect] as DisconnectFeature;
}

describe("Wallet Standard adapter", () => {
  it("maps Solana clusters to Wallet Standard chains", () => {
    expect(getSolanaChain("mainnet-beta")).toBe("solana:mainnet");
    expect(getSolanaChain("testnet")).toBe("solana:testnet");
    expect(getSolanaChain("devnet")).toBe("solana:devnet");
    expect(getSolanaChain("localnet")).toBe("solana:localnet");
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

  it("adapts connect and disconnect to SolanaWallet", async () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();

    await wallet.connect();

    expect(wallet.connected).toBe(true);
    expect(wallet.publicKey?.toBase58()).toBe(account.address);
    expect(getConnectFeature(standardWallet).connect).toHaveBeenCalledOnce();

    await wallet.disconnect();

    expect(wallet.connected).toBe(false);
    expect(getDisconnectFeature(standardWallet).disconnect).toHaveBeenCalledOnce();
  });

  it("copies wallet source metadata onto adapted wallets", () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      platform: "mobile",
      source: "mobile-wallet-adapter",
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.platform).toBe("mobile");
    expect(wallet.source).toBe("mobile-wallet-adapter");
  });

  it("starts disconnected when a standard wallet already exposes accounts", async () => {
    const standardWallet = createStandardWallet([account]);
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();

    standardWallet.emitAccountsChange([account]);

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();

    await wallet.connect();

    expect(wallet.connected).toBe(true);
    expect(wallet.publicKey?.toBase58()).toBe(account.address);
  });

  it("notifies when wallet state changes", async () => {
    const onChange = vi.fn();
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet", onChange });

    await wallet.connect();

    expect(onChange).toHaveBeenCalledTimes(2);

    standardWallet.emitAccountsChange([account]);

    expect(onChange).toHaveBeenCalledTimes(3);

    await wallet.disconnect();

    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it("keeps a deliberately disconnected wallet disconnected across account events", async () => {
    const standardWallet = createStandardWallet();
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    await wallet.connect();
    await wallet.disconnect();
    standardWallet.emitAccountsChange([account]);

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();
  });

  it("rejects signAllTransactions when a wallet returns fewer results than requested", async () => {
    const standardWallet = createStandardWallet();
    const signTransaction = vi.fn().mockResolvedValue([]);
    (standardWallet.features as Record<string, unknown>)[SolanaSignTransaction] = {
      version: "1.0.0",
      supportedTransactionVersions: ["legacy"],
      signTransaction,
    };
    const walletInfo = {
      name: standardWallet.name,
      icon: standardWallet.icon,
      chains: standardWallet.chains,
      accounts: [],
      wallet: standardWallet,
    } satisfies SolanaWalletInfo;
    const wallet = adaptSolanaStandardWallet(walletInfo, { chain: "solana:devnet" });

    await wallet.connect();

    await expect(
      wallet.signAllTransactions?.([createTestTransaction(), createTestTransaction()]),
    ).rejects.toThrow("Solana wallet returned 0 signed transactions for 2 requested transactions");
    expect(signTransaction).toHaveBeenCalledOnce();
  });
});
