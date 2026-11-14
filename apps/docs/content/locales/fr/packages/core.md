---
title: "@vue-solana/core"
description: Configuration Solana indépendante du framework, RPC, types de wallet et helpers de transaction.
ogSection: Packages
surroundOrder: 16
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) contient les primitives Solana indépendantes du framework utilisées par les packages Vue Solana.

Utilisez ce package directement lorsque vous voulez des clients Kit, des helpers d'endpoint, des types de wallet partagés, des helpers d'enregistrement Android Mobile Wallet Adapter, des helpers de wallet de navigateur iOS, des lectures de comptes de token et des helpers de transaction sans installer le plugin Vue.

`@vue-solana/core` s'appuie sur le moderne [`@solana/kit`](https://www.npmjs.com/package/@solana/kit). `createSolanaClient()` se trouve sur le sous-chemin `@vue-solana/core/kit`, qui réexporte l'intégralité de `@solana/kit`. L'API historique `@solana/web3-compat` et le sous-chemin `web3` ont été supprimés en v2.0.0 — consultez [Migration vers Kit](/fr/guides/migration) pour la table complète avant/après.

## Installation

```sh
pnpm add @vue-solana/core
```

Le package est ESM uniquement. Un `require("@vue-solana/core")` CommonJS échoue avec `No "exports" main defined` ; convertissez le module importateur en ESM, ou restez sur `@vue-solana/core@^2`, qui publie encore un build `.cjs`. Consultez [Mise à niveau de la v2 vers la v3](/fr/guides/migration#migration--de-v2-à-v3).

## Démarrage rapide

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

Vous pouvez aussi créer un client Kit directement :

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()` renvoie `{ cluster, endpoint, wsEndpoint, client }` ; le `client` porte `client.rpc` et `client.rpcSubscriptions`.

L'export racine reste pris en charge. Des exports directs par sous-chemin sont également disponibles, vous pouvez donc importer uniquement les helpers dont un module a besoin :

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Sous-chemins directs :

- `@vue-solana/core/address`
- `@vue-solana/core/action`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/mobile-wallet-support`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/token-accounts`
- `@vue-solana/core/solana-pay`
- `@vue-solana/core/solana-pay-confirmation`
- `@vue-solana/core/solana-pay-status`

## Guides connexes

- [RPC et clusters](/fr/guides/rpc-and-clusters) : configurez les noms de cluster, les endpoints RPC personnalisés, les endpoints WebSocket et les helpers de client.
- [Wallets](/fr/guides/wallets) : découvrez les wallets Wallet Standard, enregistrez les sources de wallet mobile et vérifiez les capacités des wallets.
- [Transactions](/fr/guides/transactions) : signez, envoyez, confirmez et gérez les délais d'expiration de transaction en toute sécurité.
- [Solana Pay](/fr/guides/solana-pay) : encodez des demandes de paiement, générez et scannez des QR codes, et confirmez le règlement par référence.
- [Erreurs](/fr/guides/errors) : branchez-vous sur les codes `SolanaError` stables et gardez les causes brutes hors de l'interface utilisateur.

## Configuration

```ts
type SolanaCluster = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  payer?: TransactionSigner;
  payerSecretKey?: string;
}
```

Les clusters pris en charge sont `mainnet` (alias historique `mainnet-beta`), `testnet`, `devnet` et `localnet`. Les helpers de wallet utilisent des identifiants de chaîne Wallet Standard tels que `solana:devnet`, dérivés des clusters par `getSolanaChain()`. Si `endpoint` est omis, le package utilise l'endpoint RPC public Solana du cluster sélectionné. Si `wsEndpoint` est omis, il est dérivé de l'endpoint RPC.

`autoConnect` vaut `false` par défaut. Lorsqu'il est activé via le plugin Vue ou le module Nuxt, Vue Solana reconnecte uniquement une identité de wallet que l'utilisateur avait sélectionnée précédemment et qui est redécouverte côté client. Il ne stocke que les métadonnées d'identité du wallet sous `localStorage["vue-solana:selected-wallet"]` : `name`, ainsi que `platform`/`source` lorsqu'ils sont disponibles. Il ne stocke jamais de clés privées, de données de session ou de données de transaction, et il ne connecte jamais un wallet installé arbitraire.

`payer` est un `TransactionSigner` Kit utilisé comme payeur de frais du client et signer pour les transactions envoyées par le client. `payerSecretKey` est une paire de clés Ed25519 de 64 octets encodée en base64, la clé secrète en premier ; le client dérive son adresse à la création et importe la clé de signature à la première utilisation, ainsi une paire de clés dont la moitié publique ne correspond pas à sa graine est rejetée à la première signature plutôt qu'à la création du client. L'adresse provient de la moitié publique non vérifiée, considérez donc `payer.address` comme non confirmée jusqu'à ce que la première signature réussisse. La signature importe la clé via WebCrypto, que les navigateurs n'exposent que dans un contexte sécurisé (`https`, ou `http` sur `localhost`) ; en dehors de ce cas, le premier appel à `signTransactions()` échoue plutôt que de renvoyer une erreur générique de clé invalide. Ces deux options sont prises en charge par les clients core et Vue directs.

`createSolanaClient()` compose la pile officielle `@solana/kit-plugin-rpc` par défaut : `solanaRpc()` suivi de `rpcAirdrop()` lorsqu'aucun `commitment` n'est configuré (un `commitment` configuré construit explicitement la même pile afin qu'il atteigne la couche RPC). `solanaRpc()` installe lui-même `rpcTransactionPlanner()`, `rpcTransactionPlanSigningExecutor()` et `rpcTransactionPlanSendingExecutor()`, le client expose donc les lectures et souscriptions RPC ainsi que `planTransaction(s)`, `signTransaction(s)` et `sendTransaction(s)` sans plugin supplémentaire. L'ancien expéditeur de secours personnalisé n'est pas utilisé. Son exécuteur d'envoi officiel ajoute un blockhash frais, gère les limites de ressources et le preflight, signe avec les signers de client disponibles, soumet la transaction et attend le niveau de confirmation `confirmed` avant que l'envoi ne se résolve. Un envoi côté client exige un signer `payer`.

Ne placez jamais un secret brut ou `payerSecretKey` dans la configuration d'exécution publique de Nuxt. N'expédiez jamais une clé de signature approvisionnée vers le navigateur d'un utilisateur final ; utilisez une frontière serveur ou relayer, ou un signer éphémère non approvisionné pour les démos.

Utilisez `mainnet` pour le mainnet Solana. Il s'agit du nom officiel du cluster mainnet de Solana. L'orthographe historique `mainnet-beta` est toujours acceptée et redirige vers le même endpoint `https://api.mainnet.solana.com`.

