import { afterEach, describe, expect, it, vi } from "vitest";
import type { WalletAccount } from "@wallet-standard/base";
import {
  SolanaSignAndSendTransaction,
  SolanaSignIn,
  SolanaSignMessage,
  SolanaSignTransaction,
} from "@solana/wallet-standard-features";
import { adaptSolanaStandardWallet } from "./adapter";
import { PartialSignAndSendError } from "../errors";
import { setSolanaMobileWalletAuthorizationStore } from "../mobile-wallet-authorization";
import type { SolanaWalletInfo } from "../types";
import {
  account,
  createSigningTestAccount,
  createStandardWallet,
  createTestTransaction,
  getConnectFeature,
  getDisconnectFeature,
  type TestStandardWallet,
} from "./test-utils.test-utils";

// Behaviour specific to `@solana-mobile/wallet-standard-mobile` (Android MWA):
// the fakes below reproduce the result shapes that wallet actually returns.

function createMobileWalletInfo(standardWallet: TestStandardWallet) {
  return {
    name: standardWallet.name,
    icon: standardWallet.icon,
    chains: standardWallet.chains,
    platform: "mobile",
    source: "mobile-wallet-adapter",
    accounts: [],
    wallet: standardWallet,
  } satisfies SolanaWalletInfo;
}

function setFeature(standardWallet: TestStandardWallet, name: string, feature: object) {
  (standardWallet.features as Record<string, unknown>)[name] = { version: "1.0.0", ...feature };
}

function setAccounts(standardWallet: TestStandardWallet, accounts: readonly WalletAccount[]) {
  (standardWallet as { accounts: readonly WalletAccount[] }).accounts = accounts;
}

