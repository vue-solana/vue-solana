---
title: Ejemplo Nuxt
description: Aplicación de ejemplo ejecutable para @vue-solana/nuxt.
ogSection: Ejemplos
surroundOrder: 18
---

El ejemplo Nuxt muestra el flujo con el módulo `@vue-solana/nuxt` y composables autoimportados.

## Qué demuestra

- Configuración del módulo en `nuxt.config.ts`.
- Uso de `useSolanaRpc()` y `useSolanaConnection()`.
- Lecturas de balance con `useSolanaBalance()`.
- Estado de wallet con `useSolanaWallet()`.
- Flujo de transacciones en cliente.

## Ejecutar desde la raíz del repositorio

```sh
pnpm install
pnpm dev:nuxt
```

## Qué probar

- Confirmar que el módulo instala el plugin.
- Leer estado RPC sin wallet.
- Conectar una wallet en devnet.
- Probar estados de error y carga.

## SOL de devnet

Usa un faucet de devnet para financiar una cuenta de pruebas si quieres enviar transacciones.

## Nota sobre wallets

Las wallets nativas y móviles se exponen a través del mismo flujo unificado cuando están disponibles.