## Contexte

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` est un client [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) construit par `createSolanaClient()` et expose `client.rpc`, `client.rpcSubscriptions`, `planTransaction(s)` et `sendTransaction(s)`.

## Interface wallet

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: Signature }>;
}
```

Les wallets de navigateur découverts via Solana Wallet Standard et les liens de wallet de navigateur iOS pris en charge sont adaptés à cette interface. Vous pouvez aussi fournir un objet personnalisé qui implémente `SolanaWallet`. Un wallet découvert reste déconnecté jusqu'à ce que `connect()` se résolve avec succès, même si l'extension de navigateur expose des comptes précédemment autorisés.

`publicKey` est l'`Address` Kit (une chaîne) encodée en base58 du compte connecté. `SolanaTransaction` est un `Uint8Array` — les octets bruts de la transaction au format wire que le wallet signe tel quel ; l'octet de tête distingue les transactions legacy des transactions versionnées.

Android Mobile Wallet Adapter est enregistré via `@solana-mobile/wallet-standard-mobile`, puis adapté via le même adaptateur Wallet Standard.

## Métadonnées du wallet

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly SolanaWalletAccountInfo[];
  wallet: unknown;
}
```

Valeurs de métadonnées actuelles :

- Les wallets d'extension de navigateur utilisent `platform: "browser"` et `source: "wallet-standard"`.
- Android Mobile Wallet Adapter utilise `platform: "mobile"` et `source: "mobile-wallet-adapter"`.
- Les wallets de navigateur iOS utilisent `platform: "mobile"` et `source: "deep-link"`.
- `protocol-link` est réservé à de futurs adaptateurs de wallet natif de bureau éventuels.

## Helpers Wallet Standard

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` est l'identifiant de chaîne Wallet Standard utilisé par la découverte de wallets, l'enregistrement de wallet mobile, les liens de wallet iOS et les options de signature de l'adaptateur de wallet. Utilisez `getSolanaChain(cluster)` lorsque vous devez en dériver un à partir d'un cluster Solana configuré.

