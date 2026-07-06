---
title: Wallets
description: Descubre wallets, selecciona una wallet activa, conecta, desconecta y comprueba capacidades.
ogSection: Guías
surroundOrder: 9
---

Vue Solana expone wallets de navegador, móviles y nativas mediante un flujo unificado. La aplicación no debe pedir claves privadas; la wallet firma después de aprobación del usuario.

## Fuentes de wallet

- Wallet Standard en navegadores.
- Adaptadores móviles cuando están disponibles.
- Interfaces manuales para integraciones controladas.

## Matriz de soporte

Comprueba capacidades antes de mostrar acciones. Una wallet puede conectar, pero no necesariamente firmar mensajes o soportar el mismo flujo de transacción.

## Flujo de wallet en Vue

```ts
const wallet = useSolanaWallet();

await wallet.connect();
await wallet.disconnect();
```

## Flujo de wallet en Nuxt

```ts
const wallet = useSolanaWallet();
```

El módulo autoimporta el composable cuando `@vue-solana/nuxt` está instalado.

## Comprobaciones de capacidad

Antes de firmar, comprueba que la wallet esté conectada y que soporte la operación necesaria.

## Auto connect

Usa auto connect solo si la experiencia es clara y respeta el consentimiento del usuario. No dispares firmas automáticamente.

## Firma de mensajes para auth

Genera un challenge con nonce, dominio y expiración. Verifica la firma en tu backend si el flujo autentica usuarios.

## Wallets móviles

Las wallets móviles deben integrarse en el mismo flujo público de `useWallets()` y `useWallet()` para evitar APIs paralelas.

## Interfaz manual de wallet

Puedes pasar una implementación manual cuando controlas la integración, siempre respetando los límites de seguridad.

## Helpers core directos

`@vue-solana/core` contiene tipos y aserciones que también pueden usarse fuera de Vue.

## Notas de seguridad

- Nunca accedas a claves privadas.
- No firmes en mainnet sin aprobación explícita.
- Trata direcciones y respuestas RPC como entradas no confiables.
