import { computed, shallowRef, watch } from "vue";
import { address, lamports, summarizeTransactionPlanResult } from "@vue-solana/nuxt/kit";
import type { Address, Instruction, TransactionPlanResult } from "@vue-solana/nuxt/kit";
import { formatError } from "./errors";

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * Shown instead of Kit's raw simulation failure. That failure is
 * `Attempt to debit an account but found no record of a prior credit`, which
 * does not tell the reader what to do about it.
 */
const UNFUNDED_PAYER_ERROR =
  "The client payer has no devnet SOL, so it cannot pay the transaction fee. " +
  'Fund it with "Airdrop 1 SOL" below (devnet faucets are rate-limited), ' +
  "or send SOL to its address from https://faucet.solana.com, then try again.";

/**
 * Client-sent transaction state for the demo: both send composables submit
 * through the client's transaction-sending capability with no wallet popup.
 * The client's own `payer` signer is the fee payer, so the app signs and pays
 * without any wallet involvement — the shape a relayer or server-side signer
 * would use. Fund that payer with the airdrop below before sending.
 */
export function useDemoClientSend() {
  const sendTransaction = useSolanaSendTransaction();
  const sendTransactions = useSolanaSendTransactions();
  const airdrop = useSolanaAirdrop();
  const payer = useSolanaPayer();

  /** Address shown as the fee payer; null until the client's payer resolves. */
  const clientSendPayerAddress = computed<Address | null>(() => payer.value?.address ?? null);
  const payerBalance = useSolanaBalance(clientSendPayerAddress);
  const { refresh: refreshPayerBalance } = payerBalance;
  const singleStateAddress = shallowRef<Address | null>(null);
  const batchStateAddress = shallowRef<Address | null>(null);
  const singleGuardError = shallowRef<string | null>(null);
  const batchGuardError = shallowRef<string | null>(null);
  let singleAbortController: AbortController | undefined;
  let batchAbortController: AbortController | undefined;

  watch(clientSendPayerAddress, () => {
    singleAbortController?.abort();
    batchAbortController?.abort();
    singleStateAddress.value = null;
    batchStateAddress.value = null;
    singleGuardError.value = null;
    batchGuardError.value = null;
  });

  /**
   * A zero-balance payer fails inside Kit's simulation step with
   * `Attempt to debit an account but found no record of a prior credit`, which
   * hides the actual problem (no devnet SOL). Check the balance first so the
   * card can say what to do. A failed balance read is not a reason to block:
   * the send then reports whatever the RPC says.
   */
  async function payerHasNoSol(): Promise<boolean> {
    try {
      return (await refreshPayerBalance()) === 0;
    } catch {
      return false;
    }
  }

  /**
   * A SPL Memo instruction — no accounts, no funds moved — so the demo send is
   * valid on any cluster and costs only the fee paid by the client payer.
   * The note is part of the message bytes, which is what keeps the two batch
   * transactions distinct: Ed25519 is deterministic, so signing the same
   * message twice produces the same signature and the network rejects the
   * duplicate.
   */
  function buildMemoInstruction(note: string): Instruction {
    // The Kit re-export offers no instruction encoder, so the memo shape is
    // asserted once here instead of at every use site.
    return {
      programAddress: MEMO_PROGRAM_ADDRESS,
      accounts: [],
      data: new TextEncoder().encode(note),
    } as Instruction;
  }

  async function runClientSend() {
    const executionAddress = clientSendPayerAddress.value;

    if (!executionAddress) {
      singleStateAddress.value = null;
      return;
    }

    singleAbortController?.abort();
    singleAbortController = new AbortController();
    singleStateAddress.value = executionAddress;
    singleGuardError.value = null;

    if (await payerHasNoSol()) {
      singleGuardError.value = UNFUNDED_PAYER_ERROR;

      return;
    }

    try {
      // An instruction plan, not a message: the client sets the fee payer from
      // `client.payer` and adds the blockhash lifetime.
      await sendTransaction.execute([buildMemoInstruction("Hello from @vue-solana")], {
        abortSignal: singleAbortController.signal,
      });
      await refreshPayerBalance();
    } catch {
      // Already recorded on the composable and rendered by the card.
    }
  }

  async function runClientSendBatch() {
    const executionAddress = clientSendPayerAddress.value;

    if (!executionAddress) {
      batchStateAddress.value = null;
      return;
    }

    batchAbortController?.abort();
    batchAbortController = new AbortController();
    batchStateAddress.value = executionAddress;
    batchGuardError.value = null;

    if (await payerHasNoSol()) {
      batchGuardError.value = UNFUNDED_PAYER_ERROR;

      return;
    }

    try {
      await sendTransactions.execute(
        [
          buildMemoInstruction("Hello from @vue-solana (1 of 2)"),
          buildMemoInstruction("Hello from @vue-solana (2 of 2)"),
        ],
        { abortSignal: batchAbortController.signal },
      );
      await refreshPayerBalance();
    } catch {
      // Already recorded on the composable and rendered by the card.
    }
  }

  function ownsClientSendState(stateAddress: Address | null) {
    const currentAddress = clientSendPayerAddress.value;

    return currentAddress !== null && stateAddress === currentAddress;
  }

  const clientSendTransactionStatus = computed(() => {
    if (!ownsClientSendState(singleStateAddress.value)) {
      return "idle";
    }

    return singleGuardError.value ? "error" : sendTransaction.status.value;
  });
  const clientSendTransactionsStatus = computed(() => {
    if (!ownsClientSendState(batchStateAddress.value)) {
      return "idle";
    }

    return batchGuardError.value ? "error" : sendTransactions.status.value;
  });
  const sendTransactionText = computed(() => {
    const data = sendTransaction.data.value;

    return data && ownsClientSendState(singleStateAddress.value) ? formatPlanResult(data) : null;
  });
  const sendTransactionsText = computed(() => {
    const data = sendTransactions.data.value;

    return data && ownsClientSendState(batchStateAddress.value) ? formatPlanResult(data) : null;
  });
  const clientSendTransactionError = computed(() =>
    ownsClientSendState(singleStateAddress.value)
      ? (singleGuardError.value ?? formatError(sendTransaction.error.value))
      : null,
  );
  const clientSendTransactionsError = computed(() =>
    ownsClientSendState(batchStateAddress.value)
      ? (batchGuardError.value ?? formatError(sendTransactions.error.value))
      : null,
  );
  const airdropErrorText = computed(() => formatError(airdrop.error.value));
  const airdropSignature = computed(() => airdrop.data.value ?? null);

  async function runAirdrop() {
    const payerAddress = clientSendPayerAddress.value;

    if (!payerAddress) {
      return;
    }

    try {
      await airdrop.dispatch(payerAddress, lamports(1_000_000_000n));
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
    clientSendPayerBalance: payerBalance.balance,
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
