<script setup lang="ts">
import { Buffer } from "buffer/";
import { computed, ref } from "vue";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3-compat";
import {
  useBalance,
  useConnection,
  useRpc,
  useSignAndSendTransaction,
  useSolana,
  useTransaction,
  useWallet,
  useWallets,
} from "@vue-solana/vue";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

const solana = useSolana();
const rpc = useRpc();
const connection = useConnection();
const wallet = useWallet();
const walletDiscovery = useWallets();
const sendTransaction = useSignAndSendTransaction();

const balanceAddress = ref("11111111111111111111111111111111");
const transferRecipient = ref("");
const transferAmount = ref("0.000001");
const directBlockhash = ref<string | null>(null);
const directConnectionLoading = ref(false);
const directConnectionError = ref<string | null>(null);
const devnetTransferError = ref<unknown>(null);
const walletsLoaded = ref(false);
const walletNotice = ref<{ type: "success" | "error"; message: string } | null>(null);

const systemProgramId = new PublicKey("11111111111111111111111111111111");

const balance = useBalance(balanceAddress);

const mockTransaction = useTransaction(async (label: string) => {
  await new Promise((resolve) => window.setTimeout(resolve, 350));
  return `mock-${label}-${Date.now()}`;
});

const pluginInstalled = computed(() => Boolean(solana.connection && solana.endpoint));
const walletPublicKey = computed(() => wallet.publicKey.value?.toBase58() ?? "Not connected");
const walletConfigured = computed(() => Boolean(wallet.wallet.value));
const discoveredWalletCount = computed(() =>
  walletsLoaded.value ? walletDiscovery.wallets.value.length : 0,
);
const walletStatusText = computed(() => {
  if (wallet.connecting.value) {
    return "connecting";
  }

  if (wallet.disconnecting.value) {
    return "disconnecting";
  }

  return wallet.connected.value ? "connected" : "not connected";
});
const walletStatusClass = computed(() => {
  if (wallet.loading.value) {
    return "status-pill--checking";
  }

  return wallet.connected.value ? "status-pill--connected" : "status-pill--idle";
});
const canConnectWallet = computed(
  () => walletConfigured.value && !wallet.connected.value && !wallet.loading.value,
);
const canDisconnectWallet = computed(
  () => walletConfigured.value && wallet.connected.value && !wallet.loading.value,
);
const transferLamports = computed(() => {
  const amount = Number(transferAmount.value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 1_000_000_000);
});
const recipientAddressValid = computed(() => {
  try {
    new PublicKey(transferRecipient.value.trim());
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
const signAndSendStatus = computed(() => {
  if (sendTransaction.status.value !== "idle") {
    return sendTransaction.status.value;
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
  if (!walletConfigured.value) {
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
const balanceInSol = computed(() => {
  if (balance.balance.value === null) {
    return "No balance loaded";
  }

  return `${balance.balance.value / 1_000_000_000} SOL`;
});
const balanceError = computed(() => formatError(balance.error.value));
const mockTransactionError = computed(() => formatError(mockTransaction.error.value));
const sendTransactionError = computed(() =>
  formatError(devnetTransferError.value ?? sendTransaction.error.value),
);

function formatError(error: unknown) {
  if (!error) {
    return null;
  }

  return error instanceof Error ? error.message : String(error);
}

async function loadDirectBlockhash() {
  directConnectionLoading.value = true;
  directConnectionError.value = null;

  try {
    const blockhash = await connection.getLatestBlockhash();
    directBlockhash.value = blockhash.blockhash;
  } catch (error) {
    directConnectionError.value = formatError(error);
  } finally {
    directConnectionLoading.value = false;
  }
}

async function connectWallet() {
  try {
    await wallet.connect();

    walletNotice.value = {
      type: "success",
      message: `Wallet connected: ${wallet.publicKey.value?.toBase58() ?? "selected wallet"}`,
    };
  } catch (error) {
    walletNotice.value = {
      type: "error",
      message: formatError(error) ?? "Unable to connect to the selected wallet.",
    };
  }
}

async function disconnectWallet() {
  const publicKey = wallet.publicKey.value?.toBase58();

  try {
    await wallet.disconnect();

    walletNotice.value = {
      type: "success",
      message: `Wallet disconnected: ${publicKey ?? "selected wallet"}`,
    };
  } catch (error) {
    walletNotice.value = {
      type: "error",
      message: formatError(error) ?? "Unable to disconnect from the selected wallet.",
    };
  }
}

function clearWallet() {
  walletDiscovery.selectWallet(null);
}

function loadWallets() {
  walletsLoaded.value = true;
  walletDiscovery.refreshWallets();
}

async function copyWalletAddress() {
  const publicKey = wallet.publicKey.value?.toBase58();

  if (!publicKey) {
    return;
  }

  try {
    await navigator.clipboard.writeText(publicKey);

    walletNotice.value = {
      type: "success",
      message: `Wallet address copied: ${publicKey}`,
    };
  } catch (error) {
    walletNotice.value = {
      type: "error",
      message: formatError(error) ?? "Unable to copy wallet address.",
    };
  }
}

async function runMockTransaction() {
  await mockTransaction.execute("transaction");
}

async function sendDevnetTransfer() {
  const fromPubkey = wallet.publicKey.value;
  const lamports = transferLamports.value;

  if (!fromPubkey || !lamports) {
    return;
  }

  devnetTransferError.value = null;

  try {
    const toPubkey = new PublicKey(transferRecipient.value.trim());
    const latestBlockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction();

    transaction.feePayer = fromPubkey;
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.add(createTransferInstruction(fromPubkey, toPubkey, lamports));

    await sendTransaction.execute(transaction, {
      confirm: true,
      confirmation: { commitment: "confirmed" },
      skipPreflight: false,
    });
  } catch (error) {
    devnetTransferError.value = error;
  }
}

function createTransferInstruction(fromPubkey: PublicKey, toPubkey: PublicKey, lamports: number) {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);

  view.setUint32(0, 2, true);
  view.setBigUint64(4, BigInt(lamports), true);

  return new TransactionInstruction({
    keys: [
      { pubkey: fromPubkey, isSigner: true, isWritable: true },
      { pubkey: toPubkey, isSigner: false, isWritable: true },
    ],
    programId: systemProgramId,
    data,
  });
}
</script>

<template>
  <main class="dashboard">
    <section class="hero panel" data-testid="hero">
      <p class="eyebrow">Vue Solana Example App</p>
      <h1>Composable Example Dashboard</h1>
      <p>
        This screen demonstrates the current Vue Solana library features from one place: plugin
        injection, RPC status, direct connection calls, balance lookup, browser wallet discovery,
        generic transaction state, and real devnet transfers.
      </p>
    </section>

    <section class="panel" data-testid="rpc-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolana + useRpc</p>
          <h2>Plugin And RPC Status</h2>
        </div>
        <span
          class="status-pill"
          :class="`status-pill--${rpc.status.value}`"
          data-testid="rpc-status"
        >
          {{ rpc.status }}
        </span>
      </div>

      <dl class="data-grid">
        <div>
          <dt>Plugin installed</dt>
          <dd data-testid="plugin-installed">{{ pluginInstalled ? "Yes" : "No" }}</dd>
        </div>
        <div>
          <dt>Cluster</dt>
          <dd data-testid="rpc-cluster">{{ rpc.cluster }}</dd>
        </div>
        <div>
          <dt>RPC endpoint</dt>
          <dd data-testid="rpc-endpoint">{{ rpc.endpoint }}</dd>
        </div>
        <div>
          <dt>WebSocket endpoint</dt>
          <dd>{{ rpc.wsEndpoint }}</dd>
        </div>
        <div>
          <dt>Latest blockhash</dt>
          <dd data-testid="rpc-latest-blockhash">
            {{ rpc.latestBlockhash.value ?? "Not loaded yet" }}
          </dd>
        </div>
        <div v-if="rpc.error.value">
          <dt>RPC error</dt>
          <dd>{{ rpc.error.value }}</dd>
        </div>
      </dl>

      <button type="button" data-testid="check-rpc" @click="rpc.checkConnection">
        Check RPC Again
      </button>
    </section>

    <section class="panel" data-testid="direct-connection-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useConnection</p>
          <h2>Direct Connection Call</h2>
        </div>
      </div>

      <p>
        Calls <code>connection.getLatestBlockhash()</code> directly from the injected connection.
      </p>
      <button
        type="button"
        data-testid="load-blockhash"
        :disabled="directConnectionLoading"
        @click="loadDirectBlockhash"
      >
        {{ directConnectionLoading ? "Loading..." : "Load Blockhash" }}
      </button>
      <p v-if="directBlockhash" class="result" data-testid="blockhash-result">
        Blockhash: {{ directBlockhash }}
      </p>
      <p v-if="directConnectionError" class="error">{{ directConnectionError }}</p>
    </section>

    <section class="panel" data-testid="balance-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useBalance</p>
          <h2>Balance Lookup</h2>
        </div>
      </div>

      <label>
        Public key
        <input
          v-model="balanceAddress"
          data-testid="balance-address"
          placeholder="Enter a Solana public key"
        />
      </label>
      <div class="actions">
        <button
          type="button"
          data-testid="refresh-balance"
          :disabled="balance.loading.value"
          @click="balance.refresh"
        >
          {{ balance.loading.value ? "Loading..." : "Refresh Balance" }}
        </button>
      </div>
      <p class="result" data-testid="balance-lamports">
        Lamports: {{ balance.balance.value ?? "No balance loaded" }}
      </p>
      <p class="result" data-testid="balance-sol">SOL: {{ balanceInSol }}</p>
      <p v-if="balanceError" class="error">{{ balanceError }}</p>
    </section>

    <section class="panel" data-testid="wallet-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useWallets + useWallet</p>
          <h2>Browser Wallets</h2>
        </div>
        <span class="status-pill" :class="walletStatusClass">
          {{ walletStatusText }}
        </span>
      </div>

      <p>
        Click <strong>Load Wallets</strong> to discover Solana Wallet Standard browser wallets.
        Install Phantom, Solflare, Backpack, or another standard wallet and switch it to devnet
        before testing transfers.
      </p>

      <dl class="data-grid">
        <div>
          <dt>Discovered wallets</dt>
          <dd data-testid="wallet-count">{{ discoveredWalletCount }}</dd>
        </div>
        <div>
          <dt>Selected wallet</dt>
          <dd data-testid="selected-wallet">
            {{ walletDiscovery.selectedWallet.value?.name ?? "None" }}
          </dd>
        </div>
        <div>
          <dt>Wallet configured</dt>
          <dd data-testid="wallet-configured">{{ walletConfigured ? "Yes" : "No" }}</dd>
        </div>
        <div>
          <dt>Public key</dt>
          <dd>
            <span class="copyable-address">
              <code data-testid="wallet-public-key">{{ walletPublicKey }}</code>
              <button
                v-if="wallet.publicKey.value"
                type="button"
                class="copy-address-button"
                aria-label="Copy wallet address"
                title="Copy wallet address"
                @click="copyWalletAddress"
              >
                Copy
              </button>
            </span>
          </dd>
        </div>
        <div>
          <dt>Connecting</dt>
          <dd>{{ wallet.connecting.value ? "Yes" : "No" }}</dd>
        </div>
        <div>
          <dt>Disconnecting</dt>
          <dd>{{ wallet.disconnecting.value ? "Yes" : "No" }}</dd>
        </div>
      </dl>

      <div v-if="walletsLoaded && walletDiscovery.wallets.value.length" class="wallet-list">
        <button
          v-for="discoveredWallet in walletDiscovery.wallets.value"
          :key="discoveredWallet.name"
          type="button"
          class="wallet-option"
          :class="{
            'wallet-option--selected':
              walletDiscovery.selectedWallet.value?.name === discoveredWallet.name,
          }"
          @click="walletDiscovery.selectWallet(discoveredWallet)"
        >
          <img :src="discoveredWallet.icon" :alt="`${discoveredWallet.name} icon`" />
          <span>{{ discoveredWallet.name }}</span>
        </button>
      </div>
      <p v-if="!walletsLoaded" class="help-text" data-testid="wallet-message">
        Wallet discovery has not been loaded yet.
      </p>
      <p
        v-else-if="!walletDiscovery.wallets.value.length"
        class="help-text"
        data-testid="wallet-message"
      >
        No wallets detected. Install a Solana wallet extension or use a supported mobile wallet,
        then refresh wallets.
      </p>

      <div class="actions">
        <button type="button" data-testid="load-wallets" @click="loadWallets">
          {{ walletsLoaded ? "Refresh Wallets" : "Load Wallets" }}
        </button>
        <button
          type="button"
          data-testid="connect-wallet"
          :disabled="!canConnectWallet"
          @click="connectWallet"
        >
          {{ wallet.connecting.value ? "Connecting..." : "Connect" }}
        </button>
        <button
          type="button"
          data-testid="disconnect-wallet"
          :disabled="!canDisconnectWallet"
          @click="disconnectWallet"
        >
          {{ wallet.disconnecting.value ? "Disconnecting..." : "Disconnect" }}
        </button>
        <button type="button" :disabled="!walletConfigured" @click="clearWallet">
          Clear Selection
        </button>
      </div>
      <p v-if="walletNotice" :class="walletNotice.type === 'error' ? 'error' : 'result'">
        {{ walletNotice.message }}
      </p>
    </section>

    <section class="panel" data-testid="transaction-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useTransaction</p>
          <h2>Generic Transaction State</h2>
        </div>
      </div>

      <p>Runs a mock async handler to test loading, error, and signature state.</p>
      <button
        type="button"
        data-testid="run-mock-transaction"
        :disabled="mockTransaction.loading.value"
        @click="runMockTransaction"
      >
        {{ mockTransaction.loading.value ? "Running..." : "Run Mock Transaction" }}
      </button>
      <p class="result" data-testid="mock-transaction-signature">
        Signature: {{ mockTransaction.signature.value ?? "No signature yet" }}
      </p>
      <p v-if="mockTransactionError" class="error">{{ mockTransactionError }}</p>
    </section>

    <section class="panel" data-testid="transfer-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSignAndSendTransaction</p>
          <h2>Real Devnet Transfer</h2>
        </div>
        <span class="status-pill" :class="`status-pill--${sendTransaction.status.value}`">
          {{ signAndSendStatus }}
        </span>
      </div>

      <p>
        Sends a real transfer from the connected wallet, then waits for confirmed commitment. Use
        devnet, enter a recipient public key, and start with a tiny amount such as
        <code>0.000001</code> SOL.
      </p>
      <dl class="data-grid compact-grid">
        <div>
          <dt>Submitted signature</dt>
          <dd>{{ sendTransaction.signature.value ?? "No signature yet" }}</dd>
        </div>
        <div>
          <dt>Confirmation state</dt>
          <dd data-testid="transfer-confirmation-state">{{ sendTransaction.status.value }}</dd>
        </div>
      </dl>
      <label>
        Recipient address
        <input v-model="transferRecipient" placeholder="Enter recipient public key" />
      </label>
      <label>
        Amount in SOL
        <input v-model="transferAmount" inputmode="decimal" placeholder="0.000001" />
      </label>
      <div class="actions">
        <button
          type="button"
          data-testid="send-transfer"
          :disabled="!signAndSendReady"
          @click="sendDevnetTransfer"
        >
          {{ sendTransaction.loading.value ? "Sending..." : "Send Devnet Transfer" }}
        </button>
      </div>
      <p v-if="signAndSendDisabledReason" class="help-text" data-testid="transfer-disabled-reason">
        {{ signAndSendDisabledReason }}
      </p>
      <p class="result" data-testid="transfer-signature">
        Signature: {{ sendTransaction.signature.value ?? "No signature yet" }}
      </p>
      <p v-if="transferExplorerUrl" class="result" data-testid="transfer-explorer-link">
        Explorer:
        <a :href="transferExplorerUrl" target="_blank" rel="noreferrer">View transaction</a>
      </p>
      <p v-if="sendTransactionError" class="error">{{ sendTransactionError }}</p>
    </section>
  </main>
</template>

<style scoped>
.dashboard {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: clamp(1rem, 4vw, 2.5rem);
  display: grid;
  gap: 1rem;
}

.panel {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  padding: clamp(1rem, 3vw, 1.35rem);
  background: color-mix(in srgb, var(--color-background-soft) 82%, transparent);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
}

.hero {
  padding: clamp(1.25rem, 5vw, 2rem);
  background:
    radial-gradient(circle at top left, hsla(160, 100%, 37%, 0.22), transparent 34rem),
    var(--color-background-soft);
}

.hero h1,
.panel h2 {
  margin: 0;
  color: var(--color-heading);
  font-weight: 700;
  line-height: 1.1;
}

.hero h1 {
  margin-bottom: 0.75rem;
  font-size: clamp(2rem, 9vw, 4rem);
}

.panel h2 {
  font-size: 1.25rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: hsla(160, 100%, 37%, 1);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.panel-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-heading > div {
  min-width: 0;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: 0.75rem;
  margin: 0 0 1rem;
}

.compact-grid {
  margin-top: 1rem;
}

.panel > p + .data-grid,
.panel > p + .wallet-list,
.panel > p + button {
  margin-top: 1rem;
}

.data-grid div {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-background);
}

dt {
  color: var(--color-text);
  opacity: 0.7;
  font-size: 0.78rem;
}

dd {
  margin: 0.2rem 0 0;
  color: var(--color-heading);
  font-weight: 700;
  overflow-wrap: anywhere;
}

label {
  display: grid;
  gap: 0.4rem;
  color: var(--color-heading);
  font-weight: 700;
}

input {
  width: 100%;
  min-width: 0;
  padding: 0.75rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  background: var(--color-background);
  color: var(--color-heading);
  font: inherit;
}

button {
  width: fit-content;
  max-width: 100%;
  padding: 0.62rem 0.9rem;
  border: 1px solid hsla(160, 100%, 37%, 0.4);
  border-radius: 999px;
  background: hsla(160, 100%, 37%, 0.12);
  color: var(--color-heading);
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

code {
  padding: 0.1rem 0.3rem;
  border-radius: 0.35rem;
  background: var(--color-background-mute);
}

.copyable-address {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
}

.copyable-address code {
  min-width: 0;
  overflow-wrap: anywhere;
}

.copy-address-button {
  flex: 0 0 auto;
  padding: 0.24rem 0.45rem;
  border-color: var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.72rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.wallet-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: 0.6rem;
}

.wallet-option {
  width: 100%;
  justify-content: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border-color: var(--color-border);
  background: var(--color-background);
}

.wallet-option--selected {
  border-color: hsla(160, 100%, 37%, 0.75);
  background: hsla(160, 100%, 37%, 0.16);
}

.wallet-option img {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 0.4rem;
}

.status-pill {
  flex: 0 0 auto;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.status-pill--connected {
  border-color: hsla(160, 100%, 37%, 0.4);
  color: hsla(160, 100%, 37%, 1);
}

.status-pill--sent,
.status-pill--confirmed,
.status-pill--finalized {
  border-color: hsla(160, 100%, 37%, 0.4);
  color: hsla(160, 100%, 37%, 1);
}

.status-pill--sending,
.status-pill--confirming {
  border-color: hsla(48, 100%, 45%, 0.5);
  color: hsl(48, 100%, 42%);
}

.status-pill--checking {
  border-color: hsla(48, 100%, 45%, 0.5);
  color: hsl(48, 100%, 42%);
}

.status-pill--error {
  border-color: hsla(0, 100%, 45%, 0.45);
  color: hsl(0, 80%, 55%);
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

.help-text {
  margin: 0.7rem 0 0;
  color: var(--color-text);
  opacity: 0.75;
}

@media (max-width: 520px) {
  .dashboard {
    padding: 0.75rem;
  }

  .panel {
    border-radius: 0.85rem;
  }

  .panel-heading {
    display: grid;
  }

  .actions,
  button {
    width: 100%;
  }

  button {
    justify-content: center;
  }

  .status-pill {
    width: fit-content;
  }
}

@media (min-width: 860px) {
  .dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero,
  .panel:first-of-type {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1180px) {
  .dashboard {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hero,
  .panel:first-of-type {
    grid-column: 1 / -1;
  }

  .panel:nth-of-type(4) {
    grid-column: span 2;
  }
}
</style>
