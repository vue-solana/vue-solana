---
title: Solucion de problemas
description: Problemas comunes de setup, TypeScript, wallet, RPC y Nuxt.
ogSection: Soporte
surroundOrder: 4
---

Usa esta guia para diagnosticar los problemas mas comunes de setup de Vue Solana en Vue, Nuxt, TypeScript, descubrimiento de wallets, llamadas RPC y transacciones. Empieza con el mensaje de error o comportamiento que coincida con tu app, luego sigue las comprobaciones en orden antes de abrir un issue.

## `@solana/web3-compat` Cannot Be Resolved

v2.0.0 elimino `@solana/web3-compat` de todos los paquetes de Vue Solana, asi que un error de declaracion faltante contra ese paquete casi siempre significa que tu app todavia importa desde la superficie legacy eliminada: `@vue-solana/core/web3`, `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3`, o una dependencia directa de `@solana/web3-compat`.

Actualiza esas importaciones a los equivalentes de Kit — consulta la [guia de migracion a Kit](/guides/kit-migration). Si aun estas en un paquete v1.x, los paquetes v1 incluian shims de declaraciones propios del paquete para las importaciones documentadas de core, y las apps en v1 podian agregar su propio shim de `@solana/web3-compat` solo cuando importaban el paquete directamente. Actualizar a `@vue-solana/*@^2` elimina la necesidad de cualquier shim.

## `Vue Solana plugin is not installed`

Esto significa que codigo del lado cliente intento usar la conexion Solana o acciones de wallet sin instalar el plugin. Los composables actuales devuelven estado inerte seguro para SSR cuando Nuxt renderiza en el servidor, pero las operaciones RPC y de wallet reales todavia requieren el contexto del plugin cliente.

Para Vue:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

Para Nuxt, registra el modulo:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

El modulo Nuxt mantiene el plugin Vue Solana solo en cliente. Los composables autoimportados pueden llamarse durante SSR, pero evita hacer trabajo RPC directo o de wallet en el servidor. Dispara lecturas RPC desde hooks de ciclo de vida cliente o acciones del usuario cuando necesites la conexion Solana real.

## `No Solana wallet is configured`

No se ha seleccionado ni configurado manualmente ninguna wallet. Usa `useWallets()` o `useSolanaWallets()` para seleccionar una wallet descubierta antes de llamar `connect()` o enviar una transaccion.

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

Las lecturas RPC y lecturas de balance funcionan sin wallet.

## No se detectan wallets de navegador

Causas comunes:

- No hay ninguna extension de wallet Solana instalada.
- La extension de wallet esta deshabilitada para el perfil actual del navegador.
- La app se esta ejecutando en SSR o en un entorno que no es navegador.
- La wallet no implementa Wallet Standard.

Instala una wallet como Phantom, Solflare o Backpack, luego llama `refreshWallets()` despues de que cargue la pagina.

## Mobile Wallet Adapter no se detecta

El registro web de Android Mobile Wallet Adapter funciona solo en runtimes compatibles de Android Chrome mobile web y Chrome PWA.

Causas comunes:

- La app se esta ejecutando en desktop, iOS, Firefox Android, Brave Android, Opera Android u otro navegador no compatible.
- No hay una wallet movil Solana compatible instalada.
- Se paso `mobileWallet: false` al plugin Vue o al modulo Nuxt.
- El descubrimiento de wallets se ejecuto antes de la hidratacion o antes de que la pagina pudiera acceder a `window`.

Abre la app en Android Chrome, instala una wallet compatible y luego llama `refreshWallets()` despues de que cargue la pagina.

## El enlace de wallet iOS no completa

El soporte de wallets iOS usa enlaces universales de Phantom, Solflare y Backpack. La app de wallet redirige de vuelta a la URL de tu app despues de la aprobacion.

Causas comunes:

- La app no se esta ejecutando en un navegador iOS.
- Phantom, Solflare o Backpack no esta instalado en el dispositivo.
- Se paso `iosWallet: false` al plugin Vue o al modulo Nuxt.
- El `redirectUrl` configurado no vuelve a la misma pagina de la app que refresca el estado de wallet.
- El refresh de wallet o el manejo de callback solo se ejecuta durante SSR en vez de en el cliente.

