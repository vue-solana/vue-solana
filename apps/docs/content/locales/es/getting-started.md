---
title: Primeros pasos
description: Instala los paquetes de Vue Solana, configura Vue o Nuxt y prueba lecturas RPC en devnet.
ogSection: Empieza aquí
surroundOrder: 2
---

Esta guía cubre la instalación de los paquetes de Vue Solana, la configuración de Vue o Nuxt, la prueba de lecturas RPC de Solana, la conexión de wallets compatibles, la firma de mensajes, el envio de una transferencia real en devnet y la verificación del resultado. Los ejemplos usan devnet por defecto para pruebas seguras.

## Antes de empezar

Usa `@vue-solana/core` directamente si necesitas primitivas de Solana sin integración con Vue/Nuxt. Se construye sobre `@solana/kit` y reexporta `createSolanaClient()` más todo `@solana/kit` desde `@vue-solana/core/kit`. Usa `@vue-solana/vue` o `@vue-solana/nuxt` cuando quieras integración con el framework.

Clusters compatibles:

- `mainnet`: el cluster de producción de Solana. Este es el nombre oficial del mainnet de Solana.
- `devnet`: mejor opción por defecto para desarrollo de apps.
- `testnet`: red para pruebas de validadores y protocolo.
- `localnet`: validador local.

Usa `devnet` mientras aprendes y pruebas. Usa `mainnet` solo cuando estes listo para interactuar con SOL real.

Soporte actual de wallets:

- Wallets de extensión de navegador mediante paquetes Solana Wallet Standard.
- Wallets moviles nativas de Android mediante `@solana-mobile/wallet-standard-mobile` en Android Chrome y Chrome PWAs.
- Wallets de navegador iOS para Phantom, Solflare y Backpack mediante enlaces universales especificos de cada wallet.
- Objetos wallet manuales/personalizados que implementan `SolanaWallet`.

Planeado pero aún no compatible:

- Wallets de app nativa de escritorio mediante enlaces de protocolo especificos de cada wallet o registro nativo futuro de Wallet Standard.

## Instalar para Vue

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Las apps Vue pueden usar `@vue-solana/vue/kit` (`createSolanaClient`, `address`, `lamports` y tipos) y `@vue-solana/vue/buffer-polyfill` sin instalar directamente paquetes Solana de bajo nivel o Buffer. Usa `useSolanaClient()` desde `@vue-solana/vue/useSolanaClient` para el cliente inyectado.

## Instalar para Nuxt

```sh
npx nuxt module add @vue-solana/nuxt
```

Esto instala el paquete y agrega `@vue-solana/nuxt` al arreglo `modules` en `nuxt.config.ts`.

Las apps Nuxt pueden usar `@vue-solana/nuxt/kit` y `@vue-solana/nuxt/buffer-polyfill` sin instalar directamente `@vue-solana/core`, `@vue-solana/vue` ni paquetes Solana y Buffer de bajo nivel. El `useSolanaClient()` autoimportado devuelve el cliente Kit inyectado.

## Nota sobre v3

