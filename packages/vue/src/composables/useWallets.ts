import { useSolana } from "./useSolana";

export function useWallets() {
  const solana = useSolana();

  return {
    wallets: solana.wallets,
    selectedWallet: solana.selectedWallet,
    refreshWallets: solana.refreshWallets,
    selectWallet: solana.selectWallet,
  };
}