- `getSolanaChain(cluster)` : mappe `mainnet-beta` ou `mainnet`, `devnet`, `testnet` ou `localnet` vers un identifiant de chaîne Solana Wallet Standard.
- `isSolanaStandardWallet(wallet)` : vérifie si un wallet Wallet Standard prend en charge Solana.
- `getRegisteredSolanaWallets()` : renvoie les wallets Solana Wallet Standard découverts dans les environnements de navigateur, y compris Android Mobile Wallet Adapter après son enregistrement sur les clients pris en charge.
- `subscribeSolanaWallets(listener)` : s'abonne aux événements d'enregistrement et de désenregistrement Wallet Standard.
- `adaptSolanaStandardWallet(walletInfo, options?)` : adapte un wallet Wallet Standard découvert en `SolanaWallet`.
- `disconnectSolanaStandardWallet(walletInfo)` : déconnecte un wallet Wallet Standard découvert via sa propre fonctionnalité `standard:disconnect` sans l'adapter, afin qu'un wallet que l'application ne sélectionne jamais ne reçoive aucune souscription `change`. Se résout à `false` lorsque le wallet n'expose aucune fonctionnalité de déconnexion, et rejette avec l'erreur propre au wallet.

## Helpers de wallet mobile

- `registerSolanaMobileWallet(options?)` : enregistre Android Mobile Wallet Adapter via Wallet Standard sur les clients Android Chrome pris en charge.
- `isSolanaMobileWalletSupported()` : indique si l'environnement d'exécution actuel prend en charge l'enregistrement web Android MWA.
- `getDefaultMobileWalletAppIdentity()` : dérive une identité d'application Mobile Wallet Adapter par défaut à partir du document actuel.
- `getSolanaIosWallets(options?)` : renvoie les entrées de wallet de navigateur iOS Phantom, Solflare et Backpack sur les navigateurs iOS.
- `adaptSolanaIosWallet(walletInfo, options?)` : adapte une entrée de wallet deep-link iOS en `SolanaWallet`.
- `handleSolanaIosWalletCallback(options?)` : valide et déchiffre les callbacks de redirection des wallets iOS.
- `waitForRedirect(options?)` : règle l'attente d'une redirection de wallet iOS. Elle ne se résout volontairement jamais dans la page (la redirection recharge la page et le bootstrap traite le callback) ; elle rejette avec `REDIRECT_TIMEOUT` après `timeoutMs` (10 minutes par défaut) ou avec la raison du signal lorsque `signal` est annulé, afin qu'un flux de deep link personnalisé puisse réinitialiser l'état `connecting` au lieu de rester bloqué.
- `isSolanaIosBrowserWalletSupported()` : indique si l'environnement d'exécution actuel doit exposer les liens de wallet de navigateur iOS.

Ces helpers sont compatibles SSR. L'enregistrement Android renvoie sans s'enregistrer lorsque `window` est indisponible, lorsque la page n'est pas dans un contexte sécurisé ou lorsque le navigateur n'est pas Android. La découverte de wallets iOS renvoie une liste vide lorsque le navigateur n'est pas un environnement de navigateur iOS.

## Helpers

L'export racine `@vue-solana/core` réexporte les helpers publics ci-dessous. Utilisez les sous-chemins directs lorsque vous voulez importer uniquement le module d'un helper plutôt que tout le barrel :

