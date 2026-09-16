import { computed, shallowRef } from "vue";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  lamports,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { createTransferInstruction } from "./transferInstruction";
import { formatError } from "./errors";

export function useDemoTransfer() {
  const { t } = useI18n();
  const { client } = useSolana();
  const rpc = useSolanaRpc();
  const wallet = useSolanaWallet();
  const sendTransaction = useSolanaSignAndSendTransaction();
  const transferRecipient = shallowRef("");
  const transferAmount = shallowRef("0.000001");
  const devnetTransferError = shallowRef<unknown>(null);

  const transferLamports = computed(() => {
    const amount = Number(transferAmount.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    try {
      return lamports(Math.round(amount * 1_000_000_000));
    } catch {
      return null;
    }
  });
  const recipientAddressValid = computed(() => {
    try {
      address(transferRecipient.value.trim());
      return true;
    } catch {
      return false;
    }
  });
  const signAndSendReady = computed(
    () =>
      wallet.connected.value &&
      recipientAddressValid.value &&
      Boolean(transferLamports.value) &&
      !sendTransaction.loading.value,
  );
  const signAndSendState = computed(() => {
    const transactionState = sendTransaction as typeof sendTransaction & {
      status?: { value: string };
    };
    const status = transactionState.status?.value;

    if (status) {
      return status;
    }

    if (devnetTransferError.value ?? sendTransaction.error.value) {
      return "error";
    }

    if (sendTransaction.loading.value) {
      return "sending";
    }

    return sendTransaction.signature.value ? "sent" : "idle";
  });
  const signAndSendStatus = computed(() => {
    if (signAndSendState.value !== "idle") {
      return signAndSendState.value;
    }

    return wallet.connected.value ? "ready" : "waiting";
  });
  const transferExplorerUrl = computed(() => {
    const signature = sendTransaction.signature.value;

    if (!signature) {
      return null;
    }

    return `https://explorer.solana.com/tx/${signature}?cluster=${rpc.cluster.value}`;
  });
  const signAndSendDisabledReason = computed(() => {
    if (!wallet.wallet.value) {
      return t("demo.transfer.disabled.selectWallet");
    }

    if (!wallet.connected.value) {
      return t("demo.transfer.disabled.connectWallet");
    }

    if (!recipientAddressValid.value) {
      return t("demo.transfer.disabled.recipient");
    }

    if (!transferLamports.value) {
      return t("demo.transfer.disabled.amount");
    }

    return null;
  });
  const sendTransactionError = computed(() =>
    formatError(devnetTransferError.value ?? sendTransaction.error.value),
  );

  async function sendDevnetTransfer() {
    const fromPubkey = wallet.publicKey.value;
    const lamportsCount = transferLamports.value;

    if (!fromPubkey || !lamportsCount) {
      return;
    }

    devnetTransferError.value = null;

    try {
      const toAddress = address(transferRecipient.value.trim());
      const { value: latestBlockhash } = await client.rpc.getLatestBlockhash().send();
      const transactionMessage = appendTransactionMessageInstruction(
        createTransferInstruction(fromPubkey, toAddress, Number(lamportsCount)),
        setTransactionMessageLifetimeUsingBlockhash(
          latestBlockhash,
          setTransactionMessageFeePayer(fromPubkey, createTransactionMessage({ version: 0 })),
        ),
      );
      const transaction = new Uint8Array(
        getTransactionEncoder().encode(compileTransaction(transactionMessage)),
      );

      await sendTransaction.execute(transaction, {
        confirm: true,
        confirmation: { commitment: "confirmed" },
        skipPreflight: false,
      });
    } catch (error) {
      devnetTransferError.value = error;
    }
  }

  return {
    sendDevnetTransfer,
    sendTransaction,
    sendTransactionError,
    signAndSendDisabledReason,
    signAndSendReady,
    signAndSendState,
    signAndSendStatus,
    transferAmount,
    transferExplorerUrl,
    transferRecipient,
  };
}
