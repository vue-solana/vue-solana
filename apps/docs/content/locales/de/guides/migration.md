---
title: "Migrationsleitfaden"
description: So migrierst du zwischen Vue-Solana-Versionen. Behandelt das Upgrade von v3 auf v4, von v2 auf v3 und die Migration von v1.x auf v2.
ogSection: Anleitungen
surroundOrder: 14
---

Diese Anleitung behandelt die Migration zwischen Vue-Solana-Versionen. Es gibt drei große Migrationen: das Upgrade von v3 auf v4 (aktuell), von v2 auf v3 und die Migration von v1.x auf v2.

## Migration: v3 auf v4

v4.0.0 ist die aktuelle Version. Sie reduziert die Bundle-Größe, indem schwere Module aus dem Root-Barrel von `@vue-solana/core` entfernt werden, und liefert kleinere Tarballs aus. Außerdem ändert sie einige Composable-APIs und berücksichtigt das konfigurierte `commitment`.

### Was sich geändert hat

- **Root-Barrel reduziert**: `@vue-solana/core` exportiert `Buffer`/`installSolanaBufferPolyfill`, `ios-wallet` und `mobile-wallet` nicht mehr aus seinem Root-Barrel. Verwende stattdessen die dafür vorgesehenen Subpfade.
- **Kleinere Tarballs**: `.d.mts`-Deklarationsdateien werden nicht mehr ausgeliefert; jede `exports`-Bedingung zeigt auf `.d.ts`.
- **`useSignatureStatus`**: akzeptiert keine `commitment`-Option mehr.
- **`commitment` wird berücksichtigt**: `createSolanaClient()` / `createSolanaPlugin()` / Nuxt `solana.commitment` wird jetzt tatsächlich auf RPC-Aufrufe angewendet.
- **`plugin.dispose()`**: `createSolanaPlugin()` gibt jetzt `dispose()` zurück.
- **Typisierte Airdrop-Fehler**: Fehler von `useAirdrop()` sind `SolanaError`s mit dem Code `RPC_FAILURE`.
- **`buffer` als optionaler Peer**: Apps, die `buffer-polyfill` verwenden, müssen `buffer` selbst installieren.
- **`bs58` entfernt**: Apps, die `bs58` direkt importieren, müssen es zu ihren eigenen Abhängigkeiten hinzufügen.
- **Neue Auto-Imports (Nuxt)**: `useSolanaClientCapability()`, `tryUseSolana()`, `clearSwrCache()`, `deleteSwrKey()`.
- **Neues `deleteSwrKey()`** in `@vue-solana/vue/swr`.

### So migrierst du

#### 1. Abhängigkeiten aktualisieren

```sh
pnpm add @vue-solana/vue@^4.0.0
# or
pnpm add @vue-solana/nuxt@^4.0.0
```

Wenn du `buffer-polyfill` verwendest, installiere `buffer` selbst:

```sh
pnpm add buffer
```

Wenn du `bs58` direkt importierst, füge es hinzu:

```sh
pnpm add bs58
```

#### 2. Buffer- und Wallet-Importe aktualisieren

```diff
- import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core";
+ import { Buffer, installSolanaBufferPolyfill } from "@vue-solana/core/buffer-polyfill";
- import { getSolanaIosWallets } from "@vue-solana/core";
+ import { getSolanaIosWallets } from "@vue-solana/core/ios-wallet";
- import { registerSolanaMobileWallet } from "@vue-solana/core";
+ import { registerSolanaMobileWallet } from "@vue-solana/core/mobile-wallet";
```

(Die Subpfade `@vue-solana/vue/buffer-polyfill` und `@vue-solana/nuxt/buffer-polyfill` bleiben unverändert.)

#### 3. `useSignatureStatus` aktualisieren

```diff
- useSignatureStatus(signature, { commitment: "confirmed" })
+ useSignatureStatus(signature)
```

Für ein Commitment pro Aufruf übergibst du `{ commitment }` an `confirm(signature, opts)` aus `useTransactionConfirmation()` oder rufst `confirmTransactionSignature()` direkt aus `@vue-solana/core` auf.

#### 4. Plugins in reinem Vue freigeben

```ts
const solana = createSolanaPlugin();
createApp(App).use(solana);
// on teardown:
app.unmount();
solana.dispose();
```

(Nuxt verdrahtet das automatisch.)

#### 5. Typisierte Airdrop-Fehler behandeln