v3.0.0 publica solo ESM: la condición de exportación `require` y el campo `main` de primer nivel desaparecen de todos los paquetes `@vue-solana/*`. Las apps de Nuxt y Vite ya empaquetan ESM y no necesitan cambios; un script de Node que haga `require()` de un paquete de Vue Solana debe convertirse a ESM. Los subpaths `kit` también pasaron a ser un espejo completo de `@solana/kit`, así que puedes quitar `@solana/kit` de tu propio `package.json` si lo añadiste en v2. Consulta [Actualizar de v2 a v3](/es/guides/kit-migration#actualizar-de-v2-a-v3) para los detalles.

## Nota sobre v2

v2.0.0 elimino la superficie legacy `@solana/web3-compat`. El contexto ya no lleva un `connection`, y los subpaths `@vue-solana/*/web3` fueron eliminados. Todos los composables son con prioridad en Kit y `SolanaWallet.publicKey` es un string base58 `Address`. El shim `@solana/buffer/` que describian las docs v1 anteriores ya no existe; los shims propios del paquete que se conservan solo cubren el subpath del navegador `buffer/` usado por el polyfill de Buffer. Consulta la [guía de migración a Kit](/guides/kit-migration) para el mapa completo de antes/después.

## Configuración de Vue

```ts
import { createApp } from "vue";
import { createSolanaPlugin } from "@vue-solana/vue";
import App from "./App.vue";

createApp(App)
  .use(
    createSolanaPlugin({
      cluster: "devnet",
      mobileWallet: {
        appIdentity: {
          name: "Mi App Vue Solana",
        },
      },
      iosWallet: {
        appIdentity: {
          name: "Mi App Vue Solana",
        },
      },
    }),
  )
  .mount("#app");
```

`mobileWallet` e `iosWallet` son opcionales. El registro de Android Mobile Wallet Adapter y los enlaces de iOS para Phantom, Solflare y Backpack están habilitados por defecto cuando el runtime del navegador los soporta. Pasa `mobileWallet: false` o `iosWallet: false` para deshabilitar cualquiera de las dos fuentes.

Para composables de Vue, prefiere importaciones directas de subpaths en código nuevo:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
```

`useRpc()` devuelve el estado resuelto del cluster y el `client` Kit inyectado; `useBalance()` lee a traves de `client.rpc`. `useSolanaClient()` devuelve el mismo `client` y su `rpc` de solo lectura directamente, más `address()`/`lamports()` desde `@vue-solana/vue/kit`. Consulta la [guía de migración a Kit](/guides/kit-migration) para el mapa completo de antes/después.

### Ciclo de vida del cliente y del plugin

`createSolanaPlugin()` construye el cliente Kit una sola vez, durante `install()`. Crea el plugin en el ambito del modulo y reutiliza la instancia:

```ts
// solana.ts
import { createSolanaPlugin } from "@vue-solana/vue";

export const solana = createSolanaPlugin({ cluster: "devnet" });
```

Llamar de nuevo a `createSolanaPlugin()` construye un cliente y un contexto nuevos, descartando la selección de wallet y el estado RPC existentes. Si tu configuración es reactiva (un selector de cluster, por ejemplo), memoriza sobre la configuración para que solo se construya un plugin (y un cliente) nuevos cuando el valor cambie de verdad, no en cada render:

```ts
import { computed, ref } from "vue";

const cluster = ref<SolanaCluster>("devnet");
const plugin = computed(() => createSolanaPlugin({ cluster: cluster.value }));
```

Un cliente Kit ejecuta sus plugins `createClient().use(...)` durante la construcción. Cuando uno de esos plugins es asincrono, el cliente (y cualquier contexto construido a partir de el) solo se activa después de que esa promesa se resuelve. Difiere el trabajo real de RPC y wallet a hooks del ciclo de vida o a acciones del usuario tras la hidratación, en lugar de ejecutarlo durante el setup o el SSR.

## Configuración de Nuxt

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
  solana: {
    cluster: "devnet",
    mobileWallet: {
      appIdentity: {
        name: "Mi App Nuxt Solana",
      },
    },
    iosWallet: {
      appIdentity: {
        name: "Mi App Nuxt Solana",
      },
    },
  },
});
```

El modulo Nuxt instala el plugin de runtime solo en el cliente y autoimporta composables desde subpaths directos `@vue-solana/vue/*`. Los composables se pueden llamar de forma segura durante SSR, pero las operaciones RPC y de wallet reales deberian ejecutarse después de la hidratación, por ejemplo desde `onMounted()` o acciones del usuario. Las opciones `solana` de Nuxt viven en la configuración publica de runtime, así que mantenlas serializables como JSON.

Los clientes Vue/core directos aceptan `payer` y `payerSecretKey` para transacciones enviadas por el cliente. `payerSecretKey` es un keypair Ed25519 de 64 bytes en base64, así que nunca lo pongas en la configuración runtime publica de Nuxt ni envíes una clave con fondos al navegador. `ModuleOptions` de Nuxt omite ambos campos; crea un signer efimero en un plugin solo de cliente, instalalo como `payer` y define `clientPlugin: false` para que el modulo no instale un segundo plugin.

## Probar RPC sin wallet

Las lecturas RPC funcionan sin una wallet de navegador.

En Vue, usa `useRpc()`:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, client } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const { value } = await client.rpc.getLatestBlockhash().send();
  latestBlockhash.value = value.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Último blockhash: {{ latestBlockhash }}</p>
  </main>
</template>
```

El código nuevo puede usar el cliente Kit en su lugar. `useSolanaClient()` no necesita wallet y devuelve la misma info tipada para la API RPC de Kit (las llamadas de lectura devuelven `bigint`):

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";

const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>

<template>
  <main>
    <p>Slot: {{ slot }}</p>
  </main>
</template>
```

En Nuxt, usa el `useSolanaRpc()` autoimportado:

```vue
<script setup lang="ts">
const { cluster, endpoint, checkConnection, latestBlockhash } = useSolanaRpc();
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Último blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Comprobar RPC</button>
  </main>
</template>
```

En Nuxt, las mismas lecturas Kit vienen del `useSolanaClient()` autoimportado:

