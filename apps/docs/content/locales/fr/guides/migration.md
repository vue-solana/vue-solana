---
title: "Guide de migration"
description: Comment migrer entre les versions de Vue Solana. Couvre la mise à niveau de v3 vers v4, de v2 vers v3, et la migration de v1.x vers v2.
ogSection: Guides
surroundOrder: 14
---

Ce guide couvre la migration entre les versions de Vue Solana. Il existe trois migrations majeures : la mise à niveau de v3 vers v4 (la plus récente), de v2 vers v3, et la migration de v1.x vers v2.

## Migration : de v3 à v4

v4.0.0 est la version la plus récente. Elle réduit la taille du bundle en retirant les modules lourds du barrel racine de `@vue-solana/core` et publie des tarballs plus petits. Elle modifie aussi quelques API de composables et respecte le `commitment` configuré.

### Ce qui a changé

- **Barrel racine allégé** : `@vue-solana/core` ne re-exporte plus `Buffer`/`installSolanaBufferPolyfill`, `ios-wallet` ni `mobile-wallet` depuis son barrel racine. Utilisez plutôt les sous-chemins dédiés.
- **Tarballs plus petits** : les fichiers de déclaration `.d.mts` ne sont plus publiés ; toutes les conditions `exports` pointent vers `.d.ts`.
- **`useSignatureStatus`** : n'accepte plus l'option `commitment`.
- **`commitment` respecté** : `createSolanaClient()` / `createSolanaPlugin()` / `solana.commitment` de Nuxt est désormais réellement appliqué aux appels RPC.
- **`plugin.dispose()`** : `createSolanaPlugin()` renvoie maintenant `dispose()`.
- **Échecs d'airdrop typés** : les échecs de `useAirdrop()` sont des `SolanaError` avec le code `RPC_FAILURE`.
- **`buffer` en peer optionnel** : les applications qui utilisent `buffer-polyfill` doivent installer `buffer` elles-mêmes.
- **`bs58` retiré** : les applications qui importent `bs58` directement doivent l'ajouter à leurs propres dépendances.
- **Nouveaux auto-imports (Nuxt)** : `useSolanaClientCapability()`, `tryUseSolana()`, `clearSwrCache()`, `deleteSwrKey()`.
- **Nouveau `deleteSwrKey()`** dans `@vue-solana/vue/swr`.

### Comment migrer

#### 1. Mettre à jour les dépendances

```sh
pnpm add @vue-solana/vue@^4.0.0
# or
pnpm add @vue-solana/nuxt@^4.0.0
```

Si vous utilisez `buffer-polyfill`, installez `buffer` vous-même :

```sh
pnpm add buffer
```

Si vous importez `bs58` directement, ajoutez-le :

```sh
pnpm add bs58
```

#### 2. Mettre à jour les imports Buffer / Wallet

```diff
- import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core";
+ import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill";
- import { getSolanaIosWallets } from "@vue-solana/core";
+ import { getSolanaIosWallets } from "@vue-solana/core/ios-wallet";
- import { registerSolanaMobileWallet } from "@vue-solana/core";
+ import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
```

(`@vue-solana/vue/buffer-polyfill` et `@vue-solana/nuxt/buffer-polyfill` sont inchangés.)

#### 3. Mettre à jour `useSignatureStatus`

```diff
- useSignatureStatus(signature, { commitment: "confirmed" })
+ useSignatureStatus(signature)
```

Pour un `commitment` par appel, passez `{ commitment }` à `confirm(signature, opts)` de `useTransactionConfirmation()`, ou appelez directement `confirmTransactionSignature()` depuis `@vue-solana/core`.

#### 4. Libérer les plugins en Vue simple

```ts
const solana = createSolanaPlugin();
createApp(App).use(solana);
// on teardown:
app.unmount();
solana.dispose();
```

