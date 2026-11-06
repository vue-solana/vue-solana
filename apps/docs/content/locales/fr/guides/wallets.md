---
title: "Wallets"
description: Découvrez les wallets, sélectionnez un wallet actif, connectez, déconnectez et vérifiez les capacités.
ogSection: Guides
surroundOrder: 8
---

Vue Solana expose les wallets d'extension de navigateur, les wallets Android Mobile Wallet Adapter et les liens de wallets de navigateur iOS pris en charge à travers un seul flux de wallet.

Utilisez `useWallets()` pour découvrir et sélectionner un wallet. Utilisez `useWallet()` pour connecter, déconnecter, lire la clé publique active et vérifier les capacités du wallet.

La prise en charge actuelle des wallets repose sur ces bibliothèques :

- Wallets d'extension de navigateur : `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features` et `@solana/wallet-standard-features`.
- Wallets natives mobiles Android : `@solana-mobile/wallet-standard-mobile`, qui enregistre Solana Mobile Wallet Adapter comme wallet Wallet Standard sur les runtimes Android Chrome mobile web et PWA pris en charge.
- Wallets de navigateur iOS : liens universels propres à chaque wallet pour Phantom, Solflare et Backpack.
- Primitives Solana et helpers de transaction : les types et constructeurs de messages de `@solana/kit`, réexportés intégralement via `@vue-solana/vue/kit`, `@vue-solana/nuxt/kit` et `@vue-solana/core/kit`.

## Sources de wallets

Les sources de wallets actuelles sont :

- Les wallets d'extension de navigateur via Solana Wallet Standard.
- Android Mobile Wallet Adapter via l'enregistrement Wallet Standard sur les clients Android Chrome pris en charge.
- Les liens de wallets de navigateur iOS pour les wallets pris en charge comme Phantom, Solflare et Backpack.

Toutes les sources apparaissent dans la même liste de wallets découverts. Les applications ne doivent pas construire de flux publics séparés pour les wallets de navigateur, Android et iOS, sauf si elles ont besoin de textes d'interface spécifiques à une plateforme.

## Matrice de prise en charge

| Chemin de wallet                         | Statut                                          | Comment il apparaît                                     | Notes                                                                          |
| ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Wallets d'extension de navigateur        | Pris en charge                                  | `platform: "browser"`, `source: "wallet-standard"`      | Utilise l'enregistrement Solana Wallet Standard.                               |
| Wallets natives mobiles Android          | Pris en charge sur Android Chrome et PWA Chrome | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | Enregistré via `@solana-mobile/wallet-standard-mobile`.                        |
| Wallets de navigateur iOS                | Pris en charge pour les liens configurés        | `platform: "mobile"`, `source: "deep-link"`             | Phantom, Solflare et Backpack sont exposés via des liens universels.           |
| Objets wallet manuels/personnalisés      | Pris en charge                                  | Wallet fourni par l'application                         | Doit implémenter l'interface `SolanaWallet`.                                   |
| Wallets d'applications natives de bureau | Pas encore pris en charge                       | Non exposé par défaut                                   | Des métadonnées `protocol-link` réservées existent pour de futurs adaptateurs. |

Ce qui fonctionne aujourd'hui :

- Découvrir des wallets de toutes les sources prises en charge dans une seule liste `wallets`.
- Sélectionner un wallet actif sans le connecter immédiatement.
- Conserver les métadonnées d'identité du wallet sélectionné pour des flux de reconnexion facultatifs.
- Connecter, déconnecter, signer des messages, signer des transactions et signer/envoyer des transactions lorsque le wallet sélectionné prend en charge ces capacités.
- Déconnecter tous les autres wallets découverts lorsqu'un wallet se connecte, afin qu'un seul wallet reste autorisé.
- Afficher une interface pour les capacités non prises en charge à partir de `canSignMessage`, `canSignTransaction`, `canSignAllTransactions` et `canSignAndSendTransaction`.

Ce qui n'est pas encore inclus :

- Une fenêtre modale de wallet ou un package d'interface intégré.
- Des adaptateurs protocol-link pour les wallets d'applications natives de bureau.
- Des invites de wallet côté serveur.
- La gestion des clés privées ou des phrases de récupération.

## Flux de wallet en Vue

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
  </section>
</template>
```

Sélectionner un wallet ne le connecte pas. Le wallet reste déconnecté jusqu'à ce que `connect()` se résolve avec succès.

Connecter un wallet déconnecte également tous les autres wallets découverts. Un seul wallet reste autorisé pour l'application à la fois, ce qui compte car une extension autorisée plus tôt par l'utilisateur peut continuer à répondre aux demandes de signature — c'est la cause habituelle du mauvais wallet qui demande une confirmation de `signMessage`.

## Flux de wallet en Nuxt

Nuxt auto-importe le même flux de wallet avec `useSolanaWallets()` et `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

Déclenchez les opérations de wallet côté client à partir d'actions utilisateur. Les invites de wallet ne doivent pas s'exécuter pendant le SSR.

## Vérification des capacités

Les wallets peuvent prendre en charge des fonctionnalités différentes. Vérifiez les capacités avant d'afficher les actions.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

Pour du code indépendant du framework, utilisez les assertions de wallet de `@vue-solana/core/wallet`.

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey);

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Connexion automatique

`autoConnect` reconnecte uniquement une identité de wallet que l'utilisateur a sélectionnée auparavant et qui est à nouveau découverte sur le client.

