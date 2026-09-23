---
title: Acerca de
description: Que es Vue Solana, quien lo mantiene y como se gestiona el proyecto.
ogSection: Proyecto
surroundOrder: 20
---

Vue Solana es un proyecto de codigo abierto que publica librerias Vue y Nuxt para construir aplicaciones Solana. Envuelve el SDK oficial de JavaScript de Solana (Solana Kit) en composables tipados y reactivos para que los desarrolladores de Vue 3 y Nuxt puedan leer balances, descubrir wallets, firmar mensajes y enviar transacciones sin construir la infraestructura RPC a mano.

El proyecto lo mantiene el equipo de Vue Solana y acepta contribuciones de la comunidad en GitHub. Todo el codigo fuente vive en `https://github.com/vue-solana/vue-solana` bajo la licencia MIT, y cada paquete se publica en npm bajo el scope `@vue-solana`.

## Que Hacen Los Paquetes

- `@vue-solana/core`: configuracion de Solana agnostica del framework, helpers de endpoints, tipos de wallets y helpers de transacciones.
- `@vue-solana/vue`: el plugin de Vue y los composables para lecturas RPC, wallets, balances, mensajes, firmas y transacciones.
- `@vue-solana/nuxt`: un modulo de Nuxt que instala el plugin de Vue y autoimporta los composables.

## Como Se Gestiona El Proyecto

El desarrollo ocurre de forma abierta en GitHub: los issues rastrean bugs y peticiones de funcionalidades, los pull requests pasan por revision, y las versiones se publican en npm. La documentacion que estas leyendo se construye a partir del Markdown de este repositorio y se despliega en Vercel.

## Hoja De Ruta Y Gobernanza

Las funcionalidades planificadas se rastrean publicamente en la pagina de [Hoja de ruta](/es/roadmap). Los cambios que rompen compatibilidad en los paquetes siguen semver, y las superficies legibles por maquina de este sitio (llms.txt, openapi.json) estan documentadas en la [especificacion OpenAPI](/es/openapi.json) con una politica de versionado explicita.

## Contacto

Para preguntas, reportes de bugs o problemas de seguridad, consulta la pagina de [Contacto](/es/contact).
