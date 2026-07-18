---
title: Roadmap
description: Historial de lanzamientos y trabajo post-v1 planificado de Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

**La v1.0.0 ha sido lanzada.** Las ocho fases del roadmap están completas. Los paquetes son estables para producción con configuración RPC, descubrimiento de wallets, conexión de wallet, lecturas de balance, confirmación de transacciones, lecturas de cuentas, firma de mensajes y errores normalizados.

El tracker detallado de implementación está en [`plans/v1-roadmap.md`](https://github.com/vue-solana/vue-solana/blob/main/plans/v1-roadmap.md). Esta página resume el trabajo completado de v1 y las funcionalidades post-v1 planificadas para desarrolladores de aplicaciones.

## Funcionalidades v1 (lanzadas)

- Exports públicos de paquetes y nombres de composables estables.
- Comportamiento real para cada opción pública de configuración documentada.
- Selección, reconexión, desconexión y manejo de funciones no soportadas de wallets de forma predecible.
- Helpers de confirmación de transacciones además del envío de firmas.
- Composables reactivos para cuentas y estado de firmas.
- Soporte de firma de mensajes para flujos de wallet-auth.
- Errores normalizados de wallet, transacción, RPC, timeout e input inválido.
- Estado claro del soporte de wallets nativas de escritorio.
- Ejemplos, docs de paquetes, tests y cobertura E2E actualizados.

## Fases del roadmap

### 1. Estabilización de API pública

Estado: completo. Cada opción pública está implementada o eliminada antes de v1. `autoConnect` se incluye en v1 como comportamiento opt-in de reconexión para una identidad de wallet previamente seleccionada.

### 2. Fundamentos de UX de wallet

Estado: completo. La selección de wallet sobrevive recargas sin conectar wallets instaladas arbitrarias. v1 restaura solo la wallet que el usuario seleccionó previamente, y auto-conecta solo cuando está habilitado explícitamente.

### 3. Ciclo de vida de transacciones

Estado: completo. v1 incluye helpers de confirmación y estado reactivo de transacción para que las apps puedan mostrar progreso desde la firma hasta la confirmación o timeout.

### 4. Datos reactivos de cuentas

Estado: completo. v1 incluye composables de cuentas y estado de firmas como `useAccountInfo()` y `useSignatureStatus()`, con limpieza segura de suscripciones.

### 5. Firma de mensajes y capacidades

Estado: completo. v1 incluye firma de mensajes de wallet con `signMessage`, `useSignMessage()` y el autoimport de Nuxt `useSolanaSignMessage()`. Los helpers de capacidades para wallet activa y wallets descubiertas permiten que las apps rendericen la UI correcta para soporte de conexión, desconexión, firma de mensajes y firma de transacciones.

### 6. Modelo de errores

Estado: completo. v1 normaliza fallos comunes como ausencia de wallet seleccionada, función no soportada, rechazo del usuario, dirección inválida, timeout, fallo de storage y fallo RPC en códigos `SolanaError` estables para UI orientada al usuario.

### 7. Decisión sobre wallets nativas de escritorio

Estado: completo. El soporte de wallets nativas de escritorio queda explícitamente diferido de v1 y sigue siendo candidato post-v1. v1 mantiene la selección de wallets unificada mediante `useWallets()` y `useWallet()` sin agregar un flujo público específico para escritorio nativo.

### 8. Documentación, ejemplos y tests

Estado: completo. La app de docs es la fuente principal de verdad para el uso de v1. Empieza con [Primeros pasos](/getting-started), luego usa las referencias de paquetes para [`@vue-solana/core`](/packages/core), [`@vue-solana/vue`](/packages/vue) y [`@vue-solana/nuxt`](/packages/nuxt) para APIs públicas. Las guías [Wallets](/guides/wallets), [Transacciones](/guides/transactions), [Lecturas de cuentas](/guides/account-reads), [Firma de mensajes](/guides/message-signing) y [Errores](/guides/errors) cubren los flujos estables de v1 sin requerir inspección del código fuente.

El [ejemplo Vue Vite](/examples/vue-vite) y el [ejemplo Nuxt](/examples/nuxt) demuestran uso devnet-first, selección persistida de wallet, checks de capacidades de wallet, firma de mensajes, envío de transacciones, estado de confirmación, links al explorador y rutas de UI para capacidades no soportadas. Los tests unitarios y la cobertura E2E de Wallet Standard viven en la suite de tests del repositorio; ejecuta los comandos de verificación siguientes antes de etiquetar v1.

## Plan post-v1

### Nivel 1: Integraciones de alto valor en el ecosistema

- Helpers de cuentas SPL token y composables de balance de tokens.
- Soporte de wallets nativas de escritorio mediante enlaces de protocolo.
- Proveedores adicionales de wallets iOS.

### Nivel 2: Mejoras en la experiencia de desarrollo

- Helpers de Anchor provider y programas.
- Un modal de wallet o paquete de UI dedicado.
- Utilidades RPC de servidor para Nuxt para lecturas del lado del servidor.

### Nivel 3: Resiliencia y patrones avanzados

- Failover de proveedores RPC y manejo de límites de tasa.
- Patrones avanzados de indexación de cuentas de programa y caché.
- Helpers de simulación de transacciones.
- Abstracciones de suscripción de eventos para datos on-chain en tiempo real.

## Verificación

Ejecuta la suite completa de verificación local antes de etiquetar una versión:

```sh
pnpm lint
pnpm format
pnpm test
pnpm typecheck
pnpm build:packages
pnpm smoke:standalone-installs
```

E2E de red real también puede ejecutarse manualmente cuando haga falta:

```sh
pnpm test:e2e:integration
```
