---
title: "@vue-solana/core"
description: Framework-agnostische Solana-Konfiguration, RPC, Wallet-Typen und Transaktions-Helfer.
ogSection: Pakete
surroundOrder: 16
---

[`@vue-solana/core`](https://www.npmjs.com/package/@vue-solana/core) enthält framework-agnostische Solana-Primitiven, die von den Vue-Solana-Paketen genutzt werden.

Verwende dieses Paket direkt, wenn du Kit-Clients, Endpoint-Helfer, gemeinsame Wallet-Typen, Registrierungshelfer für den Android Mobile Wallet Adapter, Helfer für iOS-Browser-Wallets, Token-Konto-Lesevorgänge und Transaktions-Helfer brauchst, ohne das Vue-Plugin zu installieren.

`@vue-solana/core` baut auf dem modernen [`@solana/kit`](https://www.npmjs.com/package/@solana/kit) auf. `createSolanaClient()` liegt im Subpfad `@vue-solana/core/kit`, der ganz `@solana/kit` re-exportiert. Die Legacy-API `@solana/web3-compat` und der `web3`-Subpfad wurden in v2.0.0 entfernt — siehe [Kit-Migration](/de/guides/migration) für die vollständige Vorher/Nachher-Zuordnung.

## Installation

```sh
pnpm add @vue-solana/core
```

Das Paket ist reines ESM. Ein CommonJS-`require("@vue-solana/core")` schlägt mit `No "exports" main defined` fehl; stelle das importierende Modul auf ESM um oder bleib bei `@vue-solana/core@^2`, das weiterhin einen `.cjs`-Build ausliefert. Siehe [Upgrade von v2 auf v3](/de/guides/migration#upgrading-v2-to-v3).

## Schnellstart

```ts
import { address } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const { value: latestBlockhash } = await solana.client.rpc.getLatestBlockhash().send();

console.log(solana.endpoint, latestBlockhash.blockhash);
```

Du kannst auch direkt einen Kit-Client erstellen:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();

console.log(slot); // bigint
```

`createSolanaContext()` liefert `{ cluster, endpoint, wsEndpoint, client }`; der `client` trägt `client.rpc` und `client.rpcSubscriptions`.

Der Root-Export bleibt unterstützt. Direkte Subpfad-Exporte sind ebenfalls verfügbar, du kannst also nur die Helfer importieren, die ein Modul wirklich besitzt:

```ts
import { createSolanaClient } from "@vue-solana/core/kit";
import { createSolanaContext } from "@vue-solana/core/rpc";
import { parseAddress } from "@vue-solana/core/address";
import { getTokenBalance } from "@vue-solana/core/token-accounts";
import type { SolanaConfig } from "@vue-solana/core/types";
```

Direkte Subpfade:

- `@vue-solana/core/address`
- `@vue-solana/core/action`
- `@vue-solana/core/buffer-polyfill`
- `@vue-solana/core/types`
- `@vue-solana/core/clusters`
- `@vue-solana/core/errors`
- `@vue-solana/core/ios-wallet`
- `@vue-solana/core/kit`
- `@vue-solana/core/mobile-wallet`
- `@vue-solana/core/mobile-wallet-support`
- `@vue-solana/core/rpc`
- `@vue-solana/core/timeout`
- `@vue-solana/core/transaction`
- `@vue-solana/core/wallet`
- `@vue-solana/core/wallet-standard`
- `@vue-solana/core/token-accounts`
- `@vue-solana/core/solana-pay`
- `@vue-solana/core/solana-pay-confirmation`
- `@vue-solana/core/solana-pay-status`

## Verwandte Anleitungen

- [RPC und Cluster](/de/guides/rpc-and-clusters): Cluster-Namen, eigene RPC-Endpoints, WebSocket-Endpoints und Client-Helfer konfigurieren.
- [Wallets](/de/guides/wallets): Wallet-Standard-Wallets erkennen, mobile Wallet-Quellen registrieren und Wallet-Fähigkeiten prüfen.
- [Transaktionen](/de/guides/transactions): signieren, senden, bestätigen und Transaktions-Timeouts sicher behandeln.
- [Solana Pay](/de/guides/solana-pay): Zahlungsanforderungen kodieren, QR-Codes rendern und scannen und die Abwicklung anhand einer Reference bestätigen.
- [Fehler](/de/guides/errors): auf stabile `SolanaError`-Codes verzweigen und rohe Ursachen aus der Nutzeroberfläche heraushalten.

## Konfiguration

```ts
type SolanaCluster = "mainnet" | "mainnet-beta" | "testnet" | "devnet" | "localnet";

interface SolanaConfig {
  cluster?: SolanaCluster;
  endpoint?: string;
  wsEndpoint?: string;
  commitment?: Commitment;
  autoConnect?: boolean;
  payer?: TransactionSigner;
  payerSecretKey?: string;
}
```

Unterstützte Cluster sind `mainnet` (Legacy-Alias `mainnet-beta`), `testnet`, `devnet` und `localnet`. Wallet-Helfer verwenden Wallet-Standard-Chain-IDs wie `solana:devnet`, die über `getSolanaChain()` aus Clustern abgeleitet werden. Fehlt `endpoint`, nutzt das Paket den öffentlichen Solana-RPC-Endpoint des gewählten Clusters. Fehlt `wsEndpoint`, wird er aus dem RPC-Endpoint abgeleitet.

`autoConnect` ist standardmäßig `false`. Wenn es über das Vue-Plugin oder das Nuxt-Modul aktiviert ist, verbindet Vue Solana nur eine Wallet-Identität erneut, die die Nutzerin oder der Nutzer zuvor ausgewählt hat und die auf dem Client wieder erkannt wird. Gespeichert werden nur Metadaten der Wallet-Identität unter `localStorage["vue-solana:selected-wallet"]`: `name` sowie `platform`/`source`, sofern verfügbar. Private Schlüssel, Sitzungsdaten oder Transaktionsdaten werden nie gespeichert, und eine beliebige installierte Wallet wird nie verbunden.

`payer` ist ein Kit-`TransactionSigner`, der als Gebührenzahler des Clients und als Signer für clientseitig gesendete Transaktionen dient. `payerSecretKey` ist ein base64-kodiertes 64-Byte-Ed25519-Schlüsselpaar mit dem geheimen Schlüssel zuerst; der Client leitet die Adresse bei der Erstellung ab und importiert den Signaturschlüssel erst bei der ersten Nutzung, ein Schlüsselpaar, dessen öffentliche Hälfte nicht zu seinem Seed passt, wird also erst bei der ersten Signatur abgelehnt und nicht schon beim Erstellen des Clients. Die Adresse stammt aus der ungeprüften öffentlichen Hälfte, behandle `payer.address` daher als unbestätigt, bis die erste Signatur erfolgreich war. Beim Signieren wird der Schlüssel über WebCrypto importiert, das Browser nur in einem sicheren Kontext bereitstellen (`https` oder `http` auf `localhost`); außerhalb davon wirft der erste `signTransactions()`-Aufruf, statt einen generischen Fehler über einen ungültigen Schlüssel zurückzugeben. Beide Optionen werden von direkten Core- und Vue-Clients unterstützt.

`createSolanaClient()` setzt standardmäßig den offiziellen `@solana/kit-plugin-rpc`-Stack zusammen: `solanaRpc()`, gefolgt von `rpcAirdrop()`, wenn kein `commitment` konfiguriert ist (ein konfiguriertes `commitment` baut denselben Stack explizit, damit es die RPC-Schicht erreicht). `solanaRpc()` installiert `rpcTransactionPlanner()`, `rpcTransactionPlanSigningExecutor()` und `rpcTransactionPlanSendingExecutor()` selbst, der Client bietet also RPC-Lesevorgänge und -Subscriptions sowie `planTransaction(s)`, `signTransaction(s)` und `sendTransaction(s)` ohne zusätzliches Plugin. Der alte, eigene Fallback-Sender wird nicht verwendet. Der offizielle Send-Executor ergänzt einen frischen Blockhash, behandelt Ressourcenlimits und Preflight, signiert mit den verfügbaren Client-Signern, übermittelt die Transaktion und wartet auf `confirmed`-Commitment, bevor das Senden auflöst. Ein Client-Versand erfordert einen `payer`-Signer.

Lege niemals ein rohes Secret oder `payerSecretKey` in der öffentlichen Nuxt-Runtime-Config ab. Liefere niemals einen finanzierten Signaturschlüssel an den Browser einer Endnutzerin oder eines Endnutzers; nutze eine Server- oder Relayer-Grenze oder für Demos einen ephemeren, unfinanzierten Signer.

Verwende `mainnet` für Solana-Mainnet. Das ist Solanas offizieller Mainnet-Clustername. Die Legacy-Schreibweise `mainnet-beta` wird weiterhin akzeptiert und verweist auf denselben Endpoint `https://api.mainnet.solana.com`.

## Kontext

```ts
interface SolanaContext {
  cluster: SolanaCluster;
  endpoint: string;
  wsEndpoint: string;
  client: SolanaClient;
}
```

`client` ist ein [`@solana/kit`](https://www.npmjs.com/package/@solana/kit)-Client, der von `createSolanaClient()` gebaut wird, und stellt `client.rpc`, `client.rpcSubscriptions`, `planTransaction(s)` und `sendTransaction(s)` bereit.

## Wallet-Schnittstelle

```ts
interface SolanaWallet {
  publicKey: Address | null;
  connected: boolean;
  connecting?: boolean;
  disconnecting?: boolean;
  platform?: SolanaWalletInfo["platform"];
  source?: SolanaWalletInfo["source"];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array) => Promise<SolanaSignMessageResult>;
  signTransaction?: (transaction: SolanaTransaction) => Promise<SolanaTransaction>;
  signAllTransactions?: (transactions: SolanaTransaction[]) => Promise<SolanaTransaction[]>;
  signAndSendTransaction?: (
    transaction: SolanaTransaction,
    options?: SendTransactionOptions,
  ) => Promise<{ signature: Signature }>;
}
```

Browser-Wallets, die über den Solana Wallet Standard erkannt werden, und unterstützte iOS-Browser-Wallet-Links werden auf diese Schnittstelle abgebildet. Du kannst auch ein eigenes Objekt bereitstellen, das `SolanaWallet` implementiert. Eine erkannte Wallet bleibt getrennt, bis `connect()` erfolgreich auflöst — selbst wenn die Browser-Erweiterung zuvor autorisierte Konten offenlegt.

`publicKey` ist die base58-kodierte Kit-`Address` (ein String) des verbundenen Kontos. `SolanaTransaction` ist `Uint8Array` — rohe Wire-Transaktionsbytes, die die Wallet unverändert signiert; das führende Byte unterscheidet Legacy- von versionierten Transaktionen.

Der Android Mobile Wallet Adapter wird über `@solana-mobile/wallet-standard-mobile` registriert und dann über denselben Wallet-Standard-Adapter abgebildet.

## Wallet-Metadaten

```ts
interface SolanaWalletInfo {
  name: string;
  icon: string;
  chains: readonly string[];
  platform?: "browser" | "mobile" | "desktop";
  source?: "wallet-standard" | "mobile-wallet-adapter" | "deep-link" | "protocol-link";
  appUrl?: string;
  installUrl?: string;
  callbackUrl?: string;
  capabilities?: {
    connect?: boolean;
    disconnect?: boolean;
    signMessage?: boolean;
    signTransaction?: boolean;
    signAllTransactions?: boolean;
    signAndSendTransaction?: boolean;
  };
  accounts: readonly SolanaWalletAccountInfo[];
  wallet: unknown;
}
```

Aktuelle Metadatenwerte:

- Browser-Erweiterungs-Wallets verwenden `platform: "browser"` und `source: "wallet-standard"`.
- Der Android Mobile Wallet Adapter verwendet `platform: "mobile"` und `source: "mobile-wallet-adapter"`.
- iOS-Browser-Wallets verwenden `platform: "mobile"` und `source: "deep-link"`.
- `protocol-link` ist für mögliche zukünftige native Desktop-Wallet-Adapter reserviert.

## Wallet-Standard-Helfer

```ts
type SolanaChain = "solana:mainnet" | "solana:testnet" | "solana:devnet" | "solana:localnet";
```

`SolanaChain` ist die Wallet-Standard-Chain-ID, die von der Wallet-Erkennung, der Registrierung mobiler Wallets, iOS-Wallet-Links und den Signaturoptionen des Wallet-Adapters verwendet wird. Verwende `getSolanaChain(cluster)`, wenn du eine aus einem konfigurierten Solana-Cluster ableiten musst.

- `getSolanaChain(cluster)`: ordnet `mainnet-beta` oder `mainnet`, `devnet`, `testnet` oder `localnet` einer Solana-Wallet-Standard-Chain-ID zu.
- `isSolanaStandardWallet(wallet)`: prüft, ob eine Wallet-Standard-Wallet Solana unterstützt.
- `getRegisteredSolanaWallets()`: liefert erkannte Solana-Wallet-Standard-Wallets in Browser-Umgebungen, einschließlich des Android Mobile Wallet Adapter, nachdem er auf unterstützten Clients registriert wurde.
- `subscribeSolanaWallets(listener)`: abonniert Wallet-Standard-Register/Unregister-Ereignisse.
- `adaptSolanaStandardWallet(walletInfo, options?)`: bildet eine erkannte Wallet-Standard-Wallet auf `SolanaWallet` ab.
- `disconnectSolanaStandardWallet(walletInfo)`: trennt eine erkannte Wallet-Standard-Wallet über ihre eigene `standard:disconnect`-Funktion, ohne sie abzubilden, sodass eine Wallet, die die App nie auswählt, kein `change`-Abo erhält. Löst `false` auf, wenn die Wallet keine Disconnect-Funktion anbietet, und wird mit dem Fehler der Wallet abgelehnt.

## Helfer für mobile Wallets

- `registerSolanaMobileWallet(options?)`: registriert den Android Mobile Wallet Adapter über Wallet Standard auf unterstützten Android-Chrome-Clients.
- `isSolanaMobileWalletSupported()`: gibt zurück, ob die aktuelle Laufzeit die Android-MWA-Webregistrierung unterstützt.
- `getDefaultMobileWalletAppIdentity()`: leitet eine Standard-App-Identität für den Mobile Wallet Adapter aus dem aktuellen Dokument ab.
- `getSolanaIosWallets(options?)`: liefert iOS-Browser-Wallet-Einträge für Phantom, Solflare und Backpack auf iOS-Browsern.
- `adaptSolanaIosWallet(walletInfo, options?)`: bildet einen iOS-Deep-Link-Wallet-Eintrag auf `SolanaWallet` ab.
- `handleSolanaIosWalletCallback(options?)`: validiert und entschlüsselt iOS-Wallet-Redirect-Callbacks.
- `isSolanaIosBrowserWalletSupported()`: gibt zurück, ob die aktuelle Laufzeit iOS-Browser-Wallet-Links anzeigen sollte.

Diese Helfer sind SSR-sicher. Die Android-Registrierung kehrt ohne Registrierung zurück, wenn `window` fehlt, die Seite nicht in einem sicheren Kontext läuft oder der Browser kein Android-Browser ist. Die iOS-Wallet-Erkennung liefert eine leere Liste, wenn die Laufzeit kein iOS-Browser ist.

## Helfer

Der Root-Export `@vue-solana/core` re-exportiert die folgenden öffentlichen Helfer. Nutze direkte Subpfade, wenn du nur das Modul eines Helfers importieren willst statt des ganzen Barrels:

| Importpfad                         | Inhalt                                                                                                       | Verwende ihn, wenn                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@vue-solana/core/action`          | `createSolanaActionStore()`, `SolanaActionState` und `isSolanaActionAborted()`.                              | Du eine framework-agnostische Zustandsmaschine für asynchrone Aktionen mit Abbruch bei erneutem Dispatch für Solana-Arbeit brauchst.    |
| `@vue-solana/core/address`         | `parseAddress()` und Typen für Adresseingaben.                                                               | Du eine Solana-Adresse als String, ref-ähnliches Objekt oder Getter annimmst und eine validierte, normalisierte `Address` brauchst.     |
| `@vue-solana/core/clusters`        | Helfer für Standard-Cluster und -Endpoints.                                                                  | Du den eingebauten RPC- oder WebSocket-Endpoint des Pakets für `mainnet`, `mainnet-beta`, `testnet`, `devnet` oder `localnet` brauchst. |
| `@vue-solana/core/errors`          | `SolanaError`, Fehlerfabriken und Fehler-Guards.                                                             | Du stabile Fehlercodes für nutzerseitige Wallet-, RPC-, Adress-, Transaktions-, Timeout- oder Speicherfehler brauchst.                  |
| `@vue-solana/core/ios-wallet`      | iOS-Browser-Wallet-Erkennung, Deep-Link-Adapter und Callback-Behandlung.                                     | Du iOS-Wallet-Links ohne den einheitlichen Wallet-Flow des Vue-Plugins verdrahtest.                                                     |
| `@vue-solana/core/kit`             | `createSolanaClient()` und die gesamte `@solana/kit`-Oberfläche.                                             | Du die moderne Kit-API willst, ohne `@solana/kit` in deiner eigenen `package.json` zu installieren.                                     |
| `@vue-solana/core/mobile-wallet`   | Registrierungshelfer für den Android Mobile Wallet Adapter.                                                  | Du den Android-MWA registrieren musst, bevor du Wallet-Standard-Wallets liest.                                                          |
| `@vue-solana/core/rpc`             | `createSolanaContext()`.                                                                                     | Du einen konfigurierten Kit-Client und aufgelöste Cluster-Endpoints willst, ohne das Vue-Plugin zu installieren.                        |
| `@vue-solana/core/timeout`         | Promise-Timeout-Helfer, die Solana-Timeout-Fehler erzeugen.                                                  | Du Timeout-Verhalten brauchst, das zu den Helfern für Transaktionsbestätigung passt.                                                    |
| `@vue-solana/core/transaction`     | Helfer zum Senden und Bestätigen von Transaktionen.                                                          | Du einen wallet-fähigen Sendepfad oder ein Bestätigungsergebnis für eine bestehende Signatur brauchst.                                  |
| `@vue-solana/core/token-accounts`  | Zustandslose SPL-Token-Konto-Lesevorgänge (`getTokenAccountsByOwner`, `getTokenAccount`, `getTokenBalance`). | Du Token-Konto- oder Guthabenlesevorgänge über die `jsonParsed`-API der Kit-RPC brauchst.                                               |
| `@vue-solana/core/types`           | Gemeinsame TypeScript-Typen.                                                                                 | Du `SolanaConfig`, `SolanaContext`, `SolanaWallet`, Wallet-Metadaten oder Transaktionsoptionstypen brauchst.                            |
| `@vue-solana/core/wallet`          | Zusicherungen zum Wallet-Zustand und Fehler zu Wallet-Fähigkeiten.                                           | Du prüfen musst, ob eine ausgewählte Wallet verbunden ist oder Signieren unterstützt, bevor du Wallet-Methoden aufrufst.                |
| `@vue-solana/core/wallet-standard` | Chain-Zuordnung, Erkennung, Subscriptions und Adapter-Helfer des Wallet Standard.                            | Du deine eigene Wallet-Erkennungsschicht auf dem Solana Wallet Standard aufbaust.                                                       |

### Cluster und RPC

- `DEFAULT_CLUSTER`: Standard-Cluster, derzeit `devnet`.
- `getClusterEndpoint(cluster?)`: liefert den HTTP-RPC-Endpoint für einen Cluster.
- `getClusterWebSocketEndpoint(cluster?)`: liefert den WebSocket-Endpoint für einen Cluster.
- `getWebSocketEndpoint(endpoint)`: wandelt `http`/`https`-RPC-URLs in `ws`/`wss`-URLs um.
- `createSolanaClient(config?)`: erstellt einen `@solana/kit`-Client, dessen `rpc` an den aufgelösten Endpoint und an WebSocket-Subscriptions angebunden ist, mit standardmäßig installiertem offiziellem Planner und Transaktions-Send-Executor.
- `createSolanaContext(config?)`: erstellt `{ cluster, endpoint, wsEndpoint, client }` für framework-agnostisches App-Setup.

```ts
import { createSolanaClient } from "@vue-solana/core/kit";

const client = createSolanaClient({ cluster: "devnet" });

const slot = await client.rpc.getSlot().send();
```

Das Äquivalent mit `createSolanaContext`:

```ts
import { createSolanaContext } from "@vue-solana/core/rpc";

const solana = createSolanaContext({ cluster: "devnet" });

const slot = await solana.client.rpc.getSlot().send();
```

### Kit

Der Subpfad `@vue-solana/core/kit` re-exportiert ganz `@solana/kit` — die vollständige öffentliche Oberfläche, Werte und Typen —, sodass du `@solana/kit` nie in deiner eigenen `package.json` installierst:

```ts
import { address, lamports } from "@vue-solana/core/kit";
import type { Address, Commitment, Lamports, Signature, SolanaRpcApi } from "@vue-solana/core/kit";
```

- `createSolanaClient(config?)`: baut einen Kit-Client für die angegebene `SolanaConfig`. Nutzt die Endpoint-Auflösung aus `clusters.ts`, verdrahtet `rpcSubscriptionsUrl` aus dem aufgelösten WebSocket-Endpoint und installiert standardmäßig den offiziellen RPC-Planner und Transaktions-Send-Executor.
- `client.rpc` stellt die vollständige Solana-Lese-API (`getSlot`, `getBalance`, `getBlockHeight`, `getSignatureStatuses` und mehr) als RPC-Funktionen bereit, die mit `.send()` aufgerufen werden.
- `address(value)`: validiert und liefert eine `Address` (base58-String-Brand) — der Kit-Ersatz für `new PublicKey(...)`.
- `lamports(value: bigint)`: liefert einen `Lamports`-Wert — der Kit-Ersatz für rohe Lamport-Zahlen.
- Häufig genutzte Typen: `Address`, `Commitment`, `Lamports`, `Rpc`, `Signature`, `SolanaRpcApi`, `SolanaClient`. Der Subpfad re-exportiert jeden Typ, den `@solana/kit` exportiert, nicht nur diese.
- Vier Namen existieren sowohl in Kit als auch in dieser Bibliothek. Aus dem Root-Barrel (`@vue-solana/core`) lösen sie auf die Version **dieser Bibliothek** auf, aus dem `/kit`-Subpfad auf die Version **von Kit**: `SolanaError`, `SolanaErrorCode`, `isSolanaError` und `TransactionStatus`. Importiere `isSolanaError` aus `@vue-solana/core/kit`, wenn du einen von Kit selbst geworfenen Fehler prüfst, denn der Guard des Root-Barrels passt nicht zur Fehlerklasse von Kit.

Numerische RPC-Ergebnisse sind `bigint`, und Kontodaten sind `Uint8Array` statt `Buffer`. Details findest du in der [Kit-Migration](/de/guides/migration).

### Aktionen

`createSolanaActionStore()` kapselt jede asynchrone Funktion, die pro Aufruf ein frisches `AbortSignal` erhält, in eine framework-agnostische Zustandsmaschine für Aktionen. UI-Frameworks überführen den zurückgegebenen Store in reaktiven Zustand; das Vue-Composable `useAction()` baut auf diesem Store auf.

```ts
import { createSolanaActionStore, isSolanaActionAborted } from "@vue-solana/core/action";

const { dispatch, getState, subscribe, reset, withSignal } = createSolanaActionStore(
  (signal, address: Address) => client.rpc.getBalance(address).send(),
);

await dispatch(address);
```

- Jeder `dispatch` bricht den vorherigen laufenden Aufruf mit einem frischen `AbortSignal` ab; überholte Aufrufe werden mit einem Abbruchfehler abgelehnt und beschädigen nie den Zustand.
- `getState()` / `subscribe(listener)`: Snapshot und Stream von `SolanaActionState` (`status`, `data` und `error`).
- `withSignal(signal, ...args)`: kombiniert eine vom Aufrufer bereitgestellte Abbruchquelle für einen einzelnen Dispatch (Timeouts pro Versuch, gemeinsame Kill-Switches).
- `isSolanaActionAborted(error)`: prüft, ob eine Ablehnung von einem abgebrochenen oder überholten Aufruf stammt.

### Adressen

- `parseAddress(value)`: parst einen Adress-String, einen ref-ähnlichen Wert oder einen Getter und liefert `null` für nullish-Eingaben. Wirft `INVALID_ADDRESS` bei einem ungültigen base58-String. Akzeptiert `Address`-Werte unverändert.

```ts
import { parseAddress } from "@vue-solana/core/address";

const address = parseAddress("11111111111111111111111111111111");
const balance = address ? await client.rpc.getBalance(address).send() : null;
```

### Wallets

- `isWalletConnected(wallet)`: prüft, ob eine Wallet verbunden ist und einen öffentlichen Schlüssel hat.
- `assertWalletConnected(wallet)`: wirft `WALLET_NOT_CONNECTED`, wenn die Wallet nicht verbunden ist.
- `assertWalletCanSign(wallet)`: wirft, wenn die Wallet getrennt ist oder `signTransaction` nicht unterstützt.
- `assertWalletCanSignMessage(wallet)`: wirft, wenn die Wallet getrennt ist oder `signMessage` nicht unterstützt.

```ts
import { assertWalletCanSign } from "@vue-solana/core/wallet";

assertWalletCanSign(wallet);
const signedTransaction = await wallet.signTransaction(transaction);
```

### Transaktionen

- `signAndSendTransaction(client, wallet, transaction, options?)`: signiert und sendet rohe Wire-Transaktionsbytes mit einer konfigurierten Wallet und liefert die RPC-Signatur. Wallets, die `signAndSendTransaction` anbieten, werden delegiert; andernfalls wird die Transaktion mit `wallet.signTransaction` signiert und über `client.rpc.sendTransaction(...).send()` übermittelt. Android-Mobile-Wallet-Adapter-Wallets bevorzugen Signieren plus app-seitige RPC-Übermittlung, damit die App die Übermittlung kontrolliert und die RPC-Signatur nach dem Wallet-Handoff zuverlässig zurückgibt.
- `confirmTransactionSignature(client, signature, options?)`: wartet, bis eine übermittelte Signatur ein angefordertes Commitment erreicht. Standard sind `confirmed`-Commitment, ein Timeout von 60 Sekunden, ein Poll-Intervall von 1500 ms und das Abfragen von `client.rpc.getSignatureStatuses([signature]).send()`. Akzeptiert `pollIntervalMs` (muss größer als `0` sein), `abortSignal` und `searchTransactionHistory`. Eine fehlgeschlagene Transaktion wirft `TRANSACTION_FAILED`, eine Signatur, die nie erscheint, wirft `TRANSACTION_NOT_FOUND`, und ein ausgeschöpftes Warten wirft `TRANSACTION_TIMEOUT`. Übergib `searchTransactionHistory: true`, wenn die Signatur den jüngsten Status-Cache bereits verlassen haben könnte — ohne diese Option erscheint eine ältere Signatur nie in den Ergebnissen und läuft nach dem Timeout auf `TRANSACTION_NOT_FOUND`.

Der clientseitige Sendefluss ist von diesem wallet-fähigen Helfer getrennt. Der Client stellt `sendTransaction()` und `sendTransactions()` über den offiziellen `rpcTransactionPlanSendingExecutor()` bereit, den `solanaRpc()` innerhalb von `createSolanaClient()` installiert; die Vue-Composables kapseln diese Methoden. Sie planen, signieren, übermitteln und warten auf `confirmed`-Commitment; der Status `sent` wird erst gesetzt, nachdem dieser Sende-und-Bestätige-Vorgang abgeschlossen ist. Ein einzelnes Ergebnis zeigt die übermittelte Signatur unter `data.context.signature`, ein Batch-Ergebnis enthält den vollständigen Plan-Ergebnisbaum. Der offizielle Sender zeigt kein Wallet-Popup.

```ts
import { confirmTransactionSignature, signAndSendTransaction } from "@vue-solana/core/transaction";

const signature = await signAndSendTransaction(client, wallet, transaction);
await confirmTransactionSignature(client, signature, { commitment: "confirmed" });
```

### SPL Token

Token-Lesevorgänge nutzen die `jsonParsed`-API der Kit-RPC — keine Abhängigkeit von `@solana/spl-token`.

- `getTokenAccountsByOwner(client, owner, options?)`: liefert alle SPL-Token- und Token-2022-Konten eines Eigentümers als `TokenAccountInfo[]` (`{ address, mint, owner, amount: bigint, decimals, state, isNative }`). Übergib `programId`, um auf ein einzelnes Programm einzuschränken.
- `getTokenAccount(client, address, commitment?)`: liefert ein einzelnes geparstes Token-Konto (`TokenAccountInfo | null`). Liefert `null`, wenn das Konto nicht existiert oder kein Token-Konto ist.
- `getTokenBalance(client, mint, owner, commitment?)`: liest das Token-Konto des Eigentümers für den angegebenen Mint und liefert `{ amount, decimals }`. Liefert `null`, wenn kein Token-Konto existiert.

```ts
import { getTokenBalance } from "@vue-solana/core/token-accounts";

const balance = await getTokenBalance(client, mint, owner);
if (balance) {
  console.log(`${balance.amount} (${balance.decimals} decimals)`);
}
```

### Solana Pay

Die Solana-Pay-Helfer sind direkt auf `@solana/kit` implementiert; ein zusätzliches Solana-Pay- oder `gill`-Paket ist nicht nötig.

- `encodeURL(fields)` / `encodeTransferRequestURL(fields)` / `encodeTransactionRequestURL(fields)`: bauen `solana:`-Transfer- oder Transaktions-Request-URLs. `amount` ist ein `bigint` in Lamports und wird als dezimaler SOL-String kodiert.
- `parseURL(value)`: validiert und parst einen Transfer-Request in typisierte Felder `recipient`, `amount`, `splToken`, `reference`, `label`, `message` und `memo`. Wirft `ParseURLError` bei ungültigem Protokoll, Empfänger, Token-Mint, ungültiger Reference, ungültigem Betrag oder fehlerhafter URL.
- `createQR(url, size?, background?, color?)`: rendert einen QR-Code als SVG-String. `createQRDataURL()` und `createQRCanvas()` bieten alternative Renderziele. Der `qrcode`-Encoder wird lazy geladen, reine URL-Nutzer bündeln ihn also nicht.
- `createRecipient(address)`, `createSPLToken(address)`, `isValidSolanaAddress(value)`: Helfer zur Adressvalidierung.
- `createSolanaPayReference()` und `verifySolanaPayPayment()` liegen in `@vue-solana/core/solana-pay-confirmation`; `getSolanaPayPaymentStatus()` liegt in `@vue-solana/core/solana-pay-status`.

```ts
import { createQR, encodeURL, parseURL } from "@vue-solana/core/solana-pay";
import { address } from "@vue-solana/core/kit";

const url = encodeURL({
  recipient: address("PASTE_A_SOLANA_ADDRESS"),
  amount: 100_000_000n,
  label: "Example store",
});

const parsed = parseURL(url.toString());
const svg = await createQR(url);
```

Reference-Werte sind Kit-`Address`-Strings. Parse Scanner-Ausgaben mit `parseURL()` und zeige Empfänger, Betrag, Token, Label und Nachricht an, bevor irgendetwas signiert wird.

### Fehler und Timeouts

- `SolanaError`: normalisierte Fehlerklasse mit stabilem `code` und optionaler ursprünglicher `cause`.
- `createSolanaError(code, message, options?)`: erstellt einen normalisierten Solana-Fehler.
- `isSolanaError(error)`: verengt unbekannte Fehler auf `SolanaError`.
- `normalizeSolanaError(cause, fallbackCode, fallbackMessage?, options?)`: wandelt unbekannte Fehler in `SolanaError` um und ordnet häufige Wallet-Ablehnungen `USER_REJECTED` zu.
- `withTimeout(promise, timeoutMs, createError?, options?)`: lässt ein Promise gegen einen vom Aufrufer bereitgestellten Timeout-Fehler laufen. Wirft `INVALID_INPUT` bei `NaN` oder negativen Timeouts; `{ signal }` bricht das Warten mit dem Grund des Signals ab, und `{ code, message }` legt den Standard-Timeout-Fehler fest.
- `withSolanaTimeout(promise, timeoutMs, message)`: lässt ein Promise gegen einen `TRANSACTION_TIMEOUT`-Fehler laufen.

## Fehlermodell

Vue Solana normalisiert häufige Wallet-, RPC-, Adress-, Transaktions- und Speicherfehler in `SolanaError`. Apps sollten auf den stabilen Wert `error.code` verzweigen, statt Adapter- oder RPC-Meldungen zu parsen.

```ts
import { isSolanaError } from "@vue-solana/core/errors";

try {
  await signAndSendTransaction(client, wallet, transaction);
} catch (error) {
  if (isSolanaError(error)) {
    switch (error.code) {
      case "USER_REJECTED":
        // The user declined a wallet prompt.
        break;
      case "TRANSACTION_TIMEOUT":
        // The operation timed out; check signature state before retrying.
        break;
      case "TRANSACTION_NOT_FOUND":
        // The signature never landed; safe to retry.
        break;
      case "TRANSACTION_FAILED":
        // The transaction errored on-chain; see error.cause.
        break;
      case "RPC_FAILURE":
        // RPC or confirmation failed.
        console.error(error.cause);
        break;
    }
  }
}
```

Die stabilen Fehlercodes sind:

- `NO_WALLET_SELECTED`
- `WALLET_NOT_CONNECTED`
- `WALLET_FEATURE_UNSUPPORTED`
- `WALLET_FAILURE`
- `USER_REJECTED`
- `INVALID_SIGNATURE`
- `INVALID_ADDRESS`
- `INVALID_INPUT`
- `TRANSACTION_TIMEOUT`
- `TRANSACTION_NOT_FOUND`
- `TRANSACTION_FAILED`
- `REDIRECT_TIMEOUT`
- `DECRYPTION_FAILED`
- `RPC_FAILURE`
- `STORAGE_FAILURE`

`SolanaError.cause` bewahrt den ursprünglichen Wallet-Adapter-, RPC-, Parsing- oder Speicherfehler zum Debuggen auf. Zeige Endnutzerinnen und Endnutzern keine rohen `cause`-Details, es sei denn, die App vertraut dieser Quelle ausdrücklich.

## Buffer-Polyfill

Browser-Code, der Solana-Transaktionen serialisiert, kann ein Node-kompatibles globales `Buffer` brauchen. Initialisiere es vor dem Transaktionscode mit `installSolanaBufferPolyfill()` aus `@vue-solana/core/buffer-polyfill`. Das einzige verbliebene paketeigene Typ-Shim deckt den Browser-Subpfad `buffer/` ab, aus dem dieser Polyfill importiert.

Alle drei Pakete sind mit `"sideEffects": false` markiert, Bundler dürfen also jeden Import verwerfen, dessen Bindings ungenutzt sind. Importiere den Polyfill als benannten Import und rufe ihn auf, wie im obigen Snippet. Ein reiner Seiteneffekt-Import wie `import "@vue-solana/core/buffer-polyfill"` installiert nichts, weil der Subpfad nur die Funktion exportiert.
