---
title: Roadmap v1
description: Trabajo planificado antes de la primera versión estable de los paquetes Vue Solana.
ogSection: Roadmap
surroundOrder: 19
---

El objetivo de v1 es entregar una base estable para construir aplicaciones Solana con Vue y Nuxt.

## Objetivos de la versión v1

- API pública consistente entre Vue y Nuxt.
- Flujo unificado de wallets para navegador, móvil y escritorio.
- Helpers de RPC y transacciones seguros.
- Documentación y ejemplos verificables.

## Fases del roadmap

1. Consolidar paquetes core, Vue y Nuxt.
2. Ampliar cobertura de wallets nativas y móviles.
3. Añadir pruebas unitarias y E2E para flujos críticos.
4. Mejorar documentación, ejemplos y guías de migración.

## Candidatos post-v1

- Integraciones más profundas con proveedores RPC.
- Patrones avanzados para tokens y programas.
- Plantillas de aplicaciones completas.

## Verificación antes de v1

```sh
pnpm typecheck
pnpm build
pnpm test
```

También deben verificarse manualmente los flujos de wallet y transacción en devnet.
