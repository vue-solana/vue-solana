import { onUnmounted, ref, shallowRef } from "vue";
import { parseURL } from "@vue-solana/core/solana-pay";

export function useSolanaQrScanner() {
  const scanning = ref(false);
  const result = shallowRef<string | null>(null);
  const parsed = shallowRef<unknown>(null);
  const error = ref<unknown>(null);

  let mediaStream: MediaStream | null = null;
  let videoElement: HTMLVideoElement | null = null;
  let scanInterval: ReturnType<typeof setInterval> | null = null;
  let barcodeDetector: {
    detect: (
      source: HTMLVideoElement,
    ) => Promise<Array<{ rawValue?: string; raw?: string; value?: string }>>;
  } | null = null;
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
    if (scanInterval) {
      clearInterval(scanInterval);
      scanInterval = null;
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
      const BarcodeDetectorCtor = (
        globalThis as { BarcodeDetector?: new (opts?: unknown) => unknown }
      ).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        try {
          barcodeDetector = new BarcodeDetectorCtor({
            formats: ["qr_code"],
          }) as typeof barcodeDetector;
        } catch {
          barcodeDetector = null;
        }
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera not available");
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoElement) {
        videoElement.srcObject = mediaStream;
        await videoElement.play().catch(() => {});
      }

      scanning.value = true;
      clearTimer();
      scanInterval = setInterval(async () => {
        if (stopped || !scanning.value) return;
        try {
          if (barcodeDetector && videoElement) {
            const codes = await barcodeDetector.detect(videoElement);
            if (codes && codes.length > 0) {
              const text = codes[0]?.rawValue || codes[0]?.raw || codes[0]?.value;
              if (text) {
                try {
                  await scanFromText(text);
                } catch {
                  // ignore parse errors, keep scanning
                }
              }
            }
          }
        } catch (e) {
          // Don't fail the whole scanner on detection errors
          error.value = e;
        }
      }, intervalMs);
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
