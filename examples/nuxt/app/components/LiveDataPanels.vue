<script setup lang="ts">
import { computed, ref } from "vue";
import {
  address,
  lamports,
  summarizeTransactionPlanResult,
  type Instruction,
  type TransactionPlanResult,
} from "@solana/kit";

const { client } = useSolanaClient();
const wallet = useSolanaWallet();
const signIn = useSolanaSignIn();
const airdrop = useSolanaAirdrop();
const payer = useSolanaPayer();
const sendTransaction = useSolanaSendTransaction();
const sendTransactions = useSolanaSendTransactions();
const payerFundingAction = useSolanaAirdrop();
const clientActionBusy = ref(false);

/** Account whose live data the panels track; re-typing it re-fires everything. */
const trackedAddressInput = ref("HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH");
const trackedAddress = computed(() => {
  const raw = trackedAddressInput.value.trim();

  try {
    return address(raw);
  } catch {
    return null;
  }
});

/**
 * `useSolanaRequest` — one-shot request over the HTTP RPC, re-fired by source
 * identity change (the computed below) with stale-while-revalidate.
 */
const request = useSolanaRequest(
  computed(() =>
    trackedAddress.value
      ? async (signal: AbortSignal) => {
          const [balanceResponse, versionResponse] = await Promise.all([
            client.rpc.getBalance(trackedAddress.value).send({ abortSignal: signal }),
            client.rpc.getVersion().send({ abortSignal: signal }),
          ]);

          return {
            lamports: balanceResponse.value,
            slot: balanceResponse.context.slot,
            sol: Number(balanceResponse.value) / 1_000_000_000,
            core: versionResponse["solana-core"],
          };
        }
      : null,
  ),
);

/**
 * `useSolanaSubscription` — raw slot notifications from the websocket RPC; a
 * null source (invalid address) disables the connection.
 */
interface SlotNotificationShape {
  parent: number | bigint;
  root: number | bigint;
  slot: number | bigint;
}

const slots = useSolanaSubscription<SlotNotificationShape>(
  computed(() => (trackedAddress.value ? client.rpcSubscriptions.slotNotifications() : null)),
);

/**
 * `useSolanaTrackedData` — seeded by `getAccountInfo`, updated by
 * `accountNotifications`, slot-deduplicated between the two sources.
 */
const tracked = useSolanaTrackedData<
  { lamports: bigint } | null,
  { lamports: bigint } | null,
  bigint
>({
  rpcRequest: computed(() =>
    trackedAddress.value
      ? client.rpc.getAccountInfo(trackedAddress.value, { encoding: "base64" })
      : null,
  ),
  rpcSubscriptionRequest: computed(() =>
    trackedAddress.value
      ? client.rpcSubscriptions.accountNotifications(trackedAddress.value, {
          commitment: "confirmed",
        })
      : null,
  ),
  rpcValueMapper: (value) => value?.lamports ?? 0n,
  rpcSubscriptionValueMapper: (value) => value?.lamports ?? 0n,
});

/** Toggling remounts `SwrCard`, demonstrating stale-while-revalidate on mount. */
const swrPanelVisible = ref(true);

const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

/**
 * A SPL Memo instruction — no accounts, no funds moved — so the demo send is
 * valid on any cluster and succeeds whenever the client's payer signer has
 * enough lamports for the fee.
 */
function buildMemoInstruction(note: string): Instruction {
  // `@solana/kit` re-exports no instruction encoder, so the memo shape is
  // asserted once here instead of at every use site.
  return {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: [],
    data: new TextEncoder().encode(note),
  } as Instruction;
}

const payerStatusText = computed(() => {
  const status = payerFundingAction.isRunning.value
    ? "funding"
    : payerFundingAction.error.value
      ? "failed"
      : payerFundingAction.data.value
        ? "funded"
        : "funding required";

  return `${status} · ${payer.value.address.slice(0, 8)}…`;
});
const payerFundText = computed(() => {
  if (payerFundingAction.isRunning.value) {
    return "Funding payer...";
  }

  if (payerFundingAction.error.value) {
    return "Payer funding failed";
  }

  return payerFundingAction.data.value
    ? `Payer funded · Signature ${payerFundingAction.data.value}`
    : "Payer not funded";
});
const payerFundError = computed(() => formatError(payerFundingAction.error.value));

async function runExclusiveClientAction(action: () => Promise<unknown>) {
  if (clientActionBusy.value) {
    return;
  }

  clientActionBusy.value = true;

  try {
    await action();
  } catch {
    return;
  } finally {
    clientActionBusy.value = false;
  }
}

async function runFundPayer() {
  await runExclusiveClientAction(async () => {
    payerFundingAction.reset();
    await payerFundingAction.dispatch(payer.value.address, lamports(1_000_000_000n));
  });
}

async function runClientSend() {
  await runExclusiveClientAction(() =>
    sendTransaction.execute([buildMemoInstruction("Hello from @vue-solana")]),
  );
}

