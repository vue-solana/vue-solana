import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDefaultMobileWalletAppIdentity,
  isSolanaMobileWalletSupported,
  registerSolanaMobileWallet,
} from "./mobile-wallet";

const {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} = vi.hoisted(() => ({
  createDefaultAuthorizationCache: vi.fn(() => ({ clear: vi.fn(), get: vi.fn(), set: vi.fn() })),
  createDefaultChainSelector: vi.fn(() => ({ select: vi.fn() })),
  createDefaultWalletNotFoundHandler: vi.fn(() => vi.fn()),
  registerMwa: vi.fn(),
}));

vi.mock("@solana-mobile/wallet-standard-mobile", () => ({
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
}));

describe("mobile wallet registration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    createDefaultAuthorizationCache.mockClear();
    createDefaultChainSelector.mockClear();
    createDefaultWalletNotFoundHandler.mockClear();
    registerMwa.mockClear();
  });

  it("detects Android Chrome mobile wallet support", () => {
    mockUserAgent(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );

    expect(isSolanaMobileWalletSupported()).toBe(true);
  });

  it("does not report support for iOS browsers", () => {
    mockUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    expect(isSolanaMobileWalletSupported()).toBe(false);
  });

  it("does not register MWA on unsupported browsers", () => {
    mockUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    );

    expect(registerSolanaMobileWallet()).toBe(false);
    expect(registerMwa).not.toHaveBeenCalled();
  });

  it("registers MWA with default handlers on supported browsers", () => {
    mockUserAgent(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );

    const registered = registerSolanaMobileWallet({
      appIdentity: { name: "Test App", uri: "https://example.com" },
      chains: ["solana:devnet"],
    });

    expect(registered).toBe(true);
    expect(registerMwa).toHaveBeenCalledWith({
      appIdentity: { name: "Test App", uri: "https://example.com" },
      authorizationCache: expect.any(Object),
      chains: ["solana:devnet"],
      chainSelector: expect.any(Object),
      remoteHostAuthority: undefined,
      onWalletNotFound: expect.any(Function),
    });
  });

  it("does not duplicate MWA registrations for matching options", () => {
    mockUserAgent(
      "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    );
    const options = {
      appIdentity: { name: "Duplicate Test App", uri: "https://duplicate.example.com" },
      chains: ["solana:devnet"] as const,
    };

    expect(registerSolanaMobileWallet(options)).toBe(true);
    expect(registerSolanaMobileWallet(options)).toBe(true);

    expect(registerMwa).toHaveBeenCalledOnce();
  });

  it("uses document metadata for the default app identity", () => {
    document.head.innerHTML = '<title>Wallet Test</title><link rel="icon" href="/favicon.ico">';

    expect(getDefaultMobileWalletAppIdentity()).toEqual({
      name: "Wallet Test",
      uri: "http://localhost:3000",
      icon: "favicon.ico",
    });
  });
});

function mockUserAgent(userAgent: string) {
  vi.stubGlobal("navigator", { userAgent });
}
