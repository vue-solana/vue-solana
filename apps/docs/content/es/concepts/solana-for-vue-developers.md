---
title: Solana para desarrolladores Vue
description: Cómo pensar en Solana desde aplicaciones Vue y Nuxt.
ogSection: Conceptos
surroundOrder: 5
---

Las aplicaciones Solana combinan UI reactiva, lectura de datos RPC, conexión de wallets y operaciones de firma. Vue Solana separa esas responsabilidades en paquetes pequeños.

## Modelo mental

- RPC lee estado público de la red.
- La wallet mantiene claves y pide aprobación al usuario.
- Las transacciones se construyen en la app, pero se firman en la wallet.
- La confirmación ocurre después de enviar la firma a la red.

## Dónde encaja Vue

Vue maneja estado, formularios, errores y feedback visual. Los composables de Vue Solana exponen ese estado como refs y funciones asíncronas.

## Dónde encaja Nuxt

Nuxt instala el plugin con un módulo, autoimporta composables y permite documentar o prerenderizar rutas sin cambiar el flujo de wallet en cliente.

## Seguridad

Nunca pidas claves privadas. Nunca firmes sin interacción clara del usuario. Trata respuestas RPC, direcciones y firmas como entradas no confiables.
