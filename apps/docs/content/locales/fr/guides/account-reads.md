---
title: "Lecture de comptes"
description: Lisez les soldes, les données de compte, les comptes de programme et le statut de signature en toute sécurité depuis Vue ou Nuxt.
ogSection: Guides
surroundOrder: 9
---

Vue Solana inclut des composables pour les chemins de lecture Solana courants : soldes, informations de compte, comptes de programme et statut de signature.

Utilisez ce guide lorsque votre app doit lire l'état de la chaîne sans signer de transaction.

## Analyser les adresses

Le code indépendant du framework peut normaliser une adresse Solana avec `parseAddress()`.

```ts
import { parseAddress } from "@vue-solana/core/address";
import { createSolanaClient } from "@vue-solana/core/kit";

const address = parseAddress("11111111111111111111111111111111");

if (address) {
  const client = createSolanaClient({ cluster: "devnet" });
  const { value: lamports } = await client.rpc.getBalance(address).send();
}
```

`parseAddress()` accepte un `Address`, une chaîne d'adresse, un objet de type ref, un getter, `null` ou `undefined`. Les chaînes d'adresse invalides lèvent `INVALID_ADDRESS`.

## Lire le solde en Vue

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Lire les informations de compte

Utilisez `useAccountInfo()` pour un seul compte.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh } = useAccountInfo(address, {
  commitment: "confirmed",
});
</script>
```

Le composable renvoie des données de compte normalisées (`executable`, `lamports`, `owner`, `space` et les octets `data` décodés) et efface l'état obsolète lorsque l'adresse devient `null` ou invalide. Appelez `refresh()` pour relire le compte à la demande.

## Lire les comptes de programme

Utilisez `useProgramAccounts()` pour les comptes détenus par l'identifiant d'un programme.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> Avertissement : les scans de comptes de programme peuvent être coûteux. Utilisez des filtres étroits, `dataSlice`, la mise en cache, la pagination, l'indexation ou une infrastructure RPC dédiée pour les lectures de production.

## Lire le statut de signature

Utilisez `useSignatureStatus()` pour suivre une signature de transaction connue.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, error, refresh, stopPolling } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

Utilisez le polling pour une interface de progression de courte durée. Évitez le polling indéfini depuis des pages à fort trafic.

## Auto-imports Nuxt

Nuxt expose les mêmes helpers de lecture sous forme de composables auto-importés :

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Les composables Nuxt peuvent être appelés pendant le SSR et renvoient un état inerte jusqu'à ce que l'hydratation fournisse le vrai contexte client. Déclenchez les rafraîchissements réseau depuis des hooks de cycle de vie client ou des actions utilisateur lorsque les données dépendent d'un contexte navigateur uniquement.

## Entrées nulles et invalides

Les composables de lecture effacent leur état sans appeler le RPC lorsque l'adresse, l'identifiant de programme ou la signature vaut `null`.

Les chaînes d'adresse invalides effacent les données obsolètes, définissent `error` et n'appellent pas la méthode RPC. Branchez-vous sur `error.value.code` pour les messages destinés aux utilisateurs ; une adresse non analysable signale `INVALID_ADDRESS`.

## Sémantique de rafraîchissement et d'erreur

`useBalance`, `useAccountInfo`, `useProgramAccounts`, `useTokenAccounts` et `useTokenBalance` partagent une même machine à états, donc ils se comportent de la même façon dans trois cas faciles à manquer.

**`refresh()` rejette ; il ne résout pas en cas d'échec.** Il résout avec la nouvelle valeur en cas de succès, avec `null` lorsqu'une entrée est vide, et rejette avec un `SolanaError` normalisé sinon. Un simple `@click="refresh"` convient car Vue absorbe le rejet, mais le code écrit à la main doit le gérer :

```ts
// No error state on a rejected promise, so this silently does nothing useful.
await refresh();

// Await it and report.
try {
  await refresh();
} catch (cause) {
  console.error(cause);
}
```

`useRequest()` fait exception : son `refresh()` résout avec le résultat de la tentative au lieu de rejeter.

**Les données reviennent à leur valeur vide lorsqu'une lecture échoue.** Un solde précédemment chargé ne reste pas à l'écran à côté d'une nouvelle erreur — il se lit comme une donnée actuelle alors qu'il ne l'est pas. Branchez-vous sur `error` pour décider quoi afficher :

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="errorMessage" />
  <p v-else-if="loading">Loading…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

**Résultats en lecture seule dans `useTokenBalance`.** Ses `balance` et `decimals` sont des refs calculés dérivés d'une seule lecture. Lisez-les ; leur affecter une valeur n'a aucun effet.

## Liste de contrôle des coûts RPC

- Préférez les lectures directes d'un seul compte lorsque c'est possible.
- Utilisez des filtres pour les scans de comptes de programme.
- Utilisez `dataSlice` lorsque vous n'avez besoin que d'une partie des données de compte.
- Évitez les scans larges depuis les pages d'accueil ou à chaque navigation de route.
- Évitez les intervalles de polling agressifs sur les endpoints RPC publics.
- Mettez en cache ou indexez les données que de nombreux utilisateurs demanderont de façon répétée.
