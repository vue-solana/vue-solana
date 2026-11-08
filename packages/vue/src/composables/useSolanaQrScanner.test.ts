import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSolanaQrScanner } from "./useSolanaQrScanner";

vi.mock("@vue-solana/core/solana-pay", () => ({
  parseURL: vi.fn((s: string) => {
    if (s.includes("invalid")) throw new Error("invalid");
    return { recipient: "addr" };
  }),
}));

describe("useSolanaQrScanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with default state", () => {
    const { scanning, result, parsed } = useSolanaQrScanner();
    expect(scanning.value).toBe(false);
    expect(result.value).toBeNull();
    expect(parsed.value).toBeNull();
  });

  it("scans from text", async () => {
    const { scanFromText, result, parsed } = useSolanaQrScanner();
    const res = await scanFromText("solana:addr");
    expect(result.value).toBe("solana:addr");
    expect(parsed.value).toEqual({ recipient: "addr" });
    expect(res).toEqual({ recipient: "addr" });
  });

  it("resets state", () => {
    const { reset, result, parsed, scanning } = useSolanaQrScanner();
    result.value = "test";
    parsed.value = {};
    scanning.value = true;
    reset();
    expect(result.value).toBeNull();
    expect(parsed.value).toBeNull();
    expect(scanning.value).toBe(false);
  });
});

describe("useSolanaQrScanner camera path", () => {
  const track = { stop: vi.fn() };
  const getUserMedia = vi.fn();
  const video = { readyState: 4, srcObject: null as unknown, play: vi.fn() };
  let detected: Array<{ rawValue: string }>;
  let supportedFormats: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    detected = [];
    supportedFormats = ["qr_code"];
    getUserMedia.mockResolvedValue({ getTracks: () => [track] });
    video.play.mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal(
      "BarcodeDetector",
      class {
        static getSupportedFormats = async () => supportedFormats;
        detect = async () => detected;
      },
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function startScanner() {
    const scanner = useSolanaQrScanner();
    const started = scanner.start({ video: video as unknown as HTMLVideoElement });
    return { scanner, started };
  }

  it("stops the camera once a payment URL is read", async () => {
    const { scanner, started } = startScanner();
    await started;
    expect(scanner.scanning.value).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    expect(scanner.parsed.value).toBeNull();

    detected = [{ rawValue: "solana:addr" }];
    await vi.advanceTimersByTimeAsync(500);

    expect(scanner.parsed.value).toEqual({ recipient: "addr" });
    expect(scanner.scanning.value).toBe(false);
    expect(track.stop).toHaveBeenCalled();
  });

  it("reports a QR code that is not a payment URL and keeps scanning", async () => {
    const { scanner, started } = startScanner();
    await started;

    detected = [{ rawValue: "https://invalid.example" }];
    await vi.advanceTimersByTimeAsync(500);

    expect(scanner.error.value).toBeInstanceOf(Error);
    expect(scanner.scanning.value).toBe(true);

    detected = [{ rawValue: "solana:addr" }];
    await vi.advanceTimersByTimeAsync(500);

    expect(scanner.error.value).toBeNull();
    expect(scanner.scanning.value).toBe(false);
  });

  it("asks for a camera resolution that can read dense codes", async () => {
    await startScanner().started;

    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    });
  });

  it.each([
    ["has no BarcodeDetector", () => vi.stubGlobal("BarcodeDetector", undefined)],
    ["cannot detect QR codes", () => (supportedFormats = ["ean_13"])],
  ])("rejects without opening the camera when the browser %s", async (_, setup) => {
    setup();
    const { scanner, started } = startScanner();

    await expect(started).rejects.toThrow(/cannot detect QR codes/);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(scanner.scanning.value).toBe(false);
  });
});
