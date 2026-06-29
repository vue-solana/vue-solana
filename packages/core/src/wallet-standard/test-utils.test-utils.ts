import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3-compat";
import { vi, type Mock } from "vitest";

export type TestStandardWallet = Wallet & {
  emitAccountsChange(accounts: readonly WalletAccount[]): void;
};

export type ConnectFeature = { connect: Mock };
export type DisconnectFeature = { disconnect: Mock };

export const account = {
  address: "11111111111111111111111111111111",
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
  features: [],
} satisfies WalletAccount;

export function createTestTransaction() {
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

export function createStandardWallet(accounts: readonly WalletAccount[] = []): TestStandardWallet {
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

export function getConnectFeature(wallet: Wallet): ConnectFeature {
  return wallet.features[StandardConnect] as ConnectFeature;
}

export function getDisconnectFeature(wallet: Wallet): DisconnectFeature {
  return wallet.features[StandardDisconnect] as DisconnectFeature;
}
