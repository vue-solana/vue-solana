import { computed, shallowRef, watch } from "vue";
import {
  address,
  appendTransactionMessageInstruction,
  createTransactionMessage,
  getTransactionDecoder,
  getTransactionEncoder,
  lamports,
  setTransactionMessageFeePayerSigner,
  summarizeTransactionPlanResult,
} from "@solana/kit";
import type { Address, TransactionPlanResult, TransactionSigner } from "@solana/kit";
import { formatError } from "./errors";

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * A Kit message signer backed by the connected wallet adapter. Kit hands the
 * signer compiled transactions; we serialize them to wire format (with a
 * zero-filled signature slot), let the wallet sign, and decode the signature
 * back out of the returned transaction.
 */
function createWalletMessageSigner(
  walletAddress: Address,
  signTransaction: (transaction: Uint8Array) => Promise<Uint8Array>,
) {
  return {
    address: walletAddress,
    async signTransactions(
      ...[transactions]: readonly [
        readonly { messageBytes: Uint8Array; signatures: Record<string, Uint8Array> }[],
      ]
    ) {
      return Promise.all(
        transactions.map(async (transaction) => {
          const signatures = { ...transaction.signatures };

          if (!signatures[walletAddress]) {
            signatures[walletAddress] = new Uint8Array(64);
          }

          const wire = getTransactionEncoder().encode({
            messageBytes: transaction.messageBytes,
            signatures,
          });
          const signedWire = await signTransaction(wire);
          const decoded = getTransactionDecoder().decode(signedWire);
          const signature = decoded.signatures[walletAddress];

          if (!signature) {
            throw new Error("The connected wallet did not return a fee-payer signature.");
          }

          return { [walletAddress]: signature };
        }),
      );
    },
  } as unknown as TransactionSigner;
}

/**
 * Client-sent transaction state for the demo: both send composables submit
 * through the client's transaction-sending capability with no wallet popup.
 * The connected wallet is the fee payer and signs each transaction through its
 * `signTransaction` adapter method — the client only plans, compiles, and
 * submits. Actions are gated on a connected wallet with sign capability.
 */
