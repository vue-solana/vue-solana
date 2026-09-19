---
title: "Pruebas E2E"
description: Ejecuta la suite e2e de Playwright y simula RPC de Solana, suscripciones RPC y wallets para pruebas de UI.
ogSection: Guides
surroundOrder: 14
---

Las apps de ejemplo del repositorio están cubiertas por una suite de Playwright en `e2e/`. La suite ejecuta las apps de ejemplo Vue Vite y Nuxt compiladas contra mocks deterministas de RPC por defecto, y contra devnet real en una ejecución de integración separada.

Usa esta guía cuando añadas funcionalidades a las apps de ejemplo, cambies el comportamiento de un composable visible en los ejemplos, o quieras simular RPC de Solana en tus propias pruebas de Playwright.

## Ejecutar la suite

```sh
# Compila los paquetes y ambas apps de ejemplo, luego ejecuta Playwright.
pnpm test:e2e

# Ejecución de integración contra devnet real (sin mocks de RPC).
pnpm test:e2e:integration

# Instala el binario del navegador Chromium una vez.
pnpm test:e2e:install
```

La configuración de Playwright inicia automáticamente ambos servidores de preview de las apps de ejemplo (`reuseExistingServer` está activado fuera de CI, así que un servidor que hayas iniciado manualmente se reutiliza).

## Modos de simulación

| Modo        | Comando                     | RPC                         | Suscripciones RPC                 | Wallets                                                   |
| ----------- | --------------------------- | --------------------------- | --------------------------------- | --------------------------------------------------------- |
| Por defecto | `pnpm test:e2e`             | Simulado (`e2e/helpers.ts`) | Simulado sobre un websocket falso | Wallets Wallet Standard simuladas                         |
| Integración | `pnpm test:e2e:integration` | Devnet real                 | Devnet real                       | Wallets reales instaladas (las specs de wallet se omiten) |

Las specs que verifican datos simulados se omiten a sí mismas bajo `E2E_REAL_RPC=true` con `test.skip(isRealRpcRun(), ...)`, así que los mismos archivos de specs se ejecutan en ambos modos.

## Simular el RPC HTTP

`mockSolanaRpc(page)` intercepta `https://api.devnet.solana.com/**` y responde métodos conocidos de forma determinista:

```ts
import { mockSolanaRpc } from "./helpers";

test.beforeEach(async ({ page }) => {
  await mockSolanaRpc(page);
});
```

Métodos manejados: `getLatestBlockhash`, `getBalance`, `getVersion`, `getAccountInfo` y `getHealth`. Los métodos desconocidos devuelven `{ jsonrpc: "2.0", id, result: null }`. El preflight CORS (`OPTIONS`) se responde con `204`.

Cuando añadas una llamada RPC a una app de ejemplo, añade el método a `createRpcResponse()` en `e2e/helpers.ts`. Mantén los valores numéricos como valores seguros para JSON (`rentEpoch` se pasa como string porque el `u64::MAX` real excede el rango de enteros seguros de JavaScript).

## Simular suscripciones RPC sobre websocket

`mockSolanaSubscriptions(page)` extiende el mock HTTP con un endpoint falso `wss://api.devnet.solana.com/**` que implementa el protocolo de suscripción JSON-RPC que habla `@solana/kit`:

1. El cliente envía `{ jsonrpc, id, method: "<method>Subscribe", params }`.
2. El servidor responde `{ jsonrpc, id, result: <subscriptionId> }`.
3. Las actualizaciones llegan como `{ jsonrpc, method: "<method>Notification", params: { subscription: <id>, result: <payload> } }`. Kit demultiplexa por `params.subscription` y transforma `params.result`.
4. Kit envía keepalives `{ method: "ping" }` sin `id`; el mock los ignora.

La función resuelve a un harness para dirigir notificaciones desde una prueba:

```ts
import { mockSolanaSubscriptions } from "./helpers";

test("live data", async ({ page }) => {
  const subscriptions = await mockSolanaSubscriptions(page);
  await page.goto("/");

  // Verifica el valor sembrado, luego empuja una actualización.
  subscriptions.pushAccountNotification(43_000_000_000, 123_457);
  subscriptions.pushSlotNotification(24_042, 24_040);

  // Cuántos sockets mantienen al menos una suscripción activa.
  expect(subscriptions.openSubscriptionCount()).toBeGreaterThanOrEqual(1);
});
```

- `pushAccountNotification(lamports, slot)` envía una `accountNotification` con un payload `{ context: { slot }, value: { lamports, data, ... } }` (la forma de `accountNotifications`) a todas las suscripciones de cuenta abiertas.
- `pushSlotNotification(slot, root)` envía una `slotNotification` con `{ slot, root, parent }` a todas las suscripciones de slot abiertas.
- Las peticiones `slotSubscribe` también reciben una notificación inmediata para que `useSubscription` tenga datos sin empujes dirigidos por la prueba.

El formato de cable es crítico: si `@solana/kit` cambia su demultiplexación, las specs respaldadas por suscripciones (actualizaciones de notificaciones de slot y cuenta) fallan, que es exactamente la señal de alerta temprana buscada.

## Simular wallets Wallet Standard

`registerMockWallets(page)` inyecta dos wallets Wallet Standard mediante `page.addInitScript` antes de que la app arranque:

- **Mock Signer Wallet** — soporta `standard:connect`, `standard:disconnect`, `standard:events`, `solana:signMessage` y `solana:signIn` (SIWS). `signMessage` devuelve los bytes de firma `[1..8]`; `signIn` devuelve una cuenta, mensaje y firma fijos.
- **Mock Readonly Wallet** — soporta solo connect/disconnect/events, para verificar la UI de capacidades no soportadas.

Las wallets se registran de ambas maneras que Wallet Standard espera: escuchan `wallet-standard:app-ready` (para registrarse en la app) y emiten `wallet-standard:register-wallet` (para apps inicializadas primero).

## Aserciones para copiar

- Envuelve los flujos con `expectNoPageErrors(page, run)` de `e2e/helpers.ts` para fallar ante cualquier `pageerror` o `console.error` durante el flujo.
- Prefiere selectores `data-testid` (`getByTestId`) sobre selectores de texto o rol para las superficies estables de las apps de ejemplo.
- Para semántica SWR, verifica ambas fases: el valor en caché (obsoleto) aparece inmediatamente tras el remontaje, luego el valor revalidado lo reemplaza.
