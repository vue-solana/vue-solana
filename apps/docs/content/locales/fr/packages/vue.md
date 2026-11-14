---
title: "@vue-solana/vue"
description: Plugin Vue et composables pour les applications Solana.
ogSection: Packages
surroundOrder: 17
---

[`@vue-solana/vue`](https://www.npmjs.com/package/@vue-solana/vue) fournit un plugin Vue et des composables pour l'accès RPC à Solana, la lecture des soldes, l'état du wallet et l'état des helpers de transaction.

## Installation

```sh
pnpm add @vue-solana/vue
```

Le package est ESM uniquement. Les applications Vite empaquettent déjà de l'ESM et n'ont besoin d'aucun changement ; un `require("@vue-solana/vue")` en CommonJS échoue avec `No "exports" main defined`, donc transformez le module importateur en ESM, ou restez sur `@vue-solana/vue@^2`, qui fournit encore un build `.cjs`. Voir [Migration de v2 vers v3](/fr/guides/migration#migration--de-v2-à-v3).

Les applications navigateur qui créent ou sérialisent des transactions peuvent initialiser le polyfill Buffer depuis `@vue-solana/vue/buffer-polyfill`.

## Configuration du plugin

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "My Vue Solana App",
          uri: "https://example.com",
          icon: "favicon.ico",
        },
      },
    }),
  )
  .mount("#app");
```

L'enregistrement d'Android Mobile Wallet Adapter est activé par défaut sur les clients Android Chrome pris en charge. Passez des options `mobileWallet` pour personnaliser l'identité d'application MWA, ou passez `mobileWallet: false` pour désactiver l'enregistrement du wallet mobile Android.

Les liens de wallet de navigateur iOS sont activés par défaut sur les navigateurs iOS pour Phantom, Solflare et Backpack. Passez des options `iosWallet` pour personnaliser l'identité d'application, l'URL de redirection, les chaînes ou le cluster, ou passez `iosWallet: false` pour désactiver la découverte des liens de wallet iOS.

Vous pouvez également passer un endpoint RPC personnalisé :

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "mainnet",
    endpoint: "https://your-rpc.example.com",
    commitment: "confirmed",
  }),
);
```

Les clusters pris en charge sont `mainnet` (alias historique `mainnet-beta`), `devnet`, `testnet` et `localnet`. Utilisez `mainnet` pour le mainnet Solana ; c'est le nom officiel du cluster mainnet de Solana.

### Options du plugin

| Option           | Type                           | Défaut              | Description                                                                                                                                     |
| ---------------- | ------------------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `cluster`        | Solana cluster                 | `devnet`            | Cluster utilisé lorsque `endpoint` est omis. `mainnet-beta` est accepté comme alias historique de `mainnet`.                                    |
| `endpoint`       | `string`                       | Endpoint du cluster | Endpoint RPC HTTP.                                                                                                                              |
| `wsEndpoint`     | `string`                       | Endpoint dérivé     | Endpoint RPC WebSocket.                                                                                                                         |
| `commitment`     | Commitment                     | Défaut de Kit       | Commitment par défaut pour les appels RPC.                                                                                                      |
| `autoConnect`    | `boolean`                      | `false`             | Reconnecte uniquement un wallet découvert précédemment sélectionné.                                                                             |
| `payer`          | `TransactionSigner`            | Aucun               | Payeur de frais et signer du client pour les transactions envoyées par le client.                                                               |
| `payerSecretKey` | `string`                       | Aucun               | Keypair Ed25519 de 64 octets en base64, secret key en premier. Adresse dérivée à la création du client ; signing key importée au premier usage. |
| `wallet`         | `SolanaWallet`                 | Désactivé           | Adaptateur de wallet personnalisé.                                                                                                              |
| `mobileWallet`   | `MobileWalletOptions \| false` | Activé sur Android  | Options d'Android Mobile Wallet Adapter.                                                                                                        |
| `iosWallet`      | `iOSWalletOptions \| false`    | Activé sur iOS      | Options de liens universels de wallet iOS.                                                                                                      |

`payer` et `payerSecretKey` sont pris en charge par les clients Vue plugin/core directs. Une transaction envoyée par le client nécessite un `payer`. `payerSecretKey` dérive son adresse à la création du client à partir de la moitié publique non vérifiée, donc considérez `payer.address` comme non confirmée jusqu'à ce que la première signature réussisse, et un keypair qui ne correspond pas est rejeté à la première signature plutôt qu'à la création. La signature importe la clé via WebCrypto, que les navigateurs n'exposent que dans un contexte sécurisé (`https`, ou `http` sur `localhost`). Ne placez jamais un secret brut ou `payerSecretKey` dans la configuration runtime publique de Nuxt, et ne livrez jamais une clé de signature approvisionnée au navigateur d'un utilisateur final.

Le client par défaut créé par `createSolanaPlugin()` utilise la composition officielle `solanaRpc()` + `rpcAirdrop()` lorsqu'aucun `commitment` n'est configuré ; `solanaRpc()` installe lui-même le planner, l'exécuteur de signature de plan et l'exécuteur d'envoi de plan. Un `commitment` configuré construit la même pile explicitement afin que le commitment atteigne la couche RPC. L'ancien émetteur de repli personnalisé n'est pas utilisé. L'exécuteur d'envoi officiel attend le commitment `confirmed` avant que `execute()` ne se résolve et ne passe `status` à `sent`.

