<script setup lang="ts">
import type { SolanaWalletInfo } from "@vue-solana/core/types";

const props = defineProps<{
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

const { t } = useI18n();

const items = computed(() => [
  { label: t("demo.wallet.labels.discoveredWallets"), value: props.discoveredWalletCount },
  {
    label: t("demo.wallet.labels.selectedWallet"),
    value: props.selectedWalletName ?? t("demo.fallback.none"),
  },
  {
    label: t("demo.wallet.labels.configured"),
    value: props.configured ? t("common.yes") : t("common.no"),
  },
  { label: t("demo.wallet.labels.publicKey"), value: props.publicKey },
]);
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaWallets + useSolanaWallet"
    :title="$t('demo.wallet.title')"
    :status="statusText"
    :status-color="statusColor"
    wide
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      <i18n-t keypath="demo.wallet.description" tag="span">
        <template #loadWallets>
          <strong>{{ $t("demo.wallet.loadWallets") }}</strong>
        </template>
      </i18n-t>
    </p>

    <DemoDataGrid :items="items" />

    <UButton
      v-if="publicKey !== $t('demo.fallback.notConnected')"
      type="button"
      icon="i-mdi-content-copy"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="$t('demo.wallet.copyAddressAria')"
      @click="emit('copyAddress')"
    >
      {{ $t("demo.wallet.copyAddress") }}
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
          :alt="$t('demo.wallet.iconAlt', { name: discoveredWallet.name })"
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
      :description="$t('demo.wallet.notLoaded')"
    />
    <UAlert
      v-else
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="$t('demo.wallet.noneDetected')"
    />

    <div class="mt-4 flex flex-wrap gap-2 max-sm:grid max-sm:grid-cols-1">
      <UButton type="button" color="primary" variant="soft" @click="emit('loadWallets')">
        {{ walletsLoaded ? $t("demo.wallet.refreshWallets") : $t("demo.wallet.loadWallets") }}
      </UButton>
      <UButton type="button" :disabled="!canConnect" :loading="connecting" @click="emit('connect')">
        {{ $t("demo.wallet.connect") }}
      </UButton>
      <UButton
        type="button"
        :disabled="!canDisconnect"
        :loading="disconnecting"
        @click="emit('disconnect')"
      >
        {{ $t("demo.wallet.disconnect") }}
      </UButton>
      <UButton
        type="button"
        color="neutral"
        variant="soft"
        :disabled="!configured"
        @click="emit('deselect')"
      >
        {{ $t("demo.wallet.deselect") }}
      </UButton>
    </div>
  </DemoPanel>
</template>
