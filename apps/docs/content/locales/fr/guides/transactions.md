---
title: "Transactions"
description: Signez, envoyez, confirmez et gérez l'état des transactions avec Vue Solana.
ogSection: Guides
surroundOrder: 10
---

Vue Solana fournit des helpers tenant compte du wallet pour soumettre des transactions, ainsi que des composables pour un état de transaction réactif.

Ce guide couvre la frontière de Vue Solana : vérification des capacités du wallet, signature, envoi, confirmation et erreurs. Construisez les messages de transaction avec les helpers Kit réexportés depuis `@vue-solana/vue/kit` (`@vue-solana/nuxt/kit` dans une application Nuxt) et les helpers d'instruction du client de votre programme. Vous n'avez jamais besoin d'installer `@solana/kit` vous-même.

## Helper d'envoi core

Utilisez `signAndSendTransaction()` de `@vue-solana/core/transaction` lorsque vous disposez déjà d'un client Kit, d'un wallet et des octets bruts de transaction au format wire.

```ts
import { signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction, {
  skipPreflight: false,
});
```

Le helper renvoie la chaîne de signature RPC.

Pour les wallets Android Mobile Wallet Adapter, Vue Solana privilégie `signTransaction` suivi d'une soumission RPC côté application via `client.rpc.sendTransaction(...).send()` lorsque c'est disponible, afin que l'application maîtrise la soumission et puisse renvoyer de manière fiable la signature RPC après le passage de relais au wallet.

## Confirmer une signature

Utilisez `confirmTransactionSignature()` lorsque vous devez attendre qu'une signature soumise atteigne un niveau de commitment.

```ts
import { confirmTransactionSignature } from "@vue-solana/core/transaction";

const confirmation = await confirmTransactionSignature(client, signature, {
  commitment: "confirmed",
  timeoutMs: 60_000,
});

console.log(confirmation.signature, confirmation.commitment);
```

La confirmation utilise par défaut le commitment `confirmed` et un délai d'expiration de 60 secondes. Elle interroge périodiquement `client.rpc.getSignatureStatuses([signature]).send()`, la transaction doit donc déjà avoir été soumise.

## Transactions envoyées par le client

`createSolanaClient()` compose par défaut la stack de transactions officielle de `@solana/kit-plugin-rpc` : `solanaRpc()` puis `rpcAirdrop()`. `solanaRpc()` installe lui-même le planner de transactions ainsi que les exécuteurs de signature et d'envoi de plans. L'ancien expéditeur de repli personnalisé n'est plus utilisé.

Utilisez `useSendTransaction()` ou `useSendTransactions()` lorsque le client doit planifier, signer, soumettre et confirmer sans popup de wallet. L'exécuteur officiel récupère un blockhash récent, gère les limites de ressources et la simulation preflight, signe avec les signers du client, soumet via RPC et attend le commitment `confirmed`. Le composable ne passe `status` à `sent` qu'une fois cette opération d'envoi et de confirmation terminée. Un résultat unique expose `data.context.signature` ; un résultat par lot contient l'arbre de résultats du plan.

Configurez un client core ou Vue direct avec `payer` ou `payerSecretKey` ; le chemin d'envoi par le client exige un `payer`. `payerSecretKey` est une paire de clés Ed25519 de 64 octets encodée en base64 et ne convient qu'à un développement de confiance ou à des flux côté serveur. Ne placez jamais un secret brut ou `payerSecretKey` dans la configuration runtime publique de Nuxt, et n'exposez jamais une clé de signature approvisionnée au navigateur d'un utilisateur final.

Le flux wallet est distinct : `useSignAndSendTransaction()` peut renvoyer après la soumission RPC par défaut, ou attendre un commitment choisi avec `confirm: true`. Conservez ce comportement lorsqu'un utilisateur connecté doit approuver une transaction dans son wallet.

## Construire un vrai transfert sur devnet

Cet exemple crée un petit transfert système sur devnet. Il construit un message de transaction Kit v0 et le sérialise en octets wire que Vue Solana transmet au wallet pour signature.

Les applications de navigateur qui créent ou sérialisent des transactions doivent initialiser une fois le polyfill Buffer du package Vue avant l'exécution du code de transaction :

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

