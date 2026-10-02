<script setup lang="ts">
import { ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue";
import { formatError } from "../../format-error";

const { client } = useSolanaClient();

const directBlockhash = ref<string | null>(null);
const directConnectionLoading = ref(false);
const directConnectionError = ref<string | null>(null);

async function loadDirectBlockhash() {
  directConnectionLoading.value = true;
  directConnectionError.value = null;

  try {
    const { value } = await client.rpc.getLatestBlockhash().send();
    directBlockhash.value = value.blockhash;
  } catch (error) {
    directConnectionError.value = formatError(error);
  } finally {
    directConnectionLoading.value = false;
  }
}
</script>

<template>
  <section class="panel" data-testid="direct-connection-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useSolanaClient</p>
        <h2>Direct RPC Call</h2>
      </div>
    </div>

    <p>
      Calls <code>client.rpc.getLatestBlockhash().send()</code> directly from the injected Kit
      client.
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
</template>
