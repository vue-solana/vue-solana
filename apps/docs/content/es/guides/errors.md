---
title: Errores
description: Maneja errores normalizados de Solana desde helpers core y composables Vue/Nuxt.
ogSection: Guías
surroundOrder: 13
---

Las operaciones RPC, wallets y transacciones pueden fallar por red, entrada inválida, rechazo del usuario o limitaciones de la wallet.

## Forma del error

Los helpers de Vue Solana exponen errores en refs o resultados normalizados para que puedas renderizar mensajes de forma consistente.

## Códigos de error estables

Usa códigos para lógica de UI y mensajes localizados. Evita depender de texto crudo de proveedores RPC.

## Manejo de errores core

```ts
try {
  await signAndSendTransaction(input);
} catch (error) {
  // Normaliza y muestra un mensaje seguro.
}
```

## Refs de error en Vue

Los composables exponen `error`, `loading` y acciones como `refresh()` o `execute()`.

## Refs de error en Nuxt

El comportamiento es el mismo, con composables autoimportados por el módulo.

## Mensajes para usuarios

Explica qué pasó y qué puede hacer el usuario: revisar dirección, conectar wallet, cambiar red o intentar más tarde.

## Guía de reintentos

Reintenta lecturas RPC con cuidado. No reintentes firmas ni envíos de transacción sin una acción clara del usuario.