```ts
import {
  AccountRole,
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getTransactionEncoder,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
} from "@vue-solana/vue/kit";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");

function createTransferInstruction(from: Address, to: Address, lamports: number) {
  const data = new DataView(new ArrayBuffer(12));
  data.setUint32(0, 2, true); // System program transfer instruction index
  data.setBigUint64(4, BigInt(lamports), true);

  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data: new Uint8Array(data.buffer),
  };
}

async function createTransferTransaction(params: {
  rpc: { getLatestBlockhash(): { send(): Promise<{ value: { blockhash: string } }> } };
  from: Address;
  to: string;
  lamports: number;
}) {
  const recipient = address(params.to);
  const { value: latestBlockhash } = await params.rpc.getLatestBlockhash().send();

  const message = setTransactionMessageLifetimeUsingBlockhash(
    latestBlockhash,
    setTransactionMessageFeePayer(
      params.from,
      appendTransactionMessageInstruction(
        createTransferInstruction(params.from, recipient, params.lamports),
        createTransactionMessage({ version: 0 }),
      ),
    ),
  );

  return getTransactionEncoder().encode(compileTransaction(message));
}
```

`createTransferTransaction` renvoie les octets bruts de transaction au format wire (`Uint8Array`), c'est ce qu'acceptent `SolanaWallet.signTransaction` et `useSignAndSendTransaction()`.

Utilisez des SOL de devnet pendant les tests. Commencez par une valeur minuscule comme `1_000` lamports (`0.000001` SOL). N'utilisez jamais un wallet contenant de vrais fonds pour valider un tutoriel ou un flux d'exemple.

## Flux de signature et d'envoi en Vue

Utilisez `useSignAndSendTransaction()` lorsqu'un composant Vue a besoin d'un statut réactif, des erreurs et d'une confirmation facultative.

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useSignAndSendTransaction } from "@vue-solana/vue/useSignAndSendTransaction";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { useWallet } from "@vue-solana/vue/useWallet";

const recipient = ref("PASTE_DEVNET_RECIPIENT_ADDRESS");
const lamports = ref(1_000);
const { client } = useSolanaClient();
const { publicKey, connected, canSignTransaction } = useWallet();
const { signature, confirmation, status, error, execute } = useSignAndSendTransaction();

const canSubmit = computed(() => connected.value && canSignTransaction.value);

async function submitTransaction() {
  const from = publicKey.value;
  if (!from) return;

  const transaction = await createTransferTransaction({
    rpc: client.rpc,
    from,
    to: recipient.value,
    lamports: lamports.value,
  });

  await execute(transaction, {
    confirm: true,
    confirmation: { commitment: "confirmed" },
  });
}
</script>

<template>
  <section>
    <button type="button" :disabled="!canSubmit" @click="submitTransaction">
      Send transaction
    </button>
    <p>Status: {{ status }}</p>
    <p v-if="signature">Signature: {{ signature }}</p>
    <p v-if="confirmation">Confirmed at {{ confirmation.commitment }}</p>
    <p v-if="error">Unable to send transaction.</p>
  </section>
</template>
```

`status` distingue la soumission de la confirmation. Une `signature` renvoyée signifie que la transaction a été soumise au RPC. `confirmation` signifie que la signature soumise a atteint le commitment demandé. Si la confirmation expire après la soumission, continuez d'afficher la signature et vérifiez son statut avant de réessayer.

### Entrées et retours des requêtes wallet

Les flux de signature par wallet acceptent en entrée des octets wire bruts `Uint8Array` conformes au schéma de transaction Solana. Construisez-les avec les helpers Kit de `@vue-solana/vue/kit` (ou décodez-les depuis une réponse RPC base64/base58) ; les chaînes base64, les objets de transaction et les listes d'instructions ne sont pas acceptés ici.

```ts
import { compileTransaction, getTransactionEncoder } from "@vue-solana/vue/kit";

