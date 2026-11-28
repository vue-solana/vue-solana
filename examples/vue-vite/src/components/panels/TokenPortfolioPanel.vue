<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenPortfolio } from "@vue-solana/vue/useTokenPortfolio";
import { formatError } from "../../format-error";

const PORTFOLIO_OWNER = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";
const MALFORMED_OWNER = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

const owner = ref(PORTFOLIO_OWNER);
const malformedOwner = ref(MALFORMED_OWNER);

// Slot invalidation is disabled here so the mock-driven demo has one read per
// owner; the composable covers subscription invalidation in its unit tests.
const portfolio = useTokenPortfolio(owner, { invalidateOnSlot: false });
const malformed = useTokenPortfolio(malformedOwner, { invalidateOnSlot: false });

const errorText = computed(() => formatSolanaError(portfolio.error.value));
const malformedErrorText = computed(() => formatSolanaError(malformed.error.value));

function formatSolanaError(error: unknown) {
  const message = formatError(error);

  if (!message) {
    return null;
  }

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "UNKNOWN";

  return `${code}: ${message}`;
}
</script>

<template>
  <section class="panel" data-testid="token-portfolio-panel">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">useTokenPortfolio</p>
        <h2>Token Portfolio</h2>
      </div>
      <span class="status-pill" :class="`status-pill--${portfolio.status.value}`">
        {{ portfolio.status.value }}
      </span>
    </div>

    <p>
      Aggregates classic SPL token accounts by mint from RPC `jsonParsed` reads. Zero balances stay
      visible; prices, metadata, and mutations are deliberately out of scope. The second card shows
      the normalized error for a malformed parsed account.
    </p>

    <dl class="data-grid compact-grid">
      <div>
        <dt>Status</dt>
        <dd data-testid="token-portfolio-status">{{ portfolio.status.value }}</dd>
      </div>
      <div>
        <dt>Totals</dt>
        <dd data-testid="token-portfolio-totals">
          accounts: {{ portfolio.totals.value.accounts }} · mints:
          {{ portfolio.totals.value.mints }}
        </dd>
      </div>
    </dl>

    <ul class="result-list" data-testid="token-portfolio-items">
      <li
        v-for="item in portfolio.items.value"
        :key="item.address"
        data-testid="token-portfolio-item"
      >
        <span>{{ item.uiAmount ?? "—" }} {{ item.mint }}</span>
        <small>
          raw: {{ item.amount.toString() }} · decimals: {{ item.decimals }} ({{
            item.decimalsSource
          }})
        </small>
      </li>
    </ul>

    <div class="actions">
      <button type="button" data-testid="token-portfolio-refresh" @click="portfolio.refresh()">
        Refresh portfolio
      </button>
    </div>

    <p v-if="errorText" class="error" data-testid="token-portfolio-error">{{ errorText }}</p>

    <div class="sub-card">
      <p class="eyebrow">Malformed account</p>
      <p data-testid="token-portfolio-broken-status">{{ malformed.status.value }}</p>
      <p v-if="malformedErrorText" class="error" data-testid="token-portfolio-broken-error">
        {{ malformedErrorText }}
      </p>
    </div>
  </section>
</template>
