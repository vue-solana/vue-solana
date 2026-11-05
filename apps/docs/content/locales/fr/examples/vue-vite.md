---
title: Exemple Vue Vite
description: Application d'exemple Vue 3 et Vite exécutable pour @vue-solana/vue.
ogSection: Exemples
surroundOrder: 19
---

L'exemple Vue Vite est une application Vue 3 exécutable pour `@vue-solana/vue`.

Source : <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

Démo en ligne : [vue-solana-docs.vercel.app/demo](/fr/demo)

## Ce que démontre l'exemple

- Installer le plugin Vue Solana avec `createSolanaPlugin()`.
- Lire l'état RPC avec `useRpc()`.
- Utiliser le client Kit injecté avec `useSolanaClient()`.
- Lire les soldes en lamports avec `useBalance()`.
- Découvrir les wallets d'extension de navigateur, les wallets Android Mobile Wallet Adapter et les entrées iOS de wallets de navigateur prises en charge avec `useWallets()`.
- Gérer l'état du wallet actif avec `useWallet()`.
- Persister les métadonnées de sélection du wallet et restaurer l'identité du wallet précédemment sélectionné au rechargement.
- Le comportement optionnel `autoConnect` qui reconnecte uniquement le wallet précédemment sélectionné lorsqu'il est découvert de nouveau.
- Afficher les états de capacités non prises en charge pour les wallets qui ne peuvent pas signer de messages ou de transactions.
- Suivre l'état d'une transaction asynchrone avec `useTransaction()`.
- Signer un message d'authentification avec `useSignMessage()` lorsque le wallet connecté le prend en charge.
- Envoyer un vrai transfert avec `useSignAndSendTransaction()` et afficher l'état de la transaction soumise par rapport à celle confirmée. L'exemple utilise devnet par défaut pour des tests sûrs.
- Construire des liens Solana Explorer tenant compte du cluster pour les signatures soumises.
- Exploiter la couche de données réactive de Kit dans les Live Data Panels : `useRequest()` pour les requêtes ponctuelles, `useSubscription()` pour les notifications de slot en direct via websocket, `useTrackedData()` pour les données de compte amorcées par un fetch et mises à jour par les notifications de compte, `useSignIn()` pour Sign In With Solana, `useAirdrop()` pour les demandes de faucet devnet, `usePayer()` pour inspecter le signer payeur de frais du client, `useSendTransaction()` et `useSendTransactions()` pour les transactions SPL Memo envoyées par le client sans popup de wallet, et `useRequestSwr()` depuis `@vue-solana/vue/swr` pour le stale-while-revalidate indexé par cache à travers les remontages.
- Construire et afficher des demandes de transfert Solana Pay avec `useSolanaPay()` et `useSolanaQrCode()`, vérifier le règlement par référence avec `useSolanaPayConfirmation()`, et prévisualiser des URLs de paiement scannées ou collées avec `useSolanaQrScanner()` sans jamais les envoyer automatiquement.
- Configurer un signer `payer` de démo (`generateKeyPairSigner()` depuis `@vue-solana/vue/kit`) dans `main.ts` afin que les transactions envoyées par le client puissent payer les frais. Le payeur démarre sans fonds ; le panneau `usePayer` lui airdrop 1 SOL de devnet.
- Utiliser la composition de client officielle `solanaRpc()` par défaut, qui installe elle-même le planificateur de transactions ainsi que les exécuteurs de signature et d'envoi de plans. La démo d'envoi par le client attend le commitment `confirmed` avant d'afficher `sent` ; elle n'utilise pas d'expéditeur de secours personnalisé.

L'application utilise `devnet` par défaut. Le SOL de devnet n'a aucune valeur réelle.

## Lancer depuis la racine du dépôt

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

Ouvrez l'URL Vite affichée dans le terminal, généralement `http://localhost:5173`.

## À essayer

- Vérifiez l'état RPC initial et le dernier blockhash.
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
- Dans les Live Data Panels, changez l'adresse suivie et observez les panneaux de requête, de subscription et de tracked-data se redéclencher.
- Dans les Live Data Panels, airdropez 1 SOL au payeur de démo avec le panneau `usePayer`, puis envoyez un SPL Memo signé par le client avec `useSendTransaction()` (sans popup de wallet) ou un lot de deux avec `useSendTransactions()`, et observez l'état passer de `sending` à `sent` une fois que l'exécuteur officiel atteint le commitment `confirmed`.
- Activez et désactivez la carte SWR et observez la valeur en cache apparaître immédiatement (stale) avant que la requête revalidée ne la remplace.
- Dans les panneaux Solana Pay, créez une demande de transfert avec une référence et affichez son QR code, puis collez la même URL dans le panneau de scan pour inspecter le destinataire, le montant, le token et le mémo analysés. `Verify settlement` renvoie `expired` tant qu'un paiement n'arrive pas sous cette référence ; le scanner ouvre uniquement la demande dans un wallet et ne l'envoie jamais.

Le payeur de démo généré n'existe que dans la session du navigateur et n'est configuré ni dans `nuxt.config.ts` ni dans une configuration runtime publique. Utilisez un signer détenu par le serveur pour les relayers de production, et ne livrez jamais une keypair approvisionnée au navigateur d'un utilisateur final.

L'exemple de transfert initialise le polyfill `Buffer` du navigateur avec `installSolanaBufferPolyfill()` depuis `@vue-solana/vue/buffer-polyfill`. Redémarrez le serveur de dev Vite si Vite a précédemment mis en cache un import Buffer externalisé.

Si la confirmation expire après l'apparition d'une signature, ne soumettez pas immédiatement un transfert en double. Utilisez l'état de signature ou le lien explorer de l'exemple pour vérifier si la transaction a été confirmée plus tard.

## SOL de devnet

Demandez du SOL de devnet gratuit depuis le faucet officiel :

```txt
https://faucet.solana.com
```

## Note sur les wallets

L'exemple utilise la découverte unifiée des wallets. Installez Phantom, Solflare, Backpack ou un autre wallet standard avant de tester les flux de wallets d'extension de navigateur. Sur les runtimes Android Chrome pris en charge, `@solana-mobile/wallet-standard-mobile` peut exposer les wallets mobiles natifs installés via `Mobile Wallet Adapter` dans la même liste de wallets. Sur les navigateurs iOS, Phantom, Solflare et Backpack peuvent apparaître via des liens universels propres à chaque wallet.

La prise en charge des liens de protocole des wallets natifs de bureau ne fait intentionnellement pas partie du flux de l'exemple v1.