```vue
<script setup lang="ts">
const { rpc } = useSolanaClient();
const slot = ref<bigint | null>(null);

onMounted(async () => {
  slot.value = await rpc.getSlot().send();
});
</script>
```

## Obtener SOL de devnet o testnet

SOL de devnet y testnet son tokens de prueba sin valor real.

Usa el faucet oficial:

```txt
https://faucet.solana.com
```

Elige `Devnet` mientras sigues esta guía. Elige `Testnet` solo si estás probando contra el cluster testnet.

Si tienes instalada la Solana CLI, también puedes ejecutar:

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url devnet
```

```sh
solana airdrop 1 YOUR_WALLET_ADDRESS --url testnet
```

Nunca uses una wallet con fondos reales mientras pruebas.

## Ejecutar los ejemplos

Para ejecutar las apps de ejemplo localmente, clona primero el repositorio Vue Solana:

```sh
git clone https://github.com/vue-solana/vue-solana.git
cd vue-solana
pnpm install
pnpm build:packages
```

Inicia el ejemplo Vue Vite:

`pnpm dev:vue`

Inicia el ejemplo Nuxt:

`pnpm dev:nuxt`

Los ejemplos demuestran configuración de plugin/modulo, estado RPC, llamadas directas de conexión, lecturas de balance, descubrimiento unificado de wallets, selección persistida de wallet, estado de wallet, firma de mensajes, estado generico de transacción, flujos de transferencia de transacciones, transacciones enviadas por el cliente mediante el planner y executor oficiales de Kit, estado de confirmación, enlaces de explorer y UI para capacidades no compatibles. Usan devnet por defecto para pruebas seguras.

## Conectar una wallet

Instala Phantom, Solflare, Backpack u otra wallet de navegador Solana Wallet Standard. Cambia la wallet a devnet antes de probar.

En Android Chrome o una Android Chrome PWA, instala una wallet movil compatible de Solana como Phantom, Solflare o Seed Vault Wallet. `Mobile Wallet Adapter` puede aparecer en la misma lista de wallets después de `refreshWallets()`.

En Vue:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connect, disconnect } = useWallet();
```

En Nuxt:

```ts
const { wallets, selectedWallet, refreshWallets, selectWallet } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
```

Selecciona una wallet desde `wallets` y luego llama `connect()`. Seleccionar una wallet solo configura la wallet activa; no la conecta. Algunas extensiones exponen cuentas autorizadas previamente después de recargar la página, pero Vue Solana todavía mantiene `connected` en false hasta que `connect()` tenga éxito.

Cuando `autoConnect` está habilitado, Vue Solana restaura solo la identidad de wallet que el usuario seleccionó antes y solo después de que esa wallet se descubra otra vez en el cliente. Guarda metadatos `name`, `platform` y `source` en `localStorage`, no claves privadas, sesiones ni transacciones.

El soporte de wallets de navegador iOS usa enlaces universales especificos de cada wallet porque el soporte web de Mobile Wallet Adapter solo funciona en Android Chrome. Phantom, Solflare y Backpack aparecen en la misma lista `useWallets()` en navegadores iOS.

## Pruebas manuales de wallet

Usa esta lista cuando valides manualmente una extensión de navegador, una wallet Android MWA o una wallet de navegador iOS.

1. Configura la app para `devnet` y verifica que la UI muestre el endpoint de devnet.
2. Instala una wallet compatible y cambia la propia wallet a devnet.
3. Fondea la wallet con SOL de devnet desde `https://faucet.solana.com`.
4. Abre la app de ejemplo y haz clic en la acción de refrescar wallets.
5. Confirma que la wallet aparece en la lista unificada con la fuente esperada.
6. Selecciona la wallet y verifica que la selección por si sola no la conecta.
7. Haz clic en conectar y aprueba el prompt de la wallet.
8. Confirma que la public key y el estado `connected` se actualizan después de que `connect()` resuelve.
9. Recarga la página y confirma que la identidad de la wallet seleccionada antes puede restaurarse sin selección arbitraria de wallet.
10. Desconecta y verifica que la public key y el estado connected se limpian.

Fuentes de wallet esperadas:

| Plataforma                     | Fuente esperada         | Notas                                                                                     |
| ------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| Extensión de navegador desktop | `wallet-standard`       | Phantom, Solflare, Backpack y otras wallets standard pueden aparecer si están instaladas. |
| Android Chrome o Chrome PWA    | `mobile-wallet-adapter` | Requiere una wallet nativa compatible y soporte de navegador Android MWA.                 |
| Navegador iOS                  | `deep-link`             | Las entradas de Phantom, Solflare y Backpack usan enlaces universales especificos.        |
| App nativa desktop             | Not implemented yet     | Los enlaces de protocolo nativos desktop aún no son compatibles.                          |

