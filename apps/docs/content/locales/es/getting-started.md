---
title: Primeros pasos
description: Instala los paquetes de Vue Solana, configura Vue o Nuxt y prueba lecturas RPC en devnet.
ogSection: Empieza aqui
surroundOrder: 2
---

Esta guia cubre la instalacion de los paquetes de Vue Solana, la configuracion de Vue o Nuxt, la prueba de lecturas RPC de Solana, la conexion de wallets compatibles, la firma de mensajes, el envio de una transferencia real en devnet y la verificacion del resultado. Los ejemplos usan devnet por defecto para pruebas seguras.

## Antes de empezar

Usa `@vue-solana/core` directamente si necesitas primitivas de Solana como `Connection`, `PublicKey` y transacciones sin integracion con Vue/Nuxt. Usa `@vue-solana/vue` o `@vue-solana/nuxt` cuando quieras integracion con el framework.

Clusters compatibles:

- `mainnet-beta`: mainnet de Solana. Este es el nombre oficial del cluster mainnet de Solana.
- `devnet`: mejor opcion por defecto para desarrollo de apps.
- `testnet`: red para pruebas de validadores y protocolo.
- `localnet`: validador local.

Usa `devnet` mientras aprendes y pruebas. Usa `mainnet-beta` solo cuando estes listo para interactuar con SOL real.

Soporte actual de wallets:

- Wallets de extension de navegador mediante paquetes Solana Wallet Standard.
- Wallets moviles nativas de Android mediante `@solana-mobile/wallet-standard-mobile` en Android Chrome y Chrome PWAs.
- Wallets de navegador iOS para Phantom, Solflare y Backpack mediante enlaces universales especificos de cada wallet.
- Objetos wallet manuales/personalizados que implementan `SolanaWallet`.

Planeado pero aun no compatible:

- Wallets de app nativa de escritorio mediante enlaces de protocolo especificos de cada wallet o registro nativo futuro de Wallet Standard.

## Instalar para Vue

```sh
pnpm add @vue-solana/vue
```

```sh
npm install @vue-solana/vue
```

Las apps Vue pueden usar `@vue-solana/vue/web3` y `@vue-solana/vue/buffer-polyfill` sin instalar directamente paquetes Solana de bajo nivel o Buffer.

## Instalar para Nuxt

```sh
npx nuxt module add @vue-solana/nuxt
```

Esto instala el paquete y agrega `@vue-solana/nuxt` al arreglo `modules` en `nuxt.config.ts`.

Las apps Nuxt pueden usar `@vue-solana/nuxt/web3` y `@vue-solana/nuxt/buffer-polyfill` sin instalar directamente `@vue-solana/core`, `@vue-solana/vue` ni paquetes Solana y Buffer de bajo nivel.

## Problema conocido de TypeScript

`@solana/web3-compat@0.0.21` actualmente tiene metadatos de paquete TypeScript rotos. Sus metadatos de paquete apuntan a `dist/types/index.d.ts`, pero ese archivo no esta incluido en el paquete publicado.

Las importaciones en runtime siguen usando el paquete real `@solana/web3-compat`. Los paquetes actuales de Vue Solana publican shims temporales de declaraciones propios del paquete, asi que las apps que sigan las importaciones documentadas de `@vue-solana/core`, `@vue-solana/vue` o `@vue-solana/nuxt` no deberian necesitar su propio shim local.

Agrega un shim local solo si usas una version anterior del paquete Vue Solana o si importas `@solana/web3-compat` directamente desde codigo de la app. Vuelve a revisar esta nota despues de cada nueva version de `@solana/web3-compat`; el shim propio del paquete deberia quitarse cuando upstream publique declaraciones raiz validas.

## Configuracion de Vue

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

`mobileWallet` e `iosWallet` son opcionales. El registro de Android Mobile Wallet Adapter y los enlaces de iOS para Phantom, Solflare y Backpack estan habilitados por defecto cuando el runtime del navegador los soporta. Pasa `mobileWallet: false` o `iosWallet: false` para deshabilitar cualquiera de las dos fuentes.

Para composables de Vue, prefiere importaciones directas de subrutas en codigo nuevo:

```ts
import { useRpc } from "@vue-solana/vue/useRpc";
import { useBalance } from "@vue-solana/vue/useBalance";
```

## Configuracion de Nuxt

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

