---
title: "Kontolesevorgänge"
description: Lies Guthaben, Kontodaten, Programm-Konten und Signaturstatus sicher aus Vue oder Nuxt.
ogSection: Anleitungen
surroundOrder: 9
---

Vue Solana enthält Composables für die gängigen Solana-Lesepfade: Guthaben, Konto-Informationen, Programm-Konten und Signaturstatus.

Nutze diese Anleitung, wenn deine App Chain-Zustand lesen muss, ohne eine Transaktion zu signieren.

## Adressen parsen

Framework-agnostischer Code kann eine Solana-Adresse mit `parseAddress()` normalisieren.

```ts
import { parseAddress } from "@vue-solana/core/address";
import { createSolanaClient } from "@vue-solana/core/kit";

const address = parseAddress("11111111111111111111111111111111");

if (address) {
  const client = createSolanaClient({ cluster: "devnet" });
  const { value: lamports } = await client.rpc.getBalance(address).send();
}
```

`parseAddress()` akzeptiert ein `Address`, einen Adress-String, ein Ref-ähnliches Objekt, einen Getter, `null` oder `undefined`. Ungültige Adress-Strings werfen `INVALID_ADDRESS`.

## Guthaben in Vue lesen

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useBalance } from "@vue-solana/vue/useBalance";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useBalance(address);

const errorMessage = computed(() => {
  switch (error.value?.code) {
    case "INVALID_ADDRESS":
      return "Enter a valid Solana address.";
    case "RPC_FAILURE":
      return "Unable to load the balance.";
    default:
      return null;
  }
});
</script>

<template>
  <section>
    <p>Lamports: {{ balance ?? "Unknown" }}</p>
    <p v-if="loading">Loading...</p>
    <p v-if="errorMessage">{{ errorMessage }}</p>
    <button type="button" @click="refresh">Refresh</button>
  </section>
</template>
```

## Konto-Informationen lesen

Verwende `useAccountInfo()` für ein einzelnes Konto.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useAccountInfo } from "@vue-solana/vue/useAccountInfo";

const address = ref("PASTE_A_SOLANA_ADDRESS");
const { accountInfo, loading, error, refresh } = useAccountInfo(address, {
  commitment: "confirmed",
});
</script>
```

Das Composable gibt normalisierte Kontodaten zurück (`executable`, `lamports`, `owner`, `space` und dekodierte `data`-Bytes) und löscht veralteten Zustand, wenn die Adresse `null` oder ungültig wird. Rufe `refresh()` auf, um das Konto bei Bedarf erneut zu lesen.

## Programm-Konten lesen

Verwende `useProgramAccounts()` für Konten, die einer Programm-ID gehören.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useProgramAccounts } from "@vue-solana/vue/useProgramAccounts";

const programId = ref("PASTE_A_SOLANA_PROGRAM_ID");

const { accounts, loading, error, refresh } = useProgramAccounts(programId, {
  commitment: "confirmed",
  filters: [{ dataSize: 165 }],
  dataSlice: { offset: 0, length: 32 },
});
</script>
```

> Warnung: Scans über Programm-Konten können teuer sein. Verwende enge Filter, `dataSlice`, Caching, Paginierung, Indexing oder dedizierte RPC-Infrastruktur für Lesevorgänge in der Produktion.

## Signaturstatus lesen

Verwende `useSignatureStatus()`, um eine bekannte Transaktionssignatur zu verfolgen.

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useSignatureStatus } from "@vue-solana/vue/useSignatureStatus";

const signature = ref("PASTE_A_TRANSACTION_SIGNATURE");
const { status, error, refresh, stopPolling } = useSignatureStatus(signature, {
  pollIntervalMs: 2_000,
});
</script>
```

Verwende Polling für kurzlebige Fortschrittsanzeigen. Vermeide endloses Polling von Seiten mit hohem Traffic.

## Nuxt-Auto-Imports

Nuxt stellt dieselben Lese-Helfer als automatisch importierte Composables bereit:

- `useSolanaBalance()`
- `useSolanaAccountInfo()`
- `useSolanaProgramAccounts()`
- `useSolanaSignatureStatus()`

```vue
<script setup lang="ts">
const address = ref("PASTE_A_SOLANA_ADDRESS");
const { balance, loading, error, refresh } = useSolanaBalance(address);
</script>
```

Nuxt-Composables können während der SSR aufgerufen werden und geben inaktiven Zustand zurück, bis die Hydration den echten Client-Kontext bereitstellt. Löse Netzwerk-Refreshes aus Client-Lifecycle-Hooks oder Nutzeraktionen aus, wenn die Daten von browser-exklusivem Kontext abhängen.

## Null- und ungültige Eingaben

Lese-Composables löschen den Zustand, ohne RPC aufzurufen, wenn Adresse, Programm-ID oder Signatur `null` ist.

Ungültige Adress-Strings löschen veraltete Daten, setzen `error` und rufen die RPC-Methode nicht auf. Verzweige nach `error.value.code` für nutzerseitige Meldungen; eine nicht parsbare Adresse meldet `INVALID_ADDRESS`.

## Refresh- und Fehlersemantik

`useBalance`, `useAccountInfo`, `useProgramAccounts`, `useTokenAccounts` und `useTokenBalance` teilen sich eine Zustandsmaschine und verhalten sich daher in drei Fällen gleich, in denen man leicht Fehler macht.

**`refresh()` lehnt ab; bei einem Fehler löst es nicht auf.** Bei Erfolg löst es mit dem neuen Wert auf, bei einer leeren Eingabe mit `null`, andernfalls lehnt es mit einem normalisierten `SolanaError` ab. Ein einfaches `@click="refresh"` ist in Ordnung, weil Vue die Ablehnung schluckt, aber handgeschriebener Code muss sie behandeln:

```ts
// No error state on a rejected promise, so this silently does nothing useful.
await refresh();

// Await it and report.
try {
  await refresh();
} catch (cause) {
  console.error(cause);
}
```

`useRequest()` ist die Ausnahme: Sein `refresh()` löst mit dem Ergebnis des Versuchs auf, statt abzulehnen.

**Daten fallen auf ihren leeren Wert zurück, wenn ein Lesevorgang fehlschlägt.** Ein zuvor geladenes Guthaben bleibt nicht neben einem frischen Fehler auf dem Bildschirm stehen — es wirkt wie aktuelle Daten, obwohl es keine sind. Verzweige nach `error`, um zu entscheiden, was gerendert wird:

```vue
<template>
  <UAlert v-if="error" color="error" variant="subtle" :title="errorMessage" />
  <p v-else-if="loading">Loading…</p>
  <p v-else>Lamports: {{ balance ?? "—" }}</p>
</template>
```

**Schreibgeschützte Ergebnisse in `useTokenBalance`.** Seine `balance` und `decimals` sind Computed-Refs, die aus einem Lesevorgang abgeleitet werden. Lies sie; Zuweisungen an sie haben keine Wirkung.

## Checkliste für RPC-Kosten

- Bevorzuge nach Möglichkeit direkte Lesevorgänge für einzelne Konten.
- Verwende Filter für Scans über Programm-Konten.
- Verwende `dataSlice`, wenn du nur einen Teil der Kontodaten brauchst.
- Vermeide breite Scans von Landing-Pages oder bei jeder Routennavigation.
- Vermeide aggressive Polling-Intervalle auf öffentlichen RPC-Endpoints.
- Cache oder indexiere Daten, die viele Nutzer wiederholt anfordern.
