import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";
import type { SolanaChain } from "./types";

export interface SolanaMobileWalletAppIdentity {
  name: string;
  uri: string;
  icon?: string;
}

export interface RegisterSolanaMobileWalletOptions {
  appIdentity?: SolanaMobileWalletAppIdentity;
  chains?: readonly SolanaChain[];
  remoteHostAuthority?: string;
}

const DEFAULT_MOBILE_WALLET_CHAINS: readonly SolanaChain[] = ["solana:mainnet", "solana:devnet"];

const registeredMobileWalletKeys = new Set<string>();

export function registerSolanaMobileWallet(
  options: RegisterSolanaMobileWalletOptions = {},
): boolean {
  if (!isSolanaMobileWalletSupported()) {
    return false;
  }

  const appIdentity = options.appIdentity ?? getDefaultMobileWalletAppIdentity();
  const chains = options.chains?.length ? options.chains : DEFAULT_MOBILE_WALLET_CHAINS;
  const registrationKey = JSON.stringify({
    appIdentity,
    chains,
    remoteHostAuthority: options.remoteHostAuthority,
  });

  if (registeredMobileWalletKeys.has(registrationKey)) {
    return true;
  }

  registerMwa({
    appIdentity,
    authorizationCache: createDefaultAuthorizationCache(),
    chains,
    chainSelector: createDefaultChainSelector(),
    remoteHostAuthority: options.remoteHostAuthority,
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  });
  registeredMobileWalletKeys.add(registrationKey);

  return true;
}

export function isSolanaMobileWalletSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isAndroid = /Android/i.test(userAgent);
  const isChrome = /Chrome|CriOS/i.test(userAgent) && !/Edg|OPR|Firefox|FxiOS/i.test(userAgent);

  return isAndroid && isChrome;
}

export function getDefaultMobileWalletAppIdentity(): SolanaMobileWalletAppIdentity {
  if (typeof window === "undefined") {
    return {
      name: "Vue Solana App",
      uri: "https://localhost",
    };
  }

  return {
    name: document.title || "Vue Solana App",
    uri: window.location.origin,
    icon: getDocumentIconPath(),
  };
}

function getDocumentIconPath(): string | undefined {
  const icon = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );

  if (!icon?.href) {
    return undefined;
  }

  if (icon.href.startsWith(window.location.origin)) {
    return icon.href.slice(window.location.origin.length).replace(/^\//, "");
  }

  return icon.href;
}
