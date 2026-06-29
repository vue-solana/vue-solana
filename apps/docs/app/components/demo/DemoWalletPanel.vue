<script setup lang="ts">
import type { SolanaWalletInfo } from "@vue-solana/core/types";

defineProps<{
  canConnect: boolean;
  canDisconnect: boolean;
  configured: boolean;
  connecting: boolean;
  disconnecting: boolean;
  discoveredWalletCount: number;
  publicKey: string;
  selectedWalletName?: string | null;
  statusColor: "neutral" | "success" | "warning";
  statusText: string;
  wallets: SolanaWalletInfo[];
  walletsLoaded: boolean;
}>();

const emit = defineEmits<{
  connect: [];
  copyAddress: [];
  deselect: [];
  disconnect: [];
  loadWallets: [];
  selectWallet: [wallet: SolanaWalletInfo];
}>();
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaWallets + useSolanaWallet"
    title="Wallets"
    :status="statusText"
    :status-color="statusColor"
    wide
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      Click <strong>Load Wallets</strong> to discover Solana Wallet Standard browser wallets and
      supported mobile wallets. Install Phantom, Solflare, Backpack, or another standard wallet and
      switch it to devnet.
    </p>

    <DemoDataGrid
      :items="[
        { label: 'Discovered wallets', value: discoveredWalletCount },
        { label: 'Selected wallet', value: selectedWalletName ?? 'None' },
        { label: 'Wallet configured', value: configured ? 'Yes' : 'No' },
        { label: 'Public key', value: publicKey },
      ]"
    />

    <UButton
      v-if="publicKey !== 'Not connected'"
      type="button"
      icon="i-mdi-content-copy"
      color="neutral"
      variant="ghost"
      size="sm"
      aria-label="Copy wallet address"
      @click="emit('copyAddress')"
    >
      Copy address
    </UButton>

    <div v-if="walletsLoaded && wallets.length" class="mt-4 grid gap-2 sm:grid-cols-2">
      <UButton
        v-for="discoveredWallet in wallets"
        :key="discoveredWallet.name"
        type="button"
        color="neutral"
        :variant="selectedWalletName === discoveredWallet.name ? 'soft' : 'outline'"
        class="justify-start"
        @click="emit('selectWallet', discoveredWallet)"
      >
        <img
          :src="discoveredWallet.icon"
          :alt="`${discoveredWallet.name} icon`"
          class="size-5 rounded"
        />
        <span>{{ discoveredWallet.name }}</span>
      </UButton>
    </div>
    <UAlert
      v-else-if="!walletsLoaded"
      class="mt-4"
      color="warning"
      variant="subtle"
      description="Wallet discovery has not been loaded yet."
    />
    <UAlert
      v-else
      class="mt-4"
      color="warning"
      variant="subtle"
      description="No wallets detected. Install a Solana wallet extension or use a supported mobile wallet, then refresh wallets."
    />

    <div class="mt-4 flex flex-wrap gap-2 max-sm:grid max-sm:grid-cols-1">
      <UButton type="button" color="primary" variant="soft" @click="emit('loadWallets')">
        {{ walletsLoaded ? "Refresh Wallets" : "Load Wallets" }}
      </UButton>
      <UButton type="button" :disabled="!canConnect" :loading="connecting" @click="emit('connect')">
        Connect
      </UButton>
      <UButton
        type="button"
        :disabled="!canDisconnect"
        :loading="disconnecting"
        @click="emit('disconnect')"
      >
        Disconnect
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        :disabled="!configured"
        @click="emit('deselect')"
      >
        Deselect Wallet
      </UButton>
    </div>
  </DemoPanel>
</template>
