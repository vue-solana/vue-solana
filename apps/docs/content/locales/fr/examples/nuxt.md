---
title: Exemple Nuxt
description: Application d'exemple Nuxt exécutable pour @vue-solana/nuxt.
ogSection: Exemples
surroundOrder: 20
---

L'exemple Nuxt est une application Nuxt exécutable pour `@vue-solana/nuxt`.

Source : <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/nuxt" target="_blank" rel="noopener noreferrer"><code>examples/nuxt</code></a>

Démo en ligne : [vue-solana-docs.vercel.app/demo](/fr/demo)

## Ce que démontre l'exemple

- Installer le module Nuxt avec `modules: ['@vue-solana/nuxt']`.
- Configurer le module avec `solana: { cluster: 'devnet' }`.
- Lire l'état RPC avec `useSolanaRpc()` auto-importé.
- Utiliser le client Kit injecté avec `useSolanaClient()` auto-importé.
- Lire les soldes en lamports avec `useSolanaBalance()`.
- Découvrir les wallets d'extension de navigateur, les wallets Android Mobile Wallet Adapter et les entrées iOS de wallets de navigateur prises en charge avec `useSolanaWallets()`.
- Gérer l'état du wallet actif avec `useSolanaWallet()`.
- Persister les métadonnées de sélection du wallet et restaurer l'identité du wallet précédemment sélectionné au rechargement.
- Le comportement optionnel `autoConnect` qui reconnecte uniquement le wallet précédemment sélectionné lorsqu'il est découvert de nouveau.
- Afficher les états de capacités non prises en charge pour les wallets qui ne peuvent pas signer de messages ou de transactions.
- Signer un message d'authentification avec `useSolanaSignMessage()` auto-importé lorsque le wallet connecté le prend en charge.
- Envoyer un vrai transfert avec `useSolanaSignAndSendTransaction()` et afficher l'état de la transaction soumise par rapport à celle confirmée. L'exemple utilise devnet par défaut pour des tests sûrs.
- Construire des liens Solana Explorer tenant compte du cluster pour les signatures soumises.
- Utiliser `useTransaction()` depuis `@vue-solana/vue/useTransaction` pour l'état générique d'une transaction asynchrone.
- Exploiter la couche de données réactive de Kit dans les Live Data Panels avec les composables auto-importés : `useSolanaRequest()` pour les requêtes ponctuelles, `useSolanaSubscription()` pour les notifications de slot en direct, `useSolanaTrackedData()` pour les données de compte amorcées par un fetch, `useSolanaSignIn()` pour Sign In With Solana, `useSolanaAirdrop()` pour les demandes de faucet devnet, `useSolanaPayer()` pour inspecter le signer payeur de frais du client, `useSolanaSendTransaction()` et `useSolanaSendTransactions()` pour les transactions SPL Memo envoyées par le client sans popup de wallet, et l'adaptateur de cache `@vue-solana/vue/swr` à travers les remontages.
- Construire et afficher des demandes de transfert Solana Pay avec `useSolanaPay()` et `useSolanaQrCode()` auto-importés, vérifier le règlement par référence avec `useSolanaPayConfirmation()`, et prévisualiser des URLs de paiement scannées ou collées avec `useSolanaQrScanner()` dans `<ClientOnly>` afin que les API de caméra ne s'exécutent jamais pendant le SSR.
- Générer un payeur de frais de démo éphémère avec `generateKeyPairSigner()` dans le plugin côté client `app/plugins/demo-payer.client.ts`. Le payeur démarre sans fonds ; le panneau `useSolanaPayer` lui airdrop 1 SOL de devnet. Le module Nuxt omet volontairement `payer` et `payerSecretKey`, et les secrets bruts ne doivent jamais être placés dans la configuration runtime publique.

L'application utilise `devnet` par défaut. Le SOL de devnet n'a aucune valeur réelle.

## Lancer depuis la racine du dépôt

```sh
pnpm install
pnpm build:packages
pnpm dev:nuxt
```

Ouvrez l'URL Nuxt affichée dans le terminal, généralement `http://localhost:3000`.

## À essayer