Fehler von `useAirdrop()` sind jetzt `SolanaError`s mit dem Code `RPC_FAILURE`; der ursprüngliche Fehler bleibt als `cause` erhalten.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await airdrop();
} catch (error) {
  if (isSolanaError(error, "RPC_FAILURE")) {
    // handle
  }
}
```

## Migration: v2 auf v3

v3.0.0 ist die aktuelle Version. Sie stellt das Modulformat auf ESM-only um und macht die `kit`-Subpfade zu einem vollständigen Spiegel von `@solana/kit`. Die Kit-Migration selbst ist bereits in v2 abgeschlossen, v3 konzentriert sich daher auf das Packaging und kleinere Verhaltensänderungen.

### Was sich geändert hat

- **Nur ESM**: Alle `@vue-solana/*`-Pakete werden jetzt ausschließlich als ESM ausgeliefert. Die Export-Bedingung `require` und das Feld `main` auf oberster Ebene wurden entfernt.
- **Vollständiger Kit-Spiegel**: `@vue-solana/core/kit`, `@vue-solana/vue/kit` und `@vue-solana/nuxt/kit` machen jetzt `export *` aus `@solana/kit` (keine kuratierte Teilmenge).
- **Verhalten der Lese-Composables**: `useBalance()`, `useAccountInfo()`, `useProgramAccounts()`, `useTokenAccounts()` und `useTokenBalance()` (sowie ihre `useSolana*`-Entsprechungen in Nuxt) teilen sich eine einheitliche Zustandsmaschine mit verbesserter Fehlerbehandlung.
- **Abhängigkeitsoberfläche**: Du musst `@solana/kit` nicht mehr zu deiner eigenen `package.json` hinzufügen, wenn du die `kit`-Subpfade des Pakets verwendest.

### So migrierst du

#### 1. Abhängigkeiten aktualisieren

```sh
# For Vue apps
pnpm add @vue-solana/vue@^3.0.0

# For Nuxt apps
pnpm add @vue-solana/nuxt@^3.0.0
```

#### 2. Mit ESM-only-Paketen umgehen

Wenn deine App oder deine Skripte noch CommonJS (`require()`) verwenden, stelle sie auf ESM um. Füge `"type": "module"` zu deiner `package.json` hinzu oder benenne Dateien in `.mjs` um.

```ts
// Instead of require()
import { createSolanaClient } from "@vue-solana/core/kit";
```

Wenn du nicht auf ESM umstellen kannst, bleib bei `@vue-solana/*@^2.x`, das weiterhin `.cjs`-Builds ausliefert.

#### 3. Kit-Importe aktualisieren

Mit dem vollständigen Spiegel importierst du alles aus dem `kit`-Subpfad des Pakets. Wenn du `@solana/kit` zuvor zu deinen Abhängigkeiten hinzugefügt hast, kannst du es entfernen.

```ts
// Vue
import { address, lamports } from "@vue-solana/vue/kit";
import type { Address } from "@vue-solana/vue/kit";

// Nuxt (auto-imported composables still work)
import { address, lamports } from "@vue-solana/nuxt/kit";
```

Hinweis: Vier Namen (`SolanaError`, `SolanaErrorCode`, `isSolanaError`, `TransactionStatus`) werden zwischen Root-Barrels und `/kit`-Subpfaden unterschiedlich aufgelöst. Wenn du Fehler abfängst, die Kit wirft, importiere `isSolanaError` aus dem `kit`-Subpfad.

```ts
import { isSolanaError } from "@vue-solana/core/kit";

try {
  await client.rpc.getBalance(account).send();
} catch (error) {
  if (isSolanaError(error, "RPC_HTTP_ERROR")) {
    // ...
  }
}
```

#### 4. Fehlerbehandlung für Lese-Composables aktualisieren

`refresh()` lehnt jetzt bei einem Fehler ab (statt aufzulösen). Aktualisiere Code, der darauf wartet:

```ts
await refresh().catch(() => undefined);
```

Die Template-Bindung `@click="refresh"` ist nicht betroffen.

Wenn Lesevorgänge fehlschlagen, werden die Daten auf ihren leeren Wert zurückgesetzt. Prüfe `error` explizit:

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" title="Could not load the balance." />
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

`balance` und `decimals` von `useTokenBalance()` sind schreibgeschützte Computed-Refs - entferne alle Zuweisungen daran.

#### 5. Legacy-Web3-Importe entfernen

Entferne alle verbliebenen `@vue-solana/*/web3`-Importe und `@solana/web3-compat`-Abhängigkeiten (in v3 gibt es sie nicht).

## Migration: v1.x auf v2.0.0

Vue Solana v2.0.0 hat die zentrale API-Oberfläche von `@solana/web3-compat` auf `@solana/kit` umgestellt. Für Apps auf v1.x ist das eine Breaking Change.

### Was sich geändert hat

- **Nur-Kit-API**: `@solana/web3-compat` wurde aus allen Paketen entfernt. Der Kontext enthält keine `connection` mehr, und die `web3`-Subpfade wurden gelöscht.
- **Typänderungen**: `SolanaWallet.publicKey` ist jetzt ein einfacher base58-`Address`-String (keine `PublicKey`-Klasse).
- **Composable-Änderungen**: `useConnection()` wurde durch `useSolanaClient()` ersetzt. `useRpc()` gibt jetzt den Cluster-Zustand plus den injizierten Kit-Client zurück.
- **Numerische Typen**: RPC-Ergebnisse wie Lamports, Slots und Blockhöhen sind `bigint`. In normalisierten Composable-Ausgaben sind Kontodaten `Uint8Array` statt `Buffer`.
- **Transaktions-Oberfläche**: Helfer wie `signAndSendTransaction` und `confirmTransactionSignature` nehmen jetzt einen Kit-Client statt einer `Connection`, und Transaktionseingaben verwenden Kit-Typen.

### So migrierst du

#### 1. Abhängigkeiten aktualisieren

```sh
pnpm add @vue-solana/vue@^2.0.0
# or
pnpm add @vue-solana/nuxt@^2.0.0
```

Entferne `@solana/web3-compat` aus deinen Abhängigkeiten, falls vorhanden.

#### 2. API-Aufrufe aktualisieren

| Legacy                                                   | Ersatz                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `Connection`, `new Connection(url)`                      | `client.rpc` aus `createSolanaClient({ endpoint })` / `useSolanaClient()`                                        |
| `PublicKey`, `new PublicKey(s)`, `.toBase58()`           | `Address` über `address(s)`                                                                                      |
| `Keypair`, `keypair.publicKey`                           | `generateKeyPairSigner()` aus `@vue-solana/*/kit`; `.address` des Signers                                        |
| `SystemProgram.transfer`                                 | `getTransferSolInstruction` aus `@solana-program/system`                                                         |
| `LAMPORTS_PER_SOL`-Umrechnung                            | `lamports()` aus `@vue-solana/*/kit`                                                                             |
| `sendAndConfirmTransaction`                              | Nutze die Transaktionsplanung von Kit; für wallet-signierte Flows verwende `signAndSendTransaction(client, ...)` |
| `requestAirdrop` (devnet)                                | `client.airdrop()`                                                                                               |
| `connection.getBalance`                                  | `client.rpc.getBalance(...).send()` (gibt `bigint` zurück)                                                       |
| `connection.confirmTransaction` / `getSignatureStatuses` | `confirmTransactionSignature(client, ...)`                                                                       |
| `useConnection()`                                        | `useSolanaClient()`                                                                                              |
| `parsePublicKey(value)`                                  | `parseAddress(value)` aus `@vue-solana/core/address`                                                             |

#### 3. Codebeispiele aktualisieren

```ts
import { useSolanaClient } from "@vue-solana/vue/useSolanaClient";
import { address } from "@vue-solana/vue/kit";

const { client } = useSolanaClient();
const lamports = await client.rpc.getBalance(address("...")).send();
```

#### 4. Aufräumen

Entferne alle Importe aus `@vue-solana/*/web3`, entferne `@solana/web3-compat` aus der `package.json` und lösche alle lokalen `.d.ts`-Shims, die du für web3-compat hinzugefügt hast. Entferne auch `buffer-polyfill`, wenn du es nur für die Legacy-Transaktionspfade von web3-compat gebraucht hast.

### Hinweise

- Die Kit-`client.rpc` verwendet für `commitment` Standardwerte pro Aufruf statt des Konfigurationswerts. Übergib `commitment` bei Bedarf explizit: `rpc.getBalance(account, { commitment: "confirmed" }).send()`.
- Für framework-agnostischen Code verwende `createSolanaClient()` aus `@vue-solana/core/kit`.
