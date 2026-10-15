import type { Wallet, WalletAccount } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect, StandardEvents } from "@wallet-standard/features";
import { getBase58Decoder } from "@solana/kit";
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
  return new Uint8Array([1, 2, 3, 4, 5]);
}

export interface SigningTestAccount {
  account: WalletAccount;
  /** Produces a real Ed25519 signature over `message` for `account.publicKey`. */
  sign(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * A Wallet Standard account backed by a freshly generated Ed25519 key pair, so
 * tests can hand the adapter signatures that actually verify. The all-zero
 * `account` fixture above cannot: Kit 8.5+ rejects small-order public keys, so a
 * signature over it never verifies.
 */
export async function createSigningTestAccount(): Promise<SigningTestAccount> {
  const keyPair = (await globalThis.crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const publicKey = new Uint8Array(
    await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey),
  );

  return {
    account: {
      address: getBase58Decoder().decode(publicKey),
      publicKey,
      chains: ["solana:devnet"],
      features: [],
    } satisfies WalletAccount,
    async sign(message) {
      return new Uint8Array(
        await globalThis.crypto.subtle.sign(
          "Ed25519",
          keyPair.privateKey,
          message as unknown as BufferSource,
        ),
      );
    },
  };
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

          // Faithful unsubscribe: clearing the listener models the real
          // Wallet Standard `on("change")` return, so `dispose()` tests can
          // assert event delivery actually stops.
          return () => {
            eventsListener = null;
          };
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