| Chemin d'import                    | Ce qu'il contient                                                                                          | À utiliser lorsque                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/action`          | `createSolanaActionStore()`, `SolanaActionState` et `isSolanaActionAborted()`.                             | Vous avez besoin d'une machine à états d'action asynchrone indépendante du framework, avec annulation à la redispatch, pour du travail Solana.            |
| `@vue-solana/core/address`         | `parseAddress()` et les types d'entrée d'adresse.                                                          | Vous acceptez une adresse Solana sous forme de chaîne, d'objet de type ref ou de getter et avez besoin d'une `Address` validée et normalisée.             |
| `@vue-solana/core/clusters`        | Helpers de cluster et d'endpoint par défaut.                                                               | Vous avez besoin de l'endpoint RPC ou WebSocket intégré au package pour `mainnet`, `mainnet-beta`, `testnet`, `devnet` ou `localnet`.                     |
| `@vue-solana/core/errors`          | `SolanaError`, fabriques d'erreurs et gardes d'erreurs.                                                    | Vous avez besoin de codes d'erreur stables pour les échecs de wallet, RPC, adresse, transaction, délai d'expiration ou stockage destinés à l'utilisateur. |
| `@vue-solana/core/ios-wallet`      | Découverte de wallet de navigateur iOS, adaptateurs deep-link et gestion des callbacks.                    | Vous câblez des liens de wallet iOS sans le flux unifié de wallets du plugin Vue.                                                                         |
| `@vue-solana/core/kit`             | `createSolanaClient()` et toute la surface `@solana/kit`.                                                  | Vous voulez l'API Kit moderne sans installer `@solana/kit` dans votre propre `package.json`.                                                              |
| `@vue-solana/core/mobile-wallet`   | Helpers d'enregistrement Android Mobile Wallet Adapter.                                                    | Vous devez enregistrer Android MWA avant de lire les wallets Wallet Standard.                                                                             |
| `@vue-solana/core/rpc`             | `createSolanaContext()`.                                                                                   | Vous voulez un client Kit configuré et des endpoints de cluster résolus sans installer le plugin Vue.                                                     |
| `@vue-solana/core/timeout`         | Helpers de délai d'expiration de promesse qui produisent des erreurs de timeout Solana.                    | Vous avez besoin d'un comportement de délai d'expiration cohérent avec les helpers de confirmation de transaction.                                        |
| `@vue-solana/core/transaction`     | Helpers d'envoi et de confirmation de transaction.                                                         | Vous avez besoin d'un chemin d'envoi conscient du wallet ou d'un résultat de confirmation pour une signature existante.                                   |
| `@vue-solana/core/token-accounts`  | Lectures sans état de comptes SPL Token (`getTokenAccountsByOwner`, `getTokenAccount`, `getTokenBalance`). | Vous avez besoin de lectures de comptes de token ou de soldes via l'API `jsonParsed` du RPC Kit.                                                          |
| `@vue-solana/core/types`           | Types TypeScript partagés.                                                                                 | Vous avez besoin de `SolanaConfig`, `SolanaContext`, `SolanaWallet`, des métadonnées de wallet ou des types d'options de transaction.                     |
| `@vue-solana/core/wallet`          | Assertions d'état de wallet et erreurs de capacité de wallet.                                              | Vous devez valider qu'un wallet sélectionné est connecté ou prend en charge la signature avant d'appeler ses méthodes.                                    |
| `@vue-solana/core/wallet-standard` | Mappage de chaîne Wallet Standard, découverte, souscriptions et helpers d'adaptateur.                      | Vous construisez votre propre couche de découverte de wallets au-dessus de Solana Wallet Standard.                                                        |

### Clusters et RPC

- `DEFAULT_CLUSTER` : cluster par défaut, actuellement `devnet`.
- `getClusterEndpoint(cluster?)` : renvoie l'endpoint RPC HTTP d'un cluster.
- `getClusterWebSocketEndpoint(cluster?)` : renvoie l'endpoint WebSocket d'un cluster.
- `getWebSocketEndpoint(endpoint)` : convertit les URL RPC `http`/`https` en URL `ws`/`wss`.
- `createSolanaClient(config?)` : crée un client `@solana/kit` dont le `rpc` est câblé vers l'endpoint résolu et les souscriptions WebSocket, avec le planificateur et l'exécuteur d'envoi de transaction officiels installés par défaut.
- `createSolanaContext(config?)` : crée `{ cluster, endpoint, wsEndpoint, client }` pour une configuration d'application indépendante du framework.

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

L'équivalent avec `createSolanaContext` :

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

Le sous-chemin `@vue-solana/core/kit` réexporte tout `@solana/kit` — la surface publique complète, valeurs et types — afin que vous n'installiez jamais `@solana/kit` dans votre propre `package.json` :

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)` : construit un client Kit pour le `SolanaConfig` donné. Réutilise la résolution d'endpoint de `clusters.ts`, câble `rpcSubscriptionsUrl` à partir de l'endpoint WebSocket résolu et installe par défaut le planificateur RPC officiel et l'exécuteur d'envoi de transaction.
- `client.rpc` expose toute l'API de lecture Solana (`getSlot`, `getBalance`, `getBlockHeight`, `getSignatureStatuses`, et plus encore) sous forme de fonctions RPC appelées avec `.send()`.
- `address(value)` : valide et renvoie une `Address` (marque de chaîne base58) — le remplacement Kit de `new PublicKey(...)`.
- `lamports(value: bigint)` : renvoie une valeur `Lamports` — le remplacement Kit des nombres de lamports bruts.
- Types couramment utilisés : `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`. Le sous-chemin réexporte tous les types exportés par `@solana/kit`, pas seulement ceux-ci.
- Quatre noms existent à la fois dans Kit et dans cette bibliothèque. Ils se résolvent vers la version de **cette bibliothèque** depuis le barrel racine (`@vue-solana/core`) et vers la version de **Kit** depuis le sous-chemin `/kit` : `SolanaError`, `SolanaErrorCode`, `isSolanaError` et `TransactionStatus`. Importez `isSolanaError` depuis `@vue-solana/core/kit` lorsque vous inspectez une erreur levée par Kit lui-même, car la garde du barrel racine ne correspond pas à la classe d'erreur de Kit.