export function useDemoClientSend() {
  const sendTransaction = useSolanaSendTransaction();
  const sendTransactions = useSolanaSendTransactions();
  const airdrop = useSolanaAirdrop();
  const wallet = useSolanaWallet();

  /** Address shown as the fee payer; present only when a wallet is connected. */
  const clientSendPayerAddress = computed(() => wallet.publicKey.value);
  const singleStateAddress = shallowRef<Address | null>(null);
  const batchStateAddress = shallowRef<Address | null>(null);
  let singleAbortController: AbortController | undefined;
  let batchAbortController: AbortController | undefined;

  watch(clientSendPayerAddress, () => {
    singleAbortController?.abort();
    batchAbortController?.abort();
    singleStateAddress.value = null;
    batchStateAddress.value = null;
  });

  /**
   * A SPL Memo instruction — no accounts, no funds moved — so the demo send is
   * valid on any cluster and costs only the fee paid by the connected wallet.
   */
  function buildMemoInstruction() {
    return {
      programAddress: MEMO_PROGRAM_ADDRESS,
      accounts: [],
      data: new TextEncoder().encode("Hello from @vue-solana"),
    };
  }

  /**
   * Builds the memo transaction message with the connected wallet installed as
   * the fee-payer signer, or `null` when no capable wallet is connected. The
   * blockhash lifetime is added by the client's sender.
   */
  function buildWalletMemoMessage() {
    const walletAddress = wallet.publicKey.value;
    const signTransaction = wallet.wallet.value?.signTransaction;

    if (!walletAddress || !signTransaction) {
      return null;
    }

    const payerSigner = createWalletMessageSigner(address(walletAddress), signTransaction);

    return setTransactionMessageFeePayerSigner(
      payerSigner,
      appendTransactionMessageInstruction(
        buildMemoInstruction(),
        createTransactionMessage({ version: 0 }),
      ) as never,
    );
  }

  async function runClientSend() {
    const message = buildWalletMemoMessage();
    const executionAddress = clientSendPayerAddress.value;

    if (!message || !executionAddress) {
      singleStateAddress.value = null;
      return;
    }

    singleAbortController?.abort();
    singleAbortController = new AbortController();
    singleStateAddress.value = executionAddress;

    try {
      await sendTransaction.execute(message as never, {
        abortSignal: singleAbortController.signal,
      });
    } catch {
      // Already recorded on the composable and rendered by the card.
    }
  }

  async function runClientSendBatch() {
    const message = buildWalletMemoMessage();
    const executionAddress = clientSendPayerAddress.value;

    if (!message || !executionAddress) {
      batchStateAddress.value = null;
      return;
    }

    batchAbortController?.abort();
    batchAbortController = new AbortController();
    batchStateAddress.value = executionAddress;

    try {
      await sendTransactions.execute([message, message] as never, {
        abortSignal: batchAbortController.signal,
      });
    } catch {
      // Already recorded on the composable and rendered by the card.
    }
  }

  function ownsClientSendState(stateAddress: Address | null) {
    const currentAddress = clientSendPayerAddress.value;

    return currentAddress !== null && stateAddress === currentAddress;
  }

  const clientSendTransactionStatus = computed(() =>
    ownsClientSendState(singleStateAddress.value) ? sendTransaction.status.value : "idle",
  );
  const clientSendTransactionsStatus = computed(() =>
    ownsClientSendState(batchStateAddress.value) ? sendTransactions.status.value : "idle",
  );
  const sendTransactionText = computed(() => {
    const data = sendTransaction.data.value;

    return data && ownsClientSendState(singleStateAddress.value) ? formatPlanResult(data) : null;
  });
  const sendTransactionsText = computed(() => {
    const data = sendTransactions.data.value;

    return data && ownsClientSendState(batchStateAddress.value) ? formatPlanResult(data) : null;
  });
  const clientSendTransactionError = computed(() =>
    ownsClientSendState(singleStateAddress.value) ? formatError(sendTransaction.error.value) : null,
  );
  const clientSendTransactionsError = computed(() =>
    ownsClientSendState(batchStateAddress.value) ? formatError(sendTransactions.error.value) : null,
  );
  const airdropErrorText = computed(() => formatError(airdrop.error.value));
  const airdropSignature = computed(() => airdrop.data.value ?? null);

  async function runAirdrop() {
    if (!wallet.publicKey.value) {
      return;
    }

    try {
      await airdrop.dispatch(wallet.publicKey.value, lamports(1_000_000_000n));
    } catch {
      // Already recorded on the composable and rendered by the card.
    }
  }

  return {
    airdrop,
    airdropErrorText,
    airdropSignature,
    clientSendTransactionError,
    clientSendTransactionsError,
    // `clientSend`-prefixed names keep these composables from colliding with
    // the wallet-transfer demo's `sendTransaction` when `useDemoPage` spreads
    // both composables together.
    clientSendPayerAddress,
    clientSendTransaction: sendTransaction,
    clientSendTransactionStatus,
    clientSendTransactions: sendTransactions,
    clientSendTransactionsStatus,
    runAirdrop,
    runClientSend,
    runClientSendBatch,
    sendTransactionText,
    sendTransactionsText,
  };
}

function formatPlanResult(result: TransactionPlanResult): string {
  const summary = summarizeTransactionPlanResult(result);
  const successful = summary.successfulTransactions[0];
  const hasFailures = summary.failedTransactions.length + summary.canceledTransactions.length > 0;

  if (successful && !hasFailures) {
    return summary.successfulTransactions.length === 1
      ? `Signature ${successful.context.signature}`
      : `${summary.successfulTransactions.length} sent`;
  }

  const states: string[] = [];

  if (summary.successfulTransactions.length > 0) {
    states.push(`${summary.successfulTransactions.length} sent`);
  }

  if (summary.failedTransactions.length > 0) {
    states.push(`${summary.failedTransactions.length} failed`);
  }

  if (summary.canceledTransactions.length > 0) {
    states.push(`${summary.canceledTransactions.length} canceled`);
  }

  return states.join(" · ") || "No transactions completed";
}
