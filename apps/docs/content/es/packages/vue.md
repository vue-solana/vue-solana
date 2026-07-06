---
title: "@vue-solana/vue"
description: Plugin de Vue y composables para usar Solana en aplicaciones Vue.
ogSection: Paquetes
surroundOrder: 15
---

`@vue-solana/vue` instala el contexto Solana en Vue y expone composables idiomáticos para componentes.

## Instalar

```sh
pnpm add @vue-solana/vue
```

## Configurar el plugin

```ts
import { createSolanaPlugin } from "@vue-solana/vue";

app.use(createSolanaPlugin({ cluster: "devnet" }));
```

## Composables

- `useSolana()`
- `useSolanaRpc()`
- `useSolanaConnection()`
- `useSolanaBalance()`
- `useSolanaWallet()`
- `useSolanaSignAndSendTransaction()`

## Estado RPC

```ts
const { cluster, endpoint, connection } = useSolanaRpc();
```

## Balance

```ts
const balance = useSolanaBalance(address);
```

## Wallet

```ts
const wallet = useSolanaWallet();
await wallet.connect();
```

## Firma de mensajes

Comprueba que la wallet soporte firma de mensajes antes de llamar a la acción.

## Transacciones

Usa el composable de firmar y enviar para mantener estado de carga, firma y error en la UI.

## Errores

Muestra mensajes seguros y accionables. No expongas datos internos de RPC o wallet sin filtrar.

## Ejemplo

El ejemplo Vue Vite usa este paquete directamente: [Ejemplo Vue Vite](/es/examples/vue-vite).
