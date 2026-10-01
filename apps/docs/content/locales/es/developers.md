---
title: Portal De Desarrolladores
description: Quickstart, endpoints legibles por máquina y convenciones de integración para construir sobre Vue Solana.
ogSection: Proyecto
surroundOrder: 23
---

Este portal es el punto de entrada para desarrolladores y agentes de IA que integren con Vue Solana, tanto con las librerias Vue/Nuxt como con la superficie legible por máquina de este sitio de documentación.

## Quickstart: Construye Una App Solana Con Vue

1. Instala el paquete para tu stack: `pnpm add @vue-solana/nuxt` para Nuxt, o `pnpm add @vue-solana/vue @vue-solana/core` para Vue 3 puro.
2. Registra el plugin o modulo (ver [Comenzar](/es/getting-started)) y apuntalo a un cluster — devnet por defecto.
3. Lee datos con composables: `useSolanaClient`, `useBalance`, `useTokenAccounts`.
4. Conecta una wallet con `useWallets` y `useWallet` (extensiones de navegador, Mobile Wallet Adapter y enlaces de wallet iOS).
5. Firma y envia con `useSignMessage` y `useSignAndSendTransaction`.

No hay claves de API para el RPC de Solana: los composables hablan con endpoints publicos de devnet/mainnet, y puedes cambiar a tu propio proveedor de RPC. La [demo en vivo](/es/demo) ejecuta los paquetes publicados contra devnet en tu navegador — sin registro.

## Superficie Legible Por máquina De Este Sitio

Este sitio de documentación expone una superficie de máquina documentada, sin registro ni claves:

- `/llms.txt` — indice de todas las paginas de documentación para agentes.
- `/llms-full.txt` — el corpus completo de documentación como un único documento markdown.
- `/openapi.json` — especificación OpenAPI 3.1 que cubre todos los endpoints, el modelo de errores RFC 9457, la politica de versionado y las convenciones de rate limit.
- Negociación con `Accept: text/markdown` en todas las paginas de documentación (o anade `.md` a la URL).
- `/sitemap.xml` — lista completa de URLs.

Los errores siguen RFC 9457 (`application/problem+json`) con un objeto de extensión `recovery`; los 404 de rutas desconocidas devuelven un cuerpo de recuperación en markdown cuando se piden con `Accept: text/markdown`.

## Sandbox

El cluster de [devnet](/es/concepts/clusters) es el sandbox compartido: es gratuito, no requiere credenciales, y los airdrops permiten probar transferencias sin fondos reales. La página de demo está configurada para devnet, y los ejemplos de todas las guías se ejecutan contra ella.

## Claves De API Y Autenticación

No hay ninguna que gestionar. Los paquetes son librerias cliente que ejecutas en tu propia app, y los endpoints de máquina de este sitio son publicos. Si una funcionalidad futura requiere claves, se anunciaran primero en la página de [Hoja de ruta](/es/roadmap).
