import { afterEach, describe, expect, it, vi } from "vitest";
import { isSolanaIosBrowserWalletSupported, waitForRedirect } from "./browser";
import { mockNavigator, resetIosWalletTestEnvironment } from "./test-utils";
import { SolanaError } from "../errors";

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

describe("waitForRedirect", () => {
  afterEach(() => {
    vi.useRealTimers();
    resetIosWalletTestEnvironment();
  });

  it("rejects with REDIRECT_TIMEOUT instead of hanging forever", async () => {
    vi.useFakeTimers();

    const rejection = waitForRedirect().then(
      () => {
        throw new Error("Expected waitForRedirect to reject.");
      },
      (cause: unknown) => cause,
    );

    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

    const error = await rejection;

    expect(error).toBeInstanceOf(SolanaError);
    expect(error).toMatchObject({ code: "REDIRECT_TIMEOUT" });
  });

  it("honors a caller timeout", async () => {
    vi.useFakeTimers();

    const rejection = waitForRedirect({ timeoutMs: 100 }).then(
      () => {
        throw new Error("Expected waitForRedirect to reject.");
      },
      (cause: unknown) => cause,
    );

    await vi.advanceTimersByTimeAsync(100);

    await expect(rejection).resolves.toMatchObject({ code: "REDIRECT_TIMEOUT" });
  });

  it("rejects with the abort reason when the caller aborts", async () => {
    const controller = new AbortController();
    const pending = waitForRedirect({ signal: controller.signal });
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });

    controller.abort();
    await rejection;
  });

  it("throws INVALID_INPUT for invalid timeouts", () => {
    expect(() => waitForRedirect({ timeoutMs: Number.NaN })).toThrowError(SolanaError);

    try {
      waitForRedirect({ timeoutMs: -1 });
      throw new Error("Expected waitForRedirect to throw.");
    } catch (error) {
      expect((error as SolanaError).code).toBe("INVALID_INPUT");
    }
  });
});
