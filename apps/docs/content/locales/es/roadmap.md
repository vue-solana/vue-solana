---
title: Roadmap
description: Funcionalidades y mejoras planificadas para Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

Los paquetes son estables para producción con lecturas RPC, descubrimiento y conexión de wallets, consulta de balance, transacciones, lecturas de cuentas, firma de mensajes, manejo de errores normalizado, Sign In With Solana, firma y envío de transacciones en lote, planificación de transacciones, adaptadores de caché SWR y helpers de tokens SPL. Esta hoja de ruta describe lo que viene a continuación, ordenado por impacto y sin vincularse a una versión concreta.

## Transacciones

- Helpers de simulación de transacciones.

## Integraciones con el ecosistema

- Soporte de wallets nativas de escritorio mediante enlaces de protocolo a través de los flujos de wallet unificados.
- Más proveedores de wallets iOS.
- Provider de Anchor y helpers de programas.
- Un modal de wallet o paquete de UI dedicado.
- Utilidades RPC de servidor en Nuxt para lecturas del lado del servidor.
- Documentación versionada: una build de docs antigua archivada bajo `/v1/` con un desplegable `v1 | latest` y redirecciones de URLs antiguas, para usuarios que aún no han migrado a la ruta Kit.

## Resiliencia y patrones avanzados

- Conmutación por error del proveedor RPC y manejo de límites de tasa.
- Patrones avanzados de indexación y caché de cuentas de programas.
