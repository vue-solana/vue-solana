---
title: Ejemplo Vue Vite
description: Aplicación de ejemplo ejecutable para @vue-solana/vue con Vite.
ogSection: Ejemplos
surroundOrder: 17
---

El ejemplo Vue Vite muestra cómo instalar el plugin de Vue Solana en una aplicación Vue estándar.

## Qué demuestra

- Configuración de `createSolanaPlugin()`.
- Lecturas RPC en devnet.
- Lecturas de balance.
- Descubrimiento y conexión de wallets.
- Flujos de firma simulados o seguros para desarrollo.

## Ejecutar desde la raíz del repositorio

```sh
pnpm install
pnpm dev:vue
```

## Qué probar

- Cargar el blockhash más reciente.
- Introducir una dirección pública y leer su balance.
- Conectar una wallet compatible.
- Revisar mensajes de error con direcciones inválidas.

## SOL de devnet

Usa un faucet para obtener SOL de devnet antes de probar transferencias reales en la red de desarrollo.

## Nota sobre wallets

La wallet debe estar instalada, desbloqueada y configurada en devnet para que las pruebas sean consistentes.
