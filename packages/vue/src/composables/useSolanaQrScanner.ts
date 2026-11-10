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

/**
 * Sides, in pixels, the frame is scaled to for the JavaScript decoder, tried in
 * order until one decodes. Downscaling averages out camera sensor noise that
 * defeats jsQR's binarizer: on noisy, slightly blurred frames of a 61-module
 * payment code, 360px then 480px decoded 2.7x as many frames as a single
 * 720px pass, for about a third of the CPU time per frame.
 */
const DECODE_SIZES = [360, 480];

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

/**
 * Some Android cameras open with a fixed or single-shot focus, so a code held
 * close to the lens stays blurred and no decoder can read it. Ask for
 * continuous autofocus where the track reports it; elsewhere this is a no-op.
 */
async function enableContinuousFocus(stream: MediaStream) {
  const [track] = stream.getVideoTracks?.() ?? [];
  const capabilities = track?.getCapabilities?.() as { focusMode?: string[] } | undefined;

  if (!track || !capabilities?.focusMode?.includes("continuous")) {
    return;
  }

  try {
    await track.applyConstraints({
      advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
    });
  } catch {
    // The stream still works with the camera's default focus.
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
   * preview shows, at each of `DECODE_SIZES` until one reads a code.
   */
  function decodeFrame(video: HTMLVideoElement): string | null {
    const side = Math.min(video.videoWidth, video.videoHeight);

    if (!qrDecoder || !side) {
      return null;
    }

    frameCanvas ??= document.createElement("canvas");

    for (const size of new Set(DECODE_SIZES.map((decodeSize) => Math.min(side, decodeSize)))) {
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

      const text = qrDecoder(context.getImageData(0, 0, size, size).data, size, size);

      if (text) {
        return text;
      }
    }

    return null;
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
      await enableContinuousFocus(mediaStream);
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