Un wallet que l'utilisateur a laissé connecté est restauré après un rechargement de la page, même lorsque `autoConnect` est désactivé. La restauration est une connexion silencieuse : le wallet ne fait que signaler une autorisation déjà accordée, il n'affiche donc jamais de demande et ne lance aucune application de wallet. Si le wallet n'autorise plus le site, il reste déconnecté. Un appel explicite à `disconnect()` oublie la session.

Vue Solana stocke uniquement les métadonnées d'identité du wallet sous `localStorage["vue-solana:selected-wallet"]` : `name`, `platform`/`source` lorsqu'ils sont disponibles, ainsi que `connected: true` tant que le wallet est connecté. Il ne stocke jamais de clés privées, de données de session ni de données de transaction.

Appelez `selectWallet(null)` lorsque les utilisateurs effacent explicitement la sélection de wallet. Appelez `setWallet(customWallet)` depuis `useWallet()` uniquement lorsque votre application possède un objet wallet personnalisé ; l'interface normale de l'application doit sélectionner via `useWallets()`.

Si le stockage local n'est pas disponible, la sélection de wallet fonctionne toujours pour la session de page en cours, mais la restauration persistée peut échouer avec une erreur normalisée `STORAGE_FAILURE`.

## Signature de messages pour l'authentification

La signature de messages prouve le contrôle du wallet pour une authentification off-chain. Elle n'autorise pas une transaction on-chain. Utilisez un texte de challenge clair et vérifiez-le sur votre backend.

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

Gardez les nonces à usage unique et de courte durée. N'utilisez pas les messages d'erreur bruts du wallet ou du RPC comme erreurs d'authentification affichées à l'utilisateur.

## Wallets mobiles

L'enregistrement d'Android Mobile Wallet Adapter est activé par défaut dans le plugin Vue et le module Nuxt sur les clients Android Chrome pris en charge.

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

Passez `mobileWallet: false` pour désactiver l'enregistrement d'Android Mobile Wallet Adapter.

Les liens de wallets iOS sont activés par défaut sur les navigateurs iOS. Passez les options `iosWallet` pour personnaliser l'identité de l'application, l'URL de redirection, les chains ou le cluster. Passez `iosWallet: false` pour désactiver la découverte des liens de wallets iOS.

Notes Android :

- L'enregistrement Android MWA est uniquement côté client et ne fait rien pendant le SSR.
- Il est censé fonctionner uniquement dans les navigateurs Android servis via un contexte sécurisé et prenant en charge le bridge mobile wallet adapter.
- Le passage de relais au wallet peut faire quitter le navigateur puis revenir à l'application ; conservez l'état de l'interface pour que les utilisateurs puissent voir la signature soumise après la redirection.
- Vue Solana adapte les wallets MWA vers la même interface `SolanaWallet` que les wallets d'extension.
- Le package mobile wallet gère l'interface de repli pour wallet non installé via son gestionnaire wallet-not-found par défaut.
- Les navigateurs peuvent afficher une invite Local Network Access unique avant que MWA puisse se connecter à une application wallet installée.
- Pour l'envoi de transactions Android MWA, Vue Solana demande au wallet mobile de signer, puis soumet la transaction signée via la connexion RPC de l'application lorsque le wallet prend en charge `signTransaction`. Cela garde la signature retournée sous le contrôle de l'application et évite un cas limite du passage de relais mobile où le wallet envoie correctement mais la page du navigateur ne reçoit pas la réponse du wallet adapter.

Notes iOS :

| Capacité                          | Comportement actuel                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Découverte                        | Les entrées Phantom, Solflare et Backpack peuvent apparaître sur les navigateurs iOS.                              |
| Connexion                         | Utilise des liens universels propres à chaque wallet et des callbacks de redirection.                              |
| Gestion de session                | Les applications doivent traiter l'état du callback avant de supposer qu'un wallet est connecté après redirection. |
| Transactions                      | La capacité dépend du lien de wallet et des données de session retournées.                                         |
| Applications natives Safari macOS | Non implémenté.                                                                                                    |

Si vous utilisez directement les helpers core iOS, appelez `handleSolanaIosWalletCallback()` tôt au démarrage du client afin que les données de redirection soient validées et déchiffrées avant que l'application ne lise l'état du wallet.

## Interface de wallet manuelle

Les intégrations de wallet personnalisées peuvent fournir un objet `SolanaWallet` directement via le plugin Vue ou `setWallet()`.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

Les objets wallet manuels ne doivent jamais exposer de clés privées à Vue Solana. Gardez la garde des clés à l'intérieur du provider de wallet.

## Helpers core directs

N'utilisez les helpers core directs que lorsque vous construisez votre propre couche d'intégration de wallets.

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

Si vous utilisez directement les helpers core iOS, appelez `handleSolanaIosWalletCallback()` avant de vous fier à une connexion de wallet iOS retournée après redirection.

## Notes de sécurité

- Ne demandez jamais de clés privées aux utilisateurs.
- Ne stockez jamais de sessions de wallet ni de données de transaction dans le stockage local.
- Considérez les noms, icônes et métadonnées des wallets comme des données d'affichage non fiables.
- Demandez une action explicite de l'utilisateur avant de signer des messages ou des transactions.
- Affichez une interface désactivée ou explicative pour les capacités non prises en charge au lieu de tenter des appels de wallet à l'aveugle.
- Gardez devnet comme valeur par défaut pour les exemples et les tutoriels ; utilisez `mainnet` uniquement lorsque de vrais fonds sont visés.

Références officielles :

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Documentation Solana](https://solana.com/docs)