### Cycle de vie du client et du plugin

`createSolanaPlugin()` construit le client Kit une seule fois, pendant `install()`. Créez le plugin au niveau du module et réutilisez l'instance :

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Appeler `createSolanaPlugin()` à nouveau construit un nouveau client et un nouveau contexte, en abandonnant la sélection de wallet et l'état RPC existants. Si votre configuration est réactive — un basculement de cluster, par exemple — mémoïsez sur la configuration afin qu'un nouveau plugin (et un nouveau client) ne soit construit que lorsque la valeur change réellement, et non à chaque rendu :

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Libérez le plugin lorsque vous démontez votre application. `createSolanaPlugin()` démarre un abonnement de découverte Wallet Standard et un bootstrap différé ; `dispose()` arrête les deux afin qu'ils ne survivent pas à l'application :

```ts
export const solana = createSolanaPlugin({ cluster: "devnet" });
const app = createApp(App).use(solana);

app.unmount();
solana.dispose();
```

Il est sûr de l'appeler plusieurs fois et avant `use()`. Les applications Nuxt n'ont besoin d'aucun code : le plugin runtime du module le câble à `vueApp.onUnmount()`.

Un client Kit exécute ses plugins `createClient().use(...)` pendant la construction. Lorsque l'un de ces plugins est asynchrone, le client — et tout contexte construit à partir de lui — ne s'active qu'une fois cette promesse résolue. Différez le vrai travail RPC et wallet vers les hooks de cycle de vie du client ou les actions utilisateur après l'hydratation plutôt que de l'exécuter pendant le setup ou le SSR.

## Composables

