<script setup lang="ts">
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";

installSolanaBufferPolyfill();
</script>

<template>
  <main class="dashboard">
    <section class="hero panel" data-testid="hero">
      <p class="eyebrow">Nuxt Solana Test App</p>
      <h1>Composable Test Dashboard</h1>
      <p>
        This screen exercises the Nuxt module and auto-imported Solana composables: plugin
        injection, RPC status, direct connection calls, balance lookup, browser wallet discovery,
        message signing, and real devnet transfers.
      </p>
    </section>

    <RpcStatusPanel />
    <DirectRpcPanel />
    <MockTransactionPanel />
    <BalancePanel />
    <WalletPanel />
    <MessageSigningPanel />
    <TransferPanel />

    <LiveDataPanels />
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

.hero {
  padding: clamp(1.25rem, 5vw, 2rem);
  background:
    radial-gradient(circle at top left, hsla(160, 100%, 37%, 0.22), transparent 34rem),
    var(--color-background-soft);
}

.hero h1 {
  margin: 0 0 0.75rem;
  color: var(--color-heading);
  font-size: clamp(2rem, 9vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
}

@media (max-width: 520px) {
  .dashboard {
    padding: 0.75rem;
  }

  .hero h1 {
    max-width: 100%;
  }
}

@media (min-width: 860px) {
  .dashboard {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero {
    grid-column: 1 / -1;
  }
}

@media (min-width: 1180px) {
  .dashboard {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .hero {
    grid-column: 1 / -1;
  }
}
</style>
