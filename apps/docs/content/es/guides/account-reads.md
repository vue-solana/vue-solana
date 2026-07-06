---
title: Lecturas de cuentas
description: Lee balances, datos de cuenta, cuentas de programa y estado de firmas de forma segura desde Vue o Nuxt.
ogSection: Guías
surroundOrder: 10
---

Las lecturas RPC son operaciones públicas. Aun así, valida entradas, maneja valores nulos y evita consultas costosas innecesarias.

## Parsear direcciones

Convierte strings a `PublicKey` dentro de un bloque seguro y muestra errores de validación al usuario.

## Leer balance en Vue

```ts
const balance = useSolanaBalance(address);

await balance.refresh();
```

## Leer información de cuenta

```ts
const { connection } = useSolanaConnection();
const account = await connection.getAccountInfo(publicKey);
```

## Leer cuentas de programa

`getProgramAccounts` puede ser costoso. Usa filtros y evita ejecutarlo en cada render.

## Leer estado de firma

```ts
const status = await connection.getSignatureStatuses([signature]);
```

## Autoimports de Nuxt

Con `@vue-solana/nuxt`, los composables de lectura están disponibles sin imports manuales.

## Entradas nulas o inválidas

No llames a RPC con direcciones vacías. Devuelve estado vacío hasta que la entrada sea válida.

## Checklist de coste RPC

- Debounce en inputs de usuario.
- Cachea resultados cuando tenga sentido.
- Evita consultas globales sin filtros.
- Muestra estados de carga y error.
