<script setup lang="ts">
import { computed, ref } from 'vue'
import type { SolanaTransaction, SolanaWallet } from '@vue-solana/core'
import {
  useBalance,
  useConnection,
  useRpc,
  useSignAndSendTransaction,
  useSolana,
  useTransaction,
  useWallet
} from '@vue-solana/vue'

const solana = useSolana()
const rpc = useRpc()
const connection = useConnection()
const wallet = useWallet()
const sendTransaction = useSignAndSendTransaction()

const balanceAddress = ref('11111111111111111111111111111111')
const directBlockhash = ref<string | null>(null)
const directConnectionLoading = ref(false)
const directConnectionError = ref<string | null>(null)

const balance = useBalance(balanceAddress)

const mockTransaction = useTransaction(async (label: string) => {
  await new Promise((resolve) => window.setTimeout(resolve, 350))
  return `mock-${label}-${Date.now()}`
})

const pluginInstalled = computed(() => Boolean(solana.connection && solana.endpoint))
const walletPublicKey = computed(() => wallet.publicKey.value?.toBase58() ?? 'Not connected')
const balanceInSol = computed(() => {
  if (balance.balance.value === null) {
    return 'No balance loaded'
  }

  return `${balance.balance.value / 1_000_000_000} SOL`
})
const balanceError = computed(() => formatError(balance.error.value))
const mockTransactionError = computed(() => formatError(mockTransaction.error.value))
const sendTransactionError = computed(() => formatError(sendTransaction.error.value))

const mockWallet: SolanaWallet = {
  publicKey: {
    toBase58: () => '11111111111111111111111111111111'
  } as SolanaWallet['publicKey'],
  connected: false,
  connecting: false,
  async connect() {
    this.connecting = true
    await new Promise((resolve) => window.setTimeout(resolve, 300))
    this.connected = true
    this.connecting = false
  },
  async disconnect() {
    this.connected = false
    this.connecting = false
  },
  async signAndSendTransaction() {
    return {
      signature: `mock-wallet-signature-${Date.now()}`
    }
  }
}

function formatError(error: unknown) {
  if (!error) {
    return null
  }

  return error instanceof Error ? error.message : String(error)
}

async function loadDirectBlockhash() {
  directConnectionLoading.value = true
  directConnectionError.value = null

  try {
    const blockhash = await connection.getLatestBlockhash()
    directBlockhash.value = blockhash.blockhash
  } catch (error) {
    directConnectionError.value = formatError(error)
  } finally {
    directConnectionLoading.value = false
  }
}

async function installMockWallet() {
  wallet.setWallet(mockWallet)
}

async function connectWallet() {
  await wallet.connect()
}

async function disconnectWallet() {
  await wallet.disconnect()
}

function clearWallet() {
  wallet.setWallet(null)
}

async function runMockTransaction() {
  await mockTransaction.execute('transaction')
}

async function runMockSignAndSend() {
  await sendTransaction.execute({} as SolanaTransaction)
}
</script>

<template>
  <main class="dashboard">
    <section class="hero panel">
      <p class="eyebrow">Vue Solana Test App</p>
      <h1>Composable Test Dashboard</h1>
      <p>
        This screen exercises the current Vue Solana library features from one place:
        plugin injection, RPC status, direct connection calls, balance lookup, wallet state,
        generic transactions, and sign/send transaction state.
      </p>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSolana + useRpc</p>
          <h2>Plugin And RPC Status</h2>
        </div>
        <span class="status-pill" :class="`status-pill--${rpc.status.value}`">
          {{ rpc.status }}
        </span>
      </div>

      <dl class="data-grid">
        <div>
          <dt>Plugin installed</dt>
          <dd>{{ pluginInstalled ? 'Yes' : 'No' }}</dd>
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
          <dd>{{ rpc.latestBlockhash.value ?? 'Not loaded yet' }}</dd>
        </div>
        <div v-if="rpc.error.value">
          <dt>RPC error</dt>
          <dd>{{ rpc.error.value }}</dd>
        </div>
      </dl>

      <button type="button" @click="rpc.checkConnection">Check RPC Again</button>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useConnection</p>
          <h2>Direct Connection Call</h2>
        </div>
      </div>

      <p>Calls <code>connection.getLatestBlockhash()</code> directly from the injected connection.</p>
      <button type="button" :disabled="directConnectionLoading" @click="loadDirectBlockhash">
        {{ directConnectionLoading ? 'Loading...' : 'Load Blockhash' }}
      </button>
      <p v-if="directBlockhash" class="result">Blockhash: {{ directBlockhash }}</p>
      <p v-if="directConnectionError" class="error">{{ directConnectionError }}</p>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useBalance</p>
          <h2>Balance Lookup</h2>
        </div>
      </div>

      <label>
        Public key
        <input v-model="balanceAddress" placeholder="Enter a Solana public key" />
      </label>
      <div class="actions">
        <button type="button" :disabled="balance.loading.value" @click="balance.refresh">
          {{ balance.loading.value ? 'Loading...' : 'Refresh Balance' }}
        </button>
      </div>
      <p class="result">Lamports: {{ balance.balance.value ?? 'No balance loaded' }}</p>
      <p class="result">SOL: {{ balanceInSol }}</p>
      <p v-if="balanceError" class="error">{{ balanceError }}</p>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useWallet</p>
          <h2>Wallet State</h2>
        </div>
        <span class="status-pill" :class="wallet.connected.value ? 'status-pill--connected' : 'status-pill--idle'">
          {{ wallet.connected.value ? 'connected' : 'not connected' }}
        </span>
      </div>

      <dl class="data-grid">
        <div>
          <dt>Wallet configured</dt>
          <dd>{{ wallet.wallet.value ? 'Yes' : 'No' }}</dd>
        </div>
        <div>
          <dt>Public key</dt>
          <dd>{{ walletPublicKey }}</dd>
        </div>
        <div>
          <dt>Connecting</dt>
          <dd>{{ wallet.connecting.value ? 'Yes' : 'No' }}</dd>
        </div>
      </dl>

      <div class="actions">
        <button type="button" @click="installMockWallet">Install Mock Wallet</button>
        <button type="button" :disabled="!wallet.wallet.value" @click="connectWallet">Connect</button>
        <button type="button" :disabled="!wallet.wallet.value" @click="disconnectWallet">Disconnect</button>
        <button type="button" @click="clearWallet">Clear Wallet</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useTransaction</p>
          <h2>Generic Transaction State</h2>
        </div>
      </div>

      <p>Runs a mock async handler to test loading, error, and signature state.</p>
      <button type="button" :disabled="mockTransaction.loading.value" @click="runMockTransaction">
        {{ mockTransaction.loading.value ? 'Running...' : 'Run Mock Transaction' }}
      </button>
      <p class="result">Signature: {{ mockTransaction.signature.value ?? 'No signature yet' }}</p>
      <p v-if="mockTransactionError" class="error">{{ mockTransactionError }}</p>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">useSignAndSendTransaction</p>
          <h2>Sign And Send State</h2>
        </div>
      </div>

      <p>
        Uses the mock wallet's <code>signAndSendTransaction</code> implementation. Install and connect
        the mock wallet first, then run this test.
      </p>
      <button type="button" :disabled="sendTransaction.loading.value || !wallet.connected.value" @click="runMockSignAndSend">
        {{ sendTransaction.loading.value ? 'Sending...' : 'Mock Sign And Send' }}
      </button>
      <p class="result">Signature: {{ sendTransaction.signature.value ?? 'No signature yet' }}</p>
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

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
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