const transaction: Uint8Array = getTransactionEncoder().encode(compileTransaction(message));
await execute(transaction);
```

`useSignMessage()` prend les octets bruts du message à signer. Chaque requête d'envoi par wallet accepte également les `SendTransactionOptions` de Kit :

| Option                | Description                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `skipPreflight`       | Ignore la simulation preflight avant l'envoi.                                                                         |
| `maxRetries`          | Nombre de tentatives du nœud RPC (`bigint`).                                                                          |
| `minContextSlot`      | Slot auquel tout blockhash ou nonce de la transaction est connu comme existant ; un envoi antérieur peut être rejeté. |
| `preflightCommitment` | Commitment utilisé pour la simulation preflight.                                                                      |

Formes des valeurs de retour :

- `useSignMessage().execute(bytes)` se résout en `{ signedMessage, signature }`, tous deux des `Uint8Array`.
- `useSignTransactions().execute(transactions)` se résout en `Uint8Array[]` signés (également exposés sous `signedTransactions`) ; passez un tableau d'un seul élément pour une transaction.
- `useSignAndSendTransaction().execute(transaction)` se résout en la chaîne `signature` soumise ; avec `confirm: true`, elle remplit aussi `confirmation`.
- `useSignAndSendTransactions().execute(transactions)` se résout en un `string[]` de signatures (également exposé sous `signatures`).

Un wallet peut modifier le message ou la transaction avant de signer — par exemple pour ajouter sa propre instruction ou changer le payeur des frais — et le Wallet Standard l'autorise explicitement. Relisez le `signedMessage` renvoyé ou les octets de transaction signés au lieu de supposer qu'ils correspondent octet pour octet à votre entrée.

## Liens vers l'Explorer

Les liens vers l'Explorer doivent correspondre au cluster utilisé par votre application.

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Pour devnet, les liens doivent ressembler à `https://explorer.solana.com/tx/SIGNATURE?cluster=devnet`. `mainnet` et l'alias hérité `mainnet-beta` omettent tous deux volontairement le paramètre de cluster.

## État de transaction générique

Utilisez `useTransaction()` lorsque votre opération asynchrone de type transaction ne correspond pas au helper de signature/envoi intégré.

```ts
import { useTransaction } from "@vue-solana/vue/useTransaction";

const { status, error, execute } = useTransaction(async () => {
  return await submitCustomFlow();
});
```

`useTransaction()` centralise les états de chargement, de succès, d'erreur et d'expiration pour les flux personnalisés.

## Auto-imports Nuxt

Nuxt expose :

- `useSolanaSignAndSendTransaction()`
- `useSolanaSendTransaction()`
- `useSolanaSendTransactions()`
- `useSolanaTransactionConfirmation()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const { signature, status, error, execute } = useSolanaSignAndSendTransaction();

async function submit(transaction: Uint8Array) {
  await execute(transaction, { confirm: true });
}
</script>
```

Appelez les méthodes de transaction depuis des actions utilisateur côté client. Ne déclenchez pas de signature par wallet pendant le SSR. Les options du module Nuxt omettent volontairement `payer` et `payerSecretKey` ; configurez un `payer` dans un plugin Vue côté client avec `clientPlugin: false` plutôt que de placer un secret dans la configuration runtime publique.

Utilisez `useSolanaTransactionConfirmation({ commitment: "confirmed" })` et appelez `confirm(signature)` lorsque vous devez confirmer une signature renvoyée par un autre flux. Utilisez `useSolanaSignatureStatus(signature, { pollIntervalMs: 2_000 })` lorsque vous voulez continuer à vérifier le statut après une expiration ou une redirection.

## Gestion des erreurs

Les helpers de transaction normalisent les échecs en `SolanaError`.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "NO_WALLET_SELECTED":
      case "WALLET_NOT_CONNECTED":
        // Ask the user to connect a wallet.
        break;
      case "WALLET_FEATURE_UNSUPPORTED":
        // Hide or disable unsupported transaction actions.
        break;
      case "USER_REJECTED":
        // The user declined the wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // Check signature status before retrying.
        break;
      case "RPC_FAILURE":
        // RPC send or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

## Liste de vérification de sécurité

- Gardez les clés de signature côté client sur un serveur de confiance ou dans un signer de démo explicitement éphémère ; n'exposez jamais de secrets approvisionnés via la configuration runtime publique de Nuxt.
- Montrez aux utilisateurs ce qu'ils sont sur le point de signer avant d'ouvrir une invite de wallet.
- Ne signez ni n'envoyez jamais de transactions sans action explicite de l'utilisateur.
- Ne demandez ni ne manipulez jamais de clés privées.
- Vérifiez les capacités du wallet avant d'afficher des actions de signature.
- Considérez les erreurs RPC et de wallet comme des données non fiables ; convertissez-les en messages d'interface sûrs.
- Après une expiration, vérifiez le statut de la signature avant de réessayer pour éviter les doubles soumissions.
- Conservez la signature soumise dans l'interface même si la confirmation échoue ou expire.
- Liez le bon cluster de Solana Explorer pour que les utilisateurs ne confondent pas les transactions devnet et mainnet.