(Nuxt s'en charge automatiquement.)

#### 5. Gérer les erreurs d'airdrop typées

Les échecs de `useAirdrop()` sont désormais des `SolanaError` avec le code `RPC_FAILURE` ; l'erreur d'origine est conservée dans `cause`.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await airdrop();
} catch (error) {
  if (isSolanaError(error, "RPC_FAILURE")) {
    // handle
  }
}
```

## Migration : de v2 à v3

v3.0.0 est la version la plus récente. Elle passe le format du module en ESM uniquement et fait des sous-chemins `kit` un miroir complet de `@solana/kit`. La migration vers Kit est déjà terminée en v2, donc v3 se concentre sur le packaging et sur des changements de comportement mineurs.

### Ce qui a changé

- **ESM uniquement** : tous les packages `@vue-solana/*` ne publient plus que de l'ESM. La condition d'export `require` et le champ `main` de premier niveau ont été supprimés.
- **Miroir complet de Kit** : `@vue-solana/core/kit`, `@vue-solana/vue/kit` et `@vue-solana/nuxt/kit` font désormais `export *` depuis `@solana/kit` (et non un sous-ensemble choisi).
- **Comportement des composables de lecture** : `useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()` et `useTokenBalance()` (ainsi que leurs équivalents Nuxt `useSolana*`) partagent une machine d'état unifiée avec une meilleure gestion des erreurs.
- **Surface de dépendances** : vous n'avez plus besoin d'ajouter `@solana/kit` à votre propre `package.json` lorsque vous utilisez les sous-chemins `kit` du package.

### Comment migrer

#### 1. Mettre à jour les dépendances

```sh
# For Vue apps
pnpm add @vue-solana/vue@^3.0.0

# For Nuxt apps
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. Gérer les packages ESM uniquement

Si votre application ou vos scripts utilisent encore CommonJS (`require()`), convertissez-les en ESM. Ajoutez `"type": "module"` à votre `package.json` ou renommez les fichiers en `.mjs`.

```ts
// Instead of require()
import { createSolanaClient } from "@vue-solana/core/kit";
```

Si vous ne pouvez pas passer à ESM, restez sur `@vue-solana/*@^2.x`, qui publie encore des builds `.cjs`.

#### 3. Mettre à jour les imports Kit

Avec le miroir complet, importez tout depuis le sous-chemin `kit` du package. Si vous aviez ajouté `@solana/kit` à vos dépendances, vous pouvez le retirer.

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt (auto-imported composables still work)
import { address, lamports } from "@vue-solana/nuxt/kit";
```

Remarque : quatre noms (`SolanaError`, `SolanaErrorCode`, `isSolanaError`, `TransactionStatus`) sont résolus différemment entre les barrels racine et les sous-chemins `/kit`. Si vous interceptez des erreurs levées par Kit, importez `isSolanaError` depuis le sous-chemin `kit`.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. Mettre à jour la gestion des erreurs des composables de lecture

`refresh()` rejette désormais en cas d'échec (au lieu de résoudre). Mettez à jour le code qui l'attend :

```ts
await refresh().catch(() => undefined);
```

Le `@click="refresh"` dans les templates n'est pas affecté.

Lorsque les lectures échouent, les données reviennent à leur valeur vide. Vérifiez `error` explicitement :

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="Could not load the balance." />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`balance` et `decimals` de `useTokenBalance()` sont des refs calculés en lecture seule - supprimez toute affectation à leur endroit.

#### 5. Retirer les imports Web3 hérités

Retirez tout import `@vue-solana/*/web3` restant et les dépendances `@solana/web3-compat` (elles n'existent pas en v3).

## Migration : de v1.x à v2.0.0

Vue Solana v2.0.0 est passé de `@solana/web3-compat` à `@solana/kit` comme surface d'API principale. Il s'agit d'un changement incompatible pour les applications en v1.x.

### Ce qui a changé

- **API Kit uniquement** : `@solana/web3-compat` est retiré de tous les packages. Le contexte ne porte plus `connection`, et les sous-chemins `web3` sont supprimés.
- **Changements de types** : `SolanaWallet.publicKey` est désormais une simple chaîne `Address` en base58 (et non une classe `PublicKey`).
- **Changements de composables** : `useConnection()` a été remplacé par `useSolanaClient()`. `useRpc()` renvoie maintenant l'état du cluster ainsi que le client Kit injecté.
- **Types numériques** : les résultats RPC comme les lamports, les slots et les hauteurs de bloc sont des `bigint`. Les données de compte sont des `Uint8Array` plutôt que des `Buffer` dans les sorties normalisées des composables.
- **Surface des transactions** : les helpers comme `signAndSendTransaction` et `confirmTransactionSignature` prennent désormais un client Kit au lieu d'une `Connection`, et les entrées de transaction utilisent les types de Kit.

### Comment migrer

#### 1. Mettre à jour les dépendances

```sh
pnpm add @vue-solana/vue@^2.0.0
# or
pnpm add @vue-solana/nuxt@^2.0.0
```

Retirez `@solana/web3-compat` de vos dépendances s'il est présent.

#### 2. Mettre à jour les appels d'API

| Hérité                                                   | Remplacement                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Connection`, `new Connection(url)`                      | `client.rpc` de `createSolanaClient({ endpoint })` / `useSolanaClient()`                                                  |
| `PublicKey`, `new PublicKey(s)`, `.toBase58()`           | `Address` via `address(s)`                                                                                                |
| `Keypair`, `keypair.publicKey`                           | `generateKeyPairSigner()` de `@vue-solana/*/kit` ; `.address` du signer                                                   |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` de `@solana-program/system`                                                                   |
| Calculs `LAMPORTS_PER_SOL`                               | `lamports()` de `@vue-solana/*/kit`                                                                                       |
| `sendAndConfirmTransaction`                              | Utilisez la planification de transactions de Kit ; pour les flux signés par wallet, `signAndSendTransaction(client, ...)` |
| `requestAirdrop` (devnet)                                | `client.airdrop()`                                                                                                        |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()` (renvoie un `bigint`)                                                                 |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                                                                |
| `useConnection()`                                        | `useSolanaClient()`                                                                                                       |
| `parsePublicKey(value)`                                  | `parseAddress(value)` de `@vue-solana/core/address`                                                                       |

#### 3. Mettre à jour les exemples de code

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. Nettoyer

Retirez tous les imports depuis `@vue-solana/*/web3`, retirez `@solana/web3-compat` de `package.json` et supprimez les éventuels shims `.d.ts` locaux que vous aviez ajoutés pour web3-compat. Retirez aussi `buffer-polyfill` si vous n'en aviez besoin que pour les chemins de transaction hérités de web3-compat.

### Remarques

- Le `client.rpc` de Kit utilise des valeurs par défaut par appel pour `commitment` plutôt que la valeur de configuration. Passez `commitment` explicitement si nécessaire : `rpc.getBalance(account, { commitment: "confirmed" }).send()`.
- Pour du code indépendant du framework, utilisez `createSolanaClient()` depuis `@vue-solana/core/kit`.
