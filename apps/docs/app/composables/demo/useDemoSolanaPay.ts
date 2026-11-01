import { computed, onScopeDispose, ref, shallowRef } from "vue";
import { address, isAddress } from "@vue-solana/nuxt/kit";
import { formatError } from "./errors";

/**
 * Mirrors the core package's `SolanaPayVerificationResult`, which this app
 * deliberately does not import (see `docs-import-policy.test.ts`). The
 * composable's return type carries the shape, so this stays structural.
 */
export interface PaymentVerification {
  status: "pending" | "found" | "confirmed" | "finalized" | "expired" | "error";
  verified: boolean;
  signature?: string;
  reason?: string;
}

/** The subset of a parsed Solana Pay transfer request this demo renders. */
export interface ParsedTransferRequest {
  recipient?: string;
  amount?: bigint;
  splToken?: string;
  reference?: string | string[];
  label?: string;
  message?: string;
  memo?: string;
}

export type CreateDisabledReason = "recipient" | "splToken" | "amount";

const SOL_DECIMALS = 9;
const LAMPORTS_PER_SOL = 10n ** BigInt(SOL_DECIMALS);
const AMOUNT_PATTERN = /^\d+(\.\d{1,9})?$/;

export function lamportsToSolText(lamports: bigint): string {
  const whole = lamports / LAMPORTS_PER_SOL;
  const fraction = (lamports % LAMPORTS_PER_SOL)
    .toString()
    .padStart(SOL_DECIMALS, "0")
    .replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : String(whole);
}

/**
 * Merchant-side Solana Pay demo: build a `solana:` transfer request, generate
 * the payment reference, render the QR code, and verify settlement against the
 * same reference. The reference is the link between the QR code and the
 * on-chain payment, so both must come from one request.
 */
export function useDemoSolanaPay() {
  const { rpc } = useSolanaClient();
  const pay = useSolanaPay();
  const qr = useSolanaQrCode();
  const confirmation = useSolanaPayConfirmation();
  const wallet = useSolanaWallet();

  const recipient = ref("");
  const amount = ref("0.001");
  const label = ref("Vue Solana store");
  const message = ref("Order 1042");
  const memo = ref("order-1042");
  const splToken = ref("");

  const createError = shallowRef<unknown>(null);
  const verification = shallowRef<PaymentVerification | null>(null);
  const polling = ref(false);

  const amountLamports = computed<bigint | null>(() => {
    const raw = amount.value.trim();

    if (!AMOUNT_PATTERN.test(raw)) {
      return null;
    }

    const [whole = "0", fraction = ""] = raw.split(".");
    return BigInt(whole) * LAMPORTS_PER_SOL + BigInt(fraction.padEnd(SOL_DECIMALS, "0") || "0");
  });
  const recipientValid = computed(() => isAddress(recipient.value.trim()));
  const splTokenValid = computed(
    () => splToken.value.trim() === "" || isAddress(splToken.value.trim()),
  );
  const createReady = computed(
    () =>
      recipientValid.value &&
      splTokenValid.value &&
      amountLamports.value !== null &&
      amountLamports.value > 0n &&
      !pay.loading.value,
  );
  const createDisabledReason = computed<CreateDisabledReason | null>(() => {
    if (!recipientValid.value) {
      return "recipient";
    }

    if (!splTokenValid.value) {
      return "splToken";
    }

    if (amountLamports.value === null || amountLamports.value <= 0n) {
      return "amount";
    }

    return null;
  });

  const requestUrl = computed(() => pay.requestUrl.value);
  const reference = computed(() => (pay.reference.value ? String(pay.reference.value) : null));
  const parsedRequest = computed(
    () => (pay.parsedRequest.value as ParsedTransferRequest | null) ?? null,
  );
  const referenceList = computed(() => {
    const references = parsedRequest.value?.reference;

    if (!references) {
      return [];
    }

    return Array.isArray(references) ? references.map(String) : [String(references)];
  });
  const parsedAmountText = computed(() => {
    const lamports = parsedRequest.value?.amount;

    return lamports ? `${lamportsToSolText(lamports)} SOL` : null;
  });
  const qrMarkup = computed(() => (typeof qr.svg.value === "string" ? qr.svg.value : ""));
  const payStatus = computed(() => pay.status.value);
  const payError = computed(() =>
    formatError(createError.value ?? pay.error.value ?? qr.error.value),
  );
  const confirmationError = computed(() => formatError(confirmation.error.value));
  const walletAddress = computed(() => wallet.publicKey.value ?? null);

  function stopWatching() {
    polling.value = false;
    confirmation.stopPolling();
  }

  function useConnectedWalletAsRecipient() {
    const connected = walletAddress.value;

    if (connected) {
      recipient.value = connected;
    }
  }

  async function createRequest() {
    const lamports = amountLamports.value;

    if (!createReady.value || lamports === null) {
      return;
    }

    createError.value = null;
    verification.value = null;
    stopWatching();

    try {
      const url = await pay.createTransferRequest({
        recipient: address(recipient.value.trim()),
        amount: lamports,
        ...(label.value.trim() ? { label: label.value.trim() } : {}),
        ...(message.value.trim() ? { message: message.value.trim() } : {}),
        ...(memo.value.trim() ? { memo: memo.value.trim() } : {}),
        ...(splTokenValid.value && splToken.value.trim()
          ? { splToken: address(splToken.value.trim()) }
          : {}),
      });

      await qr.generate(url, { size: 260 });
    } catch (error) {
      createError.value = error;
    }
  }

  async function verifySettlement() {
    if (!reference.value) {
      return;
    }

    createError.value = null;
    verification.value = null;

    try {
      verification.value = (await pay.confirmTransfer({
        timeoutMs: 5_000,
      })) as PaymentVerification;
    } catch (error) {
      createError.value = error;
    }
  }

  function startWatching() {
    if (!reference.value) {
      return;
    }

    polling.value = true;
    confirmation.startPolling(rpc, reference.value, 2_000);
  }

  function resetRequest() {
    stopWatching();
    pay.reset();
    qr.reset();
    verification.value = null;
    createError.value = null;
  }

  onScopeDispose(stopWatching);

  return {
    amount,
    amountLamports,
    confirmationError,
    confirmationStatus: confirmation.status,
    createDisabledReason,
    createReady,
    createRequest,
    label,
    memo,
    parsedAmountText,
    parsedRequest,
    payError,
    payLoading: pay.loading,
    payStatus,
    polling,
    qrMarkup,
    recipient,
    recipientValid,
    reference,
    referenceList,
    requestUrl,
    resetRequest,
    splToken,
    splTokenValid,
    startWatching,
    stopWatching,
    useConnectedWalletAsRecipient,
    verification,
    verifySettlement,
    walletAddress,
    message,
  };
}