## Firmar un mensaje

Usa la firma de mensajes para comprobaciones de propiedad de wallet o desafios de autenticación. No envia una transacción y no autoriza cambios de estado on-chain.

En Vue:

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Iniciar sesión en example.com"));
}
```

En Nuxt:

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Iniciar sesión en example.com"));
}
```

Renderiza un boton de auth deshabilitado cuando `canSignMessage` sea false. Algunas wallets pueden conectar y firmar transacciones sin admitir firma arbitraria de mensajes.

Para pruebas manuales, usa una cadena de desafio clara que incluya tu dominio, un nonce y una hora de expiración. Nunca pidas a usuarios firmar mensajes vacios o ambiguos.

```ts
const challenge = new TextEncoder().encode(
  "Iniciar sesión en example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

Después de firmar, verifica que la UI muestre los bytes de la firma devuelta y no trate la firma del mensaje como una transacción on-chain.

## Enviar una transferencia

Los ejemplos de Vue y Nuxt incluyen campos de dirección de destinatario y cantidad para una transferencia real. Usan devnet por defecto para que puedas probar con SOL que no tiene valor real. Para mainnet, configura `mainnet` o un endpoint RPC de mainnet y usa una wallet con SOL real para fees.

Empieza con una cantidad diminuta como `0.000001` SOL mientras pruebas.

Las apps de navegador que crean o serializan transacciones deberian inicializar el polyfill Buffer del paquete de framework antes del código de transacciones:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

La wallet te pedirá aprobar la transacción. Después de aprobarla, el ejemplo muestra la firma de transacción, el estado de confirmación y el enlace de explorer. En Android Mobile Wallet Adapter, Vue Solana prefiere la firma de wallet más el envío RPC desde la app cuando está disponible, lo que hace que la firma devuelta sea más fiable después de que la wallet redirija de vuelta al navegador.

Para pruebas manuales de transferencia:

1. Manten tanto la app como la wallet en devnet.
2. Usa una dirección de destinatario que controles o una wallet devnet recien generada.
3. Empieza con `0.000001` SOL.
4. Revisa el prompt de la wallet antes de aprobar.
5. Después del envio, espera a que el ejemplo muestre el estado de confirmación.
6. Abre el enlace de explorer y confirma que usa la query del cluster devnet.
7. Refresca los balances del remitente y del destinatario.

Las URLs de explorer deberian ser conscientes del cluster:

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet" || cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Si la confirmación agota el tiempo después de devolver una firma, no reenvies inmediatamente. Comprueba primero el estado de la firma o el explorer; la transacción todavía puede confirmarse.

El demo de envio del cliente usa el `rpcTransactionPlanSendingExecutor()` oficial instalado por el cliente por defecto. Conecta una wallet compatible con `signTransaction`, fondea el payer de demo cuando el ejemplo lo requiera y usa `useSendTransaction()` o `useSendTransactions()`. El executor envia la transacción y espera `confirmed` antes de que el composable muestre `sent`; no hay un popup de envio separado. En Nuxt, crea cualquier payer de demo en un plugin solo de cliente, no en `nuxt.config.ts`, y define `clientPlugin: false` para que el modulo omita su propio plugin.

## Verificación final

Antes de confiar en un flujo de app, verifica estos comportamientos en devnet:

- Las lecturas RPC funcionan sin wallet.
- El descubrimiento de wallets muestra solo fuentes de wallet compatibles con la plataforma actual.
- La selección y la conexión de wallet son acciones de usuario separadas.
- `autoConnect` opcional restaura solo la identidad de wallet seleccionada previamente.
- Las capacidades no compatibles de firma de mensajes o firma de transacciones están deshabilitadas en la UI.
- La firma de mensajes devuelve una firma sin enviar una transacción on-chain.
- El envio de transferencia devuelve una firma y estado de confirmación.
- Los envios del cliente usan el planner y el executor oficiales, requieren un signer `payer` configurado, y solo alcanzan `sent` después de `confirmed`.
- Los enlaces de explorer apuntan al mismo cluster que la app.
- `mainnet` se usa solo cuando configuras mainnet intencionalmente y entiendes que SOL real está en riesgo.

## Más lectura

- [Solana para desarrolladores Vue](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [Wallets](/guides/wallets)
- [guía de transacciones](/guides/transactions)
- [Migración a Kit](/guides/kit-migration)
- [Solución de problemas](/troubleshooting)
- [Documentación de Solana Kit](https://www.solanakit.com/) — guías oficiales de Kit, recetas y referencia de API
- [Documentación de Solana](https://solana.com/docs)
