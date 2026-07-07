---
title: "Wallets"
description: Descubre wallets, selecciona una wallet activa, conecta, desconecta y comprueba capacidades.
ogSection: Guias
surroundOrder: 9
---

Vue Solana expone wallets de extension de navegador, wallets Android Mobile Wallet Adapter y enlaces de wallets de navegador iOS admitidas mediante un unico flujo de wallet.

Usa `useWallets()` para descubrir y seleccionar una wallet. Usa `useWallet()` para conectar, desconectar, leer la public key activa y comprobar capacidades de la wallet.

El soporte actual de wallets se basa en estas librerias:

- Wallets de extension de navegador: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features` y `@solana/wallet-standard-features`.
- Wallets nativas moviles Android: `@solana-mobile/wallet-standard-mobile`, que registra Solana Mobile Wallet Adapter como Wallet Standard en runtimes compatibles de Android Chrome mobile web y PWA.
- Wallets de navegador iOS: enlaces universales especificos de wallet para Phantom, Solflare y Backpack.
- Primitivas y tipos de transaccion de Solana: `@vue-solana/vue/web3` para apps Vue, `@vue-solana/nuxt/web3` para apps Nuxt y `@vue-solana/core/web3` para uso core independiente del framework.

## Fuentes De Wallet

Las fuentes actuales de wallet son:

- Wallets de extension de navegador mediante Solana Wallet Standard.
- Android Mobile Wallet Adapter mediante registro Wallet Standard en clientes Android Chrome compatibles.
- Enlaces de wallets de navegador iOS para wallets admitidas como Phantom, Solflare y Backpack.

Todas las fuentes aparecen en la misma lista de wallets descubiertas. Las apps no deberian construir flujos publicos separados para wallets de navegador, Android e iOS salvo que necesiten texto de UI especifico de plataforma.

## Matriz De Soporte

| Ruta de wallet                  | Estado v1                                | Como aparece                                            | Notas                                                                 |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Wallets de extension navegador  | Admitido                                 | `platform: "browser"`, `source: "wallet-standard"`      | Usa registro Solana Wallet Standard.                                  |
| Wallets nativas moviles Android | Admitido en Android Chrome y Chrome PWAs | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | Registrado mediante `@solana-mobile/wallet-standard-mobile`.          |
| Wallets de navegador iOS        | Admitido para enlaces configurados       | `platform: "mobile"`, `source: "deep-link"`             | Phantom, Solflare y Backpack se exponen mediante enlaces universales. |
| Objetos wallet manuales/custom  | Admitido                                 | Wallet proporcionada por la app                         | Debe implementar la interfaz `SolanaWallet`.                          |
| Wallets desktop nativas         | Diferido de v1                           | No expuesto por defecto                                 | Metadata `protocol-link` reservada para adaptadores futuros.          |

Lo que funciona hoy:

- Descubrir wallets de todas las fuentes admitidas en una sola lista `wallets`.
- Seleccionar una wallet activa sin conectarla inmediatamente.
- Persistir metadata de identidad de la wallet seleccionada para flujos de reconexion opcionales.
- Conectar, desconectar, firmar mensajes, firmar transacciones y firmar/enviar transacciones cuando la wallet seleccionada admite esas capacidades.
- Renderizar UI de capacidades no admitidas desde `canSignMessage`, `canSignTransaction`, `canSignAllTransactions` y `canSignAndSendTransaction`.

Lo que no esta incluido en v1:

- Un modal de wallet o paquete de UI integrado.
- Adaptadores de enlaces de protocolo para wallets desktop nativas.
- Prompts de wallet del lado del servidor.
- Manejo de claves privadas o frases semilla.

## Flujo De Wallet En Vue

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";
import { useWallets } from "@vue-solana/vue/useWallets";

const { wallets, selectedWallet, refreshWallets, selectWallet } = useWallets();
const { publicKey, connected, connecting, connect, disconnect } = useWallet();
</script>

<template>
  <section>
    <button type="button" @click="refreshWallets">Actualizar wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Seleccionada: {{ selectedWallet?.name ?? "Ninguna" }}</p>
    <p>Conectada: {{ connected }}</p>
    <p>Public key: {{ publicKey?.toBase58() ?? "Ninguna" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Conectar
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Desconectar</button>
  </section>
</template>
```

Seleccionar una wallet no la conecta. La wallet permanece desconectada hasta que `connect()` se resuelve correctamente.

## Flujo De Wallet En Nuxt

Nuxt autoimporta el mismo flujo de wallet con `useSolanaWallets()` y `useSolanaWallet()`.

```vue
<script setup lang="ts">
const { wallets, selectedWallet, selectWallet, refreshWallets } = useSolanaWallets();
const { publicKey, connected, connect, disconnect } = useSolanaWallet();
</script>
```

Dispara trabajo de wallet en el cliente desde acciones del usuario. Los prompts de wallet no deben ejecutarse durante SSR.

## Comprobaciones De Capacidades

Las wallets pueden admitir distintas funciones. Comprueba capacidades antes de renderizar acciones.

```vue
<script setup lang="ts">
import { useWallet } from "@vue-solana/vue/useWallet";

const { connected, canSignMessage, canSignTransaction, connect } = useWallet();
</script>

<template>
  <button type="button" :disabled="connected" @click="connect">Conectar</button>
  <button type="button" :disabled="!connected || !canSignMessage">Firmar mensaje</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Firmar transaccion</button>
</template>
```

Para codigo independiente del framework, usa las aserciones de wallet de `@vue-solana/core/wallet`.

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey.toBase58());

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Auto Connect