L'export racine reste pris en charge. Pour les composables, préférez les imports directs par sous-chemin dans le nouveau code afin que les bundlers puissent éviter d'évaluer le code d'entrée non lié du package :

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useWallet } from "@vue-solana/vue/useWallet";
```

Sous-chemins directs du package :

- `@vue-solana/vue/buffer-polyfill`
- `@vue-solana/vue/useAction`
- `@vue-solana/vue/useAirdrop`
- `@vue-solana/vue/useRequest`
- `@vue-solana/vue/useSubscription`
- `@vue-solana/vue/useTrackedData`
- `@vue-solana/vue/useSignIn`
- `@vue-solana/vue/useSelectedWalletAccount`
- `@vue-solana/vue/useSignTransactions`
- `@vue-solana/vue/useSignAndSendTransactions`
- `@vue-solana/vue/useClientCapability`
- `@vue-solana/vue/usePayer`
- `@vue-solana/vue/useIdentity`
- `@vue-solana/vue/usePlanTransaction`
- `@vue-solana/vue/usePlanTransactions`
- `@vue-solana/vue/useSendTransaction`
- `@vue-solana/vue/useSendTransactions`
- `@vue-solana/vue/swr`
- `@vue-solana/vue/useSolana`
- `@vue-solana/vue/useSolanaClient`
- `@vue-solana/vue/useSolanaPay`
- `@vue-solana/vue/useSolanaPayConfirmation`
- `@vue-solana/vue/useSolanaQrCode`
- `@vue-solana/vue/useSolanaQrScanner`
- `@vue-solana/vue/useRpc`
- `@vue-solana/vue/useConnection`
- `@vue-solana/vue/useAccountInfo`
- `@vue-solana/vue/useBalance`
- `@vue-solana/vue/useProgramAccounts`
- `@vue-solana/vue/useWallet`
- `@vue-solana/vue/useWallets`
- `@vue-solana/vue/useTransaction`
- `@vue-solana/vue/useTransactionConfirmation`
- `@vue-solana/vue/useSignatureStatus`
- `@vue-solana/vue/useSignMessage`
- `@vue-solana/vue/useSignAndSendTransaction`
- `@vue-solana/vue/useTokenBalance`
- `@vue-solana/vue/useTokenAccounts`
- `@vue-solana/vue/kit`

Utilisez `@vue-solana/vue/buffer-polyfill` pour le code de transaction navigateur qui a besoin du polyfill Buffer. Importez `installSolanaBufferPolyfill()` comme import nommé et appelez-le ; un import à effet de bord seul tel que `import "@vue-solana/vue/buffer-polyfill"` n'installe rien, car chaque package `@vue-solana/*` est marqué `"sideEffects": false` et le sous-chemin n'exporte que la fonction. Utilisez `@vue-solana/vue/kit` pour l'API Kit — il réexporte l'intégralité de `@solana/kit`, donc vous n'installez jamais ce package vous-même. Les imports directs `@vue-solana/core/*` restent pris en charge pour un usage core de plus bas niveau.

- `useSolana()` : renvoie le contexte Solana injecté complet.
- `useSolanaClient()` : renvoie le `{ client, rpc }` Kit depuis le contexte. Recommandé pour le nouveau code.
- `useRpc()` : renvoie le cluster, l'endpoint, l'état de connexion, le dernier blockhash, le `client` Kit injecté et `checkConnection()`.
- `useConnection()` : renvoie le client Kit injecté (déprécié au profit de `useSolanaClient()`).
- `useAccountInfo(address, options?)` : charge les données de compte normalisées (executable, lamports, owner, space, octets de données).
- `useProgramAccounts(programId, options?)` : charge les comptes détenus par un program id avec des filtres et un découpage de données optionnels.
- `useWallet()` : renvoie les refs du wallet actif, l'état de connexion calculé et les actions du wallet.
- `useWallets()` : renvoie les wallets d'extension de navigateur découverts, les wallets Android Mobile Wallet Adapter, les entrées de wallet de navigateur iOS prises en charge et les actions de sélection de wallet.
- `useBalance(address, commitment?)` : charge le solde en lamports pour une adresse sous forme de chaîne.
- `useAirdrop()` : distribue des SOL sur un compte sur les réseaux de test et les validateurs locaux.
- `useTokenAccounts(owner, options?)` : charge tous les comptes de token SPL d'un owner, en interrogeant les programmes Token et Token-2022 par défaut.
- `useTokenBalance(mint, owner)` : charge le solde de token SPL et les décimales pour une paire mint/owner via le compte de token associé.
- `useTransaction(handler, options?)` : helper générique d'état de transaction asynchrone avec réglages de timeout optionnels.
- `useTransactionConfirmation(options?)` : confirme une signature soumise avec un état réactif et un état de timeout/erreur.
- `useSignatureStatus(signature, options?)` : lit, interroge ou s'abonne aux mises à jour du statut d'une signature.
- `useSignMessage()` : signe des messages d'authentification arbitraires via le wallet configuré lorsqu'il le prend en charge.
- `useSignAndSendTransaction()` : signe et envoie une transaction via le wallet configuré, avec attente de confirmation optionnelle.
- `useAction(handler)` : machine à états générique pour actions asynchrones avec abandon lors d'un nouvel envoi ; la base des composables de données.
- `useRequest(source, options?)` : requête asynchrone ponctuelle qui se relance lorsque sa source change, avec stale-while-revalidate.
- `useSubscription(source, options?)` : données live issues des abonnements RPC et d'autres sources de flux réactifs.
- `useTrackedData(source, options?)` : abonnement RPC amorcé par un fetch ponctuel, dédupliqué par slot.
- `useSignIn()` : déclenche la fonctionnalité Sign In With Solana (SIWS) d'un wallet.
- `useSolanaPay()` : construit et analyse les URL de requête de transfert Solana Pay et suit l'état de confirmation par référence.
- `useSolanaPayConfirmation()` : interroge périodiquement le statut de paiement d'une référence Solana Pay.
- `useSolanaQrCode()` : rend une URL Solana Pay sous forme de QR code SVG.
- `useSolanaQrScanner()` : scanne des QR codes Solana Pay via la caméra et `BarcodeDetector`.
- `useSelectedWalletAccount()` : lit le compte de wallet sélectionné à l'échelle de l'application depuis `SelectedWalletAccountProvider` (ou `provideSelectedWalletAccount()`).
- `useSignTransactions()` : signe plusieurs transactions sérialisées en une seule requête au wallet.
- `useSignAndSendTransactions()` : signe et envoie plusieurs transactions en une seule requête au wallet.
- `useClientCapability(capability)` : vérifie qu'une capacité est installée sur le client Kit, en échouant rapidement avec une erreur claire.
- `usePayer()` / `useIdentity()` : suivent de manière réactive le signer payeur de frais / identité agissante depuis le client Kit.
- `usePlanTransaction()` / `usePlanTransactions()` : planifient des messages de transaction à partir d'entrées d'instructions sans les envoyer.
- `useSendTransaction()` / `useSendTransactions()` : utilisent le planner Kit officiel et l'exécuteur d'envoi de plan RPC installés par `createSolanaClient()` ; ils planifient, signent, soumettent et attendent le commitment `confirmed` sans popup de wallet. Configurez `payer`.

## Guides associés

- [RPC et clusters](/fr/guides/rpc-and-clusters) : lisez l'état de connexion et configurez les endpoints.
- [Wallets](/fr/guides/wallets) : découvrez, sélectionnez, connectez, déconnectez et vérifiez les capacités du wallet.
- [Lectures de comptes](/fr/guides/account-reads) : lisez les soldes, les informations de compte, les comptes de programme et le statut de signature.
- [Transactions](/fr/guides/transactions) : signez, envoyez, confirmez et affichez la progression des transactions.
- [Signature de messages](/fr/guides/message-signing) : signez des challenges d'authentification ou de propriété hors chaîne.
- [Solana Pay](/fr/guides/solana-pay) : construisez des requêtes de paiement avec `useSolanaPay()` et affichez ou scannez des QR codes.
- [Tests E2E](/fr/guides/e2e-testing) : simulez RPC, abonnements RPC et wallets dans les tests Playwright.
- [Erreurs](/fr/guides/errors) : mappez les refs `error` des composables vers des messages d'interface sûrs.

## Lire l'état RPC

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, status, error, latestBlockhash, checkConnection } = useRpc();

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

## Utiliser le client Kit

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { client, rpc } = useSolanaClient();
const slot = ref<bigint>();

async function checkSlot() {
  slot.value = await rpc.getSlot().send();
}

onMounted(checkSlot);
</script>

<template>
  <section>
    <p>Slot: {{ slot }}</p>
    <button type="button" @click="checkSlot">Check Slot</button>
  </section>
</template>
```

`useSolanaClient()` renvoie le même contexte que `useSolana()` mais le façonne pour les lectures Kit : `client` est le client `@solana/kit` complet et `rpc` est son API de lecture. Les résultats RPC sont des `bigint` et les données de compte sont des `Uint8Array`. Voir [Migration vers Kit](/fr/guides/migration).

## Lire le solde

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

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
import { computed, ref } from "vue";
import { useTokenAccounts } from "@vue-solana/vue/useTokenAccounts";

const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { tokenAccounts, loading, error, refresh } = useTokenAccounts(owner);

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

`useTokenAccounts()` efface l'état sans appeler RPC lorsque l'owner est null. Passez `programId` dans les options pour limiter les résultats à un seul programme de token.

## Lire le solde de token

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useTokenBalance } from "@vue-solana/vue/useTokenBalance";

const mint = ref("PASTE_A_MINT_ADDRESS");
const owner = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, decimals, loading, error, refresh } = useTokenBalance(mint, owner);

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

`useTokenBalance()` renvoie `null` pour le solde et les décimales lorsque le compte de token associé n'existe pas, sans le traiter comme une erreur. Ses `balance` et `decimals` sont des refs calculées en lecture seule dérivées d'une seule lecture — lisez-les, ne leur assignez pas de valeur.

## Sémantique des composables de lecture

`useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()` et `useTokenBalance()` partagent une même machine à états. Deux de ses règles surprennent les personnes venant de la v2 :

- **`refresh()` rejette en cas d'échec** au lieu de se résoudre, et se résout avec `null` lorsqu'une entrée est vide. Un `await refresh()` sans `try`/`catch` lève une exception. Le câbler directement à `@click` fonctionne — Vue absorbe le rejet — mais les appelants écrits à la main doivent le gérer. `useRequest()` fait exception et se résout toujours avec le résultat de la tentative.
- **Les données reviennent à leur valeur vide lorsqu'une lecture échoue.** Le dernier solde réussi ne persiste pas à côté d'une nouvelle `error`, car une valeur obsolète à côté d'une erreur se lit comme des données actuelles alors qu'elle ne le sont pas. Branchez sur `error` pour choisir ce qu'il faut rendre.

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="balanceErrorMessage" />
  <p v-else-if="loading">Loading…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

Une adresse non analysable rapporte `INVALID_ADDRESS` dans `error` et n'atteint jamais le RPC. Voir [Lectures de comptes](/fr/guides/account-reads#sémantique-de-rafraîchissement-et-derreur).

## Gestion des erreurs

Les refs `error` des composables utilisent `SolanaError | null` depuis `@vue-solana/core/errors`. Branchez sur `error.value.code` pour l'interface utilisateur et conservez `error.value.cause` pour déboguer les échecs d'origine liés au wallet, au RPC, à l'analyse d'adresse, au timeout ou au stockage.

```ts
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

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
```

La ref `error` du contexte injecté derrière `useSolana()` et `useRpc()` est partagée avec le travail de démarrage du wallet : l'enregistrement du wallet mobile, l'auto-connexion du wallet persisté et le traitement du callback iOS y écrivent `WALLET_FAILURE` (ou `USER_REJECTED` lorsque le wallet signale un rejet). Le prochain `checkConnection()` ou un `connect()` réussi l'efface. Ces chemins de wallet écrivent dans `console.error` avec un préfixe `[Vue Solana]` uniquement en développement.

## Lire les informations de compte

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh, stopWatching } = useAccountInfo(address, {
  commitment: "confirmed",
  watch: true,
});

const accountInfoErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load account data from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ accountInfo?.lamports ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="accountInfoErrorMessage">{{ accountInfoErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
    <button type="button" @click="stopWatching">Stop watching</button>
  </section>
</template>
```

`useAccountInfo()` efface l'état sans appeler RPC lorsque l'adresse est null. Les chaînes d'adresse invalides effacent l'`accountInfo` obsolète, définissent `error` et n'appellent pas `getAccountInfo()`. Lorsque `watch: true` est activé, l'écouteur websocket est supprimé automatiquement au démontage du composant. Appeler `stopWatching()` supprime l'écouteur actuel et empêche les redémarrages automatiques pour cette instance de composable.

## Lire les comptes de programme

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");
const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});

const programAccountsErrorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana program id.";
    case "RPC_FAILURE":
      return "Unable to load program accounts from RPC.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Accounts: {{ accounts.length }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="programAccountsErrorMessage">{{ programAccountsErrorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

`useProgramAccounts()` efface l'état sans appeler RPC lorsque le program id est null. Les chaînes de program id invalides effacent les `accounts` obsolètes, définissent `error` et n'appellent pas `getProgramAccounts()`.

> Avertissement : `useProgramAccounts()` peut être coûteux. Chaque rafraîchissement peut parcourir un large ensemble de comptes détenus par un programme, consommer beaucoup de crédits RPC, atteindre les limites de débit du provider ou expirer. N'exécutez pas de scans larges depuis des chemins d'interface à fort trafic. Utilisez des filtres étroits, `dataSlice`, la mise en cache, l'indexation, des stratégies de pagination ou une infrastructure RPC dédiée pour les lectures de production.

## État du wallet

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
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
    <p v-if="connecting">Connecting...</p>
    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Les wallets d'extension de navigateur sont découverts via le Solana Wallet Standard. Les wallets Android Mobile Wallet Adapter sont enregistrés via `@solana-mobile/wallet-standard-mobile` et exposés dans la même liste `useWallets()` sur les clients Android Chrome pris en charge. Les entrées iOS Phantom, Solflare et Backpack sont exposées via des liens universels spécifiques au wallet sur les navigateurs iOS. `refreshWallets()` ne met à jour que la liste des wallets découverts, et `selectWallet()` ne configure que le wallet actif. `connected` reste false jusqu'à ce que `connect()` réussisse, même si l'extension expose des comptes précédemment autorisés après un rafraîchissement de page. Un `connect()` réussi déconnecte aussi tous les autres wallets découverts via leur fonctionnalité `standard:disconnect`, afin qu'un seul wallet reste autorisé pour l'application.

Les adaptateurs de wallet d'application native de bureau ne sont pas encore implémentés. Le support natif de bureau nécessite des liens de protocole spécifiques au wallet ou un futur enregistrement natif Wallet Standard.

Les composables renvoient un état inerte et compatible SSR lorsqu'aucun contexte de plugin n'est disponible. Les vraies opérations RPC et wallet nécessitent toujours le contexte client fourni par le plugin.

## Signature de messages

```ts
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

if (connected.value && canSignMessage.value) {
  await execute(new TextEncoder().encode("Sign in to example.com"));
}
```

La signature de messages sert aux challenges de propriété de wallet ou d'authentification. Ce n'est pas de la signature de transaction et cela n'autorise pas de changements d'état on-chain. Les wallets qui n'exposent pas la signature de messages rapportent `canSignMessage` à false et `execute()` rejette avec une erreur de wallet non pris en charge.

## Sign In With Solana

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signInResult, status, loading, error, signIn } = useSignIn();

async function handleSignIn() {
  const { account, signedMessage, signature } = await signIn({
    statement: "Sign in to My App",
    // Generate the nonce server-side and verify it on the server.
    nonce: await fetchNonceFromBackend(),
  });

  // Send { account.address, signature, signedMessage } to your backend for
  // verification before creating a session.
}
```

Le wallet doit prendre en charge la fonctionnalité SIWS (`canSignIn` est false sinon, et `signIn()` rejette avec une erreur `WALLET_FEATURE_UNSUPPORTED`). La connexion utilise le compte actuellement sélectionné du wallet ; si aucun wallet n'est connecté, `signIn()` rejette avec une erreur `WALLET_NOT_CONNECTED` — connectez-vous d'abord, le composable ne le fait pas pour vous.

### Vérifier la signature sur votre serveur

Le wallet renvoie une signature sur `signedMessage` — le message SIWS auquel l'utilisateur a consenti. Faire confiance au résultat sans vérification permettrait à un client malveillant de forger une identité, donc vérifiez côté serveur avant d'émettre une session :

1. **Vérifiez le message** : décodez `signedMessage` et confirmez que le domaine correspond à votre origine, que l'`uri` est le vôtre, que le `nonce` correspond à celui émis par votre serveur pour cette session et que la déclaration et les ressources correspondent à ce que vous attendez.
2. **Vérifiez la signature** : la signature est une signature Ed25519 des octets du message SIWS. Vérifiez-la avec `tweetnacl` (`nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`) ou toute bibliothèque Ed25519, contre la `publicKey` du compte issue du résultat de connexion.
3. **Liez la session** : ne créez la session qu'après la vérification du message et de la signature — en la rattachant à `account.address`.

Le serveur doit redériver le message attendu à partir du nonce qu'il a émis (ou valider chaque champ du message reçu) afin que les nonces expirés ou rejoués soient rejetés.

Avant que `signMessage()` ou `signIn()` ne se résolve, l'adaptateur vérifie aussi la signature renvoyée contre la `publicKey` du compte lorsque Ed25519 (WebCrypto) est disponible, en rejetant avec `INVALID_SIGNATURE` en cas de non-correspondance. C'est une protection côté client au mieux contre un wallet défaillant — elle est ignorée là où Ed25519 n'est pas disponible, donc c'est la vérification côté serveur ci-dessus qui authentifie réellement l'utilisateur.

## Composables de récupération de données

`useRequest`, `useSubscription` et `useTrackedData` forment la couche de données de style SWR, construite sur les primitives de store réactif de Kit :

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useTrackedData } from "@vue-solana/vue/useTrackedData";
import { address } from "@vue-solana/vue/kit";

const { rpc, rpcSubscriptions } = useSolanaClient().client;
const someAddress = address("...");

const { data, status, refresh } = useTrackedData({
  rpcRequest: rpc.getBalance(someAddress),
  rpcValueMapper: (lamports) => lamports,
  rpcSubscriptionRequest: rpcSubscriptions.accountNotifications(someAddress),
  rpcSubscriptionValueMapper: ({ lamports }) => lamports,
});

// data.value is a SolanaRpcResponse envelope: data.value.value and
// data.value.context.slot.
```

- `useRequest` se relance lorsqu'une source ref/computed change d'identité ; passer `null` le désactive (statut `disabled`).
- `useSubscription` conserve la valeur obsolète pendant la reconnexion ; `reconnect()` rouvre le flux.
- `useTrackedData` déduplique par slot le fetch et l'abonnement afin que les arrivées hors ordre ne puissent pas faire régresser la valeur.

Les callbacks `rpcValueMapper` et `rpcSubscriptionValueMapper` reçoivent la valeur de réponse **déballée** (`value.lamports` pour un solde), tandis que la ref `data` renvoyée conserve l'enveloppe `SolanaRpcResponse` complète pour que vous puissiez lire `data.value?.context.slot`.

### Requêtes ponctuelles avec `useRequest`

`useRequest` est la requête SWR généraliste. Elle accepte une fonction de requête, un objet de requête Kit (tout ce qui possède `send()`), ou une `ref`/`computed` de l'un ou l'autre, ou `null` pour désactiver :

```ts
import { computed } from "vue";
import { useRequest } from "@vue-solana/vue/useRequest";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const someAddress = ref("...");

const { data, error, status, refresh } = useRequest(
  computed(() => (someAddress.value ? rpc.getBalance(someAddress.value) : null)),
  {
    // Optional per-attempt cancellation composed with the internal signal.
    getAbortSignal: () => AbortSignal.timeout(5_000),
  },
);

// data.value is the raw response value; status is
// "fetching" | "success" | "error" | "disabled".
```

Pendant une revalidation, les précédentes `data` et `error` restent renseignées, afin que l'interface continue de s'afficher. `refresh()` se relance manuellement et se résout avec le résultat de la tentative.

### Flux avec `useSubscription`

`useSubscription` consomme toute source de flux réactif Kit (typée par duck-typing sur `reactiveStore()`), démonte la connexion au démontage et prend en charge la reconnexion manuelle avec stale-while-revalidate :

```ts
import { useSubscription } from "@vue-solana/vue/useSubscription";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpcSubscriptions } = useSolanaClient().client;

const { data, error, status, reconnect } = useSubscription(
  computed(() => (someAddress.value ? rpcSubscriptions.slotNotifications() : null)),
  { onError: (cause) => console.error(cause) },
);

// Status is "loading" | "loaded" | "error" | "disabled".
// reconnect() re-opens the stream while data keeps the last known value.
```

Les erreurs préservent la dernière `data` connue ; une source `null` désactive l'abonnement et efface l'état.

### Mise en cache entre les montages

```ts
import {
  useRequestSwr,
  useSubscriptionSwr,
  useTrackedDataSwr,
  clearSwrCache,
} from "@vue-solana/vue/swr";

const balance = useRequestSwr(`balance:${someAddress}`, rpc.getBalance(someAddress));
```

Les composants montés avec la même clé sont amorcés à partir de la dernière valeur connue pendant que leur propre requête se revalide. Il n'y a pas d'adaptateur `useAction` — les actions sont des mutations, pas des lectures cachables ; utilisez l'API de mutation de votre couche de données (ou `useAction` lui-même).

Détails du comportement du cache :

- Les clés sont préfixées par adaptateur (`request:`, `subscription:`, `tracked:`), donc la même clé est sûre d'un adaptateur à l'autre.
- Une source `null`/`undefined` désactive le composable et **efface** l'entrée en cache de cette clé — y compris lorsqu'un composant est monté avec sa source déjà désactivée.
- `useTrackedDataSwr` met en cache l'enveloppe `SolanaRpcResponse` complète, afin que les composants remontés restaurent à la fois la valeur et son contexte de slot.
- Le cache est une `Map` au niveau du module. Sur le serveur, préfixez les clés par requête ou appelez `clearSwrCache()` entre les requêtes pour éviter toute fuite entre requêtes.
- `deleteSwrKey(key)` évince une entrée via sa clé de cache **complète**, préfixe d'adaptateur inclus (`deleteSwrKey("request:balance")`, pas `"balance"`). Utilisez-la lorsqu'une seule valeur obsolète doit disparaître ; `clearSwrCache()` vide toujours tout.
- Le cache contient au maximum 1024 entrées et évince d'abord l'écriture la plus ancienne. Réécrire une clé existante (un remontage ou un résultat revalidé) rafraîchit sa position, afin que les clés activement utilisées ne soient pas évincées alors que les clés inactives le sont.

Pour une démonstration exécutable des cinq composables (y compris le comportement de remontage SWR) contre devnet, voir les Live Data Panels dans l'[exemple Vue Vite](/fr/examples/vue-vite).

## État de transaction

```ts
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";

const { signature, confirmation, status, loading, error, execute } = useSignAndSendTransaction();

await execute(transaction, {
  confirm: true,
  confirmation: { commitment: "confirmed" },
  skipPreflight: false,
});
```

Le wallet actuel doit être connecté et prendre en charge `signAndSendTransaction` ou `signTransaction`. Les wallets Android Mobile Wallet Adapter préfèrent `signTransaction` plus une soumission RPC côté application lorsqu'elle est disponible. Cela évite un cas limite de transfert mobile où le wallet envoie avec succès mais la page du navigateur ne reçoit pas la signature renvoyée par l'adaptateur du wallet.

Sans `confirm: true`, `execute()` revient après la soumission et passe `status` à `sent`. Avec la confirmation activée, le statut passe par `sending`, `confirming`, puis `processed`, `confirmed` ou `finalized` pour correspondre au commitment demandé. Si la confirmation expire ou échoue, la `signature` soumise reste disponible afin que l'application puisse créer un lien vers un explorateur.

`useSignAndSendTransaction()` efface aussi `loading` si un adaptateur de wallet ne renvoie jamais de résultat. Dans ce cas de blocage, `error` est défini et le statut on-chain peut être inconnu, donc vérifiez le wallet connecté ou un explorateur avant de réessayer.

### Entrées et retours des requêtes de wallet

Les flux de signature de wallet acceptent une transaction en entrée sous forme d'octets wire `Uint8Array` bruts conformes au schéma de transaction Solana. Construisez-les avec les helpers Kit de `@vue-solana/vue/kit` (ou décodez-les à partir d'une réponse RPC base64/base58) ; les chaînes base64, les objets de transaction et les listes d'instructions ne sont pas acceptés ici.

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` prend les octets bruts du message à signer. Chaque requête d'envoi au wallet accepte aussi les `SendTransactionOptions` de Kit :

| Option                | Description                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Ignore la simulation preflight avant l'envoi.                                                                       |
| `maxRetries`          | Nombre de tentatives du nœud RPC (`bigint`).                                                                        |
| `minContextSlot`      | Slot auquel tout blockhash ou nonce de la transaction est connu pour exister ; un envoi antérieur peut être rejeté. |
| `preflightCommitment` | Commitment utilisé pour la simulation preflight.                                                                    |

Formes de retour :

- `useSignMessage().execute(bytes)` se résout en `{ signedMessage, signature }`, tous deux des `Uint8Array`.
- `useSignTransactions().execute(transactions)` se résout en `Uint8Array[]` signés (aussi exposé comme `signedTransactions`) ; passez un tableau d'un seul élément pour une transaction.
- `useSignAndSendTransaction().execute(transaction)` se résout en la chaîne `signature` soumise ; avec `confirm: true`, elle remplit aussi `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` se résout en un `string[]` de signatures (aussi exposé comme `signatures`).

Un wallet peut modifier le message ou la transaction avant de signer — par exemple pour ajouter sa propre instruction ou changer le payeur de frais — et le Wallet Standard l'autorise explicitement. Relisez le `signedMessage` renvoyé ou les octets de transaction signés au lieu de supposer qu'ils correspondent octet pour octet à votre entrée.

### Transactions envoyées par le client

`useSendTransaction()` et `useSendTransactions()` utilisent la capacité d'envoi de transaction du client plutôt que le wallet connecté. `createSolanaClient()` et `createSolanaPlugin()` installent la pile officielle `solanaRpc()` par défaut, et `solanaRpc()` installe lui-même le planner ainsi que les exécuteurs de signature et d'envoi de plan, donc ces composables n'ont besoin ni d'un repli personnalisé ni d'une seconde installation manuelle de plugin.

L'exécuteur lit un blockhash frais, estime ou respecte les limites de ressources, effectue une simulation preflight sauf configuration contraire, signe avec les signers du client, soumet via RPC et attend le commitment `confirmed`. `status` passe de `sending` à `sent` seulement une fois cette opération d'envoi et confirmation terminée. Un résultat unique expose `data.context.signature` ; un résultat par lot contient l'arbre de résultat du plan. Il n'y a pas de popup de wallet, donc n'utilisez ce chemin que lorsque le client possède un signer approprié.

Configurez un `payer` directement dans un client Vue/core avec `payer` ou `payerSecretKey` ; un client sans payer ne peut ni planifier ni envoyer. Un serveur ou un relayer doit posséder les clés de production approvisionnées. Ne placez pas un secret brut ou `payerSecretKey` dans la configuration runtime publique de Nuxt, et ne livrez pas un keypair approvisionné au navigateur d'un utilisateur final.

Les composables de wallet restent distincts : `useSignAndSendTransaction()` peut revenir après la soumission RPC, ou attendre un commitment choisi lorsque `confirm: true` est passé. Les transactions envoyées par le client utilisent toujours le comportement d'envoi et confirmation `confirmed` de l'exécuteur officiel.

## Transactions par lot

```ts
import { useSignTransactions } from "@vue-solana/vue/useSignTransactions";
import { useSignAndSendTransactions } from "@vue-solana/vue/useSignAndSendTransactions";

const { signedTransactions, execute: signMany } = useSignTransactions();
const { signatures, execute: signAndSendMany } = useSignAndSendTransactions();

// One wallet request for N transactions.
const signed = await signMany([transactionA, transactionB]);

// One wallet request for N signatures.
const sent = await signAndSendMany([transactionA, transactionB], { minContextSlot });
```

Les deux préfèrent la capacité de lot du wallet. `useSignTransactions` retombe sur la fonctionnalité historique de lot `signAllTransactions` ; `useSignAndSendTransactions` retombe sur l'envoi de la requête singulière en séquence. La signature par lot est tout ou rien (un rejet ne signe rien), mais le repli de signature et envoi peut laisser des transactions antérieures soumises. Lorsque cela arrive, il rejette avec une `PartialSignAndSendError` dont `signatures` liste les transactions déjà envoyées, afin qu'une nouvelle tentative puisse les ignorer :

```ts
import { PartialSignAndSendError } from "@vue-solana/vue/useSignAndSendTransactions";

try {
  await signAndSendMany([transactionA, transactionB]);
} catch (error) {
  if (error instanceof PartialSignAndSendError) {
    // error.signatures: the ones that already landed — resend only the rest.
  }
}
```

## Compte de wallet sélectionné

Pour un état de compte sélectionné à l'échelle de l'application avec persistance et filtrage, montez le provider une fois près de la racine et lisez-le n'importe où :

```vue
<script setup lang="ts">
import { SelectedWalletAccountProvider } from "@vue-solana/vue/useSelectedWalletAccount";
</script>

<template>
  <SelectedWalletAccountProvider :filter-wallet="filter">
    <RouterView />
  </SelectedWalletAccountProvider>
</template>
```

```ts
import { useSelectedWalletAccount } from "@vue-solana/vue/useSelectedWalletAccount";

const [selectedAccount, setSelectedAccount, filteredWallets] = useSelectedWalletAccount();
```

La sélection persiste sous la forme `${walletName}:${accountAddress}` dans `localStorage` par défaut (passez `stateSync` pour personnaliser ou `null` pour désactiver) et est restaurée à la visite suivante lorsque le wallet et le compte sont disponibles. `filterWallet` restreint les comptes de wallet proposés. Dans Nuxt, le plugin runtime du module installe ce contexte automatiquement.

## Capacités du client et planification

```ts
import { usePayer, useIdentity } from "@vue-solana/vue/usePayer";
import { usePlanTransaction } from "@vue-solana/vue/usePlanTransaction";

// Reactive signers from the Kit client (requires a signer plugin).
const payer = usePayer();
const identity = useIdentity();

// Plan transaction messages from instructions without sending.
const { transactionMessage, execute } = usePlanTransaction();
const message = await execute(instructions);
```

`useClientCapability("payer")` vérifie qu'une capacité est installée sur le client et lève une erreur descriptive (nommant le hook et la façon de l'installer) pendant le setup lorsqu'elle manque. L'erreur est une `MissingClientCapabilityError` — une sous-classe de `SolanaError` dont le `code` est `MISSING_CLIENT_CAPABILITY` —, donc `isSolanaError()` la restreint comme n'importe quelle autre erreur du paquet. Le client Vue par défaut reçoit déjà le planner et les exécuteurs de signature et d'envoi de plan depuis `solanaRpc()` ; un client construit à la main (par exemple avec `createClient()` et seulement `rpcTransactionPlanner()`) doit installer `rpcTransactionPlanSendingExecutor()` et un plugin de signer lui-même. Le même code remonte de `usePlanTransaction()` / `useSendTransaction()` lorsque la capacité disparaît après le setup.

## Confirmer une signature existante

Utilisez `useTransactionConfirmation()` lorsque votre application dispose déjà d'une signature soumise et souhaite attendre un commitment spécifique indépendamment de la signature et de l'envoi :

```ts
import { useTransactionConfirmation } from "@vue-solana/vue/useTransactionConfirmation";

const { signature, confirmation, status, loading, error, confirm, reset } =
  useTransactionConfirmation({ commitment: "confirmed", timeoutMs: 60_000 });

await confirm("PASTE_SUBMITTED_SIGNATURE", { commitment: "finalized" });
```

Le composable préserve la `signature` soumise lorsque la confirmation expire ou que l'appel RPC échoue, afin que les applications puissent encore afficher un lien vers un explorateur tout en présentant `error` à l'utilisateur. Les options sont transmises à `confirmTransactionSignature()` : `commitment`, `timeoutMs`, `pollIntervalMs`, `abortSignal` et `searchTransactionHistory`. Une transaction échouée présente `TRANSACTION_FAILED`, une signature qui n'apparaît jamais présente `TRANSACTION_NOT_FOUND` et une attente épuisée présente `TRANSACTION_TIMEOUT`. Comme la ref `error` de ce composable est toujours une `SolanaError`, annuler une confirmation normalise la raison d'abandon en `RPC_FAILURE` avec la raison d'origine sur `error.cause` ; appelez `confirmTransactionSignature()` directement lorsque vous avez besoin de la raison d'abandon brute.

## Suivre le statut d'une signature

```ts
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const { status, loading, error, refresh, stopPolling } = useSignatureStatus(
  "PASTE_SUBMITTED_SIGNATURE",
  {
    pollIntervalMs: 5_000,
    searchTransactionHistory: true,
  },
);
```

Il n'y a pas d'option `commitment` par appel : `getSignatureStatuses()` n'en accepte aucune, donc les lectures utilisent le commitment intégré à l'endpoint. Définissez-le sur l'endpoint ou sur `createSolanaPlugin()`. Pour un commitment par appel, utilisez `useTransactionConfirmation()`.

L'interrogation utilise `getSignatureStatuses()` sur un `setTimeout` chaîné, donc un RPC lent retarde le tick suivant mais ne se chevauche jamais. Appeler `stopPolling()` efface le minuteur actuel et empêche les ticks automatiques suivants — jusqu'à ce que la signature surveillée change, ce qui redémarre l'interrogation pour la nouvelle signature. Les signatures invalides effacent le `status` obsolète, définissent `error` et n'appellent ni RPC ni interrogation. Les valeurs `pollIntervalMs` invalides inférieures ou égales à `0` définissent une `SolanaError` `INVALID_INPUT` (le même code que celui utilisé par core pour des options malformées) et ne démarrent pas l'interrogation.

## Application d'exemple

Pour un flux Vue et Vite complet et exécutable, voir l'[exemple Vue Vite](/fr/examples/vue-vite).