El modulo Nuxt instala el plugin de runtime solo en el cliente y autoimporta composables desde subrutas directas `@vue-solana/vue/*`. Los composables se pueden llamar de forma segura durante SSR, pero las operaciones RPC y de wallet reales deberian ejecutarse despues de la hidratacion, por ejemplo desde `onMounted()` o acciones del usuario. Las opciones `solana` de Nuxt viven en la configuracion publica de runtime, asi que mantenlas serializables como JSON.

## Probar RPC sin wallet

Las lecturas RPC funcionan sin una wallet de navegador.

En Vue, usa `useRpc()`:

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRpc } from "@vue-solana/vue/useRpc";

const { cluster, endpoint, connection } = useRpc();
const latestBlockhash = ref<string | null>(null);

onMounted(async () => {
  const result = await connection.getLatestBlockhash();
  latestBlockhash.value = result.blockhash;
});
</script>

<template>
  <main>
    <p>Cluster: {{ cluster }}</p>
    <p>Endpoint: {{ endpoint }}</p>
    <p>Ultimo blockhash: {{ latestBlockhash }}</p>
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
    <p>Ultimo blockhash: {{ latestBlockhash }}</p>
    <button type="button" @click="checkConnection">Comprobar RPC</button>
  </main>
</template>
```

## Obtener SOL de devnet o testnet

SOL de devnet y testnet son tokens de prueba sin valor real.

Usa el faucet oficial:

```txt
https://faucet.solana.com
```

Elige `Devnet` mientras sigues esta guia. Elige `Testnet` solo si estas probando contra el cluster testnet.

Si tienes instalada la Solana CLI, tambien puedes ejecutar:

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

Los ejemplos demuestran configuracion de plugin/modulo, estado RPC, llamadas directas de conexion, lecturas de balance, descubrimiento unificado de wallets, seleccion persistida de wallet, estado de wallet, firma de mensajes, estado generico de transaccion, flujos de transferencia de transacciones, estado de confirmacion, enlaces de explorer y UI para capacidades no compatibles. Usan devnet por defecto para pruebas seguras.

## Conectar una wallet

Instala Phantom, Solflare, Backpack u otra wallet de navegador Solana Wallet Standard. Cambia la wallet a devnet antes de probar.

En Android Chrome o una Android Chrome PWA, instala una wallet movil compatible de Solana como Phantom, Solflare o Seed Vault Wallet. `Mobile Wallet Adapter` puede aparecer en la misma lista de wallets despues de `refreshWallets()`.

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

Selecciona una wallet desde `wallets` y luego llama `connect()`. Seleccionar una wallet solo configura la wallet activa; no la conecta. Algunas extensiones exponen cuentas autorizadas previamente despues de recargar la pagina, pero Vue Solana todavia mantiene `connected` en false hasta que `connect()` tenga exito.

Cuando `autoConnect` esta habilitado, Vue Solana restaura solo la identidad de wallet que el usuario selecciono antes y solo despues de que esa wallet se descubra otra vez en el cliente. Guarda metadatos `name`, `platform` y `source` en `localStorage`, no claves privadas, sesiones ni transacciones.

El soporte de wallets de navegador iOS usa enlaces universales especificos de cada wallet porque el soporte web de Mobile Wallet Adapter solo funciona en Android Chrome. Phantom, Solflare y Backpack aparecen en la misma lista `useWallets()` en navegadores iOS.

## Pruebas manuales de wallet

Usa esta lista cuando valides manualmente una extension de navegador, una wallet Android MWA o una wallet de navegador iOS.

1. Configura la app para `devnet` y verifica que la UI muestre el endpoint de devnet.
2. Instala una wallet compatible y cambia la propia wallet a devnet.
3. Fondea la wallet con SOL de devnet desde `https://faucet.solana.com`.
4. Abre la app de ejemplo y haz clic en la accion de refrescar wallets.
5. Confirma que la wallet aparece en la lista unificada con la fuente esperada.
6. Selecciona la wallet y verifica que la seleccion por si sola no la conecta.
7. Haz clic en conectar y aprueba el prompt de la wallet.
8. Confirma que la public key y el estado `connected` se actualizan despues de que `connect()` resuelve.
9. Recarga la pagina y confirma que la identidad de la wallet seleccionada antes puede restaurarse sin seleccion arbitraria de wallet.
10. Desconecta y verifica que la public key y el estado connected se limpian.

Fuentes de wallet esperadas:

