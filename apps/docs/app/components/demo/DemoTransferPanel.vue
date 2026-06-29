<script setup lang="ts">
const recipient = defineModel<string>("recipient", { required: true });
const amount = defineModel<string>("amount", { required: true });

defineProps<{
  confirmationState: string;
  disabledReason?: string | null;
  error?: string | null;
  explorerUrl?: string | null;
  loading: boolean;
  ready: boolean;
  signature?: string | null;
  status: string;
  statusText: string;
  walletReady: boolean;
}>();

const emit = defineEmits<{
  send: [];
}>();
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaSignAndSendTransaction"
    title="Real Devnet Transfer"
    :status="statusText"
    :status-color="status === 'error' ? 'error' : walletReady ? 'success' : 'neutral'"
    wide
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      Sends a real transfer from the connected wallet, then waits for confirmed commitment. Use
      devnet, enter a recipient public key, and start with a tiny amount such as
      <code>0.000001</code> SOL.
    </p>

    <DemoDataGrid
      compact
      :items="[
        { label: 'Wallet ready', value: walletReady ? 'Yes' : 'No' },
        { label: 'Submitted signature', value: signature ?? 'No signature yet' },
        { label: 'Confirmation state', value: confirmationState },
      ]"
    />

    <div class="grid gap-3">
      <UFormField label="Recipient address">
        <UInput v-model="recipient" placeholder="Enter recipient public key" class="w-full" />
      </UFormField>
      <UFormField label="Amount in SOL">
        <UInput v-model="amount" inputmode="decimal" placeholder="0.000001" class="w-full" />
      </UFormField>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :disabled="!ready"
        :loading="loading"
        color="primary"
        @click="emit('send')"
      >
        Send Devnet Transfer
      </UButton>
    </div>

    <UAlert
      v-if="disabledReason"
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="disabledReason"
    />
    <p
      class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
      data-testid="transfer-signature"
    >
      <strong class="text-slate-950 dark:text-white">Signature:</strong>
      {{ signature ?? "No signature yet" }}
    </p>
    <p
      v-if="explorerUrl"
      class="mt-2 text-sm text-slate-600 dark:text-slate-300"
      data-testid="transfer-explorer-link"
    >
      <strong class="text-slate-950 dark:text-white">Explorer:</strong>
      <NuxtLink
        :to="explorerUrl"
        target="_blank"
        rel="noreferrer"
        class="font-bold text-violet-700 hover:underline dark:text-violet-300"
      >
        View transaction
      </NuxtLink>
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