describe("Wallet Standard adapter — Mobile Wallet Adapter", () => {
  describe("signMessage", () => {
    it("accepts MWA's signed payload (message with the signature appended)", async () => {
      const { account: signerAccount, sign } = await createSigningTestAccount();
      const standardWallet = createStandardWallet();
      const message = new Uint8Array([1, 2, 3]);
      const signature = await sign(message);
      const signedPayload = new Uint8Array([...message, ...signature]);
      setFeature(standardWallet, SolanaSignMessage, {
        signMessage: vi.fn().mockResolvedValue([{ signedMessage: signedPayload, signature }]),
      });
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        account: signerAccount,
      });

      await expect(wallet.signMessage?.(message)).resolves.toEqual({
        signedMessage: message,
        signature,
      });
    });

    it("accepts a signed payload that is the bare signature", async () => {
      const { account: signerAccount, sign } = await createSigningTestAccount();
      const standardWallet = createStandardWallet();
      const message = new Uint8Array([1, 2, 3]);
      const signature = await sign(message);
      setFeature(standardWallet, SolanaSignMessage, {
        signMessage: vi.fn().mockResolvedValue([{ signedMessage: signature, signature }]),
      });
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        account: signerAccount,
      });

      await expect(wallet.signMessage?.(message)).resolves.toEqual({
        signedMessage: message,
        signature,
      });
    });

    it("still rejects an appended signature over different bytes", async () => {
      const { account: signerAccount, sign } = await createSigningTestAccount();
      const standardWallet = createStandardWallet();
      const message = new Uint8Array([1, 2, 3]);
      const signature = await sign(new Uint8Array([9, 9, 9]));
      setFeature(standardWallet, SolanaSignMessage, {
        signMessage: vi
          .fn()
          .mockResolvedValue([
            { signedMessage: new Uint8Array([...message, ...signature]), signature },
          ]),
      });
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        account: signerAccount,
      });

      await expect(wallet.signMessage?.(message)).rejects.toMatchObject({
        code: "INVALID_SIGNATURE",
      });
    });
  });

  describe("signIn", () => {
    async function createSignInWallet() {
      const { account: signerAccount, sign } = await createSigningTestAccount();
      const standardWallet = createStandardWallet();
      const signedMessage = new TextEncoder().encode("example.com wants you to sign in");
      const signature = await sign(signedMessage);
      const disconnect = getDisconnectFeature(standardWallet).disconnect;
      // MWA authorizes during sign-in: the account becomes the wallet's and a
      // `change` event fires before the result resolves.
      const signIn = vi.fn(async () => {
        setAccounts(standardWallet, [signerAccount]);
        standardWallet.emitAccountsChange([signerAccount]);
        return [{ account: signerAccount, signedMessage, signature }];
      });
      setFeature(standardWallet, SolanaSignIn, { signIn });
      getConnectFeature(standardWallet).connect.mockImplementation(async () => {
        setAccounts(standardWallet, [signerAccount]);
        return { accounts: [signerAccount] };
      });

      return { signerAccount, standardWallet, disconnect, signIn };
    }

    it("clears the cached authorization before signing in while connected", async () => {
      const { signerAccount, standardWallet, disconnect, signIn } = await createSignInWallet();
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        chain: "solana:devnet",
      });

      await wallet.connect();
      const result = await wallet.signIn?.();

      expect(disconnect).toHaveBeenCalledOnce();
      expect(disconnect.mock.invocationCallOrder[0]).toBeLessThan(
        signIn.mock.invocationCallOrder[0]!,
      );
      expect(signIn).toHaveBeenCalledWith({
        domain: location.host,
        address: signerAccount.address,
      });
      expect(result?.account.address).toBe(signerAccount.address);
      expect(wallet.connected).toBe(true);
      expect(wallet.publicKey).toBe(signerAccount.address);
    });

    it("signs in with the domain alone and connects when not connected", async () => {
      const { signerAccount, standardWallet, signIn } = await createSignInWallet();
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        chain: "solana:devnet",
      });

      await wallet.signIn?.();

      expect(signIn).toHaveBeenCalledWith({ domain: location.host });
      expect(wallet.connected).toBe(true);
      expect(wallet.publicKey).toBe(signerAccount.address);
    });
  });

  describe("failed signIn", () => {
    afterEach(() => {
      setSolanaMobileWalletAuthorizationStore(undefined);
    });

    // A fake that behaves like MWA's authorization: `disconnect` clears the
    // cache and the in-memory accounts, and a silent `connect` reloads them
    // from the cache without launching the wallet.
    async function createAuthorizingWallet() {
      const original = await createSigningTestAccount();
      const other = await createSigningTestAccount();
      const standardWallet = createStandardWallet();
      let cached: { accounts: readonly WalletAccount[] } | undefined;
      const store = {
        get: vi.fn(async () => cached),
        set: vi.fn(async (authorization: unknown) => {
          cached = authorization as typeof cached;
        }),
      };
      const authorize = (accounts: readonly WalletAccount[]) => {
        cached = { accounts };
        setAccounts(standardWallet, accounts);
        standardWallet.emitAccountsChange(accounts);
      };
      const connect = getConnectFeature(standardWallet).connect;
      connect.mockImplementation(async (input?: { silent?: boolean }) => {
        if (!input?.silent) {
          authorize([original.account]);
        } else if (cached) {
          authorize(cached.accounts);
        }

        return { accounts: standardWallet.accounts };
      });
      getDisconnectFeature(standardWallet).disconnect.mockImplementation(async () => {
        cached = undefined;
        setAccounts(standardWallet, []);
        standardWallet.emitAccountsChange([]);
      });
      const signIn = vi.fn();
      setFeature(standardWallet, SolanaSignIn, { signIn });
      // Every public key the app could have observed, change by change.
      const observedPublicKeys: (string | null)[] = [];
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        chain: "solana:devnet",
        onChange: () => observedPublicKeys.push(wallet.publicKey),
      });

      return {
        original,
        other,
        standardWallet,
        store,
        authorize,
        connect,
        signIn,
        wallet,
        observedPublicKeys,
      };
    }

    it("restores the previous authorization when the user cancels", async () => {
      const { original, standardWallet, store, connect, signIn, wallet } =
        await createAuthorizingWallet();
      setSolanaMobileWalletAuthorizationStore(store);
      signIn.mockRejectedValue(new Error("User declined"));

      await wallet.connect();
      await expect(wallet.signIn?.()).rejects.toThrow("User declined");

      expect(wallet.connected).toBe(true);
      expect(wallet.publicKey).toBe(original.account.address);
      expect(standardWallet.accounts).toEqual([original.account]);
      expect(store.set).toHaveBeenCalledWith({ accounts: [original.account] });
      // Restored from the cache: no second interactive authorization.
      expect(connect).toHaveBeenLastCalledWith({ silent: true });
    });

    it("drops another account's authorization instead of switching to it", async () => {
      const {
        original,
        other,
        standardWallet,
        store,
        authorize,
        signIn,
        wallet,
        observedPublicKeys,
      } = await createAuthorizingWallet();
      setSolanaMobileWalletAuthorizationStore(store);
      const signedMessage = new TextEncoder().encode("example.com wants you to sign in");
      const signature = await other.sign(signedMessage);
      signIn.mockImplementation(async () => {
        authorize([other.account]);
        return [{ account: other.account, signedMessage, signature }];
      });

      await wallet.connect();
      await expect(wallet.signIn?.()).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });

      expect(observedPublicKeys).not.toContain(other.account.address);
      expect(wallet.publicKey).toBe(original.account.address);
      expect(standardWallet.accounts).toEqual([original.account]);
    });

    it("reports disconnected when there is no authorization store to restore from", async () => {
      const { standardWallet, signIn, wallet } = await createAuthorizingWallet();
      signIn.mockRejectedValue(new Error("User declined"));

      await wallet.connect();
      await expect(wallet.signIn?.()).rejects.toThrow("User declined");

      expect(standardWallet.accounts).toEqual([]);
      expect(wallet.connected).toBe(false);
    });

    it("leaves a disconnected app disconnected", async () => {
      const { standardWallet, store, connect, signIn, wallet } = await createAuthorizingWallet();
      setSolanaMobileWalletAuthorizationStore(store);
      signIn.mockRejectedValue(new Error("User declined"));

      await expect(wallet.signIn?.()).rejects.toThrow("User declined");

      expect(wallet.connected).toBe(false);
      expect(standardWallet.accounts).toEqual([]);
      expect(connect).not.toHaveBeenCalled();
    });
  });

  describe("signAndSendTransactions", () => {
    function createBatchWallet(sendTransaction = vi.fn()) {
      const standardWallet = createStandardWallet();
      const signedTransactions = [new Uint8Array([7]), new Uint8Array([8])];
      const signTransaction = vi
        .fn()
        .mockResolvedValue(signedTransactions.map((signedTransaction) => ({ signedTransaction })));
      const signAndSendTransaction = vi.fn();
      setFeature(standardWallet, SolanaSignTransaction, {
        supportedTransactionVersions: ["legacy", 0],
        signTransaction,
      });
      setFeature(standardWallet, SolanaSignAndSendTransaction, {
        supportedTransactionVersions: ["legacy", 0],
        signAndSendTransaction,
      });
      const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet), {
        chain: "solana:devnet",
        sendTransaction,
      });

      return { wallet, signedTransactions, signTransaction, signAndSendTransaction };
    }

    it("signs a batch in one wallet session and sends it through the RPC", async () => {
      const sendTransaction = vi
        .fn()
        .mockResolvedValueOnce("signature-1")
        .mockResolvedValueOnce("signature-2");
      const { wallet, signedTransactions, signTransaction, signAndSendTransaction } =
        createBatchWallet(sendTransaction);
      const transactions = [createTestTransaction(), new Uint8Array([6, 7, 8])];
      const options = { skipPreflight: true };

      await wallet.connect();

      await expect(wallet.signAndSendTransactions?.(transactions, options)).resolves.toEqual([
        "signature-1",
        "signature-2",
      ]);
      expect(signTransaction).toHaveBeenCalledOnce();
      expect(signTransaction).toHaveBeenCalledWith(
        { account, transaction: transactions[0], chain: "solana:devnet" },
        { account, transaction: transactions[1], chain: "solana:devnet" },
      );
      expect(signAndSendTransaction).not.toHaveBeenCalled();
      expect(sendTransaction.mock.calls).toEqual([
        [signedTransactions[0], options],
        [signedTransactions[1], options],
      ]);
    });

    it("reports the signatures already sent when a later send fails", async () => {
      const sendTransaction = vi
        .fn()
        .mockResolvedValueOnce("signature-1")
        .mockRejectedValueOnce(new Error("blockhash not found"));
      const { wallet } = createBatchWallet(sendTransaction);

      await wallet.connect();
      const error = await wallet
        .signAndSendTransactions?.([createTestTransaction(), createTestTransaction()])
        .catch((cause: unknown) => cause);

      expect(error).toBeInstanceOf(PartialSignAndSendError);
      expect(error).toMatchObject({ code: "RPC_FAILURE", signatures: ["signature-1"] });
    });

    it("keeps a single transaction on the wallet's own sign-and-send", async () => {
      const sendTransaction = vi.fn();
      const { wallet, signTransaction, signAndSendTransaction } =
        createBatchWallet(sendTransaction);
      signAndSendTransaction.mockResolvedValue([{ signature: new Uint8Array(64) }]);

      await wallet.connect();
      await wallet.signAndSendTransactions?.([createTestTransaction()]);

      expect(signAndSendTransaction).toHaveBeenCalledOnce();
      expect(signTransaction).not.toHaveBeenCalled();
      expect(sendTransaction).not.toHaveBeenCalled();
    });
  });
});

describe("Wallet Standard adapter — silent connect", () => {
  it("passes silent through and stays disconnected when nothing is restored", async () => {
    const standardWallet = createStandardWallet();
    const connect = getConnectFeature(standardWallet).connect;
    connect.mockResolvedValue({ accounts: [] });
    const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet));

    await expect(wallet.connect({ silent: true })).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledWith({ silent: true });
    expect(wallet.connected).toBe(false);
    expect(wallet.connecting).toBe(false);
  });

  it("connects when a silent connect restores an authorization", async () => {
    const standardWallet = createStandardWallet();
    const wallet = adaptSolanaStandardWallet(createMobileWalletInfo(standardWallet));

    await wallet.connect({ silent: true });

    expect(wallet.connected).toBe(true);
    expect(wallet.publicKey).toBe(account.address);
  });
});
