---
title: "@vue-solana/nuxt"
description: Module Nuxt pour les applications Solana.
ogSection: Packages
surroundOrder: 18
---

[`@vue-solana/nuxt`](https://www.npmjs.com/package/@vue-solana/nuxt) installe le plugin Vue Solana dans les applications Nuxt et importe automatiquement les composables.

## Installation

```sh
npx nuxt module add @vue-solana/nuxt
```

Cela installe le package et ajoute `@vue-solana/nuxt` au tableau `modules` dans `nuxt.config.ts`.

Le package est ESM uniquement. Nuxt embarque déjà ESM et ne nécessite aucun changement ; un `require("@vue-solana/nuxt")` en CommonJS échoue avec `No "exports" main defined`, donc rendez le module importateur ESM, ou restez sur `@vue-solana/nuxt@^2`, qui fournit encore une build `.cjs`. Voir [Passer de la v2 à la v3](/fr/guides/migration#migration--de-v2-à-v3).

Les applications navigateur qui créent ou sérialisent des transactions peuvent initialiser le polyfill Buffer depuis `@vue-solana/nuxt/buffer-polyfill`. Utilisez `@vue-solana/nuxt/kit` pour l'API Kit — il réexporte tout `@solana/kit` — ou le composable auto-importé `useSolanaClient()`.

## Configuration du module

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

Vous pouvez également configurer un endpoint RPC personnalisé :

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  },
});
```

Les clusters pris en charge sont `mainnet` (alias historique `mainnet-beta`), `devnet`, `testnet` et `localnet`. Utilisez `mainnet` pour le mainnet Solana ; c'est le nom officiel du cluster mainnet de Solana.

Les options du module Nuxt sont stockées dans la configuration runtime publique, elles doivent donc être sérialisables en JSON. Les objets d'adaptateur `wallet` personnalisés sont volontairement exclus de la configuration Nuxt ; utilisez directement le plugin Vue dans du code Vue client-only si vous devez injecter un objet wallet personnalisé.

`ModuleOptions` omet également volontairement `payer` et `payerSecretKey`. Ils restent pris en charge par les clients directs `@vue-solana/core` et `@vue-solana/vue`, mais le module Nuxt ne transmet aucun de ces champs et les supprime de la configuration runtime publique. Ne placez jamais un secret brut, une seed phrase ou `payerSecretKey` dans `nuxt.config.ts` ou `runtimeConfig.public` : ces valeurs sont visibles par le navigateur. Pour un signer de démonstration ou de relayer détenu côté client, créez-le dans un plugin client-only avec `generateKeyPairSigner()` et installez-y le plugin Vue, en définissant `clientPlugin: false` pour que le module n'installe pas son propre plugin. Installer les deux créerait deux contextes Solana, deux abonnements wallet et deux vérifications de connexion, et seul le dernier `provide` l'emporterait.

Le plugin runtime client du module installe aussi automatiquement le contexte de compte wallet sélectionné à l'échelle de l'application, afin que `useSolanaSelectedWalletAccount()` fonctionne dans chaque composant sans monter de provider. Pour personnaliser la persistance (`stateSync`) ou le filtrage (`filterWallet`), montez `SelectedWalletAccountProvider` depuis `@vue-solana/vue/useSelectedWalletAccount` plus profondément dans l'arbre pour masquer le contexte par défaut.

Les options de wallet mobile peuvent être configurées sans risque dans `nuxt.config.ts` lorsqu'elles ne contiennent que des paramètres d'identité d'application et de redirection sérialisables en JSON :

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
        uri: "https://example.com",
        icon: "favicon.ico",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
      redirectUrl: "https://example.com",
    },
  },
});
```

Passez `mobileWallet: false` ou `iosWallet: false` pour désactiver l'une ou l'autre source de wallet mobile. Le module pré-optimise également les dépendances courantes de Solana, Wallet Adapter et wallet mobile afin que Vite puisse correctement bundler le code de transaction et de wallet du navigateur.

## Composables auto-importés

Le module auto-importe ces composables depuis les sous-chemins directs `@vue-solana/vue/*` plutôt que depuis le barrel racine du package Vue. Cela évite que les bundles SSR de Nuxt embarquent du code runtime Solana sans rapport, simplement parce qu'une page utilise un composable.

