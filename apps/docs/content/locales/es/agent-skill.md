---
title: Skill de agente
description: Instala el Agent Skill de Vue Solana para agentes de codificación con IA.
ogSection: Herramientas
surroundOrder: 3
---

Vue Solana incluye un Agent Skill instalable para agentes de codificación con IA que soportan el formato Agent Skills. El skill entrega a los agentes patrones de configuración de Vue Solana, reglas para elegir paquetes, guía de flujos de wallet, advertencias sobre SSR en Nuxt, detalles importantes de transacciones y comandos de verificación.

Úsalo cuando pidas a un agente construir, depurar, revisar o documentar apps que usan:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- primitivas de `@vue-solana/vue/web3` y `@vue-solana/nuxt/web3` en apps Vue o Nuxt

## Instalar

Instala desde el repositorio de GitHub con Skills CLI:

```sh
# Instalar todos los skills
npx skills add vue-solana/vue-solana

# Instalar el skill de Vue Solana
npx skills add vue-solana/vue-solana --skill vue-solana

# Listar skills disponibles
npx skills add vue-solana/vue-solana --list

# Instalar globalmente
npx skills add vue-solana/vue-solana --global
```

La CLI instala los skills en el directorio de skills del agente que elijas durante la instalación. Para Claude, eso es `.claude/skills/` en el proyecto actual, o `~/.claude/skills/` cuando se usa `--global`.

## Qué cubre el skill

- Cuándo usar `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/vue/web3`, `@vue-solana/nuxt` y `@vue-solana/nuxt/web3`.
- Configuración del plugin de Vue e imports directos de composables recomendados.
- Configuración del módulo de Nuxt y composables autoimportados.
- Descubrimiento y conexión unificados de wallets mediante `useWallets()` y `useWallet()`.
- Wallets de extensión de navegador, soporte para Android Mobile Wallet Adapter, soporte para wallets en navegadores iOS y límites actuales de wallets nativas de escritorio.
- Uso de helpers de RPC, balances y transacciones.
- Guía de `installSolanaBufferPolyfill()` para el polyfill de navegador en código de transacciones.
- La solución temporal actual para metadatos TypeScript de `@solana/web3-compat@0.0.21`.
- Comandos de verificación del repositorio para cambios en Vue Solana.

## Fuente

La fuente del skill es [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md).