Les résultats numériques RPC sont des `bigint`, et les données de compte sont des `Uint8Array` plutôt que des `Buffer`. Consultez [Migration vers Kit](/fr/guides/migration) pour les détails.

### Actions

`createSolanaActionStore()` enveloppe n'importe quelle fonction asynchrone qui reçoit un `AbortSignal` frais à chaque appel dans une machine à états d'action indépendante du framework. Les frameworks d'interface relient le store renvoyé à un état réactif ; le composable Vue `useAction()` est construit sur ce store.

```ts
import { createSolanaActionStore, isSolanaActionAborted } from "@vue-solana/core/action";

const { dispatch, getState, subscribe, reset, withSignal } = createSolanaActionStore(
  (signal, address: Address) => client.rpc.getBalance(address).send(),
);

await dispatch(address);
```

- Chaque `dispatch` annule l'appel en cours précédent avec un `AbortSignal` frais ; les appels remplacés rejettent avec une erreur d'annulation et ne corrompent jamais l'état.
- `getState()` / `subscribe(listener)` : instantané et flux de `SolanaActionState` (`status`, `data` et `error`).
- `withSignal(signal, ...args)` : compose une source d'annulation fournie par l'appelant pour un seul dispatch (délais d'expiration par tentative, interrupteurs d'arrêt partagés).
- `isSolanaActionAborted(error)` : vérifie si un rejet provient d'un appel annulé ou remplacé.

### Adresses