- Vérifiez l'état initial du module/RPC et le dernier blockhash.
- Cliquez sur `Load Blockhash` pour appeler directement `client.rpc.getLatestBlockhash().send()`.
- Collez une adresse de wallet devnet et actualisez le solde.
- Installez un wallet Solana de navigateur et basculez-le sur devnet.
- Sur Android Chrome, installez un wallet mobile Solana compatible et cherchez `Mobile Wallet Adapter`.
- Sur les navigateurs iOS, installez Phantom, Solflare ou Backpack et cherchez l'entrée du wallet dans la même liste.
- Sélectionnez et connectez un wallet découvert.
- Rechargez la page et vérifiez que la même identité de wallet sélectionné est restaurée sans sélectionner un wallet installé arbitraire.
- Signez le message d'authentification d'exemple si le wallet indique prendre en charge la signature de messages.
- Confirmez que le bouton de signature de message est désactivé ou expliqué lorsque le wallet sélectionné ne prend pas en charge `signMessage`.
- Exécutez la transaction factice générique.
- Saisissez une adresse de destinataire et un montant, puis envoyez un vrai transfert. Gardez l'exemple sur devnet pendant les tests.
- Observez la transaction passer de la signature soumise à l'état de confirmation.
- Ouvrez le lien explorer et vérifiez qu'il contient `?cluster=devnet`.
- Dans les Live Data Panels, airdropez 1 SOL au payeur de démo avec le panneau `useSolanaPayer`, puis envoyez un SPL Memo signé par le client avec `useSolanaSendTransaction()` (sans popup de wallet) ou un lot de deux avec `useSolanaSendTransactions()`, et observez l'état passer de `sending` à `sent` une fois que l'exécuteur officiel atteint le commitment `confirmed`.
- Dans les panneaux Solana Pay, créez une demande de transfert avec une référence et affichez son QR code, puis collez la même URL dans le panneau de scan pour inspecter le destinataire, le montant, le token et le mémo analysés. `Verify settlement` renvoie `expired` tant qu'un paiement n'arrive pas sous cette référence ; le scanner ouvre uniquement la demande dans un wallet et ne l'envoie jamais.

Le payeur de démo est généré dans un plugin côté client et n'est pas configuré dans `nuxt.config.ts` ni dans la configuration runtime publique. L'exemple définit `solana.clientPlugin: false` pour que le module ignore son propre plugin ; installer les deux créerait deux contextes Solana. Le client par défaut du module utilise toujours la pile officielle `solanaRpc()`, qui installe elle-même le planificateur de transactions ainsi que les exécuteurs de signature et d'envoi de plans ; l'ancien expéditeur de secours personnalisé n'est pas utilisé. Ne placez jamais un secret approvisionné dans une valeur runtime publique de Nuxt.

L'exemple de transfert initialise le polyfill `Buffer` du navigateur avec `installSolanaBufferPolyfill()` depuis `@vue-solana/nuxt/buffer-polyfill`. Redémarrez le serveur de dev Nuxt si Vite a précédemment mis en cache un import Buffer externalisé.

Si la confirmation expire après l'apparition d'une signature, ne soumettez pas immédiatement un transfert en double. Utilisez l'état de signature ou le lien explorer de l'exemple pour vérifier si la transaction a été confirmée plus tard.

## SOL de devnet

Demandez du SOL de devnet gratuit depuis le faucet officiel :

```txt
https://faucet.solana.com
```

## Note sur les wallets

L'exemple utilise la découverte unifiée des wallets. Installez Phantom, Solflare, Backpack ou un autre wallet standard avant de tester les flux de wallets d'extension de navigateur. Sur les runtimes Android Chrome pris en charge, `@solana-mobile/wallet-standard-mobile` peut exposer les wallets mobiles natifs installés via `Mobile Wallet Adapter` dans la même liste de wallets. Sur les navigateurs iOS, Phantom, Solflare et Backpack peuvent apparaître via des liens universels propres à chaque wallet.

La prise en charge des liens de protocole des wallets natifs de bureau ne fait intentionnellement pas partie du flux de l'exemple v1.
