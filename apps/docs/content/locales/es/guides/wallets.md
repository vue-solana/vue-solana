---
title: "Wallets"
description: Descubre wallets, selecciona una wallet activa, conecta, desconecta y comprueba capacidades.
ogSection: Guides
surroundOrder: 9
---

Vue Solana expone wallets de extensión de navegador, wallets Android Mobile Wallet Adapter y enlaces de wallets de navegador iOS admitidas mediante un único flujo de wallet.

Usa `useWallets()` para descubrir y seleccionar una wallet. Usa `useWallet()` para conectar, desconectar, leer la dirección activa y comprobar capacidades de la wallet.

El soporte actual de wallets se basa en estas librerías:

- Wallets de extensión de navegador: `@wallet-standard/app`, `@wallet-standard/base`, `@wallet-standard/features` y `@solana/wallet-standard-features`.
- Wallets nativas móviles Android: `@solana-mobile/wallet-standard-mobile`, que registra Solana Mobile Wallet Adapter como Wallet Standard en runtimes compatibles de Android Chrome mobile web y PWA.
- Wallets de navegador iOS: enlaces universales específicos de wallet para Phantom, Solflare y Backpack.
- Primitivas de Solana y helpers de transacción: tipos y constructores de mensajes de `@solana/kit`, reexportados en parte a través de `@vue-solana/vue/kit`, `@vue-solana/nuxt/kit` y `@vue-solana/core/kit`.

## Fuentes De Wallet

Las fuentes actuales de wallet son:

- Wallets de extensión de navegador mediante Solana Wallet Standard.
- Android Mobile Wallet Adapter mediante registro Wallet Standard en clientes Android Chrome compatibles.
- Enlaces de wallets de navegador iOS para wallets admitidas como Phantom, Solflare y Backpack.

Todas las fuentes aparecen en la misma lista de wallets descubiertas. Las apps no deberían construir flujos públicos separados para wallets de navegador, Android e iOS salvo que necesiten texto de UI específico de plataforma.

## Matriz De Soporte

| Ruta de wallet                  | Estado                                   | Como aparece                                            | Notas                                                                 |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| Wallets de extensión navegador  | Admitido                                 | `platform: "browser"`, `source: "wallet-standard"`      | Usa registro Solana Wallet Standard.                                  |
| Wallets nativas móviles Android | Admitido en Android Chrome y Chrome PWAs | `platform: "mobile"`, `source: "mobile-wallet-adapter"` | Registrado mediante `@solana-mobile/wallet-standard-mobile`.          |
| Wallets de navegador iOS        | Admitido para enlaces configurados       | `platform: "mobile"`, `source: "deep-link"`             | Phantom, Solflare y Backpack se exponen mediante enlaces universales. |
| Objetos wallet manuales/custom  | Admitido                                 | Wallet proporcionada por la app                         | Debe implementar la interfaz `SolanaWallet`.                          |
| Wallets desktop nativas         | No soportado aún                         | No expuesto por defecto                                 | Metadata `protocol-link` reservada para adaptadores futuros.          |

Lo que funciona hoy:

- Descubrir wallets de todas las fuentes admitidas en una sola lista `wallets`.
- Seleccionar una wallet activa sin conectarla inmediatamente.
- Persistir metadata de identidad de la wallet seleccionada para flujos de reconexión opcionales.
- Conectar, desconectar, firmar mensajes, firmar transacciones y firmar/enviar transacciones cuando la wallet seleccionada admite esas capacidades.
- Renderizar UI de capacidades no admitidas desde `canSignMessage`, `canSignTransaction`, `canSignAllTransactions` y `canSignAndSendTransaction`.

Lo que no está incluido aún:

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
    <button type="button" @click="refreshWallets">Refresh wallets</button>

    <button
      v-for="wallet in wallets"
      :key="`${wallet.source ?? 'unknown'}:${wallet.name}`"
      type="button"
      @click="selectWallet(wallet)"
    >
      {{ wallet.name }}
    </button>

    <p>Selected: {{ selectedWallet?.name ?? "None" }}</p>
    <p>Connected: {{ connected }}</p>
    <p>Public key: {{ publicKey ?? "None" }}</p>

    <button type="button" :disabled="!selectedWallet || connected || connecting" @click="connect">
      Connect
    </button>
    <button type="button" :disabled="!connected" @click="disconnect">Disconnect</button>
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
  <button type="button" :disabled="connected" @click="connect">Connect</button>
  <button type="button" :disabled="!connected || !canSignMessage">Sign message</button>
  <button type="button" :disabled="!connected || !canSignTransaction">Sign transaction</button>
</template>
```

Para código independiente del framework, usa las aserciones de wallet de `@vue-solana/core/wallet`.

```ts
import { assertWalletCanSign, assertWalletConnected } from "@vue-solana/core/wallet";

assertWalletConnected(wallet);
console.log(wallet.publicKey);

assertWalletCanSign(wallet);
const signed = await wallet.signTransaction(transaction);
```

## Auto Connect

`autoConnect` reconecta solo una identidad de wallet que el usuario seleccionó previamente y que se descubre de nuevo en el cliente.

Vue Solana almacena solo metadata de identidad de wallet en `localStorage["vue-solana:selected-wallet"]`: `name`, y `platform`/`source` cuando están disponibles. Nunca almacena claves privadas, datos de sesión ni datos de transacción.

Llama `selectWallet(null)` cuando los usuarios limpien explícitamente la selección de wallet. Llama `setWallet(customWallet)` desde `useWallet()` solo cuando tu app posee un objeto wallet personalizado; la UI normal de la app debe seleccionar desde `useWallets()`.

Si local storage no está disponible, la selección de wallet sigue funcionando para la sesión actual de la página, pero la restauración persistida puede fallar con un error normalizado `STORAGE_FAILURE`.

## Firma De Mensajes Para Auth

La firma de mensajes prueba el control de una wallet para autenticación off-chain. No autoriza una transacción on-chain. Usa texto de desafío claro y verifica en tu backend.

```ts
const { connected, canSignMessage } = useWallet();
const { execute, signature } = useSignMessage();

