---
title: Clusters
description: Nombres de clusters de Solana, endpoints RPC e instrucciones para faucet.
ogSection: Concepts
surroundOrder: 6
---

Un cluster de Solana es una red de validadores. Las apps eligen a qué cluster conectarse.

## Clusters soportados

Vue Solana soporta estos nombres de cluster:

- `mainnet`: el cluster de producción de Solana. Este es el nombre oficial del mainnet de Solana. Úsalo para apps de producción y SOL real.
- `mainnet-beta`: grafía heredada de `mainnet`. Sigue siendo aceptada y redirige al mismo endpoint `https://api.mainnet.solana.com`.
- `devnet`: red para desarrolladores. Úsala mientras construyes apps. El SOL de devnet no tiene valor real.
- `testnet`: red de pruebas de validadores y protocolo. Es menos común para desarrollo de apps que devnet.
- `localnet`: un validador local ejecutándose en tu máquina, normalmente en `http://127.0.0.1:8899`.

Usa `mainnet` en código Vue Solana. La documentación de Solana se refiere al cluster de producción como Mainnet, y `mainnet` es el nombre de cluster que las herramientas de Solana esperan. La grafía heredada `mainnet-beta` sigue siendo aceptada: ambos nombres resuelven al endpoint oficial `https://api.mainnet.solana.com`.

Referencia oficial: [Solana Clusters](https://solana.com/docs/references/clusters)

## Endpoints RPC

Un endpoint RPC es la URL HTTP que tu app usa para leer o escribir en Solana.

Ejemplos:

- `https://api.devnet.solana.com`
- `https://api.mainnet.solana.com`
- `http://127.0.0.1:8899`

Las peticiones RPC pasan por `client.rpc` desde `useSolanaClient()` o `useSolanaRpc()`, o desde `createSolanaClient()` / `createSolanaContext()` en `@vue-solana/core`. La clase legacy `Connection` y los subpaths `web3` se eliminaron en v2.0.0. Los endpoints públicos son útiles para empezar, pero las apps de producción normalmente usan un proveedor RPC dedicado por fiabilidad y límites de tasa.

Referencia oficial: [Solana RPC](https://solana.com/docs/rpc)

## Proveedores RPC alojados

Los endpoints públicos de Solana los comparten todos. Son la forma más rápida de hacer tu primera llamada a `getLatestBlockhash()` o `getBalance()`, pero no son una buena base para una aplicación que otras personas usarán. Cuando el endpoint está ocupado, las solicitudes pueden limitarse, la latencia es menos predecible y no hay un panel de uso ni un contrato de soporte. Un proveedor RPC alojado te da un endpoint HTTP y WebSocket con clave propia, cuotas publicadas, métricas y una vía clara para crecer cuando aumenta el tráfico.

Vue Solana no depende de ningún proveedor en particular. Todas las llamadas RPC pasan por el cliente Kit creado a partir de tu `endpoint` (y `wsEndpoint` opcional), así que cambiar de proveedor es un cambio de configuración, no una reescritura de tus composables. Consulta [Endpoints RPC personalizados](/es/guides/rpc-and-clusters#endpoints-rpc-personalizados) para ver el código.

### Por qué usar uno

- **Límites predecibles.** Un endpoint público comparte un presupuesto entre todos sus usuarios. Con un proveedor, tu clave tiene su propia cuota y un comportamiento documentado cuando la superas.
- **Suscripciones.** `useSubscription()` y `useTrackedData()` necesitan una conexión WebSocket. Los proveedores ofrecen una URL `wss://` correspondiente y suelen permitir más suscripciones simultáneas.
- **Observabilidad.** Los paneles muestran volumen de solicitudes, errores y latencia, para que sepas si un fallo viene de tu aplicación o de la capa RPC.
- **Una vía hacia producción.** Cuando un tutorial se convierte en una aplicación real, puedes subir los límites sin cambiar el código de los componentes.

### Qué revisar antes de elegir

- **Qué métodos admite el plan.** La disponibilidad varía según el cluster y el proveedor. Chainstack marca algunos métodos pesados de escaneo de Solana como de pago en mainnet y no ofrece nodos de archivo para devnet.
- **Cómo se mide el uso.** Chainstack usa Request Units (1 RU por solicitud a un nodo completo); Alchemy usa Compute Units, que varían según el método. Comparar solo «solicitudes por segundo» puede ser engañoso.
- **Si WebSockets, webhooks o gRPC están incluidos en el plan gratuito.** Tu aplicación puede necesitar uno de ellos aunque las lecturas HTTP simples funcionen.
- **Dónde vivirá la clave de API.** Una URL de endpoint en el bundle del navegador es visible para los usuarios. Restringe la clave en el panel del proveedor o colócala detrás de una ruta de servidor.

### Opciones gratuitas para empezar

| Proveedor                                     | Plan gratuito                                                                     | Ideal para                                                                                                                        | Detalles                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Chainstack](https://chainstack.com/pricing/) | Developer: 0 $/mes, 3.000.000 RU/mes, 25 RPS en total, 1 proyecto, WebSockets.    | Facturación predecible por Request Units y límites explícitos por red. Un buen paso para salir de un endpoint público compartido. | Las [directrices de rendimiento](https://docs.chainstack.com/docs/limits) indican 25 RPS en Solana devnet, pero solo 5 RPS en Solana mainnet para Developer. `getProgramAccounts`, `getSupply` y `getTokenAccountsByOwner` son de pago en mainnet; devnet no tiene nodos de archivo. El exceso cuesta 20 $ por cada 1 M de RU adicionales. |
| [Alchemy](https://www.alchemy.com/pricing)    | Free: 30 M de CU/mes, 15 RPS, 5 apps y 5 webhooks, todas las mainnets y testnets. | Una URL HTTP/WSS de devnet lista para pegar, un panel de uso y webhooks para aprender y hacer demos.                              | [Solana Devnet RPC](https://www.alchemy.com/rpc/solana-devnet) enumera el endpoint y las APIs no disponibles en devnet (Token, NFT, Prices, Debug, Trace y otras). La facturación usa Compute Units, no solicitudes brutas; gRPC es de pago.                                                                                               |

Las cuotas y los precios cambian. Considera las páginas de los proveedores enlazadas como la fuente de verdad; las cifras anteriores son un punto de partida, no una promesa de Vue Solana.

Un proveedor te da acceso RPC, no SOL de prueba. Sigues necesitando SOL de devnet del faucet de más abajo para enviar transacciones.

## Endpoints WebSocket

Los endpoints WebSocket se usan para suscripciones y actualizaciones en tiempo real. Vue Solana deriva un endpoint WebSocket desde tu endpoint RPC, salvo que pases `wsEndpoint` explícitamente.

Ejemplos:

- `wss://api.devnet.solana.com`
- `wss://api.mainnet.solana.com`
- `ws://127.0.0.1:8900`

## Configurar un cluster

Para Vue:

```ts
createSolanaPlugin({
  cluster: "devnet",
});
```

Para Nuxt:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
  },
});
```

También puedes pasar un endpoint personalizado:

```ts
createSolanaPlugin({
  cluster: "mainnet",
  endpoint: "https://your-rpc.example.com",
  commitment: "confirmed",
});
```

## Obtener SOL de devnet o testnet

Usa el faucet oficial:

```txt
https://faucet.solana.com
```

Elige `Devnet` o `Testnet`, pega la dirección de tu wallet y solicita SOL.

Si tienes instalada la CLI de Solana, también puedes solicitar un airdrop:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

El SOL de devnet y testnet no tiene valor real. Nunca uses una wallet con fondos reales mientras pruebas.
