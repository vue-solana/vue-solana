<script setup lang="ts">
import { Buffer } from "buffer/";
import { computed, ref } from "vue";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3-compat";
import { useTransaction } from "@vue-solana/vue";

(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

useHead({
  title: "Live Demo - Vue Solana",
});

const solana = useSolana();
const rpc = useSolanaRpc();
const connection = useSolanaConnection();
const wallet = useSolanaWallet();
const walletDiscovery = useSolanaWallets();
const sendTransaction = useSolanaSignAndSendTransaction();
const toast = useToast();

const balanceAddress = ref("11111111111111111111111111111111");
const transferRecipient = ref("11111111111111111111111111111111");
const transferAmount = ref("0.000001");
const directBlockhash = ref<string | null>(null);
const directConnectionLoading = ref(false);
const directConnectionError = ref<string | null>(null);
const devnetTransferError = ref<unknown>(null);
const walletsLoaded = ref(false);

const systemProgramId = new PublicKey("11111111111111111111111111111111");

const balance = useSolanaBalance(balanceAddress);
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
  if (sendTransaction.loading.value) {
    return "sending";
  }

  if (sendTransaction.signature.value) {
    return "signed";
  }

  return wallet.connected.value ? "ready" : "waiting";
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

    toast.add({
      title: "Wallet connected",
      description: wallet.publicKey.value?.toBase58() ?? "Connected to selected wallet.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Wallet connection failed",
      description: formatError(error) ?? "Unable to connect to the selected wallet.",
      color: "error",
    });
  }
}

