import { afterEach, describe, expect, it } from "vitest";
import { isSolanaIosBrowserWalletSupported } from "./browser";
import { mockNavigator, resetIosWalletTestEnvironment } from "./test-utils";

describe("iOS wallet browser support", () => {
  afterEach(resetIosWalletTestEnvironment);

  it("detects iOS browser runtimes", () => {
    mockNavigator({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
    });

    expect(isSolanaIosBrowserWalletSupported()).toBe(true);
  });

  it("prefers User-Agent Client Hints when available", () => {
    mockNavigator({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "MacIntel",
      maxTouchPoints: 0,
      userAgentData: {
        platform: "iOS",
      },
    });

    expect(isSolanaIosBrowserWalletSupported()).toBe(true);
  });

  it("does not report support for Android browsers", () => {
    mockNavigator({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    });

    expect(isSolanaIosBrowserWalletSupported()).toBe(false);
  });
});
