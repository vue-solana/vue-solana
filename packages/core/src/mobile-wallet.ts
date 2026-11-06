import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
  type Authorization,
  type AuthorizationCache,
} from "@solana-mobile/wallet-standard-mobile";
import { setSolanaMobileWalletAuthorizationStore } from "./mobile-wallet-authorization";
import { isSolanaMobileWalletSupported } from "./mobile-wallet-support";
import type { SolanaChain } from "./types";

export { isSolanaMobileWalletSupported };

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

  const authorizationCache = createChainScopedAuthorizationCache(chains);

  registerMwa({
    appIdentity,
    authorizationCache,
    chains,
    chainSelector: createDefaultChainSelector(),
    remoteHostAuthority: options.remoteHostAuthority,
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  });
  registeredMobileWalletKeys.add(registrationKey);
  // Lets a failed MWA sign-in restore the authorization it had to clear.
  setSolanaMobileWalletAuthorizationStore({
    get: () => authorizationCache.get(),
    set: (authorization) => authorizationCache.set(authorization as Authorization),
  });

  return true;
}

/**
 * The default MWA authorization cache is a single localStorage entry shared by
 * every network, and re-authorization reuses the cached `chain`. An app that
 * moved from devnet to mainnet would otherwise keep signing against the devnet
 * authorization, so one for a chain this registration does not serve is
 * dropped and the next request authorizes afresh.
 */
export function createChainScopedAuthorizationCache(
  chains: readonly SolanaChain[],
): AuthorizationCache {
  const cache = createDefaultAuthorizationCache();

  return {
    clear: () => cache.clear(),
    set: (authorization) => cache.set(authorization),
    async get() {
      const authorization = await cache.get();

      if (authorization && !chains.includes(authorization.chain as SolanaChain)) {
        await cache.clear();
        return undefined;
      }

      return authorization;
    },
  };
}

/**
 * Clears this package's local record of which Mobile Wallet Adapter
 * registration keys have been applied. This only affects the deduplication guard
 * inside `registerSolanaMobileWallet()`; it does not (and cannot) unregister an
 * MWA wallet already installed into the host's Wallet Standard registry, because
 * `@solana-mobile/wallet-standard-mobile` provides no unregister API. Calling
 * `registerSolanaMobileWallet()` after this may therefore install a duplicate
 * host-side registration. Intended for test/HMR reset only.
 */
export function unregisterSolanaMobileWallet(): void {
  registeredMobileWalletKeys.clear();
  setSolanaMobileWalletAuthorizationStore(undefined);
}

/**
 * The identity MWA sends with every `authorize`, including the re-authorization
 * that precedes each signing request. Wallets bind the auth token to it, so it
 * must not change between page loads: `document.title` did (per route, per
 * locale, and empty on a client-only route at registration time), and a session
 * restored under one title was then re-authorized under another, which Phantom
 * answered by opening without a prompt. Pass `appIdentity` to pin it explicitly.
 */
export function getDefaultMobileWalletAppIdentity(): SolanaMobileWalletAppIdentity {
  if (typeof window === "undefined") {
    return {
      name: "Vue Solana App",
      uri: "https://localhost",
    };
  }

  return {
    name: getDocumentAppName(),
    uri: window.location.origin,
    icon: getDocumentIconPath(),
  };
}

function getDocumentAppName(): string {
  const name =
    getMetaContent('meta[name="application-name"]') ??
    getMetaContent('meta[property="og:site_name"]') ??
    window.location.hostname;

  return name || "Vue Solana App";
}

function getMetaContent(selector: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(selector)?.content.trim() || undefined;
}

/**
 * MWA only accepts an icon as a path relative to `uri` or a `data:` URI, so a
 * cross-origin icon is left out rather than sent as an absolute URL.
 */
function getDocumentIconPath(): string | undefined {
  const icon = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );

  if (!icon?.href) {
    return undefined;
  }

  if (icon.href.startsWith("data:")) {
    return icon.href;
  }

  if (icon.href.startsWith(`${window.location.origin}/`)) {
    return icon.href.slice(window.location.origin.length + 1);
  }

  return undefined;
}
