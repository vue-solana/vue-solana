---
title: Documentación de Vue Solana
description: Documentación para bibliotecas Vue y Nuxt que ayudan a desarrolladores a usar Solana.
ogSection: Resumen
surroundOrder: 1
---

Vue Solana es un pequeño ecosistema de paquetes Vue y Nuxt para construir aplicaciones Solana.

Vue Solana ofrece configuración RPC, lecturas reactivas de cuentas, lecturas de balance, descubrimiento de wallets de extensión de navegador, descubrimiento de Android Mobile Wallet Adapter, links de wallets para navegador iOS, conexión/desconexión de wallet y flujos de transferencias de transacciones mediante composables Vue y Nuxt. Los ejemplos usan devnet por defecto para pruebas seguras.

## Paquetes

- [`@vue-solana/core`](/packages/core): configuración Solana agnóstica al framework, helpers de endpoint, tipos de wallet y helpers de transacciones.
- [`@vue-solana/vue`](/packages/vue): plugin de Vue y composables.
- [`@vue-solana/nuxt`](/packages/nuxt): módulo de Nuxt que instala el plugin de Vue y autoimporta composables.

`@vue-solana/core` se construye sobre `@solana/web3-compat` y reexporta primitivas Solana soportadas desde `@vue-solana/core/web3`. Las apps Vue pueden usar `@vue-solana/vue/web3`, y las apps Nuxt pueden usar `@vue-solana/nuxt/web3`, sin instalar core directamente.

## Empieza aquí

- [Primeros pasos](/getting-started)
- [Guía de wallets](/guides/wallets)
- [Guía de transacciones](/guides/transactions)
- [Solana para desarrolladores Vue](/concepts/solana-for-vue-developers)
- [Clusters](/concepts/clusters)
- [Roadmap v1](/roadmap)
- [Agent Skill](/agent-skill)
- [Solución de problemas](/troubleshooting)

## Referencia de API

- [`@vue-solana/core`](/packages/core): configuración, endpoints, interfaces de wallet, helpers de Wallet Standard, helpers móviles/iOS, helpers de transacciones y errores normalizados.
- [`@vue-solana/vue`](/packages/vue): plugin de Vue y composables para RPC, lecturas de cuentas, wallets, mensajes, firmas y transacciones.
- [`@vue-solana/nuxt`](/packages/nuxt): opciones del módulo Nuxt, comportamiento runtime y composables autoimportados.

## Ejemplos

- [Demo en vivo](/demo)
- [Ejemplo Vue Vite](/examples/vue-vite)
- [Ejemplo Nuxt](/examples/nuxt)

## Para usuarios de los paquetes

Empieza con [Primeros pasos](/getting-started) para instalar el paquete Vue o Nuxt en tu propia app. Usa la [Demo en vivo](/demo) para probar lecturas RPC en devnet, conexión de wallet, firma de mensajes y flujos de transferencia antes de integrar los composables en tu proyecto.

Referencias oficiales de Solana:

- [Solana Documentation](https://solana.com/docs)
- [Solana RPC Methods](https://solana.com/docs/rpc)
- [Solana Clusters](https://solana.com/docs/references/clusters)
- [Solana Faucet](https://faucet.solana.com)
