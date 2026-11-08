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

/**
 * `BarcodeDetector` is missing on iOS and Firefox, and Android Chrome can ship
 * it without QR support. Opening the camera there only shows a preview that
 * never detects anything, so `start()` rejects instead.
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

export function useSolanaQrScanner() {
  const scanning = ref(false);
  const result = shallowRef<string | null>(null);
  const parsed = shallowRef<unknown>(null);
  const error = ref<unknown>(null);

  let mediaStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let barcodeDetector: BarcodeDetectorLike | null = null;
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

  /** Returns true once a valid Solana Pay URL was read. */
  async function scanFrame(): Promise<boolean> {
    // Detecting on a video without a decoded frame throws or finds nothing.
    if (!barcodeDetector || !videoElement || videoElement.readyState < 2) {
      return false;
    }

    try {
      const codes = await barcodeDetector.detect(videoElement);
      const text = codes[0]?.rawValue || codes[0]?.raw || codes[0]?.value;

      if (!text) {
        return false;
      }

      await scanFromText(text);
      return true;
    } catch (e) {
      // A detection failure or a QR code that is not a Solana Pay URL: show
      // why, and keep scanning.
      error.value = e;
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

      barcodeDetector = await createQrCodeDetector();

      if (!barcodeDetector) {
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

      // Chained timeouts rather than an interval, so a slow `detect()` never
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
