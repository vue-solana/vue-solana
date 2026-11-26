---
title: Roadmap
description: Funcionalidades y mejoras planificadas para Vue Solana.
ogSection: Roadmap
surroundOrder: 22
---

Los paquetes son estables para producción con lecturas RPC, descubrimiento y conexión de wallets, consulta de balance, transacciones, lecturas de cuentas, firma de mensajes, manejo de errores normalizado, Sign In With Solana, firma y envío de transacciones en lote, planificación de transacciones, adaptadores de caché SWR y helpers de tokens SPL. Esta hoja de ruta describe lo que viene a continuación, ordenado por impacto y sin vincularse a una versión concreta.

## Auditoría actual y próximos pasos

La auditoría del 18 de noviembre de 2026 confirmó que en ese momento ninguna de las funcionalidades enumeradas aquí se había publicado como una función pública completa, aunque varias ya contaban con una base parcial. La simulación, el RPC de servidor de Nuxt y el historial de transacciones se han publicado, y la unión de diagnósticos de transacciones está implementada y pendiente de publicación; trabaja en los elementos restantes en este orden salvo que una solicitud del usuario cambie la prioridad:

| Prioridad | Elemento                                                                                                                                                      | Estado                                                                                                              | Próximo paso                                                                                                                                                                                                                |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Política de comisiones/presupuesto de compute                                                                                                                 | Planificada                                                                                                         | Implementar la fase 1 del [plan de la cola de funciones](https://github.com/vue-solana/vue-solana/blob/main/plans/feature-queue-phases.md): política sobre los setters de Kit, sin envío ni oráculo dinámico de comisiones. |
| 2         | Unión de diagnósticos de transacciones                                                                                                                        | Implementado; pendiente de publicación                                                                              | Fase 2: se publicará a través de `@vue-solana/core/diagnostics`, `useTransactionDiagnostics()` y `useSolanaTransactionDiagnostics()`; consulta [Errores](/es/guides/errors).                                                |
| 3         | Lecturas de token/cartera                                                                                                                                     | Planificadas                                                                                                        | Fase 3: primero lecturas SPL clásicas, Token-2022 detrás de una subruta opcional.                                                                                                                                           |
| 4         | Reactividad de clients de programa                                                                                                                            | Planificada                                                                                                         | Fase 4: adaptadores reactivos alrededor de clients generados por Codama; sin generación de código ni registro.                                                                                                              |
| 5         | Pulido de bundle y SSR                                                                                                                                        | Vía paralela                                                                                                        | Fase 5: carga diferida de iOS desde [seguimientos de bundle](https://github.com/vue-solana/vue-solana/blob/main/plans/deferred/bundle-performance-followups.md), auditoría SSR y guardas de tamaño.                         |
| Shipped   | Helpers de simulación de transacciones                                                                                                                        | Publicado en 4.3.0 mediante `simulateTransaction()`, `useSimulateTransaction()` y `useSolanaSimulateTransaction()`  | Registro archivado en [`plans/archived/use-simulate-transaction.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/use-simulate-transaction.md).                                                        |
| Shipped   | Utilidades RPC de servidor en Nuxt                                                                                                                            | Implementado en 4.4.0 mediante `@vue-solana/nuxt/server` (`createServerSolanaClient()`, `useServerSolanaClient()`). | Consulta la sección «RPC del lado del servidor durante SSR» en la documentación del paquete Nuxt.                                                                                                                           |
| Shipped   | Historial de transacciones                                                                                                                                    | Publicado en 4.5.0 mediante `getTransactionHistory()`, `useTransactionHistory()` y `useSolanaTransactionHistory()`. | Registro archivado en [`plans/archived/transaction-history.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/archived/transaction-history.md).                                                                  |
| Más tarde | Documentación versionada, más wallets iOS, helpers de Anchor, modal/UI de wallet, wallets nativas de escritorio, failover RPC, indexación avanzada de cuentas | Faltan o están pospuestas; requieren un compromiso amplio de API o arquitectura                                     | Mantenerlos aquí hasta que cada uno tenga un plan propio. La decisión sobre UI está en el [informe de la biblioteca de UI](https://github.com/vue-solana/vue-solana/blob/main/reports/Vue%20Solana%20UI%20library.md).      |

Dos elementos antiguos ya están cubiertos: las suscripciones en tiempo real están implementadas mediante `useSubscription()`, `useTrackedData()` y los adaptadores SWR. El elemento marcado como completado «wallets nativas de escritorio» en `plans/deferred/native-wallet-plan.md` registra una decisión pospuesta, no una implementación.

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

Implementado en 4.4.0: `createServerSolanaClient()` y `useServerSolanaClient()` de `@vue-solana/nuxt/server` leen datos de Solana desde rutas de servidor Nitro sin exponer secretos.

### Documentación versionada

Documentación versionada: una build de docs antigua archivada bajo `/v1/` con un desplegable `v1 | latest` y redirecciones de URLs antiguas, para usuarios que aún no han migrado a la ruta Kit.

## Resiliencia y patrones avanzados

### Conmutación por error del proveedor RPC

Conmutación por error del proveedor RPC y manejo de límites de tasa.

### Indexación avanzada de cuentas

Patrones avanzados de indexación y caché de cuentas de programas.