`autoConnect` reconecta solo una identidad de wallet que el usuario selecciono previamente y que se descubre de nuevo en el cliente.

Vue Solana almacena solo metadata de identidad de wallet en `localStorage["vue-solana:selected-wallet"]`: `name`, y `platform`/`source` cuando estan disponibles. Nunca almacena claves privadas, datos de sesion ni datos de transaccion.

Llama `selectWallet(null)` cuando los usuarios limpien explicitamente la seleccion de wallet. Llama `setWallet(customWallet)` desde `useWallet()` solo cuando tu app posee un objeto wallet personalizado; la UI normal de la app debe seleccionar desde `useWallets()`.

Si local storage no esta disponible, la seleccion de wallet sigue funcionando para la sesion actual de la pagina, pero la restauracion persistida puede fallar con un error normalizado `STORAGE_FAILURE`.

## Firma De Mensajes Para Auth

La firma de mensajes prueba el control de una wallet para autenticacion off-chain. No autoriza una transaccion on-chain. Usa texto de desafio claro y verificalo en tu backend.

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Iniciar sesion en example.com\nNonce: 8f1a2c\nExpira: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

Manten los nonces de un solo uso y corta vida. No uses errores crudos de wallet o RPC como errores de autenticacion visibles al usuario.

## Wallets Moviles

El registro Android Mobile Wallet Adapter esta habilitado por defecto en el plugin Vue y el modulo Nuxt en clientes Android Chrome compatibles.

```ts
createSolanaPlugin({
  cluster: "devnet",
  mobileWallet: {
    appIdentity: {
      name: "My Vue Solana App",
      uri: "https://example.com",
      icon: "favicon.ico",
    },
  },
});
```

Pasa `mobileWallet: false` para deshabilitar el registro de Android Mobile Wallet Adapter.

Los enlaces de wallets iOS estan habilitados por defecto en navegadores iOS. Pasa opciones `iosWallet` para personalizar identidad de app, URL de redireccion, chains o cluster. Pasa `iosWallet: false` para deshabilitar el descubrimiento de enlaces de wallets iOS.

Notas de Android:

- El registro Android MWA es solo de cliente y no hace nada durante SSR.
- Se espera que funcione solo en runtimes Android Chrome o Chrome PWA que admitan el bridge mobile wallet adapter.
- El traspaso a la wallet puede salir del navegador y volver a la app; conserva estado de UI para que los usuarios puedan ver la firma enviada despues de la redireccion.
- Vue Solana adapta wallets MWA a la misma interfaz `SolanaWallet` que las wallets de extension.
- El paquete mobile wallet maneja UI de fallback para wallet no instalada mediante su handler predeterminado wallet-not-found.
- Los navegadores pueden mostrar un prompt de Local Network Access una sola vez antes de que MWA pueda conectar con una app wallet instalada.
- Para envios de transacciones Android MWA, Vue Solana pide a la wallet movil que firme y luego envia la transaccion firmada mediante la conexion RPC de la app cuando la wallet admite `signTransaction`. Esto mantiene la firma devuelta bajo control de la app y evita un caso limite de traspaso movil donde la wallet envia correctamente pero la pagina del navegador no recibe la respuesta del wallet adapter.

Notas de iOS:

| Capacidad                  | Comportamiento v1                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Descubrimiento             | Entradas de Phantom, Solflare y Backpack pueden aparecer en navegadores iOS.            |
| Conexion                   | Usa enlaces universales especificos de wallet y callbacks de redireccion.               |
| Manejo de sesion           | Las apps deben manejar estado de callback antes de asumir conexion tras la redireccion. |
| Transacciones              | La capacidad depende del enlace de wallet y los datos de sesion devueltos.              |
| Apps nativas en Safari Mac | No implementado como ruta desktop nativa en v1.                                         |

Si usas helpers core de iOS directamente, llama `handleSolanaIosWalletCallback()` temprano en el arranque del cliente para validar y descifrar datos de redireccion antes de que la app lea estado de wallet.

## Interfaz Manual De Wallet

Las integraciones de wallet personalizadas pueden proporcionar un objeto `SolanaWallet` directamente mediante el plugin Vue o `setWallet()`.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Abre tu UI de wallet y asigna publicKey despues de la aprobacion.
  },
  async disconnect() {
    // Limpia el estado local de wallet.
  },
  async signTransaction(transaction) {
    // Devuelve la transaccion firmada.
    return transaction;
  },
};
```

Los objetos wallet manuales nunca deben exponer claves privadas a Vue Solana. Manten la custodia de claves dentro del proveedor de wallet.

## Helpers Core Directos

Usa helpers core directos solo cuando estes construyendo tu propia capa de integracion de wallets.

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

Si usas helpers core de iOS directamente, llama `handleSolanaIosWalletCallback()` antes de depender de una conexion de wallet iOS devuelta tras redireccion.

## Notas De Seguridad

- Nunca solicites claves privadas a los usuarios.
- Nunca almacenes sesiones de wallet ni datos de transaccion en local storage.
- Trata nombres, iconos y metadata de wallets como datos de visualizacion no confiables.
- Pide una accion explicita del usuario antes de firmar mensajes o transacciones.
- Muestra UI deshabilitada o explicativa para capacidades no admitidas en lugar de intentar llamadas de wallet a ciegas.
- Manten devnet como predeterminado para ejemplos y tutoriales; usa `mainnet-beta` solo cuando se pretendan fondos reales.

Referencias oficiales:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Documentacion De Solana](https://solana.com/docs)
