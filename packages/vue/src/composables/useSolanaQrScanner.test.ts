import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSolanaQrScanner } from "./useSolanaQrScanner";

const decoder = vi.hoisted(() => ({
  available: true,
  value: null as string | null,
  jsQR: vi.fn(),
}));

vi.mock("jsqr", () => ({
  get default() {
    return decoder.available ? decoder.jsQR : undefined;
  },
}));

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
  const video = {
    readyState: 4,
    videoWidth: 1280,
    videoHeight: 720,
    srcObject: null as unknown,
    play: vi.fn(),
  };
  const drawImage = vi.fn();
  let detected: Array<{ rawValue: string }>;
  let supportedFormats: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    detected = [];
    supportedFormats = ["qr_code"];
    decoder.available = true;
    decoder.value = null;
    decoder.jsQR.mockImplementation(() => (decoder.value ? { data: decoder.value } : null));
    getUserMedia.mockResolvedValue({ getTracks: () => [track] });
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) =>
      tag === "canvas"
        ? ({
            getContext: () => ({
              drawImage,
              getImageData: (_x: number, _y: number, width: number, height: number) => ({
                data: new Uint8ClampedArray(width * height * 4),
              }),
            }),
          } as unknown as HTMLCanvasElement)
        : createElement(tag),
    );
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
    vi.restoreAllMocks();
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

  it("asks for continuous autofocus when the camera supports it", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const videoTrack = {
      stop: vi.fn(),
      getCapabilities: () => ({ focusMode: ["manual", "single-shot", "continuous"] }),
      applyConstraints,
    };
    getUserMedia.mockResolvedValue({
      getTracks: () => [videoTrack],
      getVideoTracks: () => [videoTrack],
    });

    await startScanner().started;

    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ focusMode: "continuous" }] });
  });

  it("keeps scanning when the camera rejects the focus constraint", async () => {
    const videoTrack = {
      stop: vi.fn(),
      getCapabilities: () => ({ focusMode: ["continuous"] }),
      applyConstraints: vi.fn().mockRejectedValue(new Error("OverconstrainedError")),
    };
    getUserMedia.mockResolvedValue({
      getTracks: () => [videoTrack],
      getVideoTracks: () => [videoTrack],
    });

    const { scanner, started } = startScanner();
    await started;

    expect(scanner.error.value).toBeNull();
    expect(scanner.scanning.value).toBe(true);
  });

  it("decodes the frame itself when the browser detector finds nothing", async () => {
    const { scanner, started } = startScanner();
    await started;

    decoder.value = "solana:addr";
    await vi.advanceTimersByTimeAsync(500);

    expect(scanner.parsed.value).toEqual({ recipient: "addr" });
    expect(scanner.scanning.value).toBe(false);
    // The centre square of the 1280x720 frame, scaled down to 360 px a side.
    expect(drawImage).toHaveBeenCalledWith(video, 280, 0, 720, 720, 0, 0, 360, 360);
    expect(decoder.jsQR).toHaveBeenCalledWith(expect.any(Uint8ClampedArray), 360, 360, {
      inversionAttempts: "dontInvert",
    });
  });

  it("retries the frame at a larger size before waiting for the next one", async () => {
    const { scanner, started } = startScanner();
    await started;

    decoder.jsQR.mockImplementation((_data: Uint8ClampedArray, width: number) =>
      width === 480 ? { data: "solana:addr" } : null,
    );
    await vi.advanceTimersByTimeAsync(500);

    expect(decoder.jsQR.mock.calls.map(([, width]) => width)).toEqual([360, 480]);
    expect(scanner.parsed.value).toEqual({ recipient: "addr" });
  });

  it.each([
    ["has no BarcodeDetector", () => vi.stubGlobal("BarcodeDetector", undefined)],
    ["cannot detect QR codes", () => (supportedFormats = ["ean_13"])],
  ])("scans with the JavaScript decoder when the browser %s", async (_, setup) => {
    setup();
    const { scanner, started } = startScanner();
    await started;

    decoder.value = "solana:addr";
    await vi.advanceTimersByTimeAsync(500);

    expect(scanner.parsed.value).toEqual({ recipient: "addr" });
  });

  it("rejects without opening the camera when no detector or decoder is available", async () => {
    vi.stubGlobal("BarcodeDetector", undefined);
    decoder.available = false;
    const { scanner, started } = startScanner();

    await expect(started).rejects.toThrow(/cannot detect QR codes/);
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(scanner.scanning.value).toBe(false);
  });
});
