---
title: Roadmap
description: Funcionalidades y mejoras planificadas para Vue Solana.
ogSection: Roadmap
surroundOrder: 22
---

Los paquetes son estables para producción con lecturas RPC, descubrimiento y conexión de wallets, consulta de balance, transacciones, lecturas de cuentas, firma de mensajes, manejo de errores normalizado, Sign In With Solana, firma y envío de transacciones en lote, planificación de transacciones, adaptadores de caché SWR y helpers de tokens SPL. Esta hoja de ruta describe lo que viene a continuación, ordenado por impacto y sin vincularse a una versión concreta.

## Auditoría actual y próximos pasos

La auditoría del 18 de noviembre de 2026 confirmó que en ese momento ninguna de las funcionalidades enumeradas aquí se había publicado como una función pública completa, aunque varias ya contaban con una base parcial. La simulación de transacciones se ha publicado desde entonces; trabaja en los elementos restantes en este orden salvo que una solicitud del usuario cambie la prioridad:

| Prioridad | Elemento                                                                                                           | Estado                                                                                                                                               | Próximo paso                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Helpers de simulación de transacciones                                                                             | Publicado mediante `simulateTransaction()`, `useSimulateTransaction()` y `useSolanaSimulateTransaction()`                                            | Seguir los trabajos posteriores en [`plans/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/use-simulate-transaction.md).       |
| 2         | Carga diferida de wallets iOS                                                                                      | Trabajo de rendimiento, no una función ausente; se puede eliminar aproximadamente el 58 % del fragmento cargado de inmediato de `createSolanaPlugin` | Planificar el cambio enfocado en [`plans/bundle-performance-followups.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/bundle-performance-followups.md). |
| 3         | Utilidades RPC de servidor en Nuxt                                                                                 | Faltan; el core ya se puede usar manualmente en código de servidor                                                                                   | Definir una exportación para Nitro/servidor con reglas estrictas que excluyan secretos.                                                                               |
| 4         | Documentación versionada                                                                                           | Falta                                                                                                                                                | Crear la documentación archivada en `/v1/` y las redirecciones de URLs antiguas.                                                                                      |
| Más tarde | Más wallets iOS                                                                                                    | Phantom, Solflare y Backpack ya están implementadas; Trust Wallet sigue pendiente                                                                    | Investigar enlaces y callbacks específicos de cada proveedor y añadirlos detrás de `useWallets()`.                                                                    |
| Más tarde | Helpers de Anchor, modal/UI de wallet, wallets nativas de escritorio, failover RPC, indexación avanzada de cuentas | Faltan; requieren un compromiso amplio de API o arquitectura                                                                                         | Mantenerlos aquí hasta que cada uno tenga un plan propio.                                                                                                             |

Dos elementos antiguos ya están cubiertos: las suscripciones en tiempo real están implementadas mediante `useSubscription()`, `useTrackedData()` y los adaptadores SWR. El elemento marcado como completado «wallets nativas de escritorio» en `plans/native-wallet-plan.md` registra una decisión pospuesta, no una implementación.

## Transacciones

### Helpers de simulación de transacciones

Publicado: `simulateTransaction()` en core, `useSimulateTransaction()` en Vue y `useSolanaSimulateTransaction()` en Nuxt simulan transacciones antes de enviarlas para que las apps puedan previsualizar comisiones, cambios de cuentas y posibles fallos sin gastar SOL.

## Integraciones con el ecosistema

### Soporte de wallets nativas de escritorio

Soporte de wallets nativas de escritorio mediante enlaces de protocolo a través de los flujos de wallet unificados.

### Más proveedores de wallets iOS

Soporte para más wallets de navegadores iOS además de los enlaces universales actuales de Phantom, Solflare y Backpack.

### Provider de Anchor y helpers de programas

Un provider de Anchor y helpers para cuentas e instrucciones de programas de Anchor.

### Modal de wallet o paquete de UI

Un modal de wallet o paquete de UI dedicado con flujos de conexión y firma preconstruidos.

### Utilidades RPC de servidor en Nuxt

Utilidades RPC de servidor en Nuxt para lecturas del lado del servidor.

### Documentación versionada

Documentación versionada: una build de docs antigua archivada bajo `/v1/` con un desplegable `v1 | latest` y redirecciones de URLs antiguas, para usuarios que aún no han migrado a la ruta Kit.

## Resiliencia y patrones avanzados

### Conmutación por error del proveedor RPC

Conmutación por error del proveedor RPC y manejo de límites de tasa.

### Indexación avanzada de cuentas

Patrones avanzados de indexación y caché de cuentas de programas.
