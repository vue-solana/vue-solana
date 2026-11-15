---
title: "Signature de messages"
description: Signez des messages d'authentification ou de propriété sans créer de transactions on-chain.
ogSection: Guides
surroundOrder: 12
---

La signature de messages prouve le contrôle d'un wallet pour un message off-chain. Elle n'autorise pas de changement d'état on-chain et ne constitue pas une signature de transaction.

Utilisez la signature de messages pour les challenges d'authentification, les vérifications de propriété de compte ou un texte de consentement que votre app vérifie hors chaîne.

## Signature de messages en Vue

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignMessage } from "@vue-solana/vue/useSignMessage";
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage } = useWallet();
const { signature, status, error, execute } = useSignMessage();

const canSign = computed(() => connected.value && canSignMessage.value);

async function signIn() {
  const message = new TextEncoder().encode("Sign in to example.com");
  await execute(message);
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSign" @click="signIn">Sign message</button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature bytes: {{ signature.length }}</p>
    <p v-if="error">Unable to sign message.</p>
  </section>
</template>
```

Les wallets qui n'exposent pas la signature de messages renvoient `canSignMessage` à false. Appeler `execute()` sans prise en charge rejette avec `WALLET_FEATURE_UNSUPPORTED`.

## Sign In With Solana (SIWS)

Pour l'authentification, préférez SIWS à la signature de messages libre lorsque le wallet le prend en charge. SIWS présente à l'utilisateur un écran de consentement structuré (domaine, déclaration, ressources, URI) plutôt que des octets arbitraires, et le wallet renvoie un résultat typé :

```ts
import { useSignIn } from "@vue-solana/vue/useSignIn";

const { signIn } = useSignIn();

const { account, signedMessage, signature } = await signIn({
  statement: "Sign in to example.com",
  nonce: nonceFromYourServer,
});
```

Le résultat n'est pas une session authentifiée — c'est une affirmation à vérifier. Sur votre serveur :

1. Décodez `signedMessage` et vérifiez que le domaine correspond à votre origine, que l'URI est la vôtre et que le nonce correspond à celui émis par votre serveur pour cette tentative de connexion (usage unique, expiration courte).
2. Vérifiez la signature Ed25519 sur `signedMessage` par rapport à `account.publicKey`, par exemple avec `tweetnacl` : `nacl.sign.detached.verify(signedMessage, signature, account.publicKey)`.
3. Créez ensuite seulement la session, rattachée à `account.address`.

Les wallets sans prise en charge de SIWS rejettent `signIn()` avec `WALLET_FEATURE_UNSUPPORTED` ; pour ces wallets, repliez-vous sur `useSignMessage()` avec votre propre texte de challenge.

## Signature de messages en Nuxt

Nuxt auto-importe `useSolanaSignMessage()` et `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { connected, canSignMessage } = useSolanaWallet();
const { signature, status, error, execute } = useSolanaSignMessage();

async function signChallenge() {
  await execute(new TextEncoder().encode("Sign in to my Nuxt app"));
}
</script>
```

N'appelez la signature de messages qu'à partir d'actions utilisateur côté client.

## Texte du challenge

Utilisez un texte de challenge clair et spécifique à l'app. Les utilisateurs doivent comprendre ce qu'ils signent.

Un bon texte de challenge inclut généralement :

- Le nom de l'app ou du domaine.
- L'objectif de la signature.
- Un nonce ou une valeur de challenge à usage unique.
- L'heure d'émission et l'heure d'expiration.

Exemple :

```txt
Sign in to example.com
Wallet: 8Y...abc
Nonce: 7f4b3c
Issued At: 2026-07-02T12:00:00Z
Expires At: 2026-07-02T12:10:00Z
```

## Frontière de vérification

Vue Solana vérifie la signature renvoyée par rapport à la clé publique du compte avant de résoudre `signMessage()` / `signIn()`, lorsque l'environnement prend en charge Ed25519 (WebCrypto). Il s'agit d'une garde au mieux contre un wallet qui renverrait une signature sur les mauvais octets ou pour un autre compte — elle ne remplace pas la vérification côté serveur et elle est ignorée lorsque Ed25519 n'est pas disponible. Une signature qui échoue à ce contrôle rejette avec `INVALID_SIGNATURE`.

Votre app reste responsable de la vérification côté serveur, du stockage des nonces, des contrôles d'expiration et de la création de session.

Ne considérez pas une signature sur un texte générique comme une autorisation de transférer des tokens ou de modifier l'état on-chain.

## Gestion des erreurs

Les erreurs de signature de messages utilisent le même modèle normalisé `SolanaError` que les helpers de wallet et de transaction.

```ts
const message = computed(() => {
  switch (error.value?.code) {
    case "NO_WALLET_SELECTED":
      return "Choose a wallet first.";
    case "WALLET_NOT_CONNECTED":
      return "Connect your wallet first.";
    case "WALLET_FEATURE_UNSUPPORTED":
      return "This wallet does not support message signing.";
    case "USER_REJECTED":
      return "The message signature was rejected.";
    case "WALLET_FAILURE":
      return "The wallet could not sign the message.";
    case "INVALID_SIGNATURE":
      return "The wallet returned an invalid signature.";
    default:
      return null;
  }
});
```

## Liste de contrôle de sécurité

- Utilisez des nonces à usage unique pour les challenges d'authentification.
- Faites expirer les challenges rapidement.
- Vérifiez les signatures sur le serveur avant de créer une session.
- Rendez le texte signé lisible par un humain.
- Ne laissez jamais entendre que la signature de messages soumet une transaction.
- Ne réutilisez jamais un flux de signature de transaction pour du texte d'authentification.
