<script setup lang="ts">
import { computed, ref } from "vue";
import { useWallet, useWallets } from "@vue-solana/vue";
import { formatError } from "../../format-error";

const wallet = useWallet();
const walletDiscovery = useWallets();

const walletsLoaded = ref(false);
const walletNotice = ref<{ type: "success" | "error"; message: string } | null>(null);

const walletPublicKey = computed(() => wallet.publicKey.value ?? "Not connected");
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

async function connectWallet() {
  try {
    await wallet.connect();

    walletNotice.value = {
      type: "success",
      message: `Wallet connected: ${wallet.publicKey.value ?? "selected wallet"}`,
    };
  } catch (error) {
    walletNotice.value = {
      type: "error",
      message: formatError(error) ?? "Unable to connect to the selected wallet.",
    };
  }
}

async function disconnectWallet() {
  const publicKey = wallet.publicKey.value;

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
  const publicKey = wallet.publicKey.value;

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
</script>

<template>
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
      Install Phantom, Solflare, Backpack, or another standard wallet and switch it to devnet before
      testing transfers.
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
      No wallets detected. Install a Solana wallet extension or use a supported mobile wallet, then
      refresh wallets.
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
</template>
