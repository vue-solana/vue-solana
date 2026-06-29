import { computed, onMounted, shallowRef } from "vue";
import { createTransferInstruction } from "./transferInstruction";
import { formatError } from "./errors";
import { loadWeb3Compat, type Web3Compat } from "./web3Compat";

export function useDemoTransfer() {
  const connection = useSolanaConnection();
  const rpc = useSolanaRpc();
  const wallet = useSolanaWallet();
  const sendTransaction = useSolanaSignAndSendTransaction();
  const transferRecipient = shallowRef("");
  const transferAmount = shallowRef("0.000001");
  const devnetTransferError = shallowRef<unknown>(null);
  const web3 = shallowRef<Web3Compat | null>(null);

  const transferLamports = computed(() => {
    const amount = Number(transferAmount.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return Math.round(amount * 1_000_000_000);
  });
  const recipientAddressValid = computed(() => {
    if (!web3.value) {
      return false;
    }

    try {
      new web3.value.PublicKey(transferRecipient.value.trim());
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
      return "Select a discovered wallet first.";
    }

    if (!wallet.connected.value) {
      return "Connect the selected wallet to enable transfers.";
    }

    if (!recipientAddressValid.value) {
      return "Enter a valid Solana recipient address.";
    }

    if (!transferLamports.value) {
      return "Enter an amount greater than 0 SOL.";
    }

    return null;
  });
  const sendTransactionError = computed(() =>
    formatError(devnetTransferError.value ?? sendTransaction.error.value),
  );

  async function loadTransferWeb3() {
    web3.value = await loadWeb3Compat();
  }

  onMounted(() => {
    void loadTransferWeb3().catch((error) => {
      devnetTransferError.value = error;
    });
  });

  async function sendDevnetTransfer() {
    const fromPubkey = wallet.publicKey.value;
    const lamports = transferLamports.value;

    if (!fromPubkey || !lamports) {
      return;
    }

    devnetTransferError.value = null;

    try {
      const web3Compat = await loadWeb3Compat();
      const toPubkey = new web3Compat.PublicKey(transferRecipient.value.trim());
      const latestBlockhash = await connection.getLatestBlockhash();
      const transaction = new web3Compat.Transaction();

      transaction.feePayer = fromPubkey;
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.add(createTransferInstruction(web3Compat, fromPubkey, toPubkey, lamports));

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
