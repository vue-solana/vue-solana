---
title: "RPC und Cluster"
description: Konfiguriere Solana-Cluster, RPC-Endpoints, WebSocket-Endpoints und Client-Helfer.
ogSection: Anleitungen
surroundOrder: 7
---

Vue Solana hält die Cluster- und Endpoint-Konfiguration über `@vue-solana/core`, `@vue-solana/vue` und `@vue-solana/nuxt` hinweg gemeinsam.

Nutze diese Anleitung, wenn du einen Cluster auswählen, einen eigenen RPC-Endpoint angeben oder verstehen willst, was die RPC-Composables bereitstellen.

## Cluster-Namen

Unterstützte Cluster-Namen sind:

- `devnet`
- `testnet`
- `mainnet`
- `mainnet-beta` (Legacy-Alias für `mainnet`)
- `localnet`

Verwende `mainnet` für das Solana-Mainnet. Dies ist der offizielle Mainnet-Cluster-Name von Solana. Die Legacy-Schreibweise `mainnet-beta` wird weiterhin akzeptiert und leitet auf denselben Endpoint weiter.

`devnet` ist der Standard, weil es der sicherste Cluster für Beispiele und Entwicklung ist.

## Core einrichten

Verwende `@vue-solana/core/rpc`, wenn du eine framework-agnostische Client-Einrichtung willst.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

`createSolanaContext()` gibt den aufgelösten `cluster`, den HTTP-`endpoint`, den WebSocket-`wsEndpoint` und einen Kit-`client` zurück, dessen `rpc` RPC-Anfragen sendet.

## Eigene RPC-Endpoints

Produktions-Apps sollten üblicherweise einen dedizierten RPC-Anbieter statt öffentlicher Cluster-Endpoints verwenden.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

Wenn `wsEndpoint` weggelassen wird, leitet Vue Solana ihn aus dem HTTP-Endpoint ab, indem `https` zu `wss` und `http` zu `ws` umgewandelt wird.

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Einrichtung eines gehosteten RPC

Der integrierte devnet-Endpoint reicht für den ersten Lesevorgang aus. Für ein Beispiel, das du behalten möchtest, oder für eine App mit WebSocket-Subscriptions erstelle bei einem Anbieter wie [Chainstack](https://chainstack.com/pricing/) oder [Alchemy](https://www.alchemy.com/pricing) einen kostenlosen Endpoint mit eigenem Schlüssel. Die [Cluster-Konzepte](/de/concepts/clusters#gehostete-rpc-anbieter) vergleichen die kostenlosen Tarife und ihre Vor- und Nachteile.

Übergib die HTTP-URL des Anbieters als `endpoint`:

```ts
createSolanaPlugin({
  cluster: "devnet",
  endpoint: "https://solana-devnet.g.alchemy.com/v2/YOUR_KEY",
});
```

`wsEndpoint` ist optional. Vue Solana wandelt `https` automatisch in `wss` um, die WebSocket-URL wird also aus der obigen HTTP-URL abgeleitet. Übergib `wsEndpoint` nur explizit, wenn der Anbieter einen anderen Host oder Port verwendet.

Bei Nuxt bewahre einen nur für den Server gedachten Schlüssel in der privaten Runtime-Konfiguration auf und lies ihn mit `useServerSolanaClient()` aus, wie unter [Serverseitiges RPC während der SSR](/de/guides/rpc-and-clusters#serverseitiges-rpc-während-der-ssr) beschrieben. Setze niemals einen rohen Schlüssel in `runtimeConfig.public.solana`; die öffentliche Konfiguration wird in den Browser gebündelt. In einer reinen Client-App ist die Endpoint-Zeichenfolge grundsätzlich sichtbar. Nutze daher die Domain-/IP-Allowlist des Anbieters und halte den Schlüssel außerhalb der Versionsverwaltung.

Kostenlose Tarife sind für Lernen und geringen Traffic gedacht. Prüfe die unterstützten Methoden des Anbieters, bevor du dich auf `useProgramAccounts()`, `useTokenAccounts()` oder historische Abfragen verlässt: Dieselbe Methode kann auf devnet verfügbar und auf mainnet eingeschränkt sein oder einen Archiv-Tarif erfordern.

## Vue einrichten

Installiere das Vue-Plugin einmal kurz nach dem Start der App.

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      commitment: "confirmed",
    }),
  )
  .mount("#app");
```

Lies dann den RPC-Zustand in Komponenten mit `useRpc()`.

```vue
<script setup lang="ts">
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, latestBlockhash, error, checkConnection } = useRpc();
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="error">Unable to reach RPC.</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Nuxt einrichten

