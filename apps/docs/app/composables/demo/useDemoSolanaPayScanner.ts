import { computed, ref, shallowRef } from "vue";
import { formatError } from "./errors";

/** The subset of a parsed Solana Pay request this demo previews. */
export interface ParsedPaymentRequest {
  recipient?: string;
  amount?: bigint;
  splToken?: string;
  reference?: string | string[];
  label?: string;
  message?: string;
  memo?: string;
  link?: string;
}

const SOL_DECIMALS = 9;
const LAMPORTS_PER_SOL = 10n ** BigInt(SOL_DECIMALS);

/**
 * Payer-side Solana Pay demo: scan a merchant QR code or paste the URL and
 * preview what the wallet will be asked to pay. Scanned data is untrusted, so
 * this never signs or sends — the preview is the whole feature.
 */
export function useDemoSolanaPayScanner() {
  const { t } = useI18n();
  const scanner = useSolanaQrScanner();

  const pastedUrl = ref("");
  const pasteError = shallowRef<unknown>(null);

  const cameraSupported = computed(
    () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia),
  );
  const barcodeDetectorSupported = computed(
    () => typeof globalThis !== "undefined" && "BarcodeDetector" in globalThis,
  );
  const parsedRequest = computed(
    () => (scanner.parsed.value as ParsedPaymentRequest | null) ?? null,
  );
  const scanResult = computed(() =>
    scanner.result.value && scanner.parsed.value ? String(scanner.result.value) : null,
  );
  const isTransactionRequest = computed(() => Boolean(parsedRequest.value?.link));
  const references = computed(() => {
    const value = parsedRequest.value?.reference;

    if (!value) {
      return [];
    }

    return Array.isArray(value) ? value.map(String) : [String(value)];
  });
  const amountText = computed(() => {
    const lamports = parsedRequest.value?.amount;

    if (!lamports) {
      return null;
    }

    const whole = lamports / LAMPORTS_PER_SOL;
    const fraction = (lamports % LAMPORTS_PER_SOL)
      .toString()
      .padStart(SOL_DECIMALS, "0")
      .replace(/0+$/, "");
    const value = fraction ? `${whole}.${fraction}` : String(whole);

    return parsedRequest.value?.splToken
      ? `${value} ${t("demo.solanaPay.scanner.values.tokenUnits")}`
      : `${value} SOL`;
  });
  const scannerError = computed(() => formatError(pasteError.value ?? scanner.error.value));

  function resetScan() {
    pasteError.value = null;
    scanner.reset();
  }

  async function validatePastedUrl() {
    const value = pastedUrl.value.trim();

    if (!value) {
      pasteError.value = new Error(t("demo.solanaPay.scanner.pasteFirst"));

      return;
    }

    pasteError.value = null;

    try {
      await scanner.scanFromText(value);
    } catch (error) {
      pasteError.value = error;
    }
  }

  async function startScanner(video?: HTMLVideoElement | null) {
    pasteError.value = null;

    try {
      await scanner.start({ video: video ?? undefined, scanIntervalMs: 500 });
    } catch (error) {
      pasteError.value = error;
    }
  }

  return {
    amountText,
    barcodeDetectorSupported,
    cameraSupported,
    isTransactionRequest,
    parsedRequest,
    pasteError,
    pastedUrl,
    references,
    resetScan,
    scanResult,
    scanner,
    scannerError,
    scanning: scanner.scanning,
    startScanner,
    stopScanner: scanner.stop,
    validatePastedUrl,
  };
}