- `parseAddress(value)` : analyse une chaîne d'adresse, une valeur de type ref ou un getter et renvoie `null` pour une entrée nullish. Lève `INVALID_ADDRESS` pour une chaîne base58 invalide. Accepte les valeurs `Address` inchangées.

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
```

### Wallets

- `isWalletConnected(wallet)` : vérifie si un wallet est connecté et possède une clé publique.
- `assertWalletConnected(wallet)` : lève `WALLET_NOT_CONNECTED` si le wallet n'est pas connecté.
- `assertWalletCanSign(wallet)` : lève si le wallet est déconnecté ou ne prend pas en charge `signTransaction`.
- `assertWalletCanSignMessage(wallet)` : lève si le wallet est déconnecté ou ne prend pas en charge `signMessage`.

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### Transactions

- `signAndSendTransaction(client, wallet, transaction, options?)` : signe et envoie les octets bruts de la transaction au format wire en utilisant un wallet configuré et renvoie la signature RPC. Les wallets qui exposent `signAndSendTransaction` sont délégués ; sinon la transaction est signée avec `wallet.signTransaction` et soumise via `client.rpc.sendTransaction(...).send()`. Les wallets Android Mobile Wallet Adapter préfèrent la signature suivie d'une soumission RPC côté application, afin que l'application maîtrise la soumission et renvoie de manière fiable la signature RPC après le transfert vers le wallet.
- `confirmTransactionSignature(client, signature, options?)` : attend qu'une signature soumise atteigne le niveau de confirmation demandé. Utilise par défaut le niveau `confirmed`, un délai d'expiration de 60 secondes, un intervalle de polling de 1500 ms et interroge `client.rpc.getSignatureStatuses([signature]).send()`. Accepte `pollIntervalMs` (doit être supérieur à `0`), `abortSignal` et `searchTransactionHistory`. Une transaction échouée lève `TRANSACTION_FAILED`, une signature qui n'apparaît jamais lève `TRANSACTION_NOT_FOUND`, et une attente épuisée lève `TRANSACTION_TIMEOUT`. Passez `searchTransactionHistory: true` lorsque la signature a pu quitter le cache de statuts récents — sans cela, une signature plus ancienne n'apparaît jamais dans les résultats et se résout en `TRANSACTION_NOT_FOUND` après le délai d'expiration.

Le flux d'envoi côté client est distinct de ce helper conscient du wallet. Le client expose `sendTransaction()` et `sendTransactions()` via l'exécuteur officiel `rpcTransactionPlanSendingExecutor()` que `solanaRpc()` installe dans `createSolanaClient()` ; les composables Vue enveloppent ces méthodes. Ils planifient, signent, soumettent et attendent le niveau de confirmation `confirmed` ; le statut `sent` n'est défini qu'après la fin de cette opération d'envoi et de confirmation. Un résultat unique expose la signature soumise à `data.context.signature`, tandis qu'un résultat par lot contient l'arborescence complète du résultat du plan. L'expéditeur officiel n'affiche pas de popup de wallet.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL Token

Les lectures de token utilisent l'API `jsonParsed` du RPC Kit — aucune dépendance à `@solana/spl-token`.

- `getTokenAccountsByOwner(client, owner, options?)` : renvoie tous les comptes SPL Token et Token-2022 d'un propriétaire sous forme de `TokenAccountInfo[]` (`{ address, mint, owner, amount: bigint, decimals, state, isNative }`). Passez `programId` pour limiter à un seul programme.
- `getTokenAccount(client, address, commitment?)` : renvoie un seul compte de token analysé (`TokenAccountInfo | null`). Renvoie `null` lorsque le compte n'existe pas ou n'est pas un compte de token.
- `getTokenBalance(client, mint, owner, commitment?)` : lit le compte de token du propriétaire pour le mint donné et renvoie `{ amount, decimals }`. Renvoie `null` lorsqu'aucun compte de token n'existe.

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### Solana Pay

Les helpers Solana Pay sont implémentés directement sur `@solana/kit` ; aucun package Solana Pay supplémentaire ni package `gill` n'est requis.

- `encodeURL(fields)` / `encodeTransferRequestURL(fields)` / `encodeTransactionRequestURL(fields)` : construisent des URL de demande de transfert ou de transaction `solana:`. `amount` est un `bigint` en lamports et est encodé sous forme de chaîne décimale de SOL.
- `parseURL(value)` : valide et analyse une demande de transfert en champs typés `recipient`, `amount`, `splToken`, `reference`, `label`, `message` et `memo`. Lève `ParseURLError` pour un protocole, un destinataire, un mint de token, une référence, un montant ou une URL malformée invalides.
- `createQR(url, size?, background?, color?)` : génère un QR code sous forme de chaîne SVG. `createQRDataURL()` et `createQRCanvas()` fournissent d'autres cibles de rendu. L'encodeur `qrcode` est chargé paresseusement, afin que les consommateurs qui n'utilisent que les URL ne l'embarquent pas.
- `createRecipient(address)`, `createSPLToken(address)`, `isValidSolanaAddress(value)` : helpers de validation d'adresse.
- `createSolanaPayReference()` et `verifySolanaPayPayment()` se trouvent dans `@vue-solana/core/solana-pay-confirmation` ; `getSolanaPayPaymentStatus()` se trouve dans `@vue-solana/core/solana-pay-status`.

```ts
import { createQR, encodeURL, parseURL } from "@vue-solana/core/solana-pay";
import { address } from "@vue-solana/core/kit";

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  label: "Example store",
});