Manten el trabajo de wallet iOS del lado cliente, asegurate de que la URL de redireccion cargue la app otra vez y llama `refreshWallets()` despues de que cargue la pagina redirigida. El plugin Vue maneja callbacks iOS durante el refresh de wallet; las apps que usen helpers core directamente deberian llamar `handleSolanaIosWalletCallback()` antes de depender de la sesion de wallet adaptada.

## `Solana wallet is not connected`

El helper de transaccion se llamo antes de que la wallet reportara `connected: true` y una `publicKey` no nula.

Llama `connect()` primero, o comprueba `connected.value` antes de enviar.

## La wallet aparece conectada despues de recargar durante desarrollo local

Seleccionar una wallet descubierta no deberia marcarla como conectada. `connected` deberia volverse true solo despues de que `connect()` tenga exito, incluso si la extension de navegador expone cuentas autorizadas previamente.

Si los ejemplos locales de Vue o Nuxt todavia aparecen conectados inmediatamente despues de recargar, reconstruye los paquetes del workspace y reinicia completamente el servidor dev para que Vite/Nuxt descarten salida de paquete obsoleta:

```sh
pnpm build:packages
pnpm dev:vue
```

Para Nuxt, usa `pnpm dev:nuxt` despues de reconstruir los paquetes.

## `Solana wallet does not support signTransaction`

La wallet configurada no expone `signAndSendTransaction` ni `signTransaction`. Usa una wallet que soporte firma de transacciones para la cadena Solana seleccionada.

## La transaccion de wallet no devolvio un resultado

Esto puede pasar cuando un adaptador de wallet inicia una transferencia movil pero nunca resuelve su promesa del navegador. Vue Solana limpia `loading` y define `error` en vez de dejar la app bloqueada en estado de envio. La transaccion aun puede haber tenido exito si la wallet la envio antes de que se perdiera la respuesta, asi que revisa la actividad de la wallet o un explorer de Solana antes de reintentar.

Las wallets Android Mobile Wallet Adapter prefieren firma de wallet mas envio RPC desde la app cuando `signTransaction` esta disponible. Esa ruta evita el caso comun en que la wallet envia correctamente pero la pagina del navegador nunca recibe la firma devuelta por el adaptador.

## `Buffer is not defined`

Algunas rutas de serializacion de transacciones de Solana todavia esperan un global `Buffer` compatible con Node en runtimes de navegador. En apps Vue de navegador, inicializa el polyfill Buffer del paquete Vue antes de crear o serializar transacciones. Usa `@vue-solana/nuxt/buffer-polyfill` en apps Nuxt.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

El helper lo proporcionan los paquetes de framework, asi que las apps no necesitan instalar ni importar `buffer` directamente para los ejemplos de transacciones Vue Solana.

## El modulo `buffer` fue externalizado

Si la consola dice `Module "buffer" has been externalized for browser compatibility`, reemplaza importaciones directas de la app desde `buffer` con `installSolanaBufferPolyfill()` desde `@vue-solana/vue/buffer-polyfill` o `@vue-solana/nuxt/buffer-polyfill`, luego reinicia el servidor dev. Vite puede guardar en cache la dependencia optimizada previamente.

## Fallan las lecturas de balance

Causas comunes:

- La cadena de direccion no es una public key valida de Solana.
- El endpoint RPC no esta disponible o tiene rate limit.
- La direccion de wallet esta en un cluster diferente al endpoint RPC configurado.

Comprueba el cluster y endpoint configurados con `useRpc()` o `useSolanaRpc()`.

## Faltan los auto-imports de Nuxt

Asegurate de que `@vue-solana/nuxt` este listado en `modules` y reinicia el servidor dev de Nuxt despues de instalar el paquete.

Si TypeScript todavia no reconoce los auto-imports, regenera los tipos de Nuxt:

```sh
npx nuxi prepare
```
