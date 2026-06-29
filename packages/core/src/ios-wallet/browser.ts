import type { SolanaChain } from "../types";
import type { SolanaIosWalletAppIdentity } from "./types";

export const DEFAULT_IOS_WALLET_CHAINS: readonly SolanaChain[] = [
  "solana:mainnet",
  "solana:devnet",
];

export const CALLBACK_PARAMS = new Set([
  "data",
  "nonce",
  "errorCode",
  "errorMessage",
  "phantom_encryption_public_key",
  "solflare_encryption_public_key",
  "wallet_encryption_public_key",
]);

export function isSolanaIosBrowserWalletSupported(): boolean {
  return isIosBrowser();
}

export function isIosBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgentDataPlatform = getNavigatorUserAgentDataPlatform();

  if (isIosPlatform(userAgentDataPlatform)) {
    return true;
  }

  const userAgent = navigator.userAgent;
  const platform = getNavigatorPlatform();
  const maxTouchPoints = navigator.maxTouchPoints ?? 0;

  // iPadOS Safari can present as desktop Safari, so keep the touch-capable Mac fallback.
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function getDefaultIosWalletAppIdentity(): SolanaIosWalletAppIdentity {
  if (typeof window === "undefined") {
    return {
      name: "Vue Solana App",
      uri: "https://localhost",
    };
  }

  return {
    name: document.title || "Vue Solana App",
    uri: window.location.origin,
    icon: getDocumentIconUrl(),
  };
}

export function getDefaultIosWalletRedirectUrl(): string {
  if (typeof window === "undefined") {
    return "https://localhost";
  }

  const url = new URL(window.location.href);

  for (const param of CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }

  return url.toString();
}

export function openIosWalletUrl(url: string) {
  if (typeof window === "undefined") {
    throw new Error("iOS wallet links are only available in browser runtimes");
  }

  window.location.assign(url);
}

export function waitForRedirect<T = never>(): Promise<T> {
  return new Promise(() => {});
}

export function hasIosWalletCallbackParams(url: URL) {
  for (const param of CALLBACK_PARAMS) {
    if (url.searchParams.has(param)) {
      return true;
    }
  }

  return false;
}

export function cleanCallbackUrl(url: URL, clearUrl?: boolean) {
  if (!clearUrl || typeof window === "undefined") {
    return;
  }

  for (const param of CALLBACK_PARAMS) {
    url.searchParams.delete(param);
  }

  window.history.replaceState(window.history.state, document.title, url.toString());
}

function getDocumentIconUrl(): string | undefined {
  const icon = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );

  return icon?.href;
}

function getNavigatorUserAgentDataPlatform(): string | undefined {
  const userAgentData = Reflect.get(navigator, "userAgentData");

  if (!isObjectRecord(userAgentData)) {
    return undefined;
  }

  const platform = Reflect.get(userAgentData, "platform");

  return typeof platform === "string" ? platform : undefined;
}

function getNavigatorPlatform(): string {
  // Avoid direct navigator.platform access because it is deprecated in DOM typings,
  // while still validating the reflected runtime value.
  const platform = Reflect.get(navigator, "platform") as unknown;

  return typeof platform === "string" ? platform : "";
}

function isIosPlatform(platform: string | undefined): boolean {
  return platform?.toLowerCase() === "ios";
}

function isObjectRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}
