---
title: Solución de problemas
description: Problemas comunes al instalar, compilar y usar Vue Solana.
ogSection: Inicio
surroundOrder: 4
---

Esta página reúne fallos comunes y pasos de diagnóstico para aplicaciones Vue Solana.

## La compilación no encuentra tipos de Solana

`@solana/web3-compat@0.0.21` tiene metadatos de tipos incompletos. Usa las versiones publicadas de Vue Solana y evita importar rutas internas no documentadas.

## No aparece ninguna wallet

- Comprueba que la wallet esté instalada y desbloqueada.
- Cambia la red de la wallet a devnet para pruebas.
- Usa el flujo de descubrimiento de wallets antes de llamar a `connect()`.

## La conexión RPC falla

- Revisa el cluster configurado.
- Prueba con un endpoint RPC explícito si el endpoint público está limitado.
- Trata todos los errores RPC como datos no confiables y muestra mensajes seguros al usuario.

## El balance es `null`

Puede significar que la dirección es inválida, que la cuenta no existe o que la lectura todavía está cargando. Valida la entrada antes de llamar a RPC.

## La firma de mensajes no está disponible

No todas las wallets soportan `signMessage`. Comprueba la capacidad antes de mostrar el botón de firma.

## La transacción no confirma

- Confirma que estás en devnet.
- Revisa que la cuenta tenga SOL para fees.
- Usa un blockhash reciente.
- Muestra el enlace de explorer para que el usuario pueda inspeccionar la firma.

## Pasos de verificación

```sh
pnpm install
pnpm typecheck
pnpm build
```

Si el problema ocurre solo en el navegador, ejecuta la app de ejemplo y revisa la consola y la pestaña Network.
