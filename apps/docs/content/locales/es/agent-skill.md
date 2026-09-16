---
title: Skill de agente
description: Instala el Agent Skill de Vue Solana para agentes de codificacion con IA.
ogSection: Herramientas
surroundOrder: 3
---

Vue Solana incluye un Agent Skill instalable para agentes de codificacion con IA que soportan el formato Agent Skills. El skill entrega a los agentes patrones de configuracion de Vue Solana, reglas para elegir paquetes, guia de flujos de wallet, advertencias sobre SSR en Nuxt, detalles importantes de transacciones y comandos de verificacion.

Usalo cuando pidas a un agente construir, depurar, revisar o documentar apps que usan:

- `@vue-solana/core`
- `@vue-solana/vue`
- `@vue-solana/nuxt`
- primitivas de `@vue-solana/*/kit` en apps Vue o Nuxt

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

La CLI instala los skills en el directorio de skills del agente que elijas durante la instalacion. Para Claude, eso es `.claude/skills/` en el proyecto actual, o `~/.claude/skills/` cuando se usa `--global`.

## Que cubre el skill

- Cuando usar `@vue-solana/core`, `@vue-solana/vue`, `@vue-solana/vue/kit`, `@vue-solana/nuxt` y `@vue-solana/nuxt/kit`.
- Configuracion del plugin de Vue e imports directos de composables recomendados.
- Configuracion del modulo de Nuxt y composables autoimportados.
- Descubrimiento y conexion unificados de wallets mediante `useWallets()` y `useWallet()`.
- Wallets de extension de navegador, soporte para Android Mobile Wallet Adapter, soporte para wallets en navegadores iOS y limites actuales de wallets nativas de escritorio.
- Uso de helpers de RPC, balances, transacciones y cuentas de tokens.
- Guia de `installSolanaBufferPolyfill()` para el polyfill de navegador en codigo de transacciones.
- Comandos de verificacion del repositorio para cambios en Vue Solana.

## Fuente

La fuente del skill es [`skills/vue-solana/SKILL.md`](https://github.com/vue-solana/vue-solana/blob/main/skills/vue-solana/SKILL.md).
