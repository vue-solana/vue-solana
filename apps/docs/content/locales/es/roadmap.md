---
title: Roadmap
description: Funcionalidades y mejoras planificadas para Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

Los paquetes son estables para producción con lecturas RPC, descubrimiento y conexión de wallets, consulta de balance, transacciones, lecturas de cuentas, firma de mensajes, manejo de errores normalizado, Sign In With Solana, firma y envío de transacciones en lote, planificación de transacciones, adaptadores de caché SWR y helpers de tokens SPL. Esta hoja de ruta describe lo que viene a continuación, ordenado por impacto y sin vincularse a una versión concreta.

## Transacciones

### Helpers de simulación de transacciones

Simule las transacciones antes de enviarlas para previsualizar comisiones, cambios de cuentas y posibles fallos sin gastar SOL.

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