- `useSolana()`: renvoie le contexte Solana injecté complet.
- `useSolanaClient()`: renvoie le `{ client, rpc }` de Kit depuis le contexte. Recommandé pour le nouveau code.
- `useSolanaRpc()`: renvoie le cluster, l'endpoint, le statut RPC, le dernier blockhash, le `client` Kit injecté et `checkConnection()`.
- `useSolanaConnection()`: renvoie le `client` Kit injecté (déprécié au profit de `useSolanaClient()`).
- `useSolanaAccountInfo(address, options?)`: lit les informations de compte et peut s'abonner aux changements du compte.
- `useSolanaAirdrop()`: distribue des SOL sur un compte sur les réseaux de test et les validateurs locaux.
- `useSolanaWallet()`: renvoie l'état du wallet sélectionné, l'état de connexion, les capacités et les actions du wallet.
- `useSolanaWallets()`: renvoie les wallets découverts et les actions de sélection et de rafraîchissement des wallets.
- `useSolanaBalance(address, commitment?)`: lit le solde en lamports d'une clé publique ou d'une adresse.
- `useSolanaTokenAccounts(owner, options?)`: lit tous les comptes de token SPL d'un propriétaire, en interrogeant par défaut à la fois les programmes Token et Token-2022.
- `useSolanaTokenBalance(mint, owner)`: lit le solde et les décimales du token SPL pour une paire mint/propriétaire via le compte de token associé.
- `useSolanaProgramAccounts(programId, options?)`: lit les comptes détenus par un programme avec filtres et découpage des données.
- `useSolanaTransactionConfirmation(options?)`: confirme la signature d'une transaction existante.
- `useSolanaSignatureStatus(signature, options?)`: lit, interroge périodiquement ou suit par abonnement le statut d'une signature.
- `useSolanaSignMessage()`: signe des messages d'authentification hors chaîne ou de preuve de propriété.
- `useSolanaSignAndSendTransaction()`: signe, envoie et confirme éventuellement des transactions.
- `useSolanaAction(handler)`: machine à états générique pour actions asynchrones, avec abandon lors d'un nouvel envoi (abort-on-redispatch).
- `useSolanaRequest(source, options?)`: requête unique qui se relance lorsque sa source change, avec stale-while-revalidate.
- `useSolanaSubscription(source, options?)`: données en direct issues des abonnements RPC et d'autres sources de flux réactives.
- `useSolanaTrackedData(source, options?)`: abonnement RPC amorcé par une requête unique, dédupliqué par slot.
- `useSolanaSignIn()`: déclenche la fonctionnalité Sign In With Solana (SIWS) d'un wallet.
- `useSolanaPay()`: construit et analyse les URL de demande de transfert Solana Pay et suit le statut de confirmation par référence.
- `useSolanaPayConfirmation()`: interroge périodiquement le statut du paiement pour une référence Solana Pay.
- `useSolanaQrCode()`: rend une URL Solana Pay sous forme de QR code SVG.
- `useSolanaQrScanner()`: scanne les QR codes Solana Pay via la caméra et `BarcodeDetector`.

Pour le cache keying entre les montages, les adaptateurs SWR ne sont pas auto-importés. Importez-les explicitement depuis le sous-chemin du package Vue :

