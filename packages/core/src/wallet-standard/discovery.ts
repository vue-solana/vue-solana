import { getWallets } from "@wallet-standard/app";
import type { Wallet } from "@wallet-standard/base";
import { StandardConnect, StandardDisconnect } from "@wallet-standard/features";
import type { SolanaChain, SolanaWalletInfo } from "../types";
import { SOLANA_CHAINS } from "./chains";
import { hasSignAndSendTransaction, hasSignMessage, hasSignTransaction } from "./features";

export const SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME = "Mobile Wallet Adapter";

export function isSolanaStandardWallet(wallet: Wallet): boolean {
  return (
    StandardConnect in wallet.features &&
    StandardDisconnect in wallet.features &&
    wallet.chains.some((chain) => SOLANA_CHAINS.includes(chain as SolanaChain))
  );
}

export function getRegisteredSolanaWallets(): SolanaWalletInfo[] {
  if (typeof window === "undefined") {
    return [];
  }

  return getWallets().get().filter(isSolanaStandardWallet).map(createSolanaWalletInfo);
}

export function subscribeSolanaWallets(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const wallets = getWallets();
  const offRegister = wallets.on("register", listener);
  const offUnregister = wallets.on("unregister", listener);

  return () => {
    offRegister();
    offUnregister();
  };
}

function createSolanaWalletInfo(wallet: Wallet): SolanaWalletInfo {
  const isMobileWallet = wallet.name === SOLANA_MOBILE_WALLET_ADAPTER_WALLET_NAME;

  return {
    name: wallet.name,
    icon: wallet.icon,
    chains: wallet.chains,
    platform: isMobileWallet ? "mobile" : "browser",
    source: isMobileWallet ? "mobile-wallet-adapter" : "wallet-standard",
    appUrl: getWalletUrl(wallet),
    capabilities: {
      connect: true,
      disconnect: true,
      signMessage: hasSignMessage(wallet),
      signTransaction: hasSignTransaction(wallet),
      signAllTransactions: hasSignTransaction(wallet),
      signAndSendTransaction: hasSignAndSendTransaction(wallet),
    },
    accounts: wallet.accounts.map((account) => ({
      address: account.address,
      publicKey: Uint8Array.from(account.publicKey),
      chains: account.chains,
      label: account.label,
      icon: account.icon,
    })),
    wallet,
  };
}

function getWalletUrl(wallet: Wallet): string | undefined {
  return "url" in wallet && typeof wallet.url === "string" ? wallet.url : undefined;
}