Konfiguriere das Modul in `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt speichert die Moduloptionen in der öffentlichen Runtime-Config, die Optionen müssen also JSON-serialisierbar sein. Das Nuxt-Modul lässt `payer` und `payerSecretKey` absichtlich weg; platziere niemals ein rohes Secret in der öffentlichen Runtime-Config. Installiere einen ephemeren `payer` in einem client-only Plugin mit `clientPlugin: false`.

Direkte Core- und Vue-Clients können `payer` oder `payerSecretKey` an `createSolanaClient()` / `createSolanaPlugin()` übergeben. Der Standard-Client verwendet den offiziellen `solanaRpc()`-Stack für clientseitig gesendete Transaktionen, und `solanaRpc()` installiert den Transaktions-Planer sowie die Executors für Plan-Signierung und Plan-Versand selbst.

Verwende das automatisch importierte Composable `useSolanaRpc()` in Nuxt-Seiten und -Komponenten.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

Das Browser-Runtime-Plugin von Nuxt ist clientseitig, aber ein Server-Plugin installiert während der SSR einen anfragenbezogenen Kontext mit dem konfigurierten Cluster und den konfigurierten Endpoints, sodass `useSolanaRpc()` den konfigurierten Cluster statt eines fest codierten `devnet` rendert. Der Wallet-Zustand bleibt bis zur Hydration inaktiv; halte Wallet-Arbeit in Client-Lifecycle-Hooks oder Nutzeraktionen.

## Serverseitiges RPC während der SSR

Für Daten, die im initialen HTML vorhanden sein müssen, halte die RPC-URL und eventuelle API-Keys in der **privaten** Runtime-Config unter `solanaServer` und lies sie in einer Nitro-Server-Route über `useServerSolanaClient()` aus `@vue-solana/nuxt/server`. Das Utility akzeptiert nur Leseoptionen (`cluster`, `endpoint`, `wsEndpoint`, `commitment`) und entfernt `wallet`, `payer` und `payerSecretKey` zur Laufzeit. Private Config wird nie in den Browser gebündelt; lege niemals Zugangsdaten in `runtimeConfig.public.solana` ab.

Konfiguriere den privaten Endpoint in `nuxt.config.ts` (oder über die Umgebungsvariable `NUXT_SOLANA_SERVER_ENDPOINT`):

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
  },
  runtimeConfig: {
    solanaServer: {
      // Private: this value is never bundled into the browser.
      endpoint: process.env.SOLANA_RPC_URL,
      commitment: "confirmed",
    },
  },
});
```

Lies in einer Nitro-Server-Route nur die Felder, die die Seite braucht:

```ts
// server/api/slot.get.ts
import { useServerSolanaClient } from "@vue-solana/nuxt/server";

export default defineEventHandler(async () => {
  const { rpc } = useServerSolanaClient();
  const slot = await rpc.getSlot().send();
  return { slot: slot.toString() };
});
```

Rufe es dann während der SSR mit `useAsyncData()` ab:

```vue
<script setup lang="ts">
const { data, refresh } = await useAsyncData("solana-slot", () =>
  $fetch<{ slot: string }>("/api/slot"),
);
</script>

<template>
  <p>Slot: {{ data?.slot ?? "Loading..." }}</p>
  <button type="button" @click="refresh()">Refresh</button>
</template>
```

`useAsyncData()` legt das Ergebnis in die Nuxt-Payload, sodass der Client es während der Hydration nicht erneut abruft. Wandle `bigint`-Ergebnisse wie Slotnummern und Guthaben in der Server-Route in Zeichenfolgen um; nur die Felder, die du zurückgibst, sind für den Browser sichtbar. Wallet-Erkennung, Signierung und Prompts müssen nach der Hydration in Client-Komponenten bleiben.

## Endpoint-Helfer

Verwende `@vue-solana/core/clusters`, wenn du die eingebauten Endpoint-Werte brauchst, ohne einen Client zu erstellen.

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## Hinweise für die Produktion

- Bevorzuge für Produktions-Traffic einen dedizierten RPC-Anbieter.
- Vermeide breite oder häufige Scans auf öffentlichen RPC-Endpoints.
- Verwende WebSocket-Subscriptions bewusst; räume sie immer auf, wenn du sie nicht mehr brauchst.
- Behandle RPC-Antworten als nicht vertrauenswürdige Eingaben und gehe mit fehlenden, veralteten oder fehlgeschlagenen Daten um.
