import { computed, ref, shallowRef } from "vue";
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@vue-solana/nuxt/kit";
import { formatError } from "./errors";
import { createSolanaPayTransferInstructions } from "./transferInstruction";

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

export type PayDisabledReason = "connectWallet" | "transactionRequest" | "splToken" | "amount";

/**
 * Payer-side Solana Pay demo: scan a merchant QR code or paste the URL, preview
 * what the wallet will be asked to pay, and pay it from the connected wallet.
 * Scanned data is untrusted, so nothing is sent until the user presses Pay
 * after reading the preview, and the wallet still asks for approval.
 */
export function useDemoSolanaPayScanner() {
  const { t } = useI18n();
  const { client } = useSolana();
  const rpc = useSolanaRpc();
  const wallet = useSolanaWallet();
  const scanner = useSolanaQrScanner();
  const payment = useSolanaSignAndSendTransaction();
  const payError = shallowRef<unknown>(null);

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

  // Only SOL transfer requests with an amount are paid here: SPL token
  // transfers need the mint's token accounts, and a transaction request is
  // built by the merchant's server.
  const payDisabledReason = computed<PayDisabledReason | null>(() => {
    if (!wallet.connected.value) {
      return "connectWallet";
    }

    if (isTransactionRequest.value) {
      return "transactionRequest";
    }

    if (parsedRequest.value?.splToken) {
      return "splToken";
    }

    if (!parsedRequest.value?.amount) {
      return "amount";
    }

    return null;
  });
  const payReady = computed(
    () =>
      Boolean(parsedRequest.value) && payDisabledReason.value === null && !payment.loading.value,
  );
  const paymentSignature = computed(() => payment.signature.value ?? null);
  const paymentExplorerUrl = computed(() =>
    paymentSignature.value
      ? `https://explorer.solana.com/tx/${paymentSignature.value}?cluster=${rpc.cluster.value}`
      : null,
  );
  const paymentError = computed(() => formatError(payError.value ?? payment.error.value));

  async function payScannedRequest() {
    const request = parsedRequest.value;
    const payer = wallet.publicKey.value;

    if (!request?.recipient || !request.amount || !payer || !payReady.value) {
      return;
    }

    payError.value = null;

    try {
      const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
      const transactionMessage = appendTransactionMessageInstructions(
        createSolanaPayTransferInstructions({
          payer,
          recipient: address(request.recipient),
          lamports: request.amount,
          references: references.value.map((reference) => address(reference)),
          memo: request.memo,
        }),
        setTransactionMessageLifetimeUsingBlockhash(
          latestBlockhash,
          setTransactionMessageFeePayer(payer, createTransactionMessage({ version: 0 })),
        ),
      );
      const transaction = new Uint8Array(
        getTransactionEncoder().encode(compileTransaction(transactionMessage)),
      );

      await payment.execute(transaction, {
        confirm: true,
        confirmation: { commitment: "confirmed" },
        skipPreflight: false,
      });
    } catch (error) {
      payError.value = error;
    }
  }

  function resetScan() {
    pasteError.value = null;
    payError.value = null;
    payment.signature.value = null;
    payment.error.value = null;
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
    payDisabledReason,
    payLoading: payment.loading,
    payReady,
    payScannedRequest,
    paymentError,
    paymentExplorerUrl,
    paymentSignature,
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
