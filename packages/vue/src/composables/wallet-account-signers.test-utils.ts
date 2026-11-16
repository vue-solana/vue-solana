import { defineComponent, h, shallowRef } from "vue";
import { vi } from "vitest";
import type { SolanaWallet, SolanaWalletInfo } from "@vue-solana/core/types";
import {
  address,
  compileTransaction,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
  type Transaction,
} from "@vue-solana/core/kit";
import { createMockSolanaContext, mountWithSolana } from "../../test-utils";

export const PAYER = address("9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin");
export const OTHER = address("Vote111111111111111111111111111111111111111");
export const BLOCKHASH = "11111111111111111111111111111111" as Blockhash;
export const OTHER_BLOCKHASH = "EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N" as Blockhash;
export const SIGNATURE_BASE58 = "1".repeat(64);

export const ACCOUNT: SolanaWalletInfo["accounts"][number] = {
  address: PAYER,
  publicKey: new Uint8Array(32),
  chains: ["solana:devnet"],
};

export function createTransaction(blockhash: Blockhash = BLOCKHASH): Transaction {
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (next) => setTransactionMessageFeePayer(PAYER, next),
    (next) =>
      setTransactionMessageLifetimeUsingBlockhash({ blockhash, lastValidBlockHeight: 100n }, next),
  );

  return compileTransaction(message);
}

export function createWallet(overrides: Partial<SolanaWallet> = {}): SolanaWallet {
  return {
    publicKey: PAYER,
    connected: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  } as unknown as SolanaWallet;
}

export function withWallet<T>(wallet: SolanaWallet | null, create: () => T): T {
  let result: T | undefined;
  const context = createMockSolanaContext({ wallet: shallowRef(wallet) });

  mountWithSolana(
    defineComponent({
      setup() {
        result = create();

        return () => h("div");
      },
    }),
    context,
  );

  return result as T;
}
