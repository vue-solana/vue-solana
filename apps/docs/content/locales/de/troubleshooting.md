---
title: Fehlerbehebung
description: Häufige Probleme mit Einrichtung, TypeScript, Wallet, RPC und Nuxt.
ogSection: Support
surroundOrder: 4
---

Nutze diese Anleitung, um die häufigsten Einrichtungsprobleme von Vue Solana in Vue, Nuxt, TypeScript, Wallet-Erkennung, RPC-Aufrufen und Transaktionen zu diagnostizieren. Beginne mit der Fehlermeldung oder dem Verhalten, das zu deiner App passt, und arbeite dann die Prüfungen der Reihe nach durch, bevor du ein Issue öffnest.

## `@solana/web3-compat` kann nicht aufgelöst werden

v2.0.0 hat `@solana/web3-compat` aus allen Vue-Solana-Paketen entfernt, daher bedeutet ein Fehler über eine fehlende Deklaration für dieses Paket fast immer, dass deine App noch aus der gelöschten Legacy-Oberfläche importiert: `@vue-solana/core/web3`, `@vue-solana/vue/web3`, `@vue-solana/nuxt/web3` oder eine direkte Abhängigkeit auf `@solana/web3-compat`.

Aktualisiere diese Importe auf die Kit-Entsprechungen — siehe die [Kit-Migrationsanleitung](/de/guides/migration). Wenn du noch auf einem v1.x-Paket bist: Die v1-Pakete lieferten paketeigene Deklarations-Shims für die dokumentierten Core-Importe, und Apps auf v1 konnten nur dann ein eigenes `@solana/web3-compat`-Shim hinzufügen, wenn sie das Paket direkt importierten. Ein Upgrade auf `@vue-solana/*@^2` macht jedes Shim überflüssig.

## `ERR_PACKAGE_PATH_NOT_EXPORTED` beim `require` eines Pakets

v3 wird ausschließlich als ESM veröffentlicht: Die Export-Bedingung `require` und das Feld `main` auf oberster Ebene wurden entfernt. Ein CommonJS-`require("@vue-solana/core")` schlägt daher mit `No "exports" main defined` fehl, und das Anfordern eines Subpfads schlägt mit `Package subpath './kit' is not defined by "exports"` fehl.

Stelle das importierende Modul auf ESM um. Füge `"type": "module"` zu deiner `package.json` hinzu oder benenne die Datei in `.mjs` um:

```js
import { createSolanaClient } from "@vue-solana/core/kit";
```

Nuxt- und Vite-Apps bündeln bereits ESM und sind nicht betroffen. Wenn du CommonJS nicht verlassen kannst, pinne `@vue-solana/*` auf `^2`, das weiterhin einen `.cjs`-Build ausliefert.

## `Vue Solana plugin is not installed`

Das bedeutet, dass clientseitiger Code versucht hat, den Solana-Client oder Wallet-Aktionen zu nutzen, ohne das Plugin zu installieren. Die aktuellen Composables geben inaktiven, SSR-sicheren Zustand zurück, wenn Nuxt auf dem Server rendert, aber echte RPC- und Wallet-Operationen benötigen weiterhin den Kontext des Client-Plugins.

Für Vue:

```ts
createApp(App).use(
  createSolanaPlugin({
    cluster: "devnet",
  }),
);
```

Für Nuxt registriere das Modul:

```ts
export default defineNuxtConfig({
  modules: ["@vue-solana/nuxt"],
});
```

Das Nuxt-Modul hält das Vue-Solana-Plugin clientseitig. Automatisch importierte Composables können während der SSR aufgerufen werden, aber vermeide direkte RPC- oder Wallet-Arbeit auf dem Server. Löse RPC-Lesevorgänge aus Client-Lifecycle-Hooks oder Nutzeraktionen aus, wenn du den echten Solana-Client brauchst.

## `No Solana wallet is configured`

Es wurde keine Wallet ausgewählt oder manuell konfiguriert. Verwende `useWallets()` oder `useSolanaWallets()`, um eine erkannte Wallet auszuwählen, bevor du `connect()` aufrufst oder eine Transaktion sendest.

```ts
const { wallets, selectWallet } = useSolanaWallets();

selectWallet(wallets.value[0]);
```

RPC-Lesevorgänge und Guthabenabfragen funktionieren ohne Wallet.

## Keine Browser-Wallets werden erkannt

Häufige Ursachen:

- Es ist keine Solana-Wallet-Erweiterung installiert.
- Die Wallet-Erweiterung ist für das aktuelle Browser-Profil deaktiviert.
- Die App läuft in SSR oder einer Nicht-Browser-Umgebung.
- Die Wallet implementiert den Wallet Standard nicht.

Installiere eine Wallet wie Phantom, Solflare oder Backpack und rufe dann `refreshWallets()` auf, nachdem die Seite geladen ist.

## Mobile Wallet Adapter wird nicht erkannt

Die Web-Registrierung des Android Mobile Wallet Adapter funktioniert nur in Android-Browsern, die über einen sicheren Kontext (HTTPS) ausgeliefert werden.

Häufige Ursachen:

- Die App läuft auf Desktop, iOS, Firefox Android, Brave Android, Opera Android oder einem anderen nicht unterstützten Browser.
- Es ist keine kompatible Solana-Wallet für Mobilgeräte installiert.
- `mobileWallet: false` wurde an das Vue-Plugin oder das Nuxt-Modul übergeben.
- Die Wallet-Erkennung lief vor der Hydration oder bevor die Seite auf `window` zugreifen konnte.

Öffne die App in Android Chrome, installiere eine kompatible Wallet und rufe dann `refreshWallets()` auf, nachdem die Seite geladen ist.