async function signIn() {
  if (!connected.value || !canSignMessage.value) return;

  const message = new TextEncoder().encode(
    "Sign in to example.com\nNonce: 8f1a2c\nExpires: 2026-07-03T12:00:00Z",
  );

  await execute(message);
  await fetch("/api/verify-wallet", {
    method: "POST",
    body: JSON.stringify({ signature: Array.from(signature.value ?? []) }),
  });
}
```

Mantén los nonces de un solo uso y corta vida. No uses errores crudos de wallet o RPC como errores de autenticación visibles al usuario.

## Wallets Móviles

El registro Android Mobile Wallet Adapter está habilitado por defecto en el plugin Vue y el módulo Nuxt en clientes Android Chrome compatibles.

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

Los enlaces de wallets iOS están habilitados por defecto en navegadores iOS. Pasa opciones `iosWallet` para personalizar identidad de app, URL de redirección, chains o cluster. Pasa `iosWallet: false` para deshabilitar el descubrimiento de enlaces de wallets iOS.

Notas de Android:

- El registro Android MWA es solo de cliente y no hace nada durante SSR.
- Se espera que funcione solo en runtimes Android Chrome o Chrome PWA que admitan el bridge mobile wallet adapter.
- El traspaso a la wallet puede salir del navegador y volver a la app; conserva estado de UI para que los usuarios puedan ver la firma enviada después de la redirección.
- Vue Solana adapta wallets MWA a la misma interfaz `SolanaWallet` que las wallets de extensión.
- El paquete mobile wallet maneja UI de fallback para wallet no instalada mediante su handler predeterminado wallet-not-found.
- Los navegadores pueden mostrar un prompt de Local Network Access una sola vez antes de que MWA pueda conectar con una app wallet instalada.
- Para envíos de transacciones Android MWA, Vue Solana pide a la wallet móvil que firme y luego envía la transacción firmada a través de la conexión RPC de la app cuando la wallet admite `signTransaction`. Esto mantiene la firma devuelta bajo control de la app y evita un caso límite de traspaso móvil donde la wallet envía correctamente pero la página del navegador no recibe la respuesta del wallet adapter.

Notas de iOS:

| Capacidad                  | Comportamiento actual                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Descubrimiento             | Entradas de Phantom, Solflare y Backpack pueden aparecer en navegadores iOS.            |
| Conexión                   | Usa enlaces universales específicos de wallet y callbacks de redirección.               |
| Manejo de sesión           | Las apps deben manejar estado de callback antes de asumir conexión tras la redirección. |
| Transacciones              | La capacidad depende del enlace de wallet y los datos de sesión devueltos.              |
| Apps nativas en Safari Mac | No implementado.                                                                        |

Si usas helpers core de iOS directamente, llama `handleSolanaIosWalletCallback()` temprano en el arranque del cliente para validar y descifrar datos de redirección antes de que la app lea estado de wallet.

## Interfaz Manual De Wallet

Las integraciones de wallet personalizadas pueden proporcionar un objeto `SolanaWallet` directamente mediante el plugin Vue o `setWallet()`.

```ts
import type { SolanaWallet } from "@vue-solana/core/types";

const customWallet: SolanaWallet = {
  publicKey: null,
  connected: false,
  async connect() {
    // Open your wallet UI and assign publicKey after approval.
  },
  async disconnect() {
    // Clear local wallet state.
  },
  async signTransaction(transaction) {
    // Return the signed transaction.
    return transaction;
  },
};
```

Los objetos wallet manuales nunca deben exponer claves privadas a Vue Solana. Mantén la custodia de claves dentro del proveedor de wallet.

## Helpers Core Directos

Usa helpers core directos solo cuando estés construyendo tu propia capa de integración de wallets.

```ts
import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
import { getRegisteredSolanaWallets } from "@vue-solana/core/wallet-standard";

registerSolanaMobileWallet();

const wallets = getRegisteredSolanaWallets();
```

Si usas helpers core de iOS directamente, llama `handleSolanaIosWalletCallback()` antes de depender de una conexión de wallet iOS devuelta tras redirección.

## Notas De Seguridad

- Nunca solicites claves privadas a los usuarios.
- Nunca almacenes sesiones de wallet ni datos de transacción en local storage.
- Trata nombres, iconos y metadata de wallets como datos de visualización no confiables.
- Pide una acción explícita del usuario antes de firmar mensajes o transacciones.
- Muestra UI deshabilitada o explicativa para capacidades no admitidas en lugar de intentar llamadas de wallet a ciegas.
- Mantén devnet como predeterminado para ejemplos y tutoriales; usa `mainnet-beta` solo cuando se pretendan fondos reales.

Referencias oficiales:

- <a href="https://github.com/wallet-standard/wallet-standard" target="_blank" rel="noopener noreferrer">Wallet Standard</a>
- <a href="https://github.com/anza-xyz/wallet-adapter/tree/master/packages/wallets/wallet-standard" target="_blank" rel="noopener noreferrer">Solana Wallet Standard</a>
- [Documentación De Solana](https://solana.com/docs)
