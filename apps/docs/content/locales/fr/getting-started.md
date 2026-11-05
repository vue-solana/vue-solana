---
title: Premiers pas
description: Installez les packages Vue Solana, configurez Vue ou Nuxt et testez les lectures RPC sur devnet.
ogSection: Premiers pas
surroundOrder: 2
---

Ce guide couvre l'installation des packages Vue Solana, la configuration de Vue ou Nuxt, le test des lectures RPC Solana, la connexion des wallets pris en charge, la signature de messages, l'envoi d'un transfert réel sur devnet et la vérification du résultat. Les exemples utilisent devnet par défaut pour des tests sans risque.

## Avant de commencer

Utilisez `@vue-solana/core` directement si vous avez besoin des primitives Solana sans intégration Vue/Nuxt. Le package s'appuie sur `@solana/kit` et réexporte `createSolanaClient()` ainsi que l'intégralité de `@solana/kit` depuis `@vue-solana/core/kit`. Utilisez `@vue-solana/vue` ou `@vue-solana/nuxt` lorsque vous souhaitez une intégration au framework.

Clusters pris en charge :

- `mainnet` : le cluster de production de Solana. Il s'agit du nom officiel du cluster mainnet de Solana.
- `devnet` : le meilleur choix par défaut pour le développement d'applications.
- `testnet` : réseau de test pour les validateurs et le protocole.
- `localnet` : validateur local.

Utilisez `devnet` pendant l'apprentissage et les tests. N'utilisez `mainnet` que lorsque vous êtes prêt à interagir avec de vrais SOL.

Prise en charge actuelle des wallets :

- Wallets d'extension de navigateur via les packages Solana Wallet Standard.
- Wallets mobiles natifs Android via `@solana-mobile/wallet-standard-mobile` sur Android Chrome et les PWA Chrome.
- Wallets de navigateur iOS pour Phantom, Solflare et Backpack via des liens universels propres à chaque wallet.
- Objets wallet manuels ou personnalisés qui implémentent `SolanaWallet`.

Prévu mais pas encore pris en charge :

- Wallets d'application native de bureau via des liens de protocole propres à chaque wallet ou un futur enregistrement natif Wallet Standard.

## Installer pour Vue

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Les applications Vue peuvent utiliser `@vue-solana/vue/kit` (`createSolanaClient`, `address`, `lamports` et les types) ainsi que `@vue-solana/vue/buffer-polyfill` sans installer directement les packages Solana de bas niveau ni Buffer. Utilisez `useSolanaClient()` de `@vue-solana/vue/useSolanaClient` pour le client injecté.

## Installer pour Nuxt

```sh
npx nuxt module add @vue-solana/nuxt
```

Cette commande installe le package et ajoute `@vue-solana/nuxt` au tableau `modules` dans `nuxt.config.ts`.

Les applications Nuxt peuvent utiliser `@vue-solana/nuxt/kit` et `@vue-solana/nuxt/buffer-polyfill` sans installer `@vue-solana/core`, `@vue-solana/vue`, ni les packages Solana de bas niveau et Buffer directement. Le `useSolanaClient()` auto-importé renvoie le client Kit injecté.

## Note sur la v3

