---
title: Roadmap
description: Funcionalidades y mejoras planificadas para Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

Los paquetes son estables para producción con lecturas RPC, descubrimiento y conexión de wallets, consulta de balance, transacciones, lecturas de cuentas, firma de mensajes y manejo de errores normalizado. Esta hoja de ruta describe lo que viene a continuación, ordenado por impacto y sin vincularse a una versión concreta.

## Composables principales

- Un composable `useAction` genérico que envuelve cualquier función asíncrona y sigue `status`, `data`, `error` y `dispatch` con soporte de abort y closures frescas basadas en refs.
- Un composable `useRequest` de un solo uso que se re-ejecuta reactivamente cuando cambia su fuente, con stale-while-revalidate y cancelación por intento.
- Un composable `useSubscription` para streams de suscripción RPC en vivo (notificaciones de cuenta, notificaciones de slot, logs) con reconexión, recuperación de errores y stale-while-revalidate.
- Un composable `useTrackedData` que empareja una petición RPC inicial con una suscripción y deduplica por slot los resultados para un primer render rápido más actualizaciones en vivo.
- Un composable `useClientCapability` que comprueba en el montaje que una capacidad está instalada en un cliente débilmente tipado, con un mensaje de error claro en caso contrario.

## Funciones de wallet

- Sign In With Solana (`useSignIn`) para autenticación basada en wallet.
- Un contexto de selección de wallet que persiste la cuenta de wallet seleccionada en storage y soporta el filtrado de wallets disponibles.
- Composables `usePayer` y `useIdentity` que siguen reactivamente el fee payer y la identidad actuante del cliente.
- Firma y envío de transacciones en lote (`useSignTransactions`, `useSignAndSendTransactions`) para peticiones de wallet de múltiples transacciones.

## Transacciones

- Composables de planificación de transacciones (`usePlanTransaction`) que planifican mensajes de transacción a partir de instrucciones antes de firmar.
- Helpers de simulación de transacciones.
- Abstracciones de suscripción a eventos para datos on-chain en tiempo real.

## Integraciones con el ecosistema

- Adaptadores de caché para librerías de obtención de datos de Vue (Query basado en Pinia o equivalentes SWR) que reflejan los query adapters de `@solana/react`.
- Helpers de cuentas de tokens SPL y composables de balance de tokens basados en el cliente Kit.
- Soporte de wallets nativas de escritorio mediante enlaces de protocolo a través de los flujos de wallet unificados.
- Más proveedores de wallets iOS.
- Provider de Anchor y helpers de programas.
- Un modal de wallet o paquete de UI dedicado.
- Utilidades RPC de servidor en Nuxt para lecturas del lado del servidor.
- Documentación versionada: una build de docs antigua archivada bajo `/v1/` con un desplegable `v1 | latest` y redirecciones de URLs antiguas, para usuarios que aún no han migrado a la ruta Kit.

## Resiliencia y patrones avanzados

- Conmutación por error del proveedor RPC y manejo de límites de tasa.
- Patrones avanzados de indexación y caché de cuentas de programas.
