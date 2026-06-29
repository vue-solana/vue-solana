import type { IosWalletDefinition } from "./types";

export const IOS_WALLETS: readonly IosWalletDefinition[] = [
  {
    id: "phantom",
    name: "Phantom",
    icon: "https://phantom.app/img/phantom-logo.svg",
    appUrl: "https://phantom.app",
    installUrl: "https://phantom.app/download",
    encryptionPublicKeyParam: "phantom_encryption_public_key",
    connectUrl: "https://phantom.app/ul/v1/connect",
    signTransactionUrl: "https://phantom.app/ul/v1/signTransaction",
    signAllTransactionsUrl: "https://phantom.app/ul/v1/signAllTransactions",
  },
  {
    id: "solflare",
    name: "Solflare",
    icon: "https://solflare.com/favicon.ico",
    appUrl: "https://solflare.com",
    installUrl: "https://solflare.com/download",
    encryptionPublicKeyParam: "solflare_encryption_public_key",
    connectUrl: "https://solflare.com/ul/v1/connect",
    signTransactionUrl: "https://solflare.com/ul/v1/signTransaction",
    signAllTransactionsUrl: "https://solflare.com/ul/v1/signAllTransactions",
    signAndSendTransactionUrl: "https://solflare.com/ul/v1/signAndSendTransaction",
  },
  {
    id: "backpack",
    name: "Backpack",
    icon: "https://backpack.app/favicon.ico",
    appUrl: "https://backpack.app",
    installUrl: "https://backpack.app/download",
    encryptionPublicKeyParam: "wallet_encryption_public_key",
    connectUrl: "https://backpack.app/ul/v1/connect",
    signTransactionUrl: "https://backpack.app/ul/v1/signTransaction",
    signAllTransactionsUrl: "https://backpack.app/ul/v1/signAllTransactions",
    signAndSendTransactionUrl: "https://backpack.app/ul/v1/signAndSendTransaction",
  },
];

export function getIosWalletDefinitionById(walletId: string) {
  const definition = IOS_WALLETS.find((wallet) => wallet.id === walletId);

  if (!definition) {
    throw new Error(`Unknown iOS wallet: ${walletId}`);
  }

  return definition;
}

export function isIosWalletDefinition(value: unknown): value is IosWalletDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    IOS_WALLETS.some((wallet) => wallet.id === value.id)
  );
}
