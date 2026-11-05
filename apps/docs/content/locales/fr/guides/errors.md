---
title: "Erreurs"
description: Gérez les erreurs Solana normalisées provenant des helpers core et des composables Vue/Nuxt.
ogSection: Guides
surroundOrder: 13
---

Vue Solana normalise les défaillances courantes de wallet, RPC, adresse, transaction, timeout et stockage en `SolanaError`.

Utilisez les valeurs stables de `error.code` pour vos décisions d'interface. Conservez `error.cause` pour le débogage et les logs.

## Forme de l'erreur

```ts
import { SolanaError } from "@vue-solana/core/errors";

const error = new SolanaError("RPC_FAILURE", "Unable to reach RPC");
```

`SolanaError` inclut :

- `code` : code d'erreur stable et lisible par une machine.
- `message` : message destiné aux développeurs, lisible par un humain.
- `cause` : erreur d'origine facultative provenant d'un wallet, d'un appel RPC, d'un parser, d'un timeout ou d'une opération de stockage.
- `feature` : nom facultatif de la fonctionnalité du wallet pour les erreurs de capacité non prise en charge.

## Codes d'erreur stables

- `NO_WALLET_SELECTED` : aucun wallet actif n'est sélectionné.
- `WALLET_NOT_CONNECTED` : le wallet actif n'est pas connecté ou n'a pas de clé publique.
- `WALLET_FEATURE_UNSUPPORTED` : le wallet actif ne prend pas en charge la fonctionnalité demandée.
- `WALLET_FAILURE` : une opération côté wallet a échoué sans code plus spécifique — connexion/déconnexion, reconnexion automatique d'un wallet persisté, enregistrement d'un wallet mobile ou traitement du callback iOS.
- `USER_REJECTED` : l'utilisateur a rejeté une demande du wallet.
- `INVALID_SIGNATURE` : un wallet a renvoyé une signature de message ou de connexion qui ne correspond pas à la clé de son compte.
- `INVALID_ADDRESS` : une chaîne d'adresse n'a pas pu être analysée comme adresse Solana.
- `INVALID_INPUT` : un helper a reçu un endpoint, un timeout ou une valeur d'option mal formé.
- `TRANSACTION_TIMEOUT` : une opération liée à une transaction a expiré.
- `TRANSACTION_NOT_FOUND` : une signature n'est jamais apparue dans les résultats de statut RPC avant l'échéance de confirmation.
- `TRANSACTION_FAILED` : une transaction soumise a échoué avant d'atteindre le commitment demandé.
- `REDIRECT_TIMEOUT` : un wallet iOS n'a pas redirigé vers l'app à temps.
- `DECRYPTION_FAILED` : un callback de wallet iOS n'a pas pu être déchiffré ou décodé.
- `RPC_FAILURE` : un envoi, une lecture ou une confirmation RPC a échoué.
- `STORAGE_FAILURE` : le stockage du navigateur n'a pas pu être lu ou écrit.

## Gestion des erreurs dans core

Utilisez `isSolanaError()` lorsque vous interceptez des défaillances inconnues.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    console.log(error.code);
    console.debug(error.cause);
  }
}
```

Utilisez `normalizeSolanaError()` lorsque vous écrivez votre propre helper indépendant du framework et qui doit suivre le modèle d'erreurs de Vue Solana.

```ts
import { normalizeSolanaError } from "@vue-solana/core/errors";

async function loadData() {
  try {
    return await client.rpc.getLatestBlockhash().send();
  } catch (cause) {
    throw normalizeSolanaError(cause, "RPC_FAILURE", "Unable to load blockhash");
  }
}
```

`normalizeSolanaError()` mappe les formes courantes de rejet de wallet vers `USER_REJECTED`.

## Refs d'erreur en Vue

Les composables Vue exposent des refs `error`.

```vue
<script setup lang="ts">
import { computed, watchEffect } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const { error } = useBalance("PASTE_A_SOLANA_ADDRESS");

const message = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load data from RPC.";
    default:
      return null;
  }
});

watchEffect(() => {
  if (error.value?.cause) {
    console.debug("Original Solana error", error.value.cause);
  }
});
</script>
```

## Refs d'erreur en Nuxt

Les composables auto-importés de Nuxt exposent le même modèle d'erreurs.

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

## Messages destinés aux utilisateurs

N'affichez pas les détails bruts de `cause` directement aux utilisateurs finaux, sauf si votre app fait explicitement confiance à cette source. Les messages d'erreur des wallets et du RPC peuvent contenir du texte propre au fournisseur, source de confusion ou risqué pour l'interface.

Mappez plutôt les codes d'erreur stables vers de courts messages spécifiques à l'app.

```ts
function getSolanaErrorMessage(code: string) {
  switch (code) {
    case "USER_REJECTED":
      return "Request canceled.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support that action.";
    case "RPC_FAILURE":
      return "Network request failed. Try again.";
    default:
      return "Something went wrong.";
  }
}
```

## Conseils de nouvelle tentative

- Ne relancez `RPC_FAILURE` que lorsque l'opération peut être répétée sans risque.
- Après `TRANSACTION_TIMEOUT`, vérifiez le statut de la signature avant de réessayer.
- Ne relancez pas `USER_REJECTED` automatiquement.
- Ne relancez pas `INVALID_ADDRESS` ; demandez à l'utilisateur de corriger sa saisie.
- Masquez ou désactivez les actions qui produisent `WALLET_FEATURE_UNSUPPORTED`.
