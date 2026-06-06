import { describe, expect, it, vi } from "vitest";
import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import {
  adaptSolanaStandardWallet,
  getSolanaChain,
  isSolanaStandardWallet,
} from "./wallet-standard";
import type { SolanaWalletInfo } from "./types";

const account = {
  address: "11111111111111111111111111111111",
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
  features: [],
} satisfies WalletAccount;

function createStandardWallet(accounts: readonly WalletAccount[] = []): Wallet {
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
  } as Wallet & { emitAccountsChange(accounts: readonly WalletAccount[]): void };
}

describe("Wallet Standard adapter", () => {
  it("maps Solana clusters to Wallet Standard chains", () => {
    expect(getSolanaChain("mainnet-beta")).toBe("solana:mainnet");
    expect(getSolanaChain("testnet")).toBe("solana:testnet");
    expect(getSolanaChain("devnet")).toBe("solana:devnet");
    expect(getSolanaChain("localnet")).toBe("solana:localnet");
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
    expect(standardWallet.features[StandardConnect].connect).toHaveBeenCalledOnce();

    await wallet.disconnect();

    expect(wallet.connected).toBe(false);
    expect(standardWallet.features[StandardDisconnect].disconnect).toHaveBeenCalledOnce();
  });

  it("notifies when wallet state changes", async () => {
    const onChange = vi.fn();
    const standardWallet = createStandardWallet() as Wallet & {
      emitAccountsChange(accounts: readonly WalletAccount[]): void;
    };
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
    const standardWallet = createStandardWallet() as Wallet & {
      emitAccountsChange(accounts: readonly WalletAccount[]): void;
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
    await wallet.disconnect();
    standardWallet.emitAccountsChange([account]);

    expect(wallet.connected).toBe(false);
    expect(wallet.publicKey).toBeNull();
  });
});