## Der iOS-Wallet-Link wird nicht abgeschlossen

Die iOS-Wallet-Unterstützung verwendet Universal Links von Phantom, Solflare und Backpack. Die Wallet-App leitet nach der Zustimmung zurück zur URL deiner App.

Häufige Ursachen:

- Die App läuft nicht in einem iOS-Browser.
- Phantom, Solflare oder Backpack ist nicht auf dem Gerät installiert.
- `iosWallet: false` wurde an das Vue-Plugin oder das Nuxt-Modul übergeben.
- Die konfigurierte `redirectUrl` führt nicht zur selben App-Seite zurück, die den Wallet-Zustand aktualisiert.
- Das Wallet-Refresh oder die Callback-Verarbeitung läuft nur während der SSR statt im Client.

Halte die iOS-Wallet-Arbeit clientseitig, stelle sicher, dass die Redirect-URL die App erneut lädt, und rufe `refreshWallets()` auf, nachdem die weitergeleitete Seite geladen ist. Das Vue-Plugin verarbeitet iOS-Callbacks während des Wallet-Refresh; Apps, die Core-Helfer direkt verwenden, sollten `handleSolanaIosWalletCallback()` aufrufen, bevor sie sich auf die adaptierte Wallet-Session verlassen.

## `Solana wallet is not connected`

Der Transaktions-Helfer wurde aufgerufen, bevor die Wallet `connected: true` und einen nicht-null `publicKey` gemeldet hat.

Rufe zuerst `connect()` auf oder prüfe `connected.value` vor dem Senden.

## Wallet erscheint nach dem Neuladen während der lokalen Entwicklung als verbunden

Das Auswählen einer erkannten Wallet sollte sie nicht als verbunden markieren. `connected` sollte erst true werden, nachdem `connect()` erfolgreich war, selbst wenn die Browser-Erweiterung zuvor autorisierte Konten bereitstellt.

Wenn lokale Vue- oder Nuxt-Beispiele direkt nach dem Neuladen weiterhin als verbunden erscheinen, baue die Workspace-Pakete neu und starte den Dev-Server vollständig neu, damit Vite/Nuxt veraltete Paketausgaben verwerfen:

```sh
pnpm build:packages
pnpm dev:vue
```

Für Nuxt verwende `pnpm dev:nuxt`, nachdem du die Pakete neu gebaut hast.

## `Solana wallet does not support signTransaction`

Die konfigurierte Wallet stellt weder `signAndSendTransaction` noch `signTransaction` bereit. Verwende eine Wallet, die Transaktionssignierung für den ausgewählten Solana-Cluster unterstützt.

## Wallet-Transaktion hat kein Ergebnis zurückgegeben

Das kann passieren, wenn ein Wallet-Adapter eine Übergabe an das Mobilgerät startet, aber sein Browser-Promise nie auflöst. Vue Solana setzt `loading` zurück und setzt `error`, statt die App in einem sendenden Zustand hängen zu lassen. Die Transaktion kann trotzdem erfolgreich gewesen sein, wenn die Wallet sie gesendet hat, bevor die Antwort verloren ging — prüfe daher die Wallet-Aktivität oder einen Solana-Explorer, bevor du es erneut versuchst.

Android-Mobile-Wallet-Adapter-Wallets bevorzugen Wallet-Signierung plus RPC-Versand aus der App, wenn `signTransaction` verfügbar ist. Dieser Weg vermeidet den häufigen Fall, dass die Wallet erfolgreich sendet, die Browserseite aber nie die vom Adapter zurückgegebene Signatur erhält.

## `Buffer is not defined`

Einige Serialisierungspfade für Solana-Transaktionen erwarten in Browser-Runtimes weiterhin ein Node-kompatibles `Buffer`-Global. Initialisiere in Vue-Browser-Apps das Buffer-Polyfill des Vue-Pakets, bevor du Transaktionen erstellst oder serialisierst. Verwende in Nuxt-Apps `@vue-solana/nuxt/buffer-polyfill`.

```ts
import { installSolanaBufferPolyfill } from "@vue-solana/vue/buffer-polyfill";

installSolanaBufferPolyfill();
```

Der Helfer wird von den Framework-Paketen bereitgestellt, daher müssen Apps für die Transaktionsbeispiele von Vue Solana `buffer` nicht direkt installieren oder importieren.

## Modul `buffer` wurde externalisiert

Wenn die Konsole `Module "buffer" has been externalized for browser compatibility` meldet, ersetze direkte App-Importe aus `buffer` durch `installSolanaBufferPolyfill()` aus `@vue-solana/vue/buffer-polyfill` oder `@vue-solana/nuxt/buffer-polyfill` und starte dann den Dev-Server neu. Vite cached möglicherweise die zuvor optimierte Abhängigkeit.

## Guthabenabfragen schlagen fehl

Häufige Ursachen:

- Die Adresszeichenfolge ist kein gültiger öffentlicher Solana-Schlüssel.
- Der RPC-Endpoint ist nicht verfügbar oder rate-limitiert.
- Die Wallet-Adresse liegt in einem anderen Cluster als der konfigurierte RPC-Endpoint.

Prüfe den konfigurierten Cluster und Endpoint mit `useRpc()` oder `useSolanaRpc()`.

## Nuxt-Auto-Imports fehlen

Stelle sicher, dass `@vue-solana/nuxt` in `modules` aufgeführt ist, und starte den Nuxt-Dev-Server nach der Installation des Pakets neu.

Wenn TypeScript die Auto-Imports weiterhin nicht erkennt, generiere die Nuxt-Typen neu:

```sh
npx nuxi prepare
```