```ts
import { useRequestSwr } from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Consultez [Composables de récupération de données](/fr/packages/vue#composables-de-récupération-de-données) pour la sémantique complète des composables request, subscription, tracked-data et SWR-cache.

- `useSolanaSelectedWalletAccount()`: lit le contexte de compte wallet sélectionné à l'échelle de l'application, installé par le plugin runtime.
- `useSolanaSignTransactions()`: signe plusieurs transactions en une seule demande au wallet.
- `useSolanaSignAndSendTransactions()`: signe et envoie plusieurs transactions en une seule demande au wallet.
- `useSolanaPayer()` / `useSolanaIdentity()`: signers Kit réactifs du client (nécessite un plugin signer).
- `useSolanaPlanTransaction()` / `useSolanaPlanTransactions()`: planifient des messages de transaction à partir d'instructions en entrée.
- `useSolanaSendTransaction()` / `useSolanaSendTransactions()`: utilisent le planner Kit officiel et l'exécuteur d'envoi de plan RPC installés par le client par défaut ; ils planifient, signent, soumettent et attendent le commitment `confirmed` sans popup wallet. Configurez un `payer` dans un plugin Vue client-only ; utilisez `useSolanaSignAndSendTransaction(s)` lorsqu'un wallet connecté doit approuver chaque transaction.

Ce sont des alias Nuxt pour les composables Vue.

- `useSolanaClientCapability()`: échoue immédiatement lorsque le client Kit installé ne dispose pas d'une capacité requise.
- `tryUseSolana()`: accesseur sûr, qui ne lève pas d'exception, pour le contexte Solana injecté.
- `clearSwrCache()`: vide le cache SWR au niveau du module (voir [Composables de récupération de données](/fr/packages/vue#composables-de-récupération-de-données)).

Le client par défaut créé par le module Nuxt compose les plugins officiels `solanaRpc()` et `rpcAirdrop()` lorsqu'aucun `commitment` n'est configuré (un `commitment` configuré construit le même stack explicitement afin qu'il atteigne la couche RPC) ; `solanaRpc()` installe lui-même le planner de transactions ainsi que les exécuteurs de signature et d'envoi de plan. L'ancien expéditeur de secours personnalisé n'est pas utilisé. `useSolanaSendTransaction()` et `useSolanaSendTransactions()` exposent donc la capacité officielle d'envoi côté client, mais le module ne configure pas de payer, car `payer` et `payerSecretKey` sont volontairement omis de `ModuleOptions` ; une transaction envoyée côté client nécessite donc un `payer` installé dans un plugin client-only avec `clientPlugin: false`, comme décrit dans [Configuration du module](#module-setup). Leur statut `sent` est atteint une fois que l'exécuteur officiel a terminé son opération d'envoi et de confirmation au commitment `confirmed`.

Le package Vue utilise des noms courts comme `useRpc()` car les appelants les importent explicitement depuis `@vue-solana/vue/useRpc`.

Le module Nuxt expose des noms préfixés comme `useSolanaRpc()` car les composables auto-importés partagent l'espace de noms Nuxt de l'application et doivent éviter les collisions avec le code de l'application ou d'autres modules.

`useSolana()` fait exception car il est déjà préfixé et sert d'accesseur de contexte canonique dans Vue comme dans Nuxt.

Utilisez les noms `useSolana*` dans les applications Nuxt afin que les auto-imports fonctionnent sans imports explicites.

Les octets de transaction bruts et l'helper Buffer du navigateur sont des imports explicites, pas des auto-imports :

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/nuxt/buffer-polyfill";
```

L'API Kit est disponible à la fois comme auto-import et comme import explicite :

```ts
import { address, lamports } from "@vue-solana/nuxt/kit";

const { client, rpc } = useSolanaClient();
const slot = await rpc.getSlot().send(); // bigint
const owner = address("PASTE_A_SOLANA_ADDRESS");
```

N'utilisez les imports directs `@vue-solana/core/*` que pour un usage core de plus bas niveau.

Sous-chemins directs du package :

- `@vue-solana/nuxt/buffer-polyfill`
- `@vue-solana/nuxt/kit`

Le plugin runtime est client-only. Les composables auto-importés peuvent être appelés pendant le SSR et renvoient un état inerte jusqu'à ce que l'hydratation fournisse le vrai contexte client. Déclenchez les opérations RPC et wallet depuis les hooks de cycle de vie client ou les actions utilisateur.

L'enregistrement d'Android Mobile Wallet Adapter ne s'exécute lui aussi que côté client. Sur Android Chrome et les PWA Chrome, `Mobile Wallet Adapter` peut apparaître dans la même liste `useSolanaWallets()` que les wallets d'extension de navigateur. Sur les navigateurs iOS, Phantom, Solflare et Backpack peuvent apparaître dans la même liste via des liens universels propres à chaque wallet. Les adaptateurs de wallet pour applications natives de bureau sont prévus mais pas encore implémentés.

## Guides connexes

- [RPC et clusters](/fr/guides/rpc-and-clusters): configurez le module Nuxt et lisez l'état RPC.
- [Wallets](/fr/guides/wallets): utilisez `useSolanaWallets()` et `useSolanaWallet()` en toute sécurité dans les flux client.
- [Lectures de comptes](/fr/guides/account-reads): lisez les soldes, les données de compte, les comptes de programme et le statut des signatures.
- [Transactions](/fr/guides/transactions): signez, envoyez, confirmez et gérez le statut des transactions depuis Nuxt.
- [Signature de messages](/fr/guides/message-signing): demandez des signatures de wallet pour des messages hors chaîne.
- [Solana Pay](/fr/guides/solana-pay): utilisez les composables Solana Pay auto-importés pour les paiements et les QR codes.
- [Tests E2E](/fr/guides/e2e-testing): mockez le RPC, les abonnements RPC et les wallets dans les tests Playwright.
- [Erreurs](/fr/guides/errors): mappez les erreurs des composables auto-importés vers des messages d'UI sûrs.

## Lire l'état RPC