async function disconnectWallet() {
  const publicKey = wallet.publicKey.value?.toBase58();

  try {
    await wallet.disconnect();

    toast.add({
      title: "Wallet disconnected",
      description: publicKey ?? "Disconnected from selected wallet.",
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Wallet disconnection failed",
      description: formatError(error) ?? "Unable to disconnect from the selected wallet.",
      color: "error",
    });
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

    toast.add({
      title: "Wallet address copied",
      description: publicKey,
      color: "success",
    });
  } catch (error) {
    toast.add({
      title: "Copy failed",
      description: formatError(error) ?? "Unable to copy wallet address.",
      color: "error",
    });
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
  <main class="demo-page flex-1 py-6 lg:min-h-0 lg:overflow-y-auto">
    <section class="demo-hero demo-panel">
      <p class="eyebrow">Live Devnet Demo</p>
      <h1>Vue Solana in a real Nuxt app</h1>
      <p>
        This page runs against the published Vue Solana packages. Try RPC reads, balance lookup,
        Wallet Standard discovery, connect/disconnect, and a tiny real devnet transfer.
      </p>
    </section>

    <section class="demo-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolana + useSolanaRpc</p>
          <h2>Module And RPC Status</h2>
        </div>
        <span class="status-pill" :class="`status-pill--${rpc.status.value}`">
          {{ rpc.status }}
        </span>
      </div>

      <dl class="data-grid">
        <div>
          <dt>Plugin installed</dt>
          <dd>{{ pluginInstalled ? "Yes" : "No" }}</dd>
        </div>
        <div>
          <dt>Cluster</dt>
          <dd>{{ rpc.cluster }}</dd>
        </div>
        <div>
          <dt>RPC endpoint</dt>
          <dd>{{ rpc.endpoint }}</dd>
        </div>
        <div>
          <dt>WebSocket endpoint</dt>
          <dd>{{ rpc.wsEndpoint }}</dd>
        </div>
        <div>
          <dt>Latest blockhash</dt>
          <dd>{{ rpc.latestBlockhash.value ?? "Not loaded yet" }}</dd>
        </div>
        <div v-if="rpc.error.value">
          <dt>RPC error</dt>
          <dd>{{ rpc.error.value }}</dd>
        </div>
      </dl>

      <button type="button" @click="rpc.checkConnection">Check RPC Again</button>
    </section>

    <section class="demo-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolanaConnection</p>
          <h2>Direct Connection Call</h2>
        </div>
      </div>

      <p>
        Calls <code>connection.getLatestBlockhash()</code> directly from the injected connection.
      </p>
      <button type="button" :disabled="directConnectionLoading" @click="loadDirectBlockhash">
        {{ directConnectionLoading ? "Loading..." : "Load Blockhash" }}
      </button>
      <p v-if="directBlockhash" class="result">Blockhash: {{ directBlockhash }}</p>
      <p v-if="directConnectionError" class="error">{{ directConnectionError }}</p>
    </section>

    <section class="demo-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolanaBalance</p>
          <h2>Balance Lookup</h2>
        </div>
      </div>

      <label>
        Public key
        <input v-model="balanceAddress" placeholder="Enter a Solana public key" />
      </label>
      <div class="actions">
        <button type="button" :disabled="balance.loading.value" @click="balance.refresh">
          {{ balance.loading.value ? "Loading..." : "Refresh Balance" }}
        </button>
      </div>
      <p class="result">Lamports: {{ balance.balance.value ?? "No balance loaded" }}</p>
      <p class="result">SOL: {{ balanceInSol }}</p>
      <p v-if="balanceError" class="error">{{ balanceError }}</p>
    </section>

    <section class="demo-panel wallet-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolanaWallets + useSolanaWallet</p>
          <h2>Browser Wallets</h2>
        </div>
        <span class="status-pill" :class="walletStatusClass">
          {{ walletStatusText }}
        </span>
      </div>

      <p>
        Click <strong>Load Wallets</strong> to discover Solana Wallet Standard browser wallets.
        Install Phantom, Solflare, Backpack, or another standard wallet and switch it to devnet.
      </p>

      <dl class="data-grid">
        <div>
          <dt>Discovered wallets</dt>
          <dd>{{ discoveredWalletCount }}</dd>
        </div>
        <div>
          <dt>Selected wallet</dt>
          <dd>{{ walletDiscovery.selectedWallet.value?.name ?? "None" }}</dd>
        </div>
        <div>
          <dt>Wallet configured</dt>
          <dd>{{ walletConfigured ? "Yes" : "No" }}</dd>
        </div>
        <div class="address-cell">
          <dt>Public key</dt>
          <dd>
            <span class="copyable-address">
              <code>{{ walletPublicKey }}</code>
            </span>
          </dd>
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
      <p v-if="!walletsLoaded" class="hint">Wallet discovery has not been loaded yet.</p>
      <p v-else-if="!walletDiscovery.wallets.value.length" class="hint">
        No browser wallets detected. Install a Solana wallet extension, then refresh wallets.
      </p>

      <div class="actions">
        <button type="button" @click="loadWallets">
          {{ walletsLoaded ? "Refresh Wallets" : "Load Wallets" }}
        </button>
        <button type="button" :disabled="!canConnectWallet" @click="connectWallet">
          {{ wallet.connecting.value ? "Connecting..." : "Connect" }}
        </button>
        <button type="button" :disabled="!canDisconnectWallet" @click="disconnectWallet">
          {{ wallet.disconnecting.value ? "Disconnecting..." : "Disconnect" }}
        </button>
        <button
          type="button"
          class="button-muted"
          :disabled="!walletConfigured"
          @click="clearWallet"
        >
          Clear Selection
        </button>
      </div>
    </section>

    <section class="demo-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useTransaction</p>
          <h2>Generic Transaction State</h2>
        </div>
      </div>

      <p>Runs a mock async handler to test loading, error, and signature state.</p>
      <button type="button" :disabled="mockTransaction.loading.value" @click="runMockTransaction">
        {{ mockTransaction.loading.value ? "Running..." : "Run Mock Transaction" }}
      </button>
      <p class="result">Signature: {{ mockTransaction.signature.value ?? "No signature yet" }}</p>
      <p v-if="mockTransactionError" class="error">{{ mockTransactionError }}</p>
    </section>

    <section class="demo-panel transfer-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolanaSignAndSendTransaction</p>
          <h2>Real Devnet Transfer</h2>
        </div>
        <span
          class="status-pill"
          :class="signAndSendReady ? 'status-pill--connected' : 'status-pill--idle'"
        >
          {{ signAndSendStatus }}
        </span>
      </div>

      <p>
        Sends a real transfer from the connected wallet. Use devnet, enter a recipient public key,
        and start with a tiny amount such as <code>0.000001</code> SOL.
      </p>

      <dl class="data-grid compact-grid">
        <div>
          <dt>Wallet ready</dt>
          <dd>{{ wallet.connected.value ? "Yes" : "No" }}</dd>
        </div>
        <div>
          <dt>Transaction state</dt>
          <dd>{{ signAndSendStatus }}</dd>
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
        <button type="button" :disabled="!signAndSendReady" @click="sendDevnetTransfer">
          {{ sendTransaction.loading.value ? "Sending..." : "Send Devnet Transfer" }}
        </button>
      </div>
      <p v-if="signAndSendDisabledReason" class="hint">{{ signAndSendDisabledReason }}</p>
      <p class="result">Signature: {{ sendTransaction.signature.value ?? "No signature yet" }}</p>
      <p v-if="sendTransactionError" class="error">{{ sendTransactionError }}</p>
    </section>
  </main>
</template>

<style scoped>
.demo-page {
  width: min(1180px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
  color: rgb(51 65 85);
}

.demo-panel {
  min-width: 0;
  border: 1px solid rgb(226 232 240 / 0.9);
  border-radius: 1.4rem;
  padding: clamp(1rem, 3vw, 1.35rem);
  background: rgb(255 255 255 / 0.88);
  box-shadow: 0 22px 70px rgb(15 23 42 / 0.08);
  backdrop-filter: blur(14px);
}

:where(.dark, .dark-mode) .demo-panel {
  border-color: rgb(51 65 85 / 0.9);
  background: rgb(15 23 42 / 0.82);
  box-shadow: 0 22px 70px rgb(0 0 0 / 0.22);
}

.demo-hero {
  padding: clamp(1.25rem, 5vw, 2.25rem);
  background:
    radial-gradient(circle at 10% 5%, rgb(52 211 153 / 0.24), transparent 30rem),
    radial-gradient(circle at 90% 0%, rgb(139 92 246 / 0.22), transparent 28rem),
    rgb(255 255 255 / 0.9);
}

:where(.dark, .dark-mode) .demo-hero {
  background:
    radial-gradient(circle at 10% 5%, rgb(52 211 153 / 0.18), transparent 30rem),
    radial-gradient(circle at 90% 0%, rgb(139 92 246 / 0.18), transparent 28rem),
    rgb(15 23 42 / 0.86);
}

.demo-hero h1,
.demo-panel h2 {
  margin: 0;
  color: rgb(15 23 42);
  font-weight: 850;
  line-height: 1.05;
  letter-spacing: -0.045em;
}

:where(.dark, .dark-mode) .demo-hero h1,
:where(.dark, .dark-mode) .demo-panel h2 {
  color: white;
}

.demo-hero h1 {
  max-width: 13ch;
  margin-bottom: 0.85rem;
  font-size: clamp(2.35rem, 9vw, 5rem);
}

.demo-panel h2 {
  font-size: 1.25rem;
}

.demo-panel p {
  color: rgb(71 85 105);
}

:where(.dark, .dark-mode) .demo-panel p {
  color: rgb(203 213 225);
}

.eyebrow {
  margin: 0 0 0.45rem;
  color: rgb(109 40 217);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

:where(.dark, .dark-mode) .eyebrow {
  color: rgb(196 181 253);
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

.demo-panel > p + .data-grid,
.demo-panel > p + .wallet-list,
.demo-panel > p + button {
  margin-top: 1rem;
}

.data-grid div {
  min-width: 0;
  padding: 0.75rem;
  border: 1px solid rgb(226 232 240);
  border-radius: 0.9rem;
  background: rgb(248 250 252 / 0.86);
}

:where(.dark, .dark-mode) .data-grid div {
  border-color: rgb(51 65 85);
  background: rgb(2 6 23 / 0.45);
}

.compact-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

dt {
  color: rgb(100 116 139);
  font-size: 0.78rem;
}

dd {
  margin: 0.2rem 0 0;
  color: rgb(15 23 42);
  font-weight: 750;
  overflow-wrap: anywhere;
}

:where(.dark, .dark-mode) dd {
  color: white;
}

label {
  display: grid;
  gap: 0.4rem;
  color: rgb(15 23 42);
  font-weight: 750;
}

:where(.dark, .dark-mode) label {
  color: white;
}

label + label {
  margin-top: 0.75rem;
}

input {
  width: 100%;
  min-width: 0;
  padding: 0.75rem 0.85rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.85rem;
  background: white;
  color: rgb(15 23 42);
  font: inherit;
  outline: none;
}

:where(.dark, .dark-mode) input {
  border-color: rgb(71 85 105);
  background: rgb(2 6 23);
  color: white;
}

input:focus {
  border-color: rgb(139 92 246 / 0.7);
  box-shadow: 0 0 0 3px rgb(139 92 246 / 0.14);
}

button {
  width: fit-content;
  max-width: 100%;
  padding: 0.62rem 0.9rem;
  border: 1px solid rgb(139 92 246 / 0.44);
  border-radius: 999px;
  background: rgb(139 92 246 / 0.12);
  color: rgb(76 29 149);
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
}

:where(.dark, .dark-mode) button {
  color: rgb(221 214 254);
}

button:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgb(139 92 246 / 0.18);
  box-shadow: 0 12px 28px rgb(15 23 42 / 0.1);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.button-muted {
  border-color: rgb(203 213 225);
  background: rgb(248 250 252);
  color: rgb(71 85 105);
}

:where(.dark, .dark-mode) .button-muted {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: rgb(203 213 225);
}

code {
  padding: 0.1rem 0.3rem;
  border-radius: 0.35rem;
  background: rgb(241 245 249);
}

:where(.dark, .dark-mode) code {
  background: rgb(30 41 59);
}

.address-cell {
  position: relative;
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
  position: absolute;
  top: 0.64rem;
  right: 0.44rem;
  flex: 0 0 auto;
  padding: 0.24rem 0.45rem;
  border-color: rgb(203 213 225);
  background: white;
  color: rgb(71 85 105);
  font-size: 0.52rem;
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
  border-color: rgb(203 213 225);
  background: rgb(248 250 252);
}

.wallet-option--selected {
  border-color: rgb(16 185 129 / 0.75);
  background: rgb(16 185 129 / 0.14);
}

.wallet-option img {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 0.4rem;
}

.status-pill {
  flex: 0 0 auto;
  padding: 0.3rem 0.65rem;
  border: 1px solid rgb(203 213 225);
  border-radius: 999px;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
}

:where(.dark, .dark-mode) .status-pill {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42);
  color: white;
}

.status-pill--idle {
  color: rgb(100 116 139);
}

.status-pill--connected {
  border-color: rgb(16 185 129 / 0.45);
  color: rgb(5 150 105);
}

.status-pill--checking {
  border-color: rgb(234 179 8 / 0.5);
  color: rgb(161 98 7);
}

.status-pill--error {
  border-color: rgb(239 68 68 / 0.45);
  color: rgb(220 38 38);
}

.result {
  margin: 0.85rem 0 0;
  overflow-wrap: anywhere;
}

.error {
  margin: 0.85rem 0 0;
  color: rgb(220 38 38);
  overflow-wrap: anywhere;
}

.hint {
  margin: 0.85rem 0 0;
  color: rgb(161 98 7);
  overflow-wrap: anywhere;
}

@media (max-width: 520px) {
  .panel-heading {
    display: grid;
  }

  .actions,
  button {
    width: 100%;
  }

  .actions {
    display: grid;
  }

  .compact-grid {
    grid-template-columns: 1fr;
  }

  .status-pill {
    width: fit-content;
  }
}

@media (min-width: 860px) {
  .demo-page {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .demo-hero,
  .demo-panel:first-of-type {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1180px) {
  .demo-page {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .demo-hero,
  .demo-panel:first-of-type {
    grid-column: 1 / -1;
  }

  .wallet-panel,
  .transfer-panel {
    grid-column: span 2;
  }
}
</style>
