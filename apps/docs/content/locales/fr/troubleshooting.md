---
title: Dépannage
description: Problèmes courants de configuration, TypeScript, wallet, RPC et Nuxt.
ogSection: Assistance
surroundOrder: 4
---

Utilisez ce guide pour diagnostiquer les problèmes de configuration les plus courants de Vue Solana, qu'il s'agisse de Vue, Nuxt, TypeScript, de la découverte des wallets, des appels RPC ou des transactions. Commencez par le message d'erreur ou le comportement qui correspond à votre app, puis suivez les vérifications dans l'ordre avant d'ouvrir un ticket.

## Impossible de résoudre `@solana/web3-compat`

La version 2.0.0 a supprimé `@solana/web3-compat` de tous les packages Vue Solana, donc une erreur de déclaration manquante sur ce package signifie presque toujours que votre app importe encore depuis la surface legacy supprimée : `@vue-solana/core/web3`, `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3`, ou une dépendance directe à `@solana/web3-compat`.

Mettez à jour ces imports vers les équivalents Kit — consultez le [guide de migration Kit](/fr/guides/migration). Si vous utilisez encore un package v1.x, les packages v1 fournissaient des shims de déclaration intégrés pour les imports core documentés, et les apps en v1 pouvaient ajouter leur propre shim `@solana/web3-compat` uniquement en important le package directement. Passer à `@vue-solana/*@^2` supprime le besoin de tout shim.

## `ERR_PACKAGE_PATH_NOT_EXPORTED` lors d'un `require` d'un package

La v3 publie uniquement en ESM : la condition d'export `require` et le champ `main` de premier niveau ont été supprimés. Un `require("@vue-solana/core")` en CommonJS échoue donc avec `No "exports" main defined`, et le require d'un sous-chemin échoue avec `Package subpath './kit' is not defined by "exports"`.

Rendez le module importateur ESM. Ajoutez `"type": "module"` à votre `package.json`, ou renommez le fichier en `.mjs` :

```js
import { createSolanaClient } from "@vue-solana/core/kit";
```

Les apps Nuxt et Vite regroupent déjà l'ESM et ne sont pas concernées. Si vous ne pouvez pas quitter CommonJS, épinglez `@vue-solana/*` sur `^2`, qui fournit encore une build `.cjs`.

## `Vue Solana plugin is not installed`

Cela signifie que du code côté client a tenté d'utiliser le client Solana ou des actions de wallet sans installer le plugin. Les composables actuels renvoient un état inerte compatible SSR lorsque Nuxt rend côté serveur, mais les vraies opérations RPC et de wallet nécessitent toujours le contexte du plugin côté client.

Pour Vue :

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

Pour Nuxt, enregistrez le module :

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

Le module Nuxt garde le plugin Vue Solana côté client uniquement. Les composables auto-importés peuvent être appelés pendant le SSR, mais évitez tout travail RPC ou wallet direct sur le serveur. Déclenchez les lectures RPC depuis des hooks de cycle de vie client ou des actions utilisateur lorsque vous avez besoin du vrai client Solana.

## `No Solana wallet is configured`

Aucun wallet n'a été sélectionné ni configuré manuellement. Utilisez `useWallets()` ou `useSolanaWallets()` pour sélectionner un wallet découvert avant d'appeler `connect()` ou d'envoyer une transaction.

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

Les lectures RPC et les lectures de solde fonctionnent sans wallet.

## Aucun wallet de navigateur n'est détecté

Causes courantes :

- Aucune extension de wallet Solana n'est installée.
- L'extension de wallet est désactivée pour le profil de navigateur actuel.
- L'app tourne en SSR ou dans un environnement non-navigateur.
- Le wallet n'implémente pas Wallet Standard.

Installez un wallet tel que Phantom, Solflare ou Backpack, puis appelez `refreshWallets()` après le chargement de la page.

## Mobile Wallet Adapter n'est pas détecté

L'enregistrement web d'Android Mobile Wallet Adapter ne fonctionne que sur les navigateurs Android servis via un contexte sécurisé (HTTPS).

Causes courantes :

- L'app tourne sur desktop, iOS, Firefox Android, Brave Android, Opera Android ou un autre navigateur non pris en charge.
- Aucun wallet mobile Solana compatible n'est installé.
- `mobileWallet: false` a été passé au plugin Vue ou au module Nuxt.
- La découverte des wallets s'est exécutée avant l'hydratation ou avant que la page puisse accéder à `window`.

Ouvrez l'app dans Chrome sur Android, installez un wallet compatible, puis appelez `refreshWallets()` après le chargement de la page.

## Le lien de wallet iOS ne se termine pas

