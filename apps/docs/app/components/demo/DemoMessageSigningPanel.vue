<script setup lang="ts">
const message = defineModel<string>("message", { required: true });

defineProps<{
  canSignMessage: boolean;
  disabledReason?: string | null;
  error?: string | null;
  loading: boolean;
  ready: boolean;
  signature?: string | null;
  signedMessage?: string | null;
  status: string;
  statusColor: "neutral" | "primary" | "secondary" | "success" | "info" | "warning" | "error";
  walletReady: boolean;
}>();

const emit = defineEmits<{
  sign: [];
}>();
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaSignMessage"
    title="Message Signing"
    :status="status"
    :status-color="statusColor"
    data-testid="message-signing-panel"
  >
    <p class="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      Signs an arbitrary message with the connected wallet. This proves wallet ownership without
      submitting a transaction or touching devnet balances.
    </p>

    <dl class="mb-4 grid gap-3 sm:grid-cols-2">
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">Wallet ready</dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="message-wallet-ready"
        >
          {{ walletReady ? "Yes" : "No" }}
        </dd>
      </div>
      <div
        class="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-700 dark:bg-slate-950/45"
      >
        <dt class="text-xs font-medium text-slate-500 dark:text-slate-400">Message signing</dt>
        <dd
          class="mt-1 [overflow-wrap:anywhere] text-sm font-bold text-slate-950 dark:text-white"
          data-testid="message-capability"
        >
          {{ canSignMessage ? "Yes" : "No" }}
        </dd>
      </div>
    </dl>

    <div class="grid gap-3">
      <UFormField label="Message to sign">
        <UTextarea
          v-model="message"
          class="w-full"
          :rows="3"
          data-testid="message-to-sign"
          placeholder="Enter a message for the wallet to sign"
        />
      </UFormField>
    </div>

    <div class="mt-4 flex flex-wrap gap-2">
      <UButton
        type="button"
        :disabled="!ready"
        :loading="loading"
        color="primary"
        data-testid="sign-message"
        @click="emit('sign')"
      >
        Sign Message
      </UButton>
    </div>

    <UAlert
      v-if="disabledReason"
      class="mt-4"
      color="warning"
      variant="subtle"
      :description="disabledReason"
      data-testid="message-disabled-reason"
    />
    <p class="mt-4 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300">
      <strong class="text-slate-950 dark:text-white">Signature:</strong>
      <span data-testid="message-signature">{{ signature ?? "No signature yet" }}</span>
    </p>
    <p
      v-if="signedMessage"
      class="mt-2 [overflow-wrap:anywhere] text-sm text-slate-600 dark:text-slate-300"
      data-testid="signed-message"
    >
      <strong class="text-slate-950 dark:text-white">Signed message:</strong>
      {{ signedMessage }}
    </p>
    <UAlert v-if="error" class="mt-4" color="error" variant="subtle" :description="error" />
  </DemoPanel>
</template>