| Plataforma                     | Fuente esperada         | Notas                                                                                     |
| ------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------- |
| Extension de navegador desktop | `wallet-standard`       | Phantom, Solflare, Backpack y otras wallets standard pueden aparecer si estan instaladas. |
| Android Chrome o Chrome PWA    | `mobile-wallet-adapter` | Requiere una wallet nativa compatible y soporte de navegador Android MWA.                 |
| Navegador iOS                  | `deep-link`             | Las entradas de Phantom, Solflare y Backpack usan enlaces universales especificos.        |
| App nativa desktop             | Not implemented in v1   | Los enlaces de protocolo nativos desktop se aplazan explicitamente fuera de v1.           |

## Firmar un mensaje

Usa la firma de mensajes para comprobaciones de propiedad de wallet o desafios de autenticacion. No envia una transaccion y no autoriza cambios de estado on-chain.

En Vue:

```ts
const { connected, canSignMessage } = useWallet();
const signMessage = useSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Iniciar sesion en example.com"));
}
```

En Nuxt:

```ts
const { connected, canSignMessage } = useSolanaWallet();
const signMessage = useSolanaSignMessage();

if (connected.value && canSignMessage.value) {
  await signMessage.execute(new TextEncoder().encode("Iniciar sesion en example.com"));
}
```

Renderiza un boton de auth deshabilitado cuando `canSignMessage` sea false. Algunas wallets pueden conectar y firmar transacciones sin admitir firma arbitraria de mensajes.

Para pruebas manuales, usa una cadena de desafio clara que incluya tu dominio, un nonce y una hora de expiracion. Nunca pidas a usuarios firmar mensajes vacios o ambiguos.

```ts
const challenge = new TextEncoder().encode(
  "Iniciar sesion en example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
);
```

Despues de firmar, verifica que la UI muestre los bytes de la firma devuelta y no trate la firma del mensaje como una transaccion on-chain.

## Enviar una transferencia

Los ejemplos de Vue y Nuxt incluyen campos de direccion de destinatario y cantidad para una transferencia real. Usan devnet por defecto para que puedas probar con SOL que no tiene valor real. Para mainnet, configura `mainnet-beta` o un endpoint RPC de mainnet y usa una wallet con SOL real para fees.

Empieza con una cantidad diminuta como `0.000001` SOL mientras pruebas.

Las apps de navegador que crean o serializan transacciones deberian inicializar el polyfill Buffer del paquete de framework antes del codigo de transacciones:

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

La wallet te pedira aprobar la transaccion. Despues de aprobarla, el ejemplo muestra la firma de transaccion, el estado de confirmacion y el enlace de explorer. En Android Mobile Wallet Adapter, Vue Solana prefiere la firma de wallet mas el envio RPC desde la app cuando esta disponible, lo que hace que la firma devuelta sea mas fiable despues de que la wallet redirija de vuelta al navegador.

Para pruebas manuales de transferencia:

1. Manten tanto la app como la wallet en devnet.
2. Usa una direccion de destinatario que controles o una wallet devnet recien generada.
3. Empieza con `0.000001` SOL.
4. Revisa el prompt de la wallet antes de aprobar.
5. Despues del envio, espera a que el ejemplo muestre el estado de confirmacion.
6. Abre el enlace de explorer y confirma que usa la query del cluster devnet.
7. Refresca los balances del remitente y del destinatario.

Las URLs de explorer deberian ser conscientes del cluster:

```ts
function explorerUrl(signature: string, cluster: string) {
  const suffix = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${suffix}`;
}
```

Si la confirmacion agota el tiempo despues de devolver una firma, no reenvies inmediatamente. Comprueba primero el estado de la firma o el explorer; la transaccion todavia puede confirmarse.

## Verificacion final

Antes de confiar en un flujo de app, verifica estos comportamientos en devnet:

- Las lecturas RPC funcionan sin wallet.
- El descubrimiento de wallets muestra solo fuentes de wallet compatibles con la plataforma actual.
- La seleccion y la conexion de wallet son acciones de usuario separadas.
- `autoConnect` opcional restaura solo la identidad de wallet seleccionada previamente.
- Las capacidades no compatibles de firma de mensajes o firma de transacciones estan deshabilitadas en la UI.
- La firma de mensajes devuelve una firma sin enviar una transaccion on-chain.
- El envio de transferencia devuelve una firma y estado de confirmacion.
- Los enlaces de explorer apuntan al mismo cluster que la app.
- `mainnet-beta` se usa solo cuando configuras mainnet intencionalmente y entiendes que SOL real esta en riesgo.

## Mas lectura

- [Solana para desarrolladores Vue](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [Wallets](/guides/wallets)
- [Guia de transacciones](/guides/transactions)
- [Solucion de problemas](/troubleshooting)
- [Documentacion de Solana](https://solana.com/docs)