La version v3.0.0 ne publie que de l'ESM — la condition d'export `require` et le champ `main` de premier niveau ont disparu de tous les packages `@vue-solana/*`. Les applications Nuxt et Vite empaquettent déjà de l'ESM et n'ont rien à changer ; un simple script Node qui fait `require()` d'un package Vue Solana doit passer à ESM. Les sous-chemins `kit` sont également devenus un miroir complet de `@solana/kit`, vous pouvez donc retirer `@solana/kit` de votre propre `package.json` si vous l'y aviez ajouté en v2. Consultez [Mise à niveau de la v2 vers la v3](/fr/guides/migration#migration--de-v2-à-v3) pour plus de détails.

## Note sur la v2

La version v2.0.0 a supprimé la surface historique `@solana/web3-compat`. Le contexte ne porte plus de `connection`, et les sous-chemins `@vue-solana/*/web3` ont été supprimés. Tous les composables sont pensés Kit d'abord, et `SolanaWallet.publicKey` est une simple chaîne base58 `Address`. Le shim `@solana/buffer/` décrit dans les anciennes docs v1 a disparu ; les shims conservés et propres au package ne couvrent que le sous-chemin navigateur `buffer/` utilisé par le polyfill Buffer. Consultez le [guide de migration vers Kit](/fr/guides/migration) pour la table complète avant/après.

## Configuration Vue

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
        },
      },
      iosWallet: {
        appIdentity: {
          name: "My Vue Solana App",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet` et `iosWallet` sont facultatifs. L'enregistrement d'Android Mobile Wallet Adapter et les liens iOS Phantom, Solflare et Backpack sont activés par défaut lorsque l'environnement d'exécution du navigateur le permet. Passez `mobileWallet: false` ou `iosWallet: false` pour désactiver l'une de ces sources.

Pour les composables Vue, privilégiez les imports directs par sous-chemin dans le nouveau code :

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
```

`useRpc()` renvoie l'état résolu du cluster et le `client` Kit injecté ; `useBalance()` lit via `client.rpc`. `useSolanaClient()` renvoie directement le même `client` et son `rpc` en lecture seule, ainsi que `address()`/`lamports()` depuis `@vue-solana/vue/kit`. Consultez le [guide de migration vers Kit](/fr/guides/migration) pour la table complète avant/après.

### Cycle de vie du client et du plugin

`createSolanaPlugin()` construit le client Kit une seule fois, pendant `install()`. Créez le plugin au niveau du module et réutilisez l'instance :

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Appeler `createSolanaPlugin()` à nouveau construit un nouveau client et un nouveau contexte, en abandonnant la sélection de wallet et l'état RPC existants. Si votre configuration est réactive — un basculement de cluster, par exemple — mémoïsez-la sur la configuration afin qu'un nouveau plugin (et un nouveau client) ne soit construit que lorsque la valeur change réellement, et non à chaque rendu :

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Un client Kit exécute ses plugins `createClient().use(...)` pendant sa construction. Lorsque l'un de ces plugins est asynchrone, le client — et tout contexte construit à partir de lui — ne s'active qu'après la résolution de cette promesse. Différez le vrai travail RPC et wallet vers des hooks de cycle de vie ou des actions utilisateur après l'hydratation plutôt que de l'exécuter pendant le setup ou le SSR.

## Configuration Nuxt

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "My Nuxt Solana App",
      },
    },
  },
});
```

Le module Nuxt installe le plugin d'exécution uniquement côté client et auto-importe les composables depuis les sous-chemins directs `@vue-solana/vue/*`. Les composables peuvent être appelés sans risque pendant le SSR, mais les vraies opérations RPC et wallet doivent s'exécuter après l'hydratation, par exemple depuis `onMounted()` ou des actions utilisateur. Les options `solana` de Nuxt vivent dans la configuration d'exécution publique, gardez-les donc sérialisables en JSON.

Les clients directs Vue et core acceptent `payer` et `payerSecretKey` pour les transactions envoyées par le client. `payerSecretKey` est une paire de clés Ed25519 de 64 octets encodée en base64, ne la placez donc jamais dans la configuration d'exécution publique de Nuxt et n'expédiez jamais une clé approvisionnée vers un navigateur. `ModuleOptions` de Nuxt omet volontairement ces deux champs ; installez donc un `payer` appartenant au client dans un plugin côté client avec `clientPlugin: false`, afin que le module n'installe pas un second plugin.

## Tester le RPC sans wallet

Les lectures RPC fonctionnent sans wallet de navigateur.

En Vue, utilisez `useRpc()` :

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, client } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const { value } = await client.rpc.getLatestBlockhash().send();
  latestBlockhash.value = value.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

Le nouveau code peut utiliser le client Kit à la place. `useSolanaClient()` n'a besoin d'aucun wallet et renvoie les mêmes informations typées pour l'API RPC Kit (les appels de lecture renvoient un `bigint`) :

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>

<template>
  <main>
    <p>Slot: {{ slot }}</p>
  </main>
</template>
```

Dans Nuxt, utilisez le `useSolanaRpc()` auto-importé :

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Latest blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Check RPC</button>
  </main>
</template>
```

Dans Nuxt, les mêmes lectures Kit proviennent du `useSolanaClient()` auto-importé :

```vue
<script setup lang="ts">
const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>
```

## Obtenir des SOL devnet ou testnet

Les SOL devnet et testnet sont des jetons de test sans valeur réelle.

Utilisez le faucet officiel :

```txt
https://faucet.solana.com
```

Choisissez `Devnet` en suivant ce guide. Ne choisissez `Testnet` que si vous testez sur le cluster testnet.

Si vous avez installé le CLI Solana, vous pouvez aussi exécuter :

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

N'utilisez jamais un wallet contenant de vrais fonds pendant les tests.

## Lancer les exemples

Pour lancer les applications d'exemple en local, clonez d'abord le dépôt Vue Solana :

```sh
git clone https://github.com/vue-solana/vue-solana.git
cd vue-solana
pnpm install
pnpm build:packages
```

Démarrez l'exemple Vue Vite :

`pnpm dev:vue`

Démarrez l'exemple Nuxt :

`pnpm dev:nuxt`

Les exemples illustrent la configuration du plugin/module, l'état RPC, les appels de connexion directs, les lectures de solde, la découverte unifiée des wallets, la sélection de wallet persistée, l'état du wallet, la signature de messages, l'état générique de transaction, les flux de transfert, les transactions envoyées par le client via le planificateur officiel Kit et l'exécuteur d'envoi de plan RPC, l'état de confirmation, les liens vers l'explorateur et l'interface des capacités non prises en charge. Ils utilisent devnet par défaut pour des tests sans risque.

## Connecter un wallet

Installez Phantom, Solflare, Backpack ou un autre wallet de navigateur Solana Wallet Standard. Basculez le wallet sur devnet avant de tester.

Sur Android Chrome ou une PWA Android Chrome, installez un wallet mobile Solana compatible tel que Phantom, Solflare ou Seed Vault Wallet. `Mobile Wallet Adapter` peut apparaître dans la même liste de wallets après `refreshWallets()`.

En Vue :

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

Dans Nuxt :

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

Sélectionnez un wallet dans `wallets`, puis appelez `connect()`. Sélectionner un wallet ne fait que configurer le wallet actif ; cela ne le connecte pas. Certaines extensions exposent des comptes déjà autorisés après un rechargement de page, mais Vue Solana maintient tout de même `connected` à false jusqu'à ce que `connect()` réussisse.

Lorsque `autoConnect` est activé, Vue Solana ne restaure que l'identité du wallet que l'utilisateur avait sélectionné précédemment, et uniquement après que ce wallet a été redécouvert côté client. Il stocke les métadonnées `name`, `platform` et `source` dans `localStorage`, pas les clés privées, les sessions ni les transactions.

La prise en charge des wallets de navigateur iOS repose sur des liens universels propres à chaque wallet, car la prise en charge web de Mobile Wallet Adapter est limitée à Android. Phantom, Solflare et Backpack apparaissent dans la même liste `useWallets()` sur les navigateurs iOS.

## Test manuel des wallets

Utilisez cette liste de vérification lorsque vous validez manuellement une extension de navigateur, un wallet Android MWA ou un wallet de navigateur iOS.

1. Configurez l'application pour `devnet` et vérifiez que l'interface affiche l'endpoint devnet.
2. Installez un wallet pris en charge et basculez le wallet lui-même sur devnet.
3. Approvisionnez le wallet en SOL devnet depuis `https://faucet.solana.com`.
4. Ouvrez l'application d'exemple et cliquez sur l'action de rafraîchissement des wallets.
5. Vérifiez que le wallet apparaît dans la liste unifiée des wallets avec la source attendue.
6. Sélectionnez le wallet et vérifiez que la sélection seule ne le connecte pas.
7. Cliquez sur connecter et approuvez l'invite du wallet.
8. Vérifiez que la clé publique et l'état `connected` se mettent à jour après la résolution de `connect()`.
9. Rechargez la page et vérifiez que l'identité du wallet précédemment sélectionné peut être restaurée sans sélection arbitraire de wallet.
10. Déconnectez et vérifiez que la clé publique et l'état connecté sont effacés.

Sources de wallet attendues :

| Plateforme                        | Source attendue         | Remarques                                                                                              |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Extension de navigateur de bureau | `wallet-standard`       | Phantom, Solflare, Backpack et d'autres wallets standard peuvent apparaître lorsqu'ils sont installés. |
| Android Chrome ou PWA Chrome      | `mobile-wallet-adapter` | Nécessite un wallet natif compatible et la prise en charge d'Android MWA dans le navigateur.           |
| Navigateur iOS                    | `deep-link`             | Les entrées Phantom, Solflare et Backpack utilisent des liens universels propres à chaque wallet.      |
| Application native de bureau      | Pas encore implémenté   | Les liens de protocole natifs de bureau ne sont pas encore pris en charge.                             |

## Signer un message

Utilisez la signature de messages pour les vérifications de propriété de wallet ou les défis d'authentification. Cela n'envoie pas de transaction et n'autorise aucun changement d'état on-chain.

En Vue :

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Dans Nuxt :

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Sign in to example.com"));
}
```

Affichez un bouton d'authentification désactivé lorsque `canSignMessage` est false. Certains wallets peuvent se connecter et signer des transactions sans prendre en charge la signature de messages arbitraires.

Pour les tests manuels, utilisez une chaîne de défi claire incluant votre domaine, un nonce et une date d'expiration. Ne demandez jamais aux utilisateurs de signer des messages vides ou ambigus.

```ts
const challenge = new TextEncoder().encode(
  "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

Après la signature, vérifiez que l'interface affiche les octets de signature renvoyés et ne traite pas la signature du message comme une transaction on-chain.

## Envoyer un transfert

Les exemples Vue et Nuxt incluent des champs d'adresse du destinataire et de montant pour un transfert réel. Ils utilisent devnet par défaut afin que vous puissiez tester avec des SOL sans valeur réelle. Pour mainnet, configurez `mainnet` ou un endpoint RPC mainnet et utilisez un wallet contenant de vrais SOL pour les frais.

Commencez par un montant minuscule comme `0.000001` SOL pendant les tests.

Les applications de navigateur qui créent ou sérialisent des transactions doivent initialiser le polyfill Buffer du package framework avant le code de transaction :

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

Le wallet vous demandera d'approuver la transaction. Après approbation, l'exemple affiche la signature de la transaction, l'état de confirmation et le lien vers l'explorateur. Sur Android Mobile Wallet Adapter, Vue Solana privilégie la signature par le wallet suivie d'une soumission RPC côté application lorsque c'est possible, ce qui rend la signature renvoyée plus fiable après le retour du wallet vers le navigateur.

Pour tester un transfert manuellement :

1. Gardez l'application et le wallet sur devnet.
2. Utilisez une adresse de destinataire que vous contrôlez ou un wallet devnet nouvellement généré.
3. Commencez par `0.000001` SOL.
4. Relisez l'invite du wallet avant d'approuver.
5. Après la soumission, attendez que l'exemple affiche l'état de confirmation.
6. Ouvrez le lien vers l'explorateur et vérifiez qu'il utilise la requête de cluster devnet.
7. Rafraîchissez les soldes de l'expéditeur et du destinataire.

Les URL d'explorateur doivent tenir compte du cluster :

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Si la confirmation expire après le renvoi d'une signature, ne resoumettez pas immédiatement. Vérifiez d'abord l'état de la signature ou l'explorateur ; la transaction peut encore se confirmer.

La démo d'envoi côté client utilise l'exécuteur officiel `rpcTransactionPlanSendingExecutor()` installé par le client par défaut. Connectez un wallet qui prend en charge `signTransaction`, approvisionnez le payer de démo là où l'exemple l'exige, et utilisez `useSolanaSendTransaction()` ou `useSolanaSendTransactions()`. L'exécuteur soumet la transaction et attend le niveau de confirmation `confirmed` avant que le composable ne signale `sent` ; il n'y a pas de popup d'envoi distinct du wallet. Dans Nuxt, créez tout payer de démo dans un plugin côté client plutôt que dans `nuxt.config.ts`, et définissez `clientPlugin: false` pour que le module ignore son propre plugin.

## Accepter des paiements avec Solana Pay

Vue Solana prend en charge nativement [Solana Pay](https://docs.solanapay.com/). Vous pouvez construire des URL de demande de transfert, générer des QR codes à scanner par les wallets et vérifier le règlement par référence.

```ts
import { address } from "@vue-solana/vue/kit";
import { encodeURL } from "@vue-solana/core/solana-pay";
import { createSolanaPayReference } from "@vue-solana/core/solana-pay-confirmation";

const reference = await createSolanaPayReference();
const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  reference,
  label: "My Store",
});
```

En Vue, utilisez `useSolanaPay()`, `useSolanaQrCode()` et `useSolanaQrScanner()` pour créer des demandes, générer des QR codes, scanner des demandes de paiement et confirmer des paiements. Consultez le [guide Solana Pay](/fr/guides/solana-pay) pour tous les détails.

## Vérification finale

Avant de vous appuyer sur un flux applicatif, vérifiez ces comportements sur devnet :

- Les lectures RPC fonctionnent sans wallet.
- La découverte de wallets n'affiche que les sources de wallet prises en charge pour la plateforme actuelle.
- La sélection et la connexion de wallet sont deux actions utilisateur distinctes.
- L'option `autoConnect` ne restaure que l'identité du wallet précédemment sélectionné.
- Les capacités de signature de messages ou de transactions non prises en charge sont désactivées dans l'interface.
- La signature de messages renvoie une signature sans soumettre de transaction on-chain.
- La soumission d'un transfert renvoie une signature et un état de confirmation.
- Les transactions envoyées par le client utilisent le planificateur officiel et l'exécuteur d'envoi de plan RPC, exigent un signer `payer` configuré et n'atteignent `sent` qu'après le niveau de confirmation `confirmed`.
- Les liens vers l'explorateur pointent vers le même cluster que l'application.
- `mainnet` n'est utilisé que lorsque vous configurez intentionnellement mainnet et comprenez que de vrais SOL sont en jeu.

## Pour aller plus loin

- [Solana pour les développeurs Vue](/fr/concepts/solana-for-vue-developers)
- [Clusters](/fr/concepts/clusters)
- [Wallets](/fr/guides/wallets)
- [Guide des transactions](/fr/guides/transactions)
- [Migration vers Kit](/fr/guides/migration)
- [Dépannage](/fr/troubleshooting)
- [Documentation Solana Kit](https://www.solanakit.com/) — guides, recettes et référence API officiels de Kit
- [Documentation Solana](https://solana.com/docs)
