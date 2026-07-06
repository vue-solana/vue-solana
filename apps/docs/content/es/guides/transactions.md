---
title: Transacciones
description: Firma, envía, confirma y maneja estado de transacciones con Vue Solana.
ogSection: Guías
surroundOrder: 11
---

Una transacción debe construirse, firmarse por la wallet, enviarse por RPC y confirmarse antes de mostrar éxito definitivo.

## Helper core de envío

```ts
import { signAndSendTransaction } from "@vue-solana/core";

const signature = await signAndSendTransaction({
  connection,
  wallet,
  transaction,
});
```

## Confirmar una firma

```ts
await connection.confirmTransaction(signature, "confirmed");
```

## Construir una transferencia real en devnet

Usa un blockhash reciente, una cuenta financiada en devnet y una instrucción de transferencia. No pruebes transferencias iniciales en mainnet.

## Flujo de firmar y enviar en Vue

```ts
const { signAndSendTransaction } = useSolanaSignAndSendTransaction();
```

Muestra estado de carga, firma, error y confirmación.

## Enlaces de explorer

Crea enlaces con el cluster correcto para que el usuario pueda verificar la firma.

## Estado genérico de transacción

`useSolanaTransaction()` ayuda a representar operaciones asíncronas con loading, error y resultado.

## Autoimports de Nuxt

`@vue-solana/nuxt` autoimporta los composables necesarios para transacciones.

## Manejo de errores

Normaliza errores antes de mostrarlos. No expongas mensajes crudos si pueden contener detalles internos.

## Checklist de seguridad

- Explica qué va a firmar el usuario.
- Usa devnet para pruebas.
- Confirma antes de mostrar éxito.
- No reintentes firmas sin acción del usuario.
