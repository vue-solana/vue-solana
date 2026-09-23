---
title: Portal De Desarrolladores
description: Quickstart, endpoints legibles por maquina y convenciones de integracion para construir sobre Vue Solana.
ogSection: Proyecto
surroundOrder: 23
---

Este portal es el punto de entrada para desarrolladores y agentes de IA que integren con Vue Solana, tanto con las librerias Vue/Nuxt como con la superficie legible por maquina de este sitio de documentacion.

## Quickstart: Construye Una App Solana Con Vue

1. Instala el paquete para tu stack: `pnpm add @vue-solana/nuxt` para Nuxt, o `pnpm add @vue-solana/vue @vue-solana/core` para Vue 3 puro.
2. Registra el plugin o modulo (ver [Comenzar](/es/getting-started)) y apuntalo a un cluster — devnet por defecto.
3. Lee datos con composables: `useSolanaClient`, `useBalance`, `useTokenAccounts`.
4. Conecta una wallet con `useWallets` y `useWallet` (extensiones de navegador, Mobile Wallet Adapter y enlaces de wallet iOS).
5. Firma y envia con `useSignMessage` y `useSignAndSendTransaction`.

No hay claves de API para el RPC de Solana: los composables hablan con endpoints publicos de devnet/mainnet, y puedes cambiar a tu propio proveedor de RPC. La [demo en vivo](/es/demo) ejecuta los paquetes publicados contra devnet en tu navegador — sin registro.

## Superficie Legible Por Maquina De Este Sitio

Este sitio de documentacion expone una superficie de maquina documentada, sin registro ni claves:

- `/llms.txt` — indice de todas las paginas de documentacion para agentes.
- `/llms-full.txt` — el corpus completo de documentacion como un unico documento markdown.
- `/openapi.json` — especificacion OpenAPI 3.1 que cubre todos los endpoints, el modelo de errores RFC 9457, la politica de versionado y las convenciones de rate limit.
- Negociacion con `Accept: text/markdown` en todas las paginas de documentacion (o anade `.md` a la URL).
- `/sitemap.xml` — lista completa de URLs.

Los errores siguen RFC 9457 (`application/problem+json`) con un objeto de extension `recovery`; los 404 de rutas desconocidas devuelven un cuerpo de recuperacion en markdown cuando se piden con `Accept: text/markdown`.

## Sandbox

El cluster de [devnet](/es/concepts/clusters) es el sandbox compartido: es gratuito, no requiere credenciales, y los airdrops permiten probar transferencias sin fondos reales. La pagina de demo esta configurada para devnet, y los ejemplos de todas las guias se ejecutan contra ella.

## Claves De API Y Autenticacion

No hay ninguna que gestionar. Los paquetes son librerias cliente que ejecutas en tu propia app, y los endpoints de maquina de este sitio son publicos. Si una funcionalidad futura requiere claves, se anunciaran primero en la pagina de [Hoja de ruta](/es/roadmap).
