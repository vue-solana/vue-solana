import { onUnmounted, ref, shallowRef } from "vue";
import { parseURL } from "@vue-solana/core/solana-pay";

interface BarcodeDetectorLike {
  detect: (
    source: HTMLVideoElement,
  ) => Promise<Array<{ rawValue?: string; raw?: string; value?: string }>>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

type QrDecoder = (data: Uint8ClampedArray, width: number, height: number) => string | null;

/** Largest side, in pixels, of the frame handed to the JavaScript decoder. */
const DECODE_SIZE = 720;

/**
 * The browser's own detector, when it claims QR support. It is missing on iOS
 * and Firefox, and on some Android phones (seen on a Galaxy A50 in Chrome) it
 * exists, claims `qr_code`, and still never finds a code, so it is only ever a
 * fast path in front of the JavaScript decoder.
 */
async function createQrCodeDetector(): Promise<BarcodeDetectorLike | null> {
  const BarcodeDetectorCtor = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor })
    .BarcodeDetector;

  if (!BarcodeDetectorCtor) {
    return null;
  }

  try {
    const formats = await BarcodeDetectorCtor.getSupportedFormats?.();

    if (formats && !formats.includes("qr_code")) {
      return null;
    }

    return new BarcodeDetectorCtor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

/** Loaded on `start()`, so apps that never open the scanner never fetch it. */
async function loadQrDecoder(): Promise<QrDecoder | null> {
  try {
    const mod = await import("jsqr");
    const jsQR = (mod.default ?? mod) as unknown as typeof mod.default;

    if (typeof jsQR !== "function") {
      return null;
    }

    return (data, width, height) =>
      jsQR(data, width, height, { inversionAttempts: "dontInvert" })?.data || null;
  } catch {
    return null;
  }
}

export function useSolanaQrScanner() {
  const scanning = ref(false);
  const result = shallowRef<string | null>(null);
  const parsed = shallowRef<unknown>(null);
  const error = ref<unknown>(null);

  let mediaStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let barcodeDetector: BarcodeDetectorLike | null = null;
  let qrDecoder: QrDecoder | null = null;
  let frameCanvas: HTMLCanvasElement | null = null;
  let stopped = false;

  function stopTracks() {
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) {
        try {
          track.stop();
        } catch {
          // ignore
        }
      }
      mediaStream = null;
    }
  }

  function clearTimer() {
    if (scanTimer) {
      clearTimeout(scanTimer);
      scanTimer = null;
    }
  }

  async function scanFromText(text: string) {
    try {
      result.value = text;
      parsed.value = parseURL(text);
      error.value = null;
      return parsed.value;
    } catch (e) {
      error.value = e;
      throw e;
    }
  }

  async function detectWithBrowser(video: HTMLVideoElement): Promise<string | null> {
    if (!barcodeDetector) {
      return null;
    }

    try {
      const codes = await barcodeDetector.detect(video);
      return codes[0]?.rawValue || codes[0]?.raw || codes[0]?.value || null;
    } catch {
      return null;
    }
  }

  /**
   * Decodes the centre square of the frame, which is what a square, cropped
   * preview shows, scaled down so a 1280x720 stream stays cheap to decode.
   */
  function decodeFrame(video: HTMLVideoElement): string | null {
    const side = Math.min(video.videoWidth, video.videoHeight);

    if (!qrDecoder || !side) {
      return null;
    }

    const size = Math.min(side, DECODE_SIZE);
    frameCanvas ??= document.createElement("canvas");
    frameCanvas.width = size;
    frameCanvas.height = size;
    const context = frameCanvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return null;
    }

    context.drawImage(
      video,
      (video.videoWidth - side) / 2,
      (video.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    return qrDecoder(context.getImageData(0, 0, size, size).data, size, size);
  }

  /** Returns true once a valid Solana Pay URL was read. */
  async function scanFrame(): Promise<boolean> {
    // Detecting on a video without a decoded frame throws or finds nothing.
    if (!videoElement || videoElement.readyState < 2) {
      return false;
    }

    const text = (await detectWithBrowser(videoElement)) ?? decodeFrame(videoElement);

    if (!text) {
      return false;
    }

    try {
      await scanFromText(text);
      return true;
    } catch {
      // Not a Solana Pay URL: `scanFromText()` set `error`; keep scanning.
      return false;
    }
  }

  async function start(options: { video?: HTMLVideoElement; scanIntervalMs?: number } = {}) {
    if (typeof window === "undefined") {
      const err = new Error("Scanner can only run in the browser");
      error.value = err;
      throw err;
    }
    if (scanning.value) return;
    stopped = false;
    error.value = null;
    videoElement = options.video ?? null;
    const intervalMs = options.scanIntervalMs ?? 500;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera not available");
      }

      [barcodeDetector, qrDecoder] = await Promise.all([createQrCodeDetector(), loadQrDecoder()]);

      if (!barcodeDetector && !qrDecoder) {
        throw new Error("This browser cannot detect QR codes. Paste the payment URL instead.");
      }

      // The default 640x480 stream is too coarse for a dense payment QR code
      // held at arm's length.
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoElement) {
        videoElement.srcObject = mediaStream;
        await videoElement.play().catch(() => {});
      }

      scanning.value = true;
      clearTimer();

      // Chained timeouts rather than an interval, so a slow decode never
      // overlaps the next one.
      const scheduleScan = () => {
        scanTimer = setTimeout(async () => {
          if (stopped || !scanning.value) return;

          if (await scanFrame()) {
            stop();
            return;
          }

          if (!stopped && scanning.value) {
            scheduleScan();
          }
        }, intervalMs);
      };
      scheduleScan();
    } catch (e) {
      error.value = e;
      stopTracks();
      clearTimer();
      scanning.value = false;
      throw e;
    }
  }

  function stop() {
    stopped = true;
    scanning.value = false;
    clearTimer();
    stopTracks();
    if (videoElement) {
      try {
        videoElement.srcObject = null;
      } catch {
        // ignore
      }
    }
  }

  function reset() {
    stop();
    result.value = null;
    parsed.value = null;
    error.value = null;
    barcodeDetector = null;
    videoElement = null;
  }

  onUnmounted(() => {
    stop();
  });

  return { scanning, result, parsed, error, scanFromText, start, stop, reset };
}