La prise en charge des wallets iOS utilise les liens universels de Phantom, Solflare et Backpack. L'app wallet redirige vers l'URL de votre app après approbation.

Causes courantes :

- L'app ne tourne pas dans un navigateur iOS.
- Phantom, Solflare ou Backpack n'est pas installé sur l'appareil.
- `iosWallet: false` a été passé au plugin Vue ou au module Nuxt.
- Le `redirectUrl` configuré ne revient pas vers la même page de l'app qui rafraîchit l'état du wallet.
- Le rafraîchissement du wallet ou le traitement du callback ne s'exécute que pendant le SSR au lieu du côté client.

Gardez le travail lié aux wallets iOS côté client, assurez-vous que l'URL de redirection recharge l'app, et appelez `refreshWallets()` après le chargement de la page redirigée. Le plugin Vue gère les callbacks iOS pendant le rafraîchissement du wallet ; les apps qui utilisent directement les helpers core doivent appeler `handleSolanaIosWalletCallback()` avant de se fier à la session du wallet adapté.

## `Solana wallet is not connected`

Le helper de transaction a été appelé avant que le wallet signale `connected: true` et un `publicKey` non nul.

Appelez d'abord `connect()`, ou vérifiez `connected.value` avant d'envoyer.

## Le wallet apparaît connecté après un rafraîchissement en développement local

La sélection d'un wallet découvert ne doit pas le marquer comme connecté. `connected` ne doit devenir vrai qu'après la réussite de `connect()`, même si l'extension de navigateur expose des comptes déjà autorisés.

Si les exemples Vue ou Nuxt locaux apparaissent encore connectés immédiatement après un rafraîchissement, reconstruisez les packages du workspace et redémarrez complètement le serveur de développement afin que Vite/Nuxt abandonne la sortie de package obsolète :

```sh
pnpm build:packages
pnpm dev:vue
```

Pour Nuxt, utilisez `pnpm dev:nuxt` après avoir reconstruit les packages.

## `Solana wallet does not support signTransaction`

Le wallet configuré n'expose ni `signAndSendTransaction` ni `signTransaction`. Utilisez un wallet qui prend en charge la signature de transaction pour la chaîne Solana sélectionnée.

## La transaction du wallet n'a renvoyé aucun résultat

Cela peut se produire lorsqu'un adaptateur de wallet démarre un transfert mobile mais ne résout jamais sa promesse côté navigateur. Vue Solana efface `loading` et définit `error` au lieu de laisser l'app bloquée dans un état d'envoi. La transaction a peut-être quand même réussi si le wallet l'a soumise avant que la réponse ne soit perdue ; vérifiez donc l'activité du wallet ou un explorateur Solana avant de réessayer.

Les wallets Android Mobile Wallet Adapter préfèrent la signature par le wallet suivie d'une soumission RPC côté app lorsque `signTransaction` est disponible. Ce chemin évite le cas courant où le wallet envoie avec succès mais la page du navigateur ne reçoit jamais la signature renvoyée par l'adaptateur.

## `Buffer is not defined`

Certains chemins de sérialisation de transactions Solana attendent encore un global `Buffer` compatible Node dans les runtimes de navigateur. Dans les apps Vue de navigateur, initialisez le polyfill Buffer du package Vue avant de créer ou de sérialiser des transactions. Utilisez `@vue-solana/nuxt/buffer-polyfill` dans les apps Nuxt.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

Le helper est fourni par les packages de framework, donc les apps n'ont pas besoin d'installer ni d'importer `buffer` directement pour les exemples de transaction Vue Solana.

## Le module `buffer` a été externalisé

Si la console affiche `Module "buffer" has been externalized for browser compatibility`, remplacez les imports directs de `buffer` dans l'app par `installSolanaBufferPolyfill()` depuis `@vue-solana/vue/buffer-polyfill` ou `@vue-solana/nuxt/buffer-polyfill`, puis redémarrez le serveur de développement. Vite peut mettre en cache la dépendance précédemment optimisée.

## Les lectures de solde échouent

Causes courantes :

- La chaîne d'adresse n'est pas une clé publique Solana valide.
- L'endpoint RPC est indisponible ou limité en débit.
- L'adresse du wallet se trouve sur un cluster différent de l'endpoint RPC configuré.

Vérifiez le cluster et l'endpoint configurés avec `useRpc()` ou `useSolanaRpc()`.

## Les auto-imports Nuxt sont manquants

Assurez-vous que `@vue-solana/nuxt` figure dans `modules` et redémarrez le serveur de développement Nuxt après avoir installé le package.

Si TypeScript ne reconnaît toujours pas les auto-imports, régénérez les types Nuxt :

```sh
npx nuxi prepare
```
