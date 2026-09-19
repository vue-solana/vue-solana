<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  address?: string | null;
  errorText?: string | null;
  loading: boolean;
  status: string;
  walletReady: boolean;
}>();

const emit = defineEmits<{
  sign: [];
}>();

const { t } = useI18n();
const translatedStatus = computed(() => t(`demo.status.${props.status}`, props.status));
</script>

<template>
  <DemoPanel
    eyebrow="useSolanaSignIn"
    :title="$t('demo.signIn.title')"
    :status="translatedStatus"
    :status-color="
      status === 'signed-in'
        ? 'success'
        : status === 'error'
          ? 'error'
          : status === 'signing-in'
            ? 'warning'
            : 'neutral'
    "
  >
    <p class="text-sm leading-6 text-slate-600 dark:text-slate-300">
      {{ $t("demo.signIn.description") }}
    </p>

    <UButton
      color="primary"
      variant="soft"
      class="mt-4"
      :disabled="!walletReady || loading"
      :loading="loading"
      @click="emit('sign')"
    >
      {{ loading ? $t("demo.signIn.signingIn") : $t("demo.signIn.button") }}
    </UButton>

    <p class="mt-4 text-sm font-bold [overflow-wrap:anywhere] text-slate-950 dark:text-white">
      {{ address ? $t("demo.signIn.signedInAs", { address }) : $t("demo.signIn.notSignedIn") }}
    </p>

    <UAlert v-if="errorText" color="error" variant="subtle" class="mt-3" :title="errorText" />
  </DemoPanel>
</template>
