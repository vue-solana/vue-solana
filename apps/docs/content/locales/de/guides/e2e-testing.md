---
title: "E2E-Tests"
description: Führe die Playwright-E2E-Suite aus und mocke Solana-RPC, RPC-Subscriptions und Wallets für UI-Tests.
ogSection: Anleitungen
surroundOrder: 15
---

Die Beispiel-Apps des Repositorys werden von einer Playwright-Suite in `e2e/` abgedeckt. Standardmäßig fährt die Suite die gebauten Beispiel-Apps von Vue Vite und Nuxt gegen deterministische RPC-Mocks, in einem separaten Integrationslauf gegen echtes Devnet.

Nutze diese Anleitung, wenn du Funktionen der Beispiel-Apps ergänzt, das in den Beispielen sichtbare Verhalten von Composables änderst oder Solana-RPC in deinen eigenen Playwright-Tests mocken willst.

## Suite ausführen

```sh
# Build the packages and both example apps, then run Playwright.
pnpm test:e2e

# Integration run against real devnet (no RPC mocks).
pnpm test:e2e:integration

# Install the Chromium browser binary once.
pnpm test:e2e:install
```

Die Playwright-Konfiguration startet beide Preview-Server der Beispiele automatisch (`reuseExistingServer` ist außerhalb von CI aktiv, ein manuell gestarteter Server wird also wiederverwendet).

## Mock-Modi

| Modus       | Befehl                      | RPC                        | RPC-Subscriptions               | Wallets                                                      |
| ----------- | --------------------------- | -------------------------- | ------------------------------- | ------------------------------------------------------------ |
| Standard    | `pnpm test:e2e`             | Gemockt (`e2e/helpers.ts`) | Gemockt über ein Fake-Websocket | Gemockte Wallet-Standard-Wallets                             |
| Integration | `pnpm test:e2e:integration` | Echtes Devnet              | Echtes Devnet                   | Echt installierte Wallets (Wallet-Specs werden übersprungen) |

Specs, die gegen Mock-Daten prüfen, überspringen sich bei `E2E_REAL_RPC=true` selbst mit `test.skip(isRealRpcRun(), ...)`, sodass dieselben Spec-Dateien in beiden Modi laufen.

## HTTP-RPC mocken

`mockSolanaRpc(page)` leitet `https://api.devnet.solana.com/**` um und beantwortet bekannte Methoden deterministisch:

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

Behandelte Methoden: `getLatestBlockhash`, `getBalance`, `getVersion`, `getAccountInfo`. Unbekannte Methoden liefern `{ jsonrpc: "2.0", id, result: null }`. CORS-Preflight (`OPTIONS`) wird mit `204` beantwortet.

Wenn du einer Beispiel-App einen RPC-Aufruf hinzufügst, ergänze die Methode in `createRpcResponse()` in `e2e/helpers.ts`. Halte numerische Werte JSON-sicher (`rentEpoch` wird als String übergeben, weil das echte `u64::MAX` den sicheren Ganzzahlbereich von JavaScript überschreitet).

## RPC-Subscriptions über WebSocket mocken

`mockSolanaSubscriptions(page)` erweitert den HTTP-Mock um einen Fake-Endpunkt `wss://api.devnet.solana.com/**`, der das JSON-RPC-Subscription-Protokoll implementiert, das `@solana/kit` spricht:

1. Der Client sendet `{ jsonrpc, id, method: "<method>Subscribe", params }`.
2. Der Server antwortet mit `{ jsonrpc, id, result: <subscriptionId> }`.
3. Updates kommen als `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }`. Kit demultiplext über `params.subscription` und transformiert `params.result`.
4. Kit sendet `{ method: "ping" }`-Keepalives ohne `id`; der Mock ignoriert sie.

Die Funktion liefert ein Harness, mit dem ein Test Benachrichtigungen auslösen kann:

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

- `pushAccountNotification(lamports, slot)` sendet eine `accountNotification` mit einer `{ context: { slot }, value: { lamports, data, ... } }`-Nutzlast (der `accountNotifications`-Form) an jede offene Konto-Subscription.
- `pushSlotNotification(slot, root)` sendet eine `slotNotification` mit `{ slot, root, parent }` an jede offene Slot-Subscription.
- `slotSubscribe`-Anfragen erhalten zusätzlich sofort eine Benachrichtigung, damit `useSubscription` auch ohne testgesteuerte Pushes Daten hat.

Das Wire-Format ist tragend: Ändert `@solana/kit` sein Demultiplexing, schlagen die subscriptiongestützten Specs (Slot- und Konto-Benachrichtigungsupdates) fehl — das ist das gewünschte Frühwarnsignal.

## Wallet-Standard-Wallets mocken

Der Beispiel-Spec definiert einen spec-lokalen Helfer `registerMockWallets(page)` (in `e2e/example-apps.spec.ts`, nicht aus `e2e/helpers.ts` exportiert), der vor dem Start der App über `page.addInitScript` zwei Wallet-Standard-Wallets injiziert:

- **Mock Signer Wallet** — unterstützt `standard:connect`, `standard:disconnect`, `standard:events`, `solana:signMessage` und `solana:signIn` (SIWS). `signMessage` liefert die Signaturbytes `[1..8]`; `signIn` liefert ein festes Konto, eine feste Nachricht und eine feste Signatur.
- **Mock Readonly Wallet** — unterstützt nur connect/disconnect/events, um die UI für nicht unterstützte Fähigkeiten zu prüfen.

Die Wallets registrieren sich selbst auf beide Arten, die Wallet Standard erwartet: Sie lauschen auf `wallet-standard:app-ready` (um sich in die App einzutragen) und senden `wallet-standard:register-wallet` (für Apps, die zuerst initialisiert wurden).

## Assertions zum Übernehmen

- Umschließe Abläufe mit `expectNoPageErrors(page, run)` aus `e2e/helpers.ts`, um bei jedem `pageerror` oder `console.error` während des Ablaufs fehlzuschlagen.
- Bevorzuge `data-testid`-Handles (`getByTestId`) gegenüber Text- oder Rollen-Selektoren für die stabilen Oberflächen der Beispiel-Apps.
- Prüfe bei SWR-Semantik beide Phasen: Der veraltete Cache-Wert erscheint direkt nach dem erneuten Einhängen, dann ersetzt ihn der revalidierte Wert.