const parsed = parseURL(url.toString());
const svg = await createQR(url);
```

Les valeurs de référence sont des chaînes `Address` Kit. Analysez la sortie du scanner avec `parseURL()` et montrez le destinataire, le montant, le token, le label et le message à l'utilisateur avant de signer quoi que ce soit.

### Erreurs et délais d'expiration

- `SolanaError` : classe d'erreur normalisée avec un `code` stable et un `cause` d'origine facultatif.
- `createSolanaError(code, message, options?)` : crée une erreur Solana normalisée.
- `isSolanaError(error)` : restreint les erreurs inconnues à `SolanaError`.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)` : convertit les échecs inconnus en `SolanaError` et mappe les rejets de wallet courants vers `USER_REJECTED`.
- `withTimeout(promise, timeoutMs, createError?, options?)` : met une promesse en course contre une erreur de délai d'expiration fournie par l'appelant. Rejette `INVALID_INPUT` pour les délais `NaN` ou négatifs ; `{ signal }` annule l'attente avec la raison du signal, et `{ code, message }` définit l'erreur de délai d'expiration par défaut.
- `withSolanaTimeout(promise, timeoutMs, message)` : met une promesse en course contre une erreur `TRANSACTION_TIMEOUT`.

## Modèle d'erreur

Vue Solana normalise les échecs courants de wallet, RPC, adresse, transaction et stockage en `SolanaError`. Les applications doivent se brancher sur la valeur stable `error.code` plutôt que d'analyser les messages des adaptateurs ou du RPC.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // The user declined a wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // The operation timed out; check signature state before retrying.
        break;
      case "TRANSACTION_NOT_FOUND":
        // The signature never landed; safe to retry.
        break;
      case "TRANSACTION_FAILED":
        // The transaction errored on-chain; see error.cause.
        break;
      case "RPC_FAILURE":
        // RPC or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

Les codes d'erreur stables sont :

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `WALLET_FAILURE`
- `USER_REJECTED`
- `INVALID_SIGNATURE`
- `INVALID_ADDRESS`
- `INVALID_INPUT`
- `TRANSACTION_TIMEOUT`
- `TRANSACTION_NOT_FOUND`
- `TRANSACTION_FAILED`
- `REDIRECT_TIMEOUT`
- `DECRYPTION_FAILED`
- `MISSING_CLIENT_CAPABILITY`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` conserve l'erreur d'origine de l'adaptateur de wallet, du RPC, de l'analyse ou du stockage pour le débogage. Ne montrez pas les détails bruts de `cause` aux utilisateurs finaux à moins que l'application ne fasse explicitement confiance à cette source.

## Polyfill Buffer

Le code de navigateur qui sérialise des transactions Solana peut avoir besoin d'un global `Buffer` compatible Node. Initialisez-le avant le code de transaction avec `installSolanaBufferPolyfill()` de `@vue-solana/core/buffer-polyfill`. Le seul shim de types restant appartenant au package couvre le sous-chemin navigateur `buffer/` depuis lequel ce polyfill importe.

Les trois packages sont marqués `"sideEffects": false`, les bundlers peuvent donc supprimer tout import dont les liaisons ne sont pas utilisées. Importez le polyfill en tant qu'import nommé et appelez-le, comme dans l'extrait ci-dessus. Un import à effet de bord nu tel que `import "@vue-solana/core/buffer-polyfill"` n'installe rien, car le sous-chemin n'exporte que la fonction.
