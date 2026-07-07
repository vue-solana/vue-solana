---
title: Ejemplo Vue Vite
description: App de ejemplo ejecutable con Vue 3 y Vite para @vue-solana/vue.
ogSection: Ejemplos
surroundOrder: 17
---

El ejemplo Vue Vite es una app Vue 3 ejecutable para `@vue-solana/vue`.

Fuente: <a href="https://github.com/vue-solana/vue-solana/tree/main/examples/vue-vite" target="_blank" rel="noopener noreferrer"><code>examples/vue-vite</code></a>

Demo en vivo: [vue-solana-docs.vercel.app/demo](/demo)

## Qué demuestra

- Instalar el plugin de Vue Solana con `createSolanaPlugin()`.
- Leer estado RPC con `useRpc()`.
- Usar la `Connection` inyectada con `useConnection()`.
- Leer balances en lamports con `useBalance()`.
- Descubrir wallets de extensión de navegador, wallets Android Mobile Wallet Adapter y entradas soportadas de wallets para navegador iOS con `useWallets()`.
- Gestionar el estado de la wallet activa con `useWallet()`.
- Persistir metadatos de selección de wallet y restaurar la identidad de wallet previamente seleccionada al recargar.
- Comportamiento opcional de `autoConnect` que reconecta solo la wallet previamente seleccionada cuando vuelve a descubrirse.
- Renderizar estados de capacidades no soportadas para wallets que no pueden firmar mensajes o transacciones.
- Rastrear estado de transacción asíncrona con `useTransaction()`.
- Firmar un mensaje de autenticación con `useSignMessage()` cuando la wallet conectada lo soporta.
- Enviar una transferencia real con `useSignAndSendTransaction()` y mostrar estado de transacción enviada vs confirmada. El ejemplo usa devnet por defecto para pruebas seguras.
- Construir links a Solana Explorer conscientes del cluster para firmas enviadas.

La app usa `devnet` por defecto. El SOL de devnet no tiene valor real.

## Ejecutar desde la raíz del repositorio

```sh
pnpm install
pnpm build:packages
pnpm dev:vue
```

Abre la URL de Vite impresa en la terminal, normalmente `http://localhost:5173`.

## Qué probar

- Revisa el estado RPC inicial y el último blockhash.
- Haz clic en `Load Blockhash` para llamar directamente a `connection.getLatestBlockhash()`.
- Pega una dirección de wallet de devnet y refresca el balance.
- Instala una wallet Solana de navegador y cámbiala a devnet.
- En Android Chrome, instala una wallet móvil Solana compatible y busca `Mobile Wallet Adapter`.
- En navegadores iOS, instala Phantom, Solflare o Backpack y busca la entrada de wallet en la misma lista.
- Selecciona y conecta una wallet descubierta.
- Recarga la página y verifica que se restaure la misma identidad de wallet seleccionada sin seleccionar una wallet instalada arbitraria.
- Firma el mensaje de auth de ejemplo si la wallet reporta soporte de firma de mensajes.
- Confirma que el botón de firma de mensajes está deshabilitado o explicado cuando la wallet seleccionada no soporta `signMessage`.
- Ejecuta la transacción mock genérica.
- Ingresa una dirección destinataria y un monto, luego envía una transferencia real. Mantén el ejemplo en devnet mientras pruebas.
- Observa cómo la transacción avanza desde firma enviada hasta estado de confirmación.
- Abre el link del explorador y verifica que incluya `?cluster=devnet`.

El ejemplo de transferencia inicializa el polyfill de navegador `Buffer` con `installSolanaBufferPolyfill()` desde `@vue-solana/vue/buffer-polyfill`. Reinicia el servidor de desarrollo de Vite si Vite cacheó previamente un import externalizado de Buffer.

Si la confirmación expira después de que aparece una firma, no envíes inmediatamente una transferencia duplicada. Usa el estado de firma del ejemplo o el link del explorador para comprobar si la transacción confirmó más tarde.

## SOL de devnet

Solicita SOL de devnet gratis desde el faucet oficial:

```txt
https://faucet.solana.com
```

## Nota sobre wallets

El ejemplo usa descubrimiento unificado de wallets. Instala Phantom, Solflare, Backpack u otra wallet estándar antes de probar flujos de wallet de extensión de navegador. En runtimes Android Chrome soportados, `@solana-mobile/wallet-standard-mobile` puede exponer wallets móviles nativas instaladas mediante `Mobile Wallet Adapter` en la misma lista de wallets. En navegadores iOS, Phantom, Solflare y Backpack pueden aparecer mediante universal links específicos de wallet.

El soporte de protocol-link para wallets nativas de escritorio intencionalmente no forma parte del flujo de ejemplo v1.