```vue
<script setup lang="ts">
const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useSolanaRpc();

const rpcErrorMessage = computed(() => {
  if (!error.value) return null;
  return error.value.code === "RPC_FAILURE"
    ? "Unable to reach the configured Solana RPC endpoint."
    : "Unable to check the Solana connection.";
});
</script>

<template>
  <section>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Status: {{ status }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <p v-if="rpcErrorMessage">{{ rpcErrorMessage }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </section>
</template>
```

## Lire le solde

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);

const balanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="balanceErrorMessage">{{ balanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Lire les comptes de token

```vue
<script setup lang="ts">
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useSolanaTokenAccounts(owner);

const tokenErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load token accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Token accounts: {{ tokenAccounts.length }}</p>
    <ul>
      <li v-for="(account, i) in tokenAccounts" :key="i">
        {{ account.mint }} — {{ account.amount }}
      </li>
    </ul>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenErrorMessage">{{ tokenErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useSolanaTokenAccounts()` réinitialise l'état sans appeler le RPC lorsque le propriétaire est null. Passez `programId` dans les options pour limiter les résultats à un seul programme de token.

## Lire le solde d'un token

```vue
<script setup lang="ts">
const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useSolanaTokenBalance(mint, owner);

const tokenBalanceErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter valid mint and owner addresses.";
    case "RPC_FAILURE":
      return "Unable to load token balance from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p v-if="balance !== null">Balance: {{ balance }} ({{ decimals }} decimals)</p>
    <p v-else>No token account found.</p>
    <p v-if="loading">Loading...</p>
    <p v-if="tokenBalanceErrorMessage">{{ tokenBalanceErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useSolanaTokenBalance()` renvoie `null` pour le solde et les décimales lorsque le compte de token associé n'existe pas, sans le traiter comme une erreur. Ses `balance` et `decimals` sont des refs calculées en lecture seule dérivées d'une seule lecture : lisez-les, ne leur assignez pas de valeur.

## Sémantique des composables de lecture

`useSolanaBalance()`, `useSolanaAccountInfo()`, `useSolanaProgramAccounts()`, `useSolanaTokenAccounts()` et `useSolanaTokenBalance()` partagent une même machine à états, identique à celle des composables Vue :

- **`refresh()` rejette en cas d'échec** au lieu de résoudre, et résout avec `null` lorsqu'une entrée est vide. Un `await refresh()` sans `try`/`catch` lève une exception. Le lier directement à `@click` ne pose pas de problème — Vue absorbe le rejet — mais les appelants écrits à la main doivent le gérer. `useSolanaRequest()` fait exception et résout toujours avec le résultat de la tentative.
- **Les données reviennent à leur valeur vide lorsqu'une lecture échoue.** Le dernier solde réussi ne persiste pas à côté d'une nouvelle `error`. Branchez-vous sur `error` pour choisir quoi afficher.

Une adresse non analysable signale `INVALID_ADDRESS` dans `error` et n'atteint jamais le RPC. Voir [Lectures de comptes](/fr/guides/account-reads#sémantique-de-rafraîchissement-et-derreur).

## Gestion des erreurs

Les composables auto-importés de Nuxt exposent les mêmes refs normalisées `SolanaError | null` que `@vue-solana/vue`. Utilisez les valeurs stables `error.value.code` pour les branches d'UI et conservez `error.value.cause` pour journaliser les échecs d'origine (wallet, RPC, analyse, timeout ou stockage).

```vue
<script setup lang="ts">
const { error, execute } = useSolanaSignAndSendTransaction();

const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "USER_REJECTED":
      return "The wallet request was rejected.";
    case "TRANSACTION_TIMEOUT":
      return "The transaction is taking longer than expected.";
    case "RPC_FAILURE":
      return "The Solana RPC request failed.";
    default:
      return null;
  }
});
</script>
```

## Lire les données de compte

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");

const account = useSolanaAccountInfo(address, { watch: true });
const programAccounts = useSolanaProgramAccounts(programId, {
  dataSlice: { offset: 0, length: 32 },
  filters: [{ dataSize: 165 }],
});
const signatureStatus = useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 });
</script>
```

Utilisez `useSolanaProgramAccounts()` avec prudence sur les nœuds RPC publics. Préférez des filtres étroits, utilisez `dataSlice` pour des lectures partielles et évitez d'interroger en boucle des scans larges.

## État du wallet

```vue
<script setup lang="ts">
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh Wallets</button>

    <button
      v-for="wallet in wallets"
      :key="wallet.name"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey }}</p>
    <button type="button" :disabled="!selectedWallet || connected" @click="connect">Connect</button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Les wallets d'extension de navigateur sont découverts via le Solana Wallet Standard. Les wallets Android Mobile Wallet Adapter sont enregistrés via `@solana-mobile/wallet-standard-mobile` sur les clients Android Chrome compatibles et exposés dans la même liste de wallets. Les entrées iOS Phantom, Solflare et Backpack sont exposées via des liens universels propres à chaque wallet sur les navigateurs iOS. `refreshWallets()` ne met à jour que la liste des wallets découverts, et `selectWallet()` ne configure que le wallet actif. `connected` reste à false tant que `connect()` n'a pas réussi, même si l'extension expose des comptes déjà autorisés après un rafraîchissement de la page.

