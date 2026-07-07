---
title: Solana para desarrolladores Vue
description: Conceptos prácticos de Solana para desarrolladores Vue y Nuxt.
ogSection: Conceptos
surroundOrder: 5
---

Esta página explica los términos de Solana que verás al usar los paquetes de Vue Solana. Es práctica, no exhaustiva.

Referencias oficiales:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Transactions](https://solana.com/docs/core/transactions)

## Conexiones y RPC

Las apps frontend leen datos de Solana mediante un endpoint RPC. `@vue-solana/vue/web3` y `@vue-solana/nuxt/web3` exponen la clase `Connection` soportada que envía solicitudes a ese endpoint.

Los paquetes de Vue Solana crean y proveen esa conexión para código Vue y Nuxt, de modo que los composables compartan el mismo cluster, endpoint, commitment y estado de wallet.

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

## Claves públicas y direcciones

Una clave pública es una dirección de cuenta de Solana. Puedes mostrar claves públicas de forma segura en una app frontend.

```ts
import { PublicKey } from "@vue-solana/vue/web3";

const publicKey = new PublicKey("PASTE_A_SOLANA_ADDRESS");
```

Nunca expongas claves privadas, frases semilla ni arrays de clave secreta en código frontend.

## Lamports y SOL

SOL es el token nativo de Solana. Los lamports son la unidad más pequeña de SOL.

```txt
1 SOL = 1,000,000,000 lamports
```

Los métodos RPC de balance devuelven lamports. Convierte lamports a SOL solo para mostrarlo.

```ts
const lamports = await connection.getBalance(publicKey);
const sol = lamports / 1_000_000_000;
```

## Wallets

Una wallet almacena claves y firma transacciones. Las wallets de extensión de navegador incluyen Phantom, Solflare y Backpack. Las wallets móviles nativas de Android pueden conectarse mediante Solana Mobile Wallet Adapter en runtimes compatibles de Android Chrome. Phantom, Solflare y Backpack también pueden conectarse desde navegadores iOS mediante universal links específicos de cada wallet.

Vue Solana descubre wallets de extensión de navegador Solana Wallet Standard, wallets Android Mobile Wallet Adapter y links soportados de wallets para navegador iOS mediante el flujo unificado `useWallets()`. Las lecturas RPC y de balances funcionan sin wallet. Conectar, firmar y enviar transacciones requiere una wallet descubierta o un objeto personalizado que implemente la interfaz `SolanaWallet`.

Consulta [Wallets](/guides/wallets) para el soporte actual y el estado post-v1 de wallets nativas de escritorio.

## Transacciones y firma

Una transacción es un conjunto de instrucciones que cambia el estado de Solana. Ejemplos incluyen transferir SOL, crear una cuenta o interactuar con un programa.

La firma prueba que el propietario de la wallet aprueba la transacción. Las apps frontend deben pedir a la wallet del usuario que firme. No deben contener claves privadas.

## Niveles de commitment

El commitment controla qué tan finalizados deben estar los datos devueltos.

- `processed`: el más rápido, menos final.
- `confirmed`: buen valor por defecto para la mayoría de lecturas de UI de apps.
- `finalized`: el más lento, más final.

Ejemplo:

```ts
createSolanaPlugin({
  cluster: "devnet",
  commitment: "confirmed",
});
```

Referencia oficial: [Commitment Status](https://solana.com/docs/rpc#configuring-state-commitment)

## Notas de seguridad

- Usa `devnet` mientras construyes y pruebas.
- No uses una wallet con fondos reales para desarrollo.
- No hardcodees claves privadas en apps frontend.
- Usa `mainnet-beta` solo cuando estés listo para interactuar con SOL real y programas de producción.
