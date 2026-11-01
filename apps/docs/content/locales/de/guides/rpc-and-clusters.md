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

Das Nuxt-Runtime-Plugin läuft nur auf dem Client. Composables können während der SSR aufgerufen werden, aber Wallet- und RPC-Arbeit sollte aus Client-Lifecycle-Hooks oder Nutzeraktionen ausgelöst werden.

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
