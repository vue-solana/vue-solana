---
title: Skill de agente
description: Instala la skill de Vue Solana para agentes de programación con IA.
ogSection: Herramientas
surroundOrder: 3
---

La skill de Vue Solana ayuda a agentes de programación a seguir las convenciones de este repositorio y a trabajar con Vue, Nuxt y Solana de forma consistente.

## Instalar

```sh
# Instalar todas las skills
npx skills add vue-solana/vue-solana

# Instalar la skill de Vue Solana
npx skills add vue-solana/vue-solana/skills/vue-solana

# Listar skills disponibles
npx skills list

# Instalar globalmente
npx skills add --global vue-solana/vue-solana
```

## Qué cubre la skill

- Arquitectura del monorepo.
- Uso de `@vue-solana/core`, `@vue-solana/vue` y `@vue-solana/nuxt`.
- Patrones de wallet y firma con límites de seguridad.
- Reglas para ejemplos, documentación y pruebas.

## Fuente

La skill pública vive en `skills/vue-solana/`. Las skills locales de desarrollo viven en `.agents-dev/skills/` y no se publican como parte de la instalación pública.