## Signature de messages

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
</script>
```

La signature de messages sert aux preuves de propriété de wallet ou aux défis d'authentification. Ce n'est pas de la signature de transaction et cela n'autorise aucun changement d'état on-chain. Les wallets qui n'exposent pas la signature de messages rapportent `canSignMessage` à false et `execute()` rejette avec une erreur de wallet non pris en charge.

## Signer, envoyer et confirmer une transaction

Utilisez `useSolanaSignAndSendTransaction()` depuis une action utilisateur côté client lorsque le wallet connecté doit signer et soumettre une transaction. Passez `confirm: true` lorsque l'UI doit attendre la confirmation au lieu de s'arrêter après la soumission de la signature.

```vue
<script setup lang="ts">
import type { SolanaTransaction } from "@vue-solana/nuxt/kit";

const { connected, canSignTransaction } = useSolanaWallet();
const { signature, confirmation, status, loading, error, execute } =
  useSolanaSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value && !loading.value);

async function submitTransaction(transaction: SolanaTransaction) {
  // Build the transaction message with @vue-solana/nuxt/kit and serialize it to wire bytes first.
  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed", timeoutMs: 120_000 },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Submitted: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to complete the transaction.</p>
  </section>
</template>
```

Le statut passe de `sending` à `sent` après la soumission RPC. Lorsque la confirmation est activée, il passe ensuite par `confirming` et se termine sur le commitment atteint, tel que `confirmed` ou `finalized`. Si la confirmation expire après la soumission, `signature` reste disponible afin que l'application puisse afficher un lien vers un explorateur ou interroger le statut de la signature avant de réessayer.

Les transactions envoyées côté client sont différentes : `useSolanaSendTransaction()` et `useSolanaSendTransactions()` utilisent l'exécuteur officiel d'envoi de plan RPC. L'exécuteur attend le commitment `confirmed` avant que `execute()` ne résolve, donc leur statut `sent` signifie que l'opération d'envoi et de confirmation côté client est terminée. Ils n'affichent aucune popup wallet ; installez un `payer` dans un plugin Vue client-only. N'essayez pas de configurer un `payerSecretKey` brut dans la configuration runtime publique de Nuxt.

Les prompts wallet doivent être déclenchés par une interaction utilisateur après l'hydratation. N'appelez pas `execute()` pendant le SSR, dans des routes serveur ou automatiquement au chargement de la page.

## Confirmer une signature existante

Utilisez `useSolanaTransactionConfirmation()` lorsque vous disposez déjà d'une signature et souhaitez un état de confirmation réactif.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { confirmation, status, error, confirm } = useSolanaTransactionConfirmation({
  commitment: "confirmed",
  timeoutMs: 60_000,
});

async function confirmCurrentSignature() {
  await confirm(signature.value);
}
</script>

<template>
  <section>
    <button type="button" @click="confirmCurrentSignature">Confirm signature</button>
    <p>Status: {{ status }}</p>
    <p v-if="confirmation">Reached {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to confirm the signature.</p>
  </section>
</template>
```

## Suivre le statut d'une signature

Utilisez `useSolanaSignatureStatus()` lorsque vous avez besoin de vérifications continues du statut d'une signature soumise. C'est utile après un timeout, car une transaction peut encore aboutir après que l'UI a cessé d'attendre.

```vue
<script setup lang="ts">
const signature = ref("PASTE_TRANSACTION_SIGNATURE");
const { status, loading, error, refresh, stopPolling } = useSolanaSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});

onBeforeUnmount(() => {
  stopPolling();
});
</script>
```

Pour les liens vers un explorateur, utilisez le cluster configuré. Les liens devnet doivent inclure `?cluster=devnet` ; `mainnet` comme l'alias historique `mainnet-beta` doivent omettre la query de cluster.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

## Application d'exemple

Pour un flux Nuxt complet et exécutable, consultez l'[exemple Nuxt](/fr/examples/nuxt).
