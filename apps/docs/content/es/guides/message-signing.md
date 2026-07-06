---
title: Firma de mensajes
description: Firma mensajes de autenticación o propiedad sin crear transacciones on-chain.
ogSection: Guías
surroundOrder: 12
---

La firma de mensajes sirve para demostrar control de una wallet sin enviar una transacción a Solana.

## Firma de mensajes en Vue

```ts
const wallet = useSolanaWallet();

const message = new TextEncoder().encode("Sign in to Vue Solana");
const signature = await wallet.signMessage(message);
```

## Firma de mensajes en Nuxt

El mismo composable está autoimportado cuando usas `@vue-solana/nuxt`.

## Texto del challenge

Incluye dominio, intención, dirección pública, nonce y expiración. Evita mensajes ambiguos que puedan reutilizarse en otro contexto.

## Límite de verificación

La firma prueba control de clave para ese mensaje. La autorización de la sesión debe verificarse y almacenarse en tu backend.

## Manejo de errores

El usuario puede rechazar la firma. Trata ese caso como una decisión normal, no como un fallo inesperado.

## Checklist de seguridad

- No firmes mensajes vacíos.
- No reutilices nonces.
- Muestra el texto completo al usuario.
- Verifica la firma en el servidor cuando autentique una sesión.
