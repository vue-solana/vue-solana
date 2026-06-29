export {
  adaptSolanaIosWallet,
  getSolanaIosWallets,
  isSolanaIosWalletInfo,
} from "./ios-wallet/adapter";
export {
  getDefaultIosWalletAppIdentity,
  getDefaultIosWalletRedirectUrl,
  isIosBrowser,
  isSolanaIosBrowserWalletSupported,
} from "./ios-wallet/browser";
export { handleSolanaIosWalletCallback } from "./ios-wallet/callback";
export type {
  AdaptSolanaIosWalletOptions,
  GetSolanaIosWalletsOptions,
  IosWalletCallbackResult,
  IosWalletInfo,
  IosWalletMethod,
  SolanaIosWalletAppIdentity,
} from "./ios-wallet/types";
