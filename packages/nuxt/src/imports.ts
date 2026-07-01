const SOLANA_COMPOSABLE_IMPORTS = [
  ["useAccountInfo", "useSolanaAccountInfo"],
  ["useBalance", "useSolanaBalance"],
  ["useConnection", "useSolanaConnection"],
  ["useProgramAccounts", "useSolanaProgramAccounts"],
  ["useRpc", "useSolanaRpc"],
  ["useSignMessage", "useSolanaSignMessage"],
  ["useSignAndSendTransaction", "useSolanaSignAndSendTransaction"],
  ["useSignatureStatus", "useSolanaSignatureStatus"],
  ["useSolana", "useSolana"],
  ["useTransactionConfirmation", "useSolanaTransactionConfirmation"],
  ["useWallet", "useSolanaWallet"],
  ["useWallets", "useSolanaWallets"],
] as const;

export const SOLANA_IMPORTS = SOLANA_COMPOSABLE_IMPORTS.map(([name, as]) => ({
  name,
  as,
  from: `@vue-solana/vue/${name}`,
}));