async function runClientSendBatch() {
  await runExclusiveClientAction(() =>
    sendTransactions.execute([
      // Distinct notes, or both transactions serialize to the same bytes and
      // the duplicate signature gets rejected.
      buildMemoInstruction("Hello from @vue-solana (1 of 2)"),
      buildMemoInstruction("Hello from @vue-solana (2 of 2)"),
    ]),
  );
}

const sendTransactionSignatureText = computed(() => {
  const data = sendTransaction.data.value;

  return data ? formatPlanResult(data, "No client send yet") : "No client send yet";
});
const sendTransactionsText = computed(() => {
  const data = sendTransactions.data.value;

  return data ? formatPlanResult(data, "No batch send yet") : "No batch send yet";
});
const sendTransactionErrorText = computed(() => formatError(sendTransaction.error.value));
const sendTransactionsErrorText = computed(() => formatError(sendTransactions.error.value));

function formatPlanResult(result: TransactionPlanResult, emptyText: string): string {
  const summary = summarizeTransactionPlanResult(result);
  const successful = summary.successfulTransactions[0];
  const hasFailures = summary.failedTransactions.length + summary.canceledTransactions.length > 0;

  if (successful && !hasFailures) {
    return summary.successfulTransactions.length === 1
      ? `Signature ${successful.context.signature}`
      : `Batch of ${summary.successfulTransactions.length} sent`;
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

  return states.join(" · ") || emptyText;
}

function formatError(error: unknown): string {
  return error ? (error instanceof Error ? error.message : String(error)) : "";
}

const requestText = computed(() => {
  const data = request.data.value;

  return data ? `${data.sol} SOL · solana-core ${data.core}` : "No data yet";
});
const slotsText = computed(() => {
  const data = slots.data.value;

  return data ? `Slot ${data.slot} · root ${data.root}` : "No notifications yet";
});
const trackedText = computed(() => {
  const response = tracked.data.value;

  return response ? `Lamports ${response.value} · slot ${response.context.slot}` : "No data yet";
});
const signInErrorText = computed(() => formatError(signIn.error.value));
const airdropErrorText = computed(() => formatError(airdrop.error.value));
</script>

<template>
  <section class="panel" data-testid="live-panels">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Auto-imported composables</p>
        <h2>Live Data Panels</h2>
      </div>
    </div>

    <p>
      These panels exercise <code>useSolanaRequest</code>, <code>useSolanaSubscription</code>,
      <code>useSolanaTrackedData</code>, <code>useSolanaSignIn</code>,
      <code>useSolanaAirdrop</code>, <code>useSolanaPayer</code>, and the client-sent transaction
      composables against devnet. Changing the tracked address re-fires everything.
    </p>

    <label>
      Tracked address
      <input v-model="trackedAddressInput" data-testid="tracked-address" spellcheck="false" />
    </label>

    <div class="panel-grid">
      <article class="subpanel">
        <header>
          <h3>useSolanaRequest</h3>
          <span class="status-pill" role="status" aria-live="polite" data-testid="request-status">{{
            request.status.value
          }}</span>
        </header>
        <p class="result" aria-live="polite" data-testid="request-data">{{ requestText }}</p>
        <p
          v-if="request.error.value"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="request-error"
        >
          {{ request.error.value.message }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaSubscription</h3>
          <span
            class="status-pill"
            role="status"
            aria-live="polite"
            data-testid="subscription-status"
            >{{ slots.status.value }}</span
          >
        </header>
        <p class="result" aria-live="polite" data-testid="subscription-data">{{ slotsText }}</p>
        <p
          v-if="slots.error.value"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="subscription-error"
        >
          {{ slots.error.value.message }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaTrackedData</h3>
          <span class="status-pill" role="status" aria-live="polite" data-testid="tracked-status">{{
            tracked.status.value
          }}</span>
        </header>
        <p class="result" aria-live="polite" data-testid="tracked-data">{{ trackedText }}</p>
        <p
          v-if="tracked.error.value"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="tracked-error"
        >
          {{ tracked.error.value.message }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaSignIn</h3>
          <span class="status-pill" role="status" aria-live="polite" data-testid="sign-in-status">{{
            signIn.status.value
          }}</span>
        </header>
        <p>
          Triggers the wallet's Sign In With Solana feature. The result must be verified on a server
          before trusting the identity.
        </p>
        <div class="actions">
          <button
            type="button"
            data-testid="sign-in-button"
            :disabled="!wallet.connected.value || signIn.loading.value"
            @click="signIn.signIn()"
          >
            {{ signIn.loading.value ? "Signing in..." : "Sign In With Wallet" }}
          </button>
        </div>
        <p class="result" aria-live="polite" data-testid="sign-in-result">
          {{
            signIn.signInResult.value
              ? `Signed in as ${signIn.signInResult.value.account.address}`
              : "Not signed in"
          }}
        </p>
        <p
          v-if="signInErrorText"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="sign-in-error"
        >
          {{ signInErrorText }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaAirdrop</h3>
          <span class="status-pill" role="status" aria-live="polite" data-testid="airdrop-status">{{
            airdrop.status.value
          }}</span>
        </header>
        <p>
          Airdrops 1 SOL into the connected wallet. Requires an airdrop-capable RPC client such as
          devnet or a local validator; some implementations update balances without a transaction.
        </p>
        <p v-if="!wallet.connected.value" class="hint" data-testid="airdrop-connect-hint">
          Connect a wallet to airdrop SOL into it.
        </p>
        <div class="actions">
          <button
            type="button"
            data-testid="airdrop-button"
            :disabled="!wallet.connected.value || airdrop.isRunning.value"
            @click="airdrop.dispatch(wallet.publicKey.value!, lamports(1_000_000_000n))"
          >
            {{ airdrop.isRunning.value ? "Airdropping..." : "Airdrop 1 SOL" }}
          </button>
        </div>
        <p class="result" aria-live="polite" data-testid="airdrop-data">
          {{ airdrop.data.value ? `Signature ${airdrop.data.value}` : "No airdrop yet" }}
        </p>
        <p
          v-if="airdropErrorText"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="airdrop-error"
        >
          {{ airdropErrorText }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaSendTransaction</h3>
          <span
            class="status-pill"
            role="status"
            aria-live="polite"
            data-testid="send-transaction-status"
            >{{ sendTransaction.status.value }}</span
          >
        </header>
        <p>
          Sends a SPL Memo through the client's transaction-sending capability — no wallet popup.
          The client payer signer covers the fee, so it must hold lamports: fund it first via the
          usePayer panel below.
        </p>
        <div class="actions">
          <button
            type="button"
            data-testid="send-transaction-button"
            :disabled="clientActionBusy"
            @click="runClientSend"
          >
            {{ sendTransaction.loading.value ? "Sending..." : "Send Via Client" }}
          </button>
        </div>
        <p class="result" aria-live="polite" data-testid="send-transaction-data">
          {{ sendTransactionSignatureText }}
        </p>
        <p
          v-if="sendTransactionErrorText"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="send-transaction-error"
        >
          {{ sendTransactionErrorText }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaSendTransactions</h3>
          <span
            class="status-pill"
            role="status"
            aria-live="polite"
            data-testid="send-transactions-status"
            >{{ sendTransactions.status.value }}</span
          >
        </header>
        <p>
          Sends a batch of two memos in one call. The plan executes sequentially and resolves to the
          full plan result tree. Requires a funded client payer.
        </p>
        <div class="actions">
          <button
            type="button"
            data-testid="send-transactions-button"
            :disabled="clientActionBusy"
            @click="runClientSendBatch"
          >
            {{ sendTransactions.loading.value ? "Sending..." : "Send 2 Via Client" }}
          </button>
        </div>
        <p class="result" aria-live="polite" data-testid="send-transactions-data">
          {{ sendTransactionsText }}
        </p>
        <p
          v-if="sendTransactionsErrorText"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="send-transactions-error"
        >
          {{ sendTransactionsErrorText }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSolanaPayer</h3>
          <span class="status-pill" role="status" aria-live="polite" data-testid="payer-status">{{
            payerStatusText
          }}</span>
        </header>
        <p>
          The client's fee-payer signer (<code>{{ payer.address }}</code
          >), configured via <code>solana.payerSecretKey</code>. Airdrop 1 SOL into it so the
          client-sent transaction panels can pay fees.
        </p>
        <div class="actions">
          <button
            type="button"
            data-testid="payer-fund-button"
            :disabled="clientActionBusy"
            @click="runFundPayer"
          >
            {{ payerFundingAction.isRunning.value ? "Funding..." : "Airdrop 1 SOL to payer" }}
          </button>
        </div>
        <p class="result" aria-live="polite" data-testid="payer-fund-result">{{ payerFundText }}</p>
        <p
          v-if="payerFundError"
          class="error"
          role="alert"
          aria-live="assertive"
          data-testid="payer-fund-error"
        >
          {{ payerFundError }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useRequestSwr</h3>
          <button
            type="button"
            class="toggle-button"
            data-testid="swr-toggle"
            @click="swrPanelVisible = !swrPanelVisible"
          >
            {{ swrPanelVisible ? "Hide card" : "Show card" }}
          </button>
        </header>
        <p>
          Cache-keyed request. Hiding and re-showing the card remounts it: the cached value appears
          immediately (stale) while the request revalidates (fresh).
        </p>
        <SwrCard v-if="swrPanelVisible" />
        <p v-else class="result" data-testid="swr-data">Card hidden</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel-grid {
  display: grid;
  gap: 0.9rem;
  margin-top: 1rem;
}

.subpanel {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.9rem 1rem;
  background: var(--color-background);
}

.subpanel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.subpanel h3 {
  margin: 0;
  color: var(--color-heading);
  font-size: 1rem;
}

.status-pill {
  flex: 0 0 auto;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.toggle-button {
  padding: 0.32rem 0.7rem;
  font-size: 0.78rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.result {
  margin: 0.85rem 0 0;
  overflow-wrap: anywhere;
}

.error {
  margin: 0.85rem 0 0;
  color: hsl(0, 80%, 55%);
  overflow-wrap: anywhere;
}

.hint {
  margin: 0.85rem 0 0;
  color: var(--color-text);
  opacity: 0.7;
  overflow-wrap: anywhere;
}
</style>
