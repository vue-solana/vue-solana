---
title: "Tests E2E"
description: Exécutez la suite e2e Playwright et mockez le RPC Solana, les abonnements RPC et les wallets pour les tests d'interface.
ogSection: Guides
surroundOrder: 15
---

Les apps d'exemple du dépôt sont couvertes par une suite Playwright dans `e2e/`. Par défaut, la suite exécute les apps d'exemple Vue Vite et Nuxt compilées contre des mocks RPC déterministes, et contre le devnet réel dans une exécution d'intégration séparée.

Utilisez ce guide lorsque vous ajoutez des fonctionnalités aux apps d'exemple, modifiez le comportement d'un composable visible dans les exemples, ou souhaitez mocker le RPC Solana dans vos propres tests Playwright.

## Exécuter la suite

```sh
# Build the packages and both example apps, then run Playwright.
pnpm test:e2e

# Integration run against real devnet (no RPC mocks).
pnpm test:e2e:integration

# Install the Chromium browser binary once.
pnpm test:e2e:install
```

La configuration Playwright démarre automatiquement les deux serveurs de prévisualisation des exemples (`reuseExistingServer` est activé en dehors de la CI, donc un serveur que vous avez démarré manuellement est réutilisé).

## Modes de simulation (mock)

| Mode        | Commande                    | RPC                      | Abonnements RPC             | Wallets                                       |
| ----------- | --------------------------- | ------------------------ | --------------------------- | --------------------------------------------- |
| Par défaut  | `pnpm test:e2e`             | Mocké (`e2e/helpers.ts`) | Mocké via un faux websocket | Wallets Wallet Standard mockés                |
| Intégration | `pnpm test:e2e:integration` | Devnet réel              | Devnet réel                 | Wallets réellement installés (specs ignorées) |

Les specs qui s'appuient sur des données mockées s'ignorent elles-mêmes sous `E2E_REAL_RPC=true` avec `test.skip(isRealRpcRun(), ...)`, afin que les mêmes fichiers de spec s'exécutent dans les deux modes.

## Mocker le RPC HTTP

`mockSolanaRpc(page)` intercepte `https://api.devnet.solana.com/**` et répond de manière déterministe aux méthodes connues :

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

Méthodes prises en charge : `getLatestBlockhash`, `getBalance`, `getVersion`, `getAccountInfo`. Les méthodes inconnues renvoient `{ jsonrpc: "2.0", id, result: null }`. Le preflight CORS (`OPTIONS`) reçoit une réponse `204`.

Lorsque vous ajoutez un appel RPC à une app d'exemple, ajoutez la méthode à `createRpcResponse()` dans `e2e/helpers.ts`. Conservez les valeurs numériques sous une forme compatible JSON (`rentEpoch` est passé en chaîne car le vrai `u64::MAX` dépasse la plage d'entiers sûrs de JavaScript).

## Mocker les abonnements RPC via websocket

`mockSolanaSubscriptions(page)` étend le mock HTTP avec un faux endpoint `wss://api.devnet.solana.com/**` qui implémente le protocole d'abonnement JSON-RPC utilisé par `@solana/kit` :

1. Le client envoie `{ jsonrpc, id, method: "<method>Subscribe", params }`.
2. Le serveur répond `{ jsonrpc, id, result: <subscriptionId> }`.
3. Les mises à jour arrivent sous la forme `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }`. Kit démultiplexe sur `params.subscription` et transforme `params.result`.
4. Kit envoie des keepalives `{ method: "ping" }` sans `id` ; le mock les ignore.

La fonction renvoie un harnais permettant de piloter les notifications depuis un test :

```ts
import { mockSolanaSubscriptions } from "./helpers";

test("live data", async ({ page }) => {
  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // Assert the seeded value, then push an update.
  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  subscriptions.pushSlotNotification(24_042, 24_040);

  // How many sockets currently hold at least one subscription.
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);
});
```

- `pushAccountNotification(lamports, slot)` envoie un `accountNotification` avec une charge utile `{ context: { slot }, value: { lamports, data, ... } }` (la forme `accountNotifications`) à chaque abonnement de compte ouvert.
- `pushSlotNotification(slot, root)` envoie un `slotNotification` avec `{ slot, root, parent }` à chaque abonnement de slot ouvert.
- Les requêtes `slotSubscribe` reçoivent aussi une notification immédiate, afin que `useSubscription` dispose de données sans injection pilotée par le test.

Le format de transmission est structurant : si `@solana/kit` change son démultiplexage, les specs adossées aux abonnements (mises à jour des notifications de slot et de compte) échouent, ce qui constitue le signal d'alerte précoce attendu.

## Mocker des wallets Wallet Standard

La spec d'exemple définit un helper local `registerMockWallets(page)` (dans `e2e/example-apps.spec.ts`, non exporté depuis `e2e/helpers.ts`) qui injecte deux wallets Wallet Standard via `page.addInitScript` avant le démarrage de l'app :

- **Mock Signer Wallet** — prend en charge `standard:connect`, `standard:disconnect`, `standard:events`, `solana:signMessage` et `solana:signIn` (SIWS). `signMessage` renvoie les octets de signature `[1..8]` ; `signIn` renvoie un compte, un message et une signature fixes.
- **Mock Readonly Wallet** — ne prend en charge que connect/disconnect/events, pour vérifier l'interface des capacités non prises en charge.

Les wallets s'enregistrent eux-mêmes des deux façons qu'attend Wallet Standard : ils écoutent `wallet-standard:app-ready` (pour s'enregistrer dans l'app) et déclenchent `wallet-standard:register-wallet` (pour les apps initialisées en premier).

## Assertions à réutiliser

- Enveloppez les flux dans `expectNoPageErrors(page, run)` de `e2e/helpers.ts` pour échouer sur toute `pageerror` ou `console.error` pendant le flux.
- Préférez les identifiants `data-testid` (`getByTestId`) aux sélecteurs de texte ou de rôle pour les surfaces stables des apps d'exemple.
- Pour la sémantique SWR, vérifiez les deux phases : la valeur obsolète mise en cache apparaît immédiatement après le remontage, puis la valeur revalidée la remplace.
