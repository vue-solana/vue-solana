---
title: Roadmap
description: Funcionalidades y mejoras planificadas para Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

Los paquetes son estables para producción con lecturas RPC, descubrimiento y conexión de wallets, consulta de balance, transacciones, lecturas de cuentas, firma de mensajes y errores normalizados. Esta hoja de ruta describe lo que viene a continuación, ordenado por impacto y sin vincularse a una versión concreta.

## Integraciones con el ecosistema

- Helpers de cuentas de tokens SPL y composables de balance de tokens basados en el cliente Kit.
- Soporte de wallets nativas de escritorio mediante enlaces de protocolo a través de los flujos de wallet unificados.
- Más proveedores de wallets iOS.

## Experiencia de desarrollo

- Provider de Anchor y helpers de programas.
- Un modal de wallet o paquete de UI dedicado.
- Utilidades RPC de servidor en Nuxt para lecturas del lado del servidor.

## Resiliencia y patrones avanzados

- Conmutación por error del proveedor RPC y manejo de límites de tasa.
- Patrones avanzados de indexación y caché de cuentas de programas.
- Helpers de simulación de transacciones.
- Abstracciones de suscripción a eventos para datos on-chain en tiempo real.
