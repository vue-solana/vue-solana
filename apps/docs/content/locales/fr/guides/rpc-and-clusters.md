---
title: "RPC et clusters"
description: Configurez les clusters Solana, les endpoints RPC, les endpoints WebSocket et les helpers de client.
ogSection: Guides
surroundOrder: 7
---

Vue Solana partage la configuration des clusters et des endpoints entre `@vue-solana/core`, `@vue-solana/vue` et `@vue-solana/nuxt`.

Utilisez ce guide lorsque vous devez choisir un cluster, fournir un endpoint RPC personnalisé ou comprendre ce qu'exposent les composables RPC.

## Noms de clusters

Les noms de clusters pris en charge sont :

- `devnet`
- `testnet`
- `mainnet`
- `mainnet-beta` (alias historique de `mainnet`)
- `localnet`

Utilisez `mainnet` pour le mainnet Solana. C'est le nom officiel du cluster mainnet de Solana. L'ancienne graphie `mainnet-beta` est toujours acceptée et redirige vers le même endpoint.

`devnet` est la valeur par défaut car c'est le cluster le plus sûr pour les exemples et le développement.

## Configuration du core

Utilisez `@vue-solana/core/rpc` lorsque vous voulez une configuration de client indépendante du framework.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "devnet",
  commitment: "confirmed",
});

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

`createSolanaContext()` renvoie le `cluster` résolu, l'`endpoint` HTTP, le `wsEndpoint` WebSocket et un `client` Kit dont le `rpc` envoie les requêtes RPC.

## Endpoints RPC personnalisés

Les apps de production devraient généralement utiliser un provider RPC dédié plutôt que les endpoints publics des clusters.

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

Si `wsEndpoint` est omis, Vue Solana le dérive de l'endpoint HTTP en convertissant `https` en `wss` et `http` en `ws`.

```ts
import { getWebSocketEndpoint } from "@vue-solana/core/clusters";

const wsEndpoint = getWebSocketEndpoint("https://api.devnet.solana.com");
```

## Configuration de Vue

Installez le plugin Vue une seule fois au démarrage de l'app.

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

Lisez ensuite l'état RPC depuis les composants avec `useRpc()`.

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

## Configuration de Nuxt

Configurez le module dans `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    commitment: "confirmed",
  },
});
```

Nuxt stocke les options du module dans la configuration runtime publique, donc les options doivent être sérialisables en JSON. Le module Nuxt omet volontairement `payer` et `payerSecretKey` ; ne placez jamais un secret brut dans la configuration runtime publique. Installez un `payer` éphémère dans un plugin côté client avec `clientPlugin: false`.

Les clients core et Vue directs peuvent passer `payer` ou `payerSecretKey` à `createSolanaClient()` / `createSolanaPlugin()`. Le client par défaut utilise la stack officielle `solanaRpc()` pour les transactions envoyées par le client, et `solanaRpc()` installe lui-même le planificateur de transaction ainsi que les exécuteurs de signature et d'envoi de plan.

Utilisez le composable auto-importé `useSolanaRpc()` dans les pages et composants Nuxt.

```vue
<script setup lang="ts">
const { cluster, endpoint, status, checkConnection } = useSolanaRpc();
</script>
```

Le plugin runtime de Nuxt est côté client uniquement. Les composables peuvent être appelés pendant le SSR, mais le travail de wallet et de RPC doit être déclenché depuis des hooks de cycle de vie client ou des actions utilisateur.

## Helpers d'endpoint

Utilisez `@vue-solana/core/clusters` lorsque vous avez besoin des valeurs d'endpoint intégrées sans créer de client.

```ts
import {
  DEFAULT_CLUSTER,
  getClusterEndpoint,
  getClusterWebSocketEndpoint,
} from "@vue-solana/core/clusters";

const endpoint = getClusterEndpoint(DEFAULT_CLUSTER);
const wsEndpoint = getClusterWebSocketEndpoint("devnet");
```

## Notes de production

- Préférez un provider RPC dédié pour le trafic de production.
- Évitez les scans larges ou fréquents sur les endpoints RPC publics.
- Utilisez les abonnements WebSocket à bon escient ; nettoyez-les toujours lorsque vous n'en avez plus besoin.
- Traitez les réponses RPC comme des entrées non fiables et gérez les données manquantes, obsolètes ou en échec.
