<script setup lang="ts">
import { computed, ref } from "vue";
import { address } from "@solana/kit";
import {
  useRequest,
  useSignIn,
  useSolanaClient,
  useSubscription,
  useTrackedData,
  useWallet,
} from "@vue-solana/vue";
import SwrCard from "./SwrCard.vue";

const { client } = useSolanaClient();
const wallet = useWallet();
const signIn = useSignIn();

/** Account whose live data the panels track; re-typing it re-fires everything. */
const trackedAddressInput = ref("HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH");
const trackedAddress = computed(() => {
  const raw = trackedAddressInput.value.trim();

  try {
    return address(raw);
  } catch {
    return null;
  }
});

/**
 * `useRequest` — one-shot request over the HTTP RPC, re-fired by source
 * identity change (the computed below) with stale-while-revalidate.
 */
const request = useRequest(
  computed(() =>
    trackedAddress.value
      ? async (signal: AbortSignal) => {
          const [balanceResponse, versionResponse] = await Promise.all([
            client.rpc.getBalance(trackedAddress.value).send({ abortSignal: signal }),
            client.rpc.getVersion().send({ abortSignal: signal }),
          ]);

          return {
            lamports: balanceResponse.value,
            slot: balanceResponse.context.slot,
            sol: Number(balanceResponse.value) / 1_000_000_000,
            core: versionResponse["solana-core"],
          };
        }
      : null,
  ),
);

/**
 * `useSubscription` — raw slot notifications from the websocket RPC; a null
 * source (invalid address) disables the connection.
 */
interface SlotNotificationShape {
  parent: number | bigint;
  root: number | bigint;
  slot: number | bigint;
}

const slots = useSubscription<SlotNotificationShape>(
  computed(() => (trackedAddress.value ? client.rpcSubscriptions.slotNotifications() : null)),
);

/**
 * `useTrackedData` — seeded by `getAccountInfo`, updated by
 * `accountNotifications`, slot-deduplicated between the two sources.
 */
const tracked = useTrackedData<{ lamports: bigint } | null, { lamports: bigint } | null, bigint>({
  rpcRequest: computed(() =>
    trackedAddress.value
      ? client.rpc.getAccountInfo(trackedAddress.value, { encoding: "base64" })
      : null,
  ),
  rpcSubscriptionRequest: computed(() =>
    trackedAddress.value
      ? client.rpcSubscriptions.accountNotifications(trackedAddress.value, {
          commitment: "confirmed",
        })
      : null,
  ),
  rpcValueMapper: (value) => value?.lamports ?? 0n,
  rpcSubscriptionValueMapper: (value) => value?.lamports ?? 0n,
});

/** Toggling remounts `SwrCard`, demonstrating stale-while-revalidate on mount. */
const swrPanelVisible = ref(true);

const requestText = computed(() => {
  const data = request.data.value;

  return data ? `${data.sol} SOL · solana-core ${data.core}` : "No data yet";
});
const slotsText = computed(() => {
  const data = slots.data.value;

  return data ? `Slot ${data.slot} · root ${data.root}` : "No notifications yet";
});
const trackedText = computed(() => {
  const response = tracked.data.value;

  return response ? `Lamports ${response.value} · slot ${response.context.slot}` : "No data yet";
});
const signInErrorText = computed(() =>
  signIn.error.value instanceof Error ? signIn.error.value.message : "",
);
</script>

<template>
  <section class="panel" data-testid="live-panels">
    <div class="panel-heading">
      <div>
        <p class="eyebrow">Kit-reactive composables</p>
        <h2>Live Data Panels</h2>
      </div>
    </div>

    <p>
      These panels exercise <code>useRequest</code>, <code>useSubscription</code>,
      <code>useTrackedData</code>, <code>useSignIn</code>, and the SWR cache adapters against
      devnet. Changing the tracked address re-fires the request, subscription, and tracked data.
    </p>

    <label>
      Tracked address
      <input v-model="trackedAddressInput" data-testid="tracked-address" spellcheck="false" />
    </label>

    <div class="panel-grid">
      <article class="subpanel">
        <header>
          <h3>useRequest</h3>
          <span class="status-pill" data-testid="request-status">{{ request.status.value }}</span>
        </header>
        <p class="result" data-testid="request-data">{{ requestText }}</p>
        <p v-if="request.error.value" class="error" data-testid="request-error">
          {{ request.error.value.message }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSubscription</h3>
          <span class="status-pill" data-testid="subscription-status">{{
            slots.status.value
          }}</span>
        </header>
        <p class="result" data-testid="subscription-data">{{ slotsText }}</p>
        <p v-if="slots.error.value" class="error" data-testid="subscription-error">
          {{ slots.error.value.message }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useTrackedData</h3>
          <span class="status-pill" data-testid="tracked-status">{{ tracked.status.value }}</span>
        </header>
        <p class="result" data-testid="tracked-data">{{ trackedText }}</p>
        <p v-if="tracked.error.value" class="error" data-testid="tracked-error">
          {{ tracked.error.value.message }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useSignIn</h3>
          <span class="status-pill" data-testid="sign-in-status">{{ signIn.status.value }}</span>
        </header>
        <p>
          Triggers the wallet's Sign In With Solana feature. The result must be verified on a server
          before trusting the identity.
        </p>
        <div class="actions">
          <button
            type="button"
            data-testid="sign-in-button"
            :disabled="!wallet.connected.value || signIn.loading.value"
            @click="signIn.signIn()"
          >
            {{ signIn.loading.value ? "Signing in..." : "Sign In With Wallet" }}
          </button>
        </div>
        <p class="result" data-testid="sign-in-result">
          {{
            signIn.signInResult.value
              ? `Signed in as ${signIn.signInResult.value.account.address}`
              : "Not signed in"
          }}
        </p>
        <p v-if="signInErrorText" class="error" data-testid="sign-in-error">
          {{ signInErrorText }}
        </p>
      </article>

      <article class="subpanel">
        <header>
          <h3>useRequestSwr</h3>
          <button
            type="button"
            class="toggle-button"
            data-testid="swr-toggle"
            @click="swrPanelVisible = !swrPanelVisible"
          >
            {{ swrPanelVisible ? "Hide card" : "Show card" }}
          </button>
        </header>
        <p>
          Cache-keyed request. Hiding and re-showing the card remounts it: the cached value appears
          immediately (stale) while the request revalidates (fresh).
        </p>
        <SwrCard v-if="swrPanelVisible" />
        <p v-else class="result" data-testid="swr-data">Card hidden</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.panel-grid {
  display: grid;
  gap: 0.9rem;
  margin-top: 1rem;
}

.subpanel {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.9rem 1rem;
  background: var(--color-background);
}

.subpanel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.subpanel h3 {
  margin: 0;
  color: var(--color-heading);
  font-size: 1rem;
}

.status-pill {
  flex: 0 0 auto;
  padding: 0.3rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-background);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.toggle-button {
  padding: 0.32rem 0.7rem;
  font-size: 0.78rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
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
</style>
