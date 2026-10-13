import type { SolanaChain } from "../types";
import { createSolanaError } from "../errors";
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

export interface WaitForRedirectOptions {
  /**
   * Milliseconds to wait for the wallet to redirect back before rejecting
   * with `REDIRECT_TIMEOUT`. Defaults to 10 minutes, matching the pending
   * request TTL (`PENDING_REQUEST_TTL_MS` in `storage.ts`).
   */
  timeoutMs?: number;
  /**
   * Rejects without further waiting when the caller's own `AbortSignal`
   * fires. An aborted wait rejects with the signal's reason (an
   * `AbortError` by default) rather than a timeout error.
   */
  signal?: AbortSignal;
}

/**
 * Settles when the iOS wallet redirects back to the app and the page reloads
 * — which is the only way it settles on its own. The reload path runs
 * `handleSolanaIosWalletCallback()` at bootstrap and reads the stored
 * session/pending request, so this promise intentionally never resolves
 * in-page: it only rejects on `timeoutMs` / `signal` so callers can reset
 * `connecting` state instead of hanging forever.
 */
export function waitForRedirect<T = never>(options: WaitForRedirectOptions = {}): Promise<T> {
  const { timeoutMs = 10 * 60 * 1000, signal } = options;

  if (typeof timeoutMs !== "number" || Number.isNaN(timeoutMs) || timeoutMs < 0) {
    throw createSolanaError(
      "INVALID_INPUT",
      `Invalid redirect timeout: expected a non-negative number of milliseconds, received ${String(timeoutMs)}`,
    );
  }

  signal?.throwIfAborted();

  return new Promise<T>((_, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      reject(
        createSolanaError(
          "REDIRECT_TIMEOUT",
          `Timed out waiting for the iOS wallet to redirect back after ${timeoutMs} ms.`,
        ),
      );
    }, timeoutMs);

    function onAbort() {
      clearTimeout(timeoutId);
      reject(signal!.reason);
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
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
